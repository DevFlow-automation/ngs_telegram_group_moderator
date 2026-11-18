import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { sql } from '@vercel/postgres';

const bot = new Bot(process.env.BOT_TOKEN);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const GALLERY_THREAD_ID = 18;
const OLYMPIAD_THREAD_ID = 15;
const SUPER_MODERATOR_ID = 8297487103;

let dbInitialized = false;
let cachedBotUsername = "";

async function getBotUsername(api) {
    if (cachedBotUsername) return cachedBotUsername;
    try {
        const me = await api.getMe();
        cachedBotUsername = me.username || "";
    } catch {
        // ignore
    }
    return cachedBotUsername;
}

async function ensureTables() {
    if (dbInitialized) return;
    await sql`CREATE TABLE IF NOT EXISTS moderators (id BIGINT PRIMARY KEY, last_poll_at TIMESTAMPTZ);`;
    await sql`ALTER TABLE moderators ADD COLUMN IF NOT EXISTS last_poll_at TIMESTAMPTZ;`;
    await sql`
        CREATE TABLE IF NOT EXISTS moderation_queue (
            id SERIAL PRIMARY KEY,
            chat_id BIGINT NOT NULL,
            thread_id INT NOT NULL,
            author_id BIGINT NOT NULL,
            author_name TEXT NOT NULL,
            author_username TEXT,
            media_group_id TEXT,
            content_type TEXT NOT NULL,
            text_content TEXT,
            entities JSONB,
            media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
            status TEXT NOT NULL DEFAULT 'pending',
            reject_reason TEXT,
            supermod_chat_id BIGINT,
            supermod_msg_id BIGINT,
            group_notice_msg_id BIGINT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;
    await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_moderation_queue_media_group
        ON moderation_queue (media_group_id)
        WHERE media_group_id IS NOT NULL;
    `;
    dbInitialized = true;
}

// Проверка прав администратора для команд управления
async function isAdmin(ctx) {
    if (!ctx.from) return false;
    if (
        (process.env.ADMIN_ID && String(ctx.from.id) === String(process.env.ADMIN_ID)) ||
        Number(ctx.from.id) === SUPER_MODERATOR_ID
    ) {
        return true;
    }
    if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
        try {
            const member = await ctx.getChatMember(ctx.from.id);
            return member.status === "creator" || member.status === "administrator";
        } catch (error) {
            console.error("Ошибка проверки прав:", error);
            return false;
        }
    }
    return !process.env.ADMIN_ID;
}

// Получение имени (fullName) и @username пользователя из Telegram по его ID
async function getTelegramUserInfo(ctx, userId) {
    const numericId = Number(userId);
    let tgUser = null;

    if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
        try {
            const member = await ctx.getChatMember(numericId);
            tgUser = member?.user;
        } catch {
            // fallback ниже
        }
    }

    if (!tgUser) {
        try {
            const chat = await ctx.api.getChat(numericId);
            if (chat) tgUser = chat;
        } catch {
            // бот ещё не пересекался с этим пользователем
        }
    }

    if (!tgUser) {
        return {
            id: String(userId),
            fullName: null,
            username: null,
            formatted: `${userId} (имя не найдено)`
        };
    }

    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || "Без имени";
    const username = tgUser.username ? `@${tgUser.username}` : "без @username";

    return {
        id: String(userId),
        fullName,
        username,
        formatted: `${userId} — ${fullName} (${username})`
    };
}

// Извлечение текста, сущностей и медиа из сообщения (включая пересланные)
function extractMessageData(msg) {
    const textContent = msg.text ?? msg.caption ?? null;
    const entities = msg.entities ?? msg.caption_entities ?? null;

    let mediaItem = null;
    let contentType = "text";

    if (msg.photo && msg.photo.length > 0) {
        contentType = "photo";
        mediaItem = {
            type: "photo",
            file_id: msg.photo[msg.photo.length - 1].file_id
        };
    } else if (msg.video) {
        contentType = "video";
        mediaItem = {
            type: "video",
            file_id: msg.video.file_id
        };
    } else if (msg.document) {
        contentType = "document";
        mediaItem = {
            type: "document",
            file_id: msg.document.file_id
        };
    } else if (msg.animation) {
        contentType = "animation";
        mediaItem = {
            type: "animation",
            file_id: msg.animation.file_id
        };
    } else if (msg.audio) {
        contentType = "audio";
        mediaItem = {
            type: "audio",
            file_id: msg.audio.file_id
        };
    } else if (msg.voice) {
        contentType = "voice";
        mediaItem = {
            type: "voice",
            file_id: msg.voice.file_id
        };
    } else if (msg.video_note) {
        contentType = "video_note";
        mediaItem = {
            type: "video_note",
            file_id: msg.video_note.file_id
        };
    } else if (!textContent) {
        return null;
    }

    return {
        contentType,
        textContent,
        entities,
        mediaItems: mediaItem ? [mediaItem] : []
    };
}

// Отправка сохраненного поста (одиночного или альбома) в указанный чат/тему
async function sendStoredPost(api, targetChatId, targetThreadId, post) {
    const threadOpts = targetThreadId ? { message_thread_id: Number(targetThreadId) } : {};
    const mediaItems = Array.isArray(post.media_items) ? post.media_items : [];
    const text = post.text_content || undefined;
    const entities = Array.isArray(post.entities) && post.entities.length > 0 ? post.entities : undefined;

    if (mediaItems.length > 1) {
        const groupableTypes = new Set(["photo", "video", "document", "audio"]);
        const groupItems = mediaItems.filter(item => groupableTypes.has(item.type));
        if (groupItems.length > 1) {
            const mediaGroup = groupItems.map((item, idx) => ({
                type: item.type,
                media: item.file_id,
                ...(idx === 0 && text ? { caption: text, ...(entities ? { caption_entities: entities } : {}) } : {})
            }));
            const sentMessages = await api.sendMediaGroup(targetChatId, mediaGroup, threadOpts);
            return sentMessages[0]?.message_id;
        }
    }

    if (mediaItems.length >= 1) {
        const item = mediaItems[0];
        const captionOpts = {
            ...threadOpts,
            ...(text ? { caption: text } : {}),
            ...(text && entities ? { caption_entities: entities } : {})
        };

        switch (item.type) {
            case "photo": {
                const sent = await api.sendPhoto(targetChatId, item.file_id, captionOpts);
                return sent.message_id;
            }
            case "video": {
                const sent = await api.sendVideo(targetChatId, item.file_id, captionOpts);
                return sent.message_id;
            }
            case "document": {
                const sent = await api.sendDocument(targetChatId, item.file_id, captionOpts);
                return sent.message_id;
            }
            case "animation": {
                const sent = await api.sendAnimation(targetChatId, item.file_id, captionOpts);
                return sent.message_id;
            }
            case "audio": {
                const sent = await api.sendAudio(targetChatId, item.file_id, captionOpts);
                return sent.message_id;
            }
            case "voice": {
                const sent = await api.sendVoice(targetChatId, item.file_id, captionOpts);
                return sent.message_id;
            }
            case "video_note": {
                const sent = await api.sendVideoNote(targetChatId, item.file_id, threadOpts);
                if (text) {
                    await api.sendMessage(targetChatId, text, {
                        ...threadOpts,
                        ...(entities ? { entities } : {}),
                        reply_parameters: { message_id: sent.message_id }
                    });
                }
                return sent.message_id;
            }
        }
    }

    const sent = await api.sendMessage(targetChatId, text || "(без текста)", {
        ...threadOpts,
        ...(entities ? { entities } : {})
    });
    return sent.message_id;
}

// Формирование клавиатуры проверки для супермодератора
function buildModerationKeyboard(postId) {
    return new InlineKeyboard()
        .text("✅ Опубликовать", `mod_approve:${postId}`)
        .text("❌ Отменить", `mod_reject:${postId}`);
}

// Отправка поста на проверку супермодератору в ЛС
async function notifySuperModerator(api, post) {
    const authorTag = post.author_username ? ` (@${post.author_username})` : "";
    const headerText =
        `📝 Публикация #${post.id} на проверку (тема «Олимпиады»)\n` +
        `👤 Отправитель: ${post.author_name}${authorTag} [ID: ${post.author_id}]\n\n` +
        `Выберите действие ниже:`;

    try {
        const previewMsgId = await sendStoredPost(api, SUPER_MODERATOR_ID, undefined, post);
        const controlMsg = await api.sendMessage(SUPER_MODERATOR_ID, headerText, {
            reply_parameters: previewMsgId ? { message_id: previewMsgId } : undefined,
            reply_markup: buildModerationKeyboard(post.id)
        });
        await sql`
            UPDATE moderation_queue
            SET supermod_chat_id = ${SUPER_MODERATOR_ID},
                supermod_msg_id = ${controlMsg.message_id}
            WHERE id = ${post.id};
        `;
    } catch (dmError) {
        console.error("Не удалось отправить пост в ЛС супермодератору (нужно нажать /start в боте):", dmError?.message);
    }
}

bot.command("start", async (ctx) => {
    const payload = ctx.match?.trim() || "";
    const callerId = Number(ctx.from?.id);

    if (payload === "notify") {
        try {
            await ensureTables();
            // Если у этого модератора есть последняя отклоненная публикация — сразу показываем её причину
            const { rows } = await sql`
                SELECT * FROM moderation_queue
                WHERE author_id = ${callerId} AND status = 'rejected'
                ORDER BY id DESC
                LIMIT 1;
            `;
            if (rows.length > 0) {
                const post = rows[0];
                await sendStoredPost(ctx.api, callerId, undefined, post).catch(() => {});
                return ctx.reply(
                    `🔔 Уведомления подключены!\n\n` +
                    `❌ Ваша последняя публикация #${post.id} в теме «Олимпиады» была отклонена супермодератором.\n\n` +
                    `💬 Причина отклонения:\n${post.reject_reason || "Не указана"}`
                );
            }
        } catch (err) {
            console.error("Ошибка при проверке уведомлений в /start:", err);
        }
        return ctx.reply("🔔 Уведомления от бота подключены! Теперь вы будете получать результаты проверки ваших публикаций здесь в личных сообщениях.");
    }

    if (payload.startsWith("review_")) {
        const postId = Number(payload.replace("review_", ""));
        if (callerId !== SUPER_MODERATOR_ID) {
            return ctx.reply("⛔ Просмотр публикаций на проверке доступен только супермодератору.");
        }
        try {
            await ensureTables();
            const { rows } = await sql`SELECT * FROM moderation_queue WHERE id = ${postId};`;
            if (rows.length === 0) {
                return ctx.reply("ℹ️ Публикация не найдена.");
            }
            const post = rows[0];
            await sendStoredPost(ctx.api, SUPER_MODERATOR_ID, undefined, post);
            await ctx.reply(
                `📝 Публикация #${post.id} от ${post.author_name} (статус: ${post.status})`,
                {
                    reply_markup: post.status === "pending" ? buildModerationKeyboard(post.id) : undefined
                }
            );
            return;
        } catch (err) {
            console.error("Ошибка при открытии публикации в /start:", err);
            return ctx.reply("❌ Ошибка загрузки публикации.");
        }
    }

    // Если супермодератор нажал /start и есть необработанные посты в очереди — отправляем их
    if (callerId === SUPER_MODERATOR_ID && ctx.chat?.type === "private") {
        try {
            await ensureTables();
            const { rows: pendingPosts } = await sql`
                SELECT * FROM moderation_queue
                WHERE status = 'pending' AND supermod_msg_id IS NULL
                ORDER BY id ASC
                LIMIT 5;
            `;
            if (pendingPosts.length > 0) {
                await ctx.reply(`Привет! Найдено публикаций, ожидающих проверки: ${pendingPosts.length}`);
                for (const post of pendingPosts) {
                    await notifySuperModerator(ctx.api, post);
                }
                return;
            }
        } catch (err) {
            console.error("Ошибка проверки очереди при /start супермодератора:", err);
        }
    }

    ctx.reply("Привет! Бот-модератор с базой Neon работает 🚀");
});

// Команда статуса со всей информацией для модератора/администратора
bot.command("status", async (ctx) => {
    const user = ctx.from;
    const threadId = ctx.message?.message_thread_id;
    const replyUser = ctx.message?.reply_to_message?.from;
    const admin = await isAdmin(ctx);

    let dbStatus = "✅ Подключена";
    let moderatorIds = [];
    try {
        await ensureTables();
        const { rows } = await sql`SELECT id FROM moderators ORDER BY id;`;
        moderatorIds = rows.map(r => String(r.id));
    } catch (error) {
        console.error("Ошибка БД при проверке статуса:", error);
        dbStatus = "❌ Ошибка подключения или таблица не создана (/init_db)";
    }

    const isSuperMod = user ? Number(user.id) === SUPER_MODERATOR_ID : false;
    const isUserMod = user ? (isSuperMod || moderatorIds.includes(String(user.id))) : false;
    const userName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Неизвестно";
    const userHandle = user?.username ? ` (@${user.username})` : "";

    const lines = [
        "📊 Статус бота и модератора",
        "",
        "👤 Ваш профиль:",
        `• Имя: ${userName}${userHandle}`,
        `• Ваш ID: ${user?.id ?? "Неизвестно"}`,
        `• Администратор: ${admin ? "✅ Да" : "❌ Нет"}`,
        `• Супермодератор: ${isSuperMod ? "👑 Да" : "❌ Нет"}`,
        `• Модератор (тема «Олимпиады»): ${isUserMod ? "✅ Да" : "❌ Нет"}`,
    ];

    if (replyUser) {
        const replyName = [replyUser.first_name, replyUser.last_name].filter(Boolean).join(" ") || "Неизвестно";
        const replyHandle = replyUser.username ? ` (@${replyUser.username})` : "";
        const isReplySuperMod = Number(replyUser.id) === SUPER_MODERATOR_ID;
        const isReplyMod = isReplySuperMod || moderatorIds.includes(String(replyUser.id));
        lines.push(
            "",
            "↩️ Пользователь из ответа:",
            `• Имя: ${replyName}${replyHandle}`,
            `• ID: ${replyUser.id}`,
            `• Супермодератор: ${isReplySuperMod ? "👑 Да" : "❌ Нет"}`,
            `• В базе модераторов: ${isReplyMod ? "✅ Да" : "❌ Нет"}`
        );
    }

    lines.push(
        "",
        "💬 Чат и темы:",
        `• ID чата: ${ctx.chat?.id} (${ctx.chat?.type})`,
        `• ID текущей темы: ${threadId ?? "нет (основной чат)"}`,
        `• Тема «Галерея» (только медиа): ID ${GALLERY_THREAD_ID}`,
        `• Тема «Олимпиады» (предмодерация + авто-опросы): ID ${OLYMPIAD_THREAD_ID}`,
        `• ID супермодератора: ${SUPER_MODERATOR_ID}`,
        "",
        "🗄 База данных (Neon):",
        `• Статус: ${dbStatus}`,
        `• Всего модераторов в БД: ${moderatorIds.length}`
    );

    if (admin || isUserMod) {
        const modDetails = await Promise.all(
            moderatorIds.map((id, idx) =>
                getTelegramUserInfo(ctx, id).then(info => {
                    const crown = Number(id) === SUPER_MODERATOR_ID ? " 👑 [Супермодератор]" : "";
                    return `  ${idx + 1}. ${info.formatted}${crown}`;
                })
            )
        );
        lines.push(
            "• Список модераторов:",
            ...(modDetails.length > 0 ? modDetails : ["  пусто"]),
            "",
            "🛠 Команды:",
            "• /status — общая сводка (можно ответом на чужое сообщение, чтобы узнать ID автора)",
            "• /list_pullers — список всех модераторов в БД",
            "• /set_puller <ID> — добавить модератора в БД",
            "• /remove_puller <ID> — удалить модератора из БД",
            "• /init_db — инициализировать таблицы в БД"
        );
    }

    await ctx.reply(lines.join("\n"), {
        ...(threadId ? { message_thread_id: threadId } : {})
    });
});

// Единоразовая команда для создания таблиц в БД
bot.command("init_db", async (ctx) => {
    if (!(await isAdmin(ctx))) {
        return ctx.reply("⛔ У вас нет прав для выполнения этой команды.");
    }
    try {
        dbInitialized = false;
        await ensureTables();
        ctx.reply("✅ Таблицы модераторов и очереди предмодерации успешно созданы/обновлены в Neon!");
    } catch (error) {
        console.error(error);
        ctx.reply("❌ Ошибка создания таблиц.");
    }
});

// Команда назначения модератора
bot.command("set_puller", async (ctx) => {
    if (!(await isAdmin(ctx))) {
        return ctx.reply("⛔ У вас нет прав для выполнения этой команды.");
    }
    const match = ctx.match?.trim();
    const replyId = ctx.message?.reply_to_message?.from?.id;
    const rawId = match || (replyId ? String(replyId) : "");
    if (!rawId) return ctx.reply("Формат: /set_puller <ID> (или ответом на сообщение пользователя)");
    
    const newModId = Number(rawId);
    if (!Number.isInteger(newModId) || newModId <= 0) return ctx.reply("ID должен быть положительным числом.");

    try {
        await ensureTables();
        await sql`INSERT INTO moderators (id) VALUES (${newModId}) ON CONFLICT (id) DO NOTHING;`;
        const info = await getTelegramUserInfo(ctx, newModId);
        ctx.reply(`✅ Пользователь назначен модератором и сохранен в БД:\n${info.formatted}`);
    } catch (error) {
        console.error("Ошибка БД:", error);
        ctx.reply("❌ Ошибка записи в Neon.");
    }
});

// Команда удаления модератора
bot.command("remove_puller", async (ctx) => {
    if (!(await isAdmin(ctx))) {
        return ctx.reply("⛔ У вас нет прав для выполнения этой команды.");
    }
    const match = ctx.match?.trim();
    const replyId = ctx.message?.reply_to_message?.from?.id;
    const rawId = match || (replyId ? String(replyId) : "");
    if (!rawId) return ctx.reply("Формат: /remove_puller <ID> (или ответом на сообщение пользователя)");

    const modId = Number(rawId);
    if (!Number.isInteger(modId) || modId <= 0) return ctx.reply("ID должен быть положительным числом.");

    try {
        await ensureTables();
        const { rowCount } = await sql`DELETE FROM moderators WHERE id = ${modId};`;
        if (rowCount > 0) {
            ctx.reply(`🗑️ Пользователь ${modId} удален из списка модераторов.`);
        } else {
            ctx.reply(`ℹ️ Пользователь ${modId} не найден в списке модераторов.`);
        }
    } catch (error) {
        console.error("Ошибка БД при удалении:", error);
        ctx.reply("❌ Ошибка удаления из Neon.");
    }
});

// Команда просмотра списка модераторов
bot.command("list_pullers", async (ctx) => {
    const admin = await isAdmin(ctx);
    const userId = ctx.from?.id;

    try {
        await ensureTables();
        const { rows } = await sql`SELECT id FROM moderators ORDER BY id;`;
        const ids = rows.map(r => String(r.id));
        const isUserMod = userId ? (Number(userId) === SUPER_MODERATOR_ID || ids.includes(String(userId))) : false;

        if (!admin && !isUserMod) {
            return ctx.reply("⛔ У вас нет прав для выполнения этой команды.");
        }

        const superInfo = await getTelegramUserInfo(ctx, SUPER_MODERATOR_ID);
        const modDetails = await Promise.all(
            ids.map((id, idx) =>
                getTelegramUserInfo(ctx, id).then(info => `${idx + 1}. ${info.formatted}`)
            )
        );

        const textLines = [
            `👑 Супермодератор:\n${superInfo.formatted}`,
            "",
            `📋 Список модераторов в БД (${ids.length}):`,
            ...(modDetails.length > 0 ? modDetails : ["Список пуст."])
        ];
        ctx.reply(textLines.join("\n"));
    } catch (error) {
        console.error("Ошибка БД при получении списка:", error);
        ctx.reply("❌ Ошибка чтения списка модераторов из Neon.");
    }
});

// Кнопка «Опубликовать» (только для супермодератора)
bot.callbackQuery(/^mod_approve:(\d+)$/, async (ctx) => {
    if (Number(ctx.from.id) !== SUPER_MODERATOR_ID) {
        return ctx.answerCallbackQuery({
            text: "⛔ Только супермодератор может опубликовать этот пост.",
            show_alert: true
        });
    }

    const postId = Number(ctx.match[1]);
    try {
        await ensureTables();
        const { rows } = await sql`
            UPDATE moderation_queue
            SET status = 'approved'
            WHERE id = ${postId} AND status IN ('pending', 'awaiting_reason')
            RETURNING *;
        `;

        if (rows.length === 0) {
            return ctx.answerCallbackQuery({
                text: "ℹ️ Эта публикация уже была обработана.",
                show_alert: true
            });
        }

        const post = rows[0];
        await ctx.answerCallbackQuery({ text: "✅ Публикация одобрена и отправляется в тему!" });

        // 1. Публикуем пост в тему «Олимпиады» для всех участников
        const publishedMsgId = await sendStoredPost(ctx.api, Number(post.chat_id), Number(post.thread_id), post);

        // 2. Прикрепляем авто-опрос к опубликованному посту
        if (publishedMsgId) {
            await ctx.api.sendPoll(
                Number(post.chat_id),
                "Ознакомлен(а)?",
                ["Да", "Ознакомлюсь позже"],
                {
                    is_anonymous: false,
                    message_thread_id: Number(post.thread_id),
                    reply_parameters: { message_id: publishedMsgId }
                }
            );
        }

        // 3. Обновляем сообщение управления у супермодератора в ЛС
        await ctx.editMessageText(
            `✅ Публикация #${post.id} от ${post.author_name} опубликована в теме «Олимпиады» с авто-опросом.`
        ).catch(() => {});

        // 4. Уведомляем автора в ЛС (если открыто)
        await ctx.api.sendMessage(
            Number(post.author_id),
            `✅ Ваша публикация в теме «Олимпиады» одобрена супермодератором и опубликована!`
        ).catch(() => {});
    } catch (error) {
        console.error("Ошибка при одобрении публикации:", error);
        await ctx.answerCallbackQuery({
            text: "❌ Произошла ошибка при публикации.",
            show_alert: true
        }).catch(() => {});
    }
});

// Кнопка «Отменить» (только для супермодератора) — запрашивает причину отклонения
bot.callbackQuery(/^mod_reject:(\d+)$/, async (ctx) => {
    if (Number(ctx.from.id) !== SUPER_MODERATOR_ID) {
        return ctx.answerCallbackQuery({
            text: "⛔ Только супермодератор может отклонить этот пост.",
            show_alert: true
        });
    }

    const postId = Number(ctx.match[1]);
    try {
        await ensureTables();
        // Сбрасываем предыдущие незавершенные ожидания ввода причины
        await sql`
            UPDATE moderation_queue
            SET status = 'pending'
            WHERE status = 'awaiting_reason' AND id <> ${postId};
        `;

        const { rows } = await sql`
            UPDATE moderation_queue
            SET status = 'awaiting_reason'
            WHERE id = ${postId} AND status IN ('pending', 'awaiting_reason')
            RETURNING *;
        `;

        if (rows.length === 0) {
            return ctx.answerCallbackQuery({
                text: "ℹ️ Эта публикация уже была обработана.",
                show_alert: true
            });
        }

        const post = rows[0];
        await ctx.answerCallbackQuery({ text: "✍️ Напишите причину отклонения следующим сообщением" });

        const backKb = new InlineKeyboard()
            .text("✅ Всё же опубликовать", `mod_approve:${post.id}`);

        await ctx.editMessageText(
            `❌ Отклонение публикации #${post.id} (автор: ${post.author_name}).\n\n` +
            `✍️ Пожалуйста, отправьте следующим сообщением причину отклонения — она будет отправлена в ЛС автору публикации.`,
            { reply_markup: backKb }
        ).catch(() => {});
    } catch (error) {
        console.error("Ошибка при переводе в режим ввода причины:", error);
        await ctx.answerCallbackQuery({
            text: "❌ Ошибка при обработке действия.",
            show_alert: true
        }).catch(() => {});
    }
});

bot.on("message", async (ctx) => {
    const userId = ctx.from?.id ? Number(ctx.from.id) : null;
    const threadId = ctx.message.message_thread_id;

    // 0. Обработка ввода причины отклонения от супермодератора в ЛС
    if (userId === SUPER_MODERATOR_ID && ctx.chat.type === "private" && (ctx.message.text || ctx.message.caption)) {
        const rawText = (ctx.message.text || ctx.message.caption || "").trim();
        if (rawText && !rawText.startsWith("/")) {
            try {
                await ensureTables();
                const { rows: waitingRows } = await sql`
                    SELECT * FROM moderation_queue
                    WHERE status = 'awaiting_reason'
                    ORDER BY id DESC
                    LIMIT 1;
                `;

                if (waitingRows.length > 0) {
                    const post = waitingRows[0];

                    await sql`
                        UPDATE moderation_queue
                        SET status = 'rejected',
                            reject_reason = ${rawText}
                        WHERE id = ${post.id};
                    `;

                    // Отправляем в ЛС автору его исходную публикацию и причину отклонения (в тему ничего не пишем!)
                    let dmSentToAuthor = false;
                    try {
                        const copyMsgId = await sendStoredPost(ctx.api, Number(post.author_id), undefined, post);
                        await ctx.api.sendMessage(
                            Number(post.author_id),
                            `❌ Ваша публикация в тему «Олимпиады» была отклонена супермодератором.\n\n` +
                            `💬 Причина отклонения:\n${rawText}`,
                            {
                                ...(copyMsgId ? { reply_parameters: { message_id: copyMsgId } } : {})
                            }
                        );
                        dmSentToAuthor = true;
                    } catch {
                        dmSentToAuthor = false;
                    }

                    // Подтверждаем супермодератору в ЛС
                    await ctx.reply(
                        dmSentToAuthor
                            ? `✅ Публикация #${post.id} отклонена. Причина и копия поста отправлены в ЛС автору (${post.author_name}).`
                            : `✅ Публикация #${post.id} отклонена.\n⚠️ Автор (${post.author_name}) ещё не запускал бота в ЛС — он получит причину отказа автоматически, как только откроет бота.`
                    );
                    return;
                }
            } catch (err) {
                console.error("Ошибка сохранения причины отклонения:", err);
            }
        }
    }

    // 1. Модерация Галереи
    if (threadId === GALLERY_THREAD_ID) {
        const hasMedia = ctx.message.photo || 
                         ctx.message.video || 
                         ctx.message.document || 
                         ctx.message.animation || 
                         ctx.message.video_note;

        if (!hasMedia) {
            try {
                await ctx.deleteMessage();
                const warning = await ctx.reply("⚠️ В этой теме разрешены только картинки и видео. Текст удален.", {
                    message_thread_id: GALLERY_THREAD_ID
                });
                await sleep(5000);
                await ctx.api.deleteMessage(ctx.chat.id, warning.message_id).catch(() => {});
            } catch (error) {
                console.error("Ошибка удаления:", error);
            }
        }
    } 
    
    // 2. Предварительная модерация и авто-опросы в теме «Олимпиады»
    else if (threadId === OLYMPIAD_THREAD_ID) {
        if (!userId) return;

        // 2а. Если пишет сам супермодератор (8297487103) — публикуется сразу без удаления с авто-опросом
        if (userId === SUPER_MODERATOR_ID) {
            const hasText = Boolean(ctx.message.text || ctx.message.caption);
            if (!hasText) return;

            try {
                await ensureTables();
                await sql`INSERT INTO moderators (id) VALUES (${SUPER_MODERATOR_ID}) ON CONFLICT (id) DO NOTHING;`;
                const { rows } = await sql`
                    UPDATE moderators
                    SET last_poll_at = NOW()
                    WHERE id = ${SUPER_MODERATOR_ID}
                      AND (last_poll_at IS NULL OR last_poll_at < NOW() - INTERVAL '10 seconds')
                    RETURNING id;
                `;

                if (rows.length > 0) {
                    await ctx.replyWithPoll(
                        "Ознакомлен(а)?",
                        ["Да", "Ознакомлюсь позже"],
                        {
                            is_anonymous: false,
                            message_thread_id: OLYMPIAD_THREAD_ID,
                            reply_parameters: { message_id: ctx.message.message_id }
                        }
                    );
                }
            } catch (error) {
                console.error("Ошибка создания опроса для супермодератора:", error);
            }
            return;
        }

        // 2б. Проверяем, является ли отправитель модератором из БД
        try {
            await ensureTables();
            const { rows: modRows } = await sql`SELECT id FROM moderators WHERE id = ${userId};`;
            if (modRows.length === 0) {
                return;
            }

            const msgData = extractMessageData(ctx.message);
            if (!msgData) return;

            // Сразу удаляем сообщение модератора из темы
            await ctx.deleteMessage().catch((err) => {
                console.error("Не удалось удалить сообщение модератора:", err);
            });

            const authorName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "коллега";
            const authorUsername = ctx.from.username || null;
            const mediaGroupId = ctx.message.media_group_id ? String(ctx.message.media_group_id) : null;
            const entitiesJson = msgData.entities ? JSON.stringify(msgData.entities) : null;
            const mediaItemsJson = JSON.stringify(msgData.mediaItems);

            let queueRow;
            let isFirstInGroup = true;

            if (mediaGroupId) {
                const { rows } = await sql`
                    INSERT INTO moderation_queue (
                        chat_id, thread_id, author_id, author_name, author_username,
                        media_group_id, content_type, text_content, entities, media_items
                    )
                    VALUES (
                        ${ctx.chat.id}, ${OLYMPIAD_THREAD_ID}, ${userId}, ${authorName}, ${authorUsername},
                        ${mediaGroupId}, ${msgData.contentType}, ${msgData.textContent},
                        ${entitiesJson}::jsonb, ${mediaItemsJson}::jsonb
                    )
                    ON CONFLICT (media_group_id) WHERE media_group_id IS NOT NULL
                    DO UPDATE SET
                        text_content = COALESCE(moderation_queue.text_content, EXCLUDED.text_content),
                        entities = COALESCE(moderation_queue.entities, EXCLUDED.entities),
                        media_items = moderation_queue.media_items || EXCLUDED.media_items
                    RETURNING *, (xmax = 0) AS is_first;
                `;
                queueRow = rows[0];
                isFirstInGroup = Boolean(queueRow?.is_first);
            } else {
                const { rows } = await sql`
                    INSERT INTO moderation_queue (
                        chat_id, thread_id, author_id, author_name, author_username,
                        media_group_id, content_type, text_content, entities, media_items
                    )
                    VALUES (
                        ${ctx.chat.id}, ${OLYMPIAD_THREAD_ID}, ${userId}, ${authorName}, ${authorUsername},
                        NULL, ${msgData.contentType}, ${msgData.textContent},
                        ${entitiesJson}::jsonb, ${mediaItemsJson}::jsonb
                    )
                    RETURNING *;
                `;
                queueRow = rows[0];
            }

            // Для альбома уведомление в тему и супермодератору отправляем только один раз
            if (!isFirstInGroup) {
                return;
            }

            const tempText =
                `Уважаемая ${authorName}\n` +
                `В связи с введением предварительной\n` +
                `модерации, все новости о конкурсах и\n` +
                `олимпиадах будут сначала проверяться\n\n` +
                `После предварительной проверки и подтверждения соответствия требованиям ваша публикация будет опубликована\n` +
                `Благодарим за понимание!`;

            const botUsername = await getBotUsername(ctx.api);
            const tempKb = botUsername
                ? new InlineKeyboard().url("🔔 Получать статус проверки в ЛС", `https://t.me/${botUsername}?start=notify`)
                : undefined;

            const startTime = Date.now();
            const tempMsg = await ctx.api.sendMessage(ctx.chat.id, tempText, {
                message_thread_id: OLYMPIAD_THREAD_ID,
                ...(tempKb ? { reply_markup: tempKb } : {})
            });

            // Если это альбом, ждём 1.2 сек, чтобы все вложения альбома успели записаться в БД
            if (mediaGroupId) {
                await sleep(1200);
                const { rows: updatedRows } = await sql`
                    SELECT * FROM moderation_queue WHERE id = ${queueRow.id};
                `;
                if (updatedRows[0]) {
                    queueRow = updatedRows[0];
                }
            }

            // Отправляем пост с кнопками «Опубликовать» / «Отменить» супермодератору в ЛС
            await notifySuperModerator(ctx.api, queueRow);

            // Выдерживаем ровно 10 секунд с момента появления временного уведомления и удаляем его
            const elapsed = Date.now() - startTime;
            const remainingWait = Math.max(0, 10000 - elapsed);
            await sleep(remainingWait);
            await ctx.api.deleteMessage(ctx.chat.id, tempMsg.message_id).catch(() => {});
        } catch (error) {
            console.error("Ошибка при обработке предмодерации в теме Олимпиады:", error);
        }
    }
});

export default webhookCallback(bot, 'http');
