import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { sql } from '@vercel/postgres';

const bot = new Bot(process.env.BOT_TOKEN);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const GALLERY_THREAD_ID = 18;
const OLYMPIAD_THREAD_ID = 15;
const SUPER_MODERATOR_ID = 8297487103;
const GROUP_CLEANUP_MS = 7000;

let dbInitialized = false;
let cachedBotUsername = "";

const MEDIA_TYPES = ["photo", "video", "document", "animation", "audio", "voice", "video_note"];
const MEDIA_SENDERS = {
    photo: (api, chatId, fileId, opts) => api.sendPhoto(chatId, fileId, opts),
    video: (api, chatId, fileId, opts) => api.sendVideo(chatId, fileId, opts),
    document: (api, chatId, fileId, opts) => api.sendDocument(chatId, fileId, opts),
    animation: (api, chatId, fileId, opts) => api.sendAnimation(chatId, fileId, opts),
    audio: (api, chatId, fileId, opts) => api.sendAudio(chatId, fileId, opts),
    voice: (api, chatId, fileId, opts) => api.sendVoice(chatId, fileId, opts),
    video_note: (api, chatId, fileId, opts) => api.sendVideoNote(chatId, fileId, opts)
};

async function getBotUsername(api) {
    if (cachedBotUsername) return cachedBotUsername;
    try {
        cachedBotUsername = (await api.getMe()).username || "";
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
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    `;
    dbInitialized = true;
}

// Отправка ответа: в ЛС остается, а в группе удаляет саму команду и стирает ответ через 7 секунд
async function replyClean(ctx, text, delayMs = GROUP_CLEANUP_MS, extra = {}) {
    const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
    const threadId = ctx.message?.message_thread_id;
    const opts = { ...(threadId ? { message_thread_id: threadId } : {}), ...extra };

    if (isGroup && ctx.message) {
        await ctx.deleteMessage().catch(() => {});
    }

    const sent = await ctx.reply(text, opts);
    if (isGroup) {
        await sleep(delayMs);
        await ctx.api.deleteMessage(ctx.chat.id, sent.message_id).catch(() => {});
    }
    return sent;
}

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
        } catch {
            return false;
        }
    }
    return !process.env.ADMIN_ID;
}

async function getTelegramUserInfo(ctx, userId) {
    const numericId = Number(userId);
    let tgUser = null;

    if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
        try {
            tgUser = (await ctx.getChatMember(numericId))?.user;
        } catch {
            // fallback
        }
    }
    if (!tgUser) {
        try {
            tgUser = await ctx.api.getChat(numericId);
        } catch {
            // fallback
        }
    }
    if (!tgUser) {
        return { id: String(userId), formatted: `${userId} (имя не найдено)` };
    }

    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || "Без имени";
    const username = tgUser.username ? `@${tgUser.username}` : "без @username";
    return { id: String(userId), formatted: `${userId} — ${fullName} (${username})` };
}

function extractMessageData(msg) {
    const textContent = msg.text ?? msg.caption ?? null;
    const entities = msg.entities ?? msg.caption_entities ?? null;

    for (const type of MEDIA_TYPES) {
        if (!msg[type]) continue;
        const fileId = type === "photo" ? msg.photo[msg.photo.length - 1]?.file_id : msg[type].file_id;
        if (fileId) {
            return {
                contentType: type,
                textContent,
                entities,
                mediaItems: [{ type, file_id: fileId }]
            };
        }
    }

    return textContent ? { contentType: "text", textContent, entities, mediaItems: [] } : null;
}

async function sendStoredPost(api, targetChatId, targetThreadId, post) {
    const threadOpts = targetThreadId ? { message_thread_id: Number(targetThreadId) } : {};
    const seen = new Set();
    const mediaItems = (Array.isArray(post.media_items) ? post.media_items : []).filter(item => {
        if (!item?.file_id || seen.has(item.file_id)) return false;
        seen.add(item.file_id);
        return true;
    });

    const text = post.text_content || undefined;
    const entities = Array.isArray(post.entities) && post.entities.length > 0 ? post.entities : undefined;
    const canCaption = Boolean(text && text.length <= 1024);

    if (mediaItems.length > 1) {
        const groupable = new Set(["photo", "video", "document", "audio"]);
        const groupItems = mediaItems.filter(i => groupable.has(i.type)).slice(0, 10);
        if (groupItems.length > 1) {
            const mediaGroup = groupItems.map((item, idx) => ({
                type: item.type,
                media: item.file_id,
                ...(idx === 0 && canCaption ? { caption: text, ...(entities ? { caption_entities: entities } : {}) } : {})
            }));
            const sentMessages = await api.sendMediaGroup(targetChatId, mediaGroup, threadOpts);
            const firstMsgId = sentMessages[0]?.message_id;

            if (text && !canCaption) {
                const textMsg = await api.sendMessage(targetChatId, text, {
                    ...threadOpts,
                    ...(entities ? { entities } : {}),
                    ...(firstMsgId ? { reply_parameters: { message_id: firstMsgId } } : {})
                });
                return textMsg.message_id;
            }
            return firstMsgId;
        }
    }

    if (mediaItems.length >= 1) {
        const item = mediaItems[0];
        const sender = MEDIA_SENDERS[item.type];
        if (sender) {
            const isVideoNote = item.type === "video_note";
            const opts = {
                ...threadOpts,
                ...(!isVideoNote && canCaption ? { caption: text } : {}),
                ...(!isVideoNote && canCaption && entities ? { caption_entities: entities } : {})
            };
            const sentMedia = await sender(api, targetChatId, item.file_id, opts);
            if (text && (!canCaption || isVideoNote)) {
                const textMsg = await api.sendMessage(targetChatId, text, {
                    ...threadOpts,
                    ...(entities ? { entities } : {}),
                    reply_parameters: { message_id: sentMedia.message_id }
                });
                return textMsg.message_id;
            }
            return sentMedia.message_id;
        }
    }

    const sent = await api.sendMessage(targetChatId, text || "(без текста)", {
        ...threadOpts,
        ...(entities ? { entities } : {})
    });
    return sent.message_id;
}

function buildModerationKeyboard(postId) {
    return new InlineKeyboard()
        .text("✅ Опубликовать", `mod_approve:${postId}`)
        .text("❌ Отменить", `mod_reject:${postId}`);
}

function formatModHeader(post) {
    const tag = post.author_username ? ` (@${post.author_username})` : "";
    return `📝 Пост #${post.id} на проверку от: ${post.author_name}${tag}`;
}

async function notifySuperModerator(api, post) {
    try {
        const previewMsgId = await sendStoredPost(api, SUPER_MODERATOR_ID, undefined, post);
        const controlMsg = await api.sendMessage(SUPER_MODERATOR_ID, formatModHeader(post), {
            reply_parameters: previewMsgId ? { message_id: previewMsgId } : undefined,
            reply_markup: buildModerationKeyboard(post.id)
        });
        await sql`
            UPDATE moderation_queue
            SET supermod_chat_id = ${SUPER_MODERATOR_ID},
                supermod_msg_id = ${controlMsg.message_id}
            WHERE id = ${post.id};
        `;
    } catch (err) {
        console.error("ЛС супермодератора пока не активировано (/start):", err?.message);
    }
}

bot.command("start", async (ctx) => {
    const payload = ctx.match?.trim() || "";
    const callerId = Number(ctx.from?.id);

    if (callerId === SUPER_MODERATOR_ID && ctx.chat?.type === "private") {
        try {
            await ensureTables();
            const { rows: pendingPosts } = await sql`
                SELECT * FROM moderation_queue
                WHERE status = 'pending' AND supermod_msg_id IS NULL
                ORDER BY id ASC
                LIMIT 10;
            `;
            if (pendingPosts.length > 0) {
                await ctx.reply(`👑 Ожидают проверки (${pendingPosts.length} шт.):`);
                for (const post of pendingPosts) {
                    await notifySuperModerator(ctx.api, post);
                }
                return;
            }
        } catch (err) {
            console.error("Ошибка проверки очереди при /start:", err);
        }
    }

    if (payload === "notify" && ctx.chat?.type === "private") {
        try {
            await ensureTables();
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
                    `❌ Публикация #${post.id} отклонена.\n💬 Причина: ${post.reject_reason || "Не указана"}`
                );
            }
        } catch (err) {
            console.error("Ошибка при проверке уведомлений:", err);
        }
        return ctx.reply("🔔 Уведомления подключены! Результаты проверки будут приходить сюда.");
    }

    await replyClean(ctx, "Привет! Бот-модератор работает 🚀");
});

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
    } catch {
        dbStatus = "❌ Ошибка подключения (/init_db)";
    }

    const isSuperMod = user ? Number(user.id) === SUPER_MODERATOR_ID : false;
    const isUserMod = user ? (isSuperMod || moderatorIds.includes(String(user.id))) : false;
    const userName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Неизвестно";
    const userHandle = user?.username ? ` (@${user.username})` : "";

    const lines = [
        "📊 Статус бота",
        "",
        `👤 ${userName}${userHandle} [ID: ${user?.id ?? "?"}]`,
        `• Админ: ${admin ? "✅" : "❌"} | Супермод: ${isSuperMod ? "👑" : "❌"} | Модератор: ${isUserMod ? "✅" : "❌"}`
    ];

    if (replyUser) {
        const rName = [replyUser.first_name, replyUser.last_name].filter(Boolean).join(" ") || "Неизвестно";
        const isRMod = Number(replyUser.id) === SUPER_MODERATOR_ID || moderatorIds.includes(String(replyUser.id));
        lines.push(`↩️ В ответе: ${rName} [ID: ${replyUser.id}] — Модератор: ${isRMod ? "✅" : "❌"}`);
    }

    lines.push(
        "",
        `💬 Чат: ${ctx.chat?.id} | Тема: ${threadId ?? "основная"}`,
        `• Галерея: ${GALLERY_THREAD_ID} | Олимпиады: ${OLYMPIAD_THREAD_ID}`,
        `🗄 БД: ${dbStatus} (модераторов: ${moderatorIds.length})`
    );

    if (admin || isUserMod) {
        lines.push(
            "",
            "🛠 Команды: /status, /list_pullers, /set_puller <ID>, /remove_puller <ID>, /init_db"
        );
    }

    await replyClean(ctx, lines.join("\n"));
});

bot.command("init_db", async (ctx) => {
    if (!(await isAdmin(ctx))) return replyClean(ctx, "⛔ Нет прав.");
    try {
        dbInitialized = false;
        await ensureTables();
        await replyClean(ctx, "✅ Таблицы БД готовы!");
    } catch {
        await replyClean(ctx, "❌ Ошибка создания таблиц.");
    }
});

bot.command("set_puller", async (ctx) => {
    if (!(await isAdmin(ctx))) return replyClean(ctx, "⛔ Нет прав.");
    const rawId = ctx.match?.trim() || (ctx.message?.reply_to_message?.from?.id ? String(ctx.message.reply_to_message.from.id) : "");
    const newModId = Number(rawId);
    if (!rawId || !Number.isInteger(newModId) || newModId <= 0) {
        return replyClean(ctx, "Формат: /set_puller <ID> (или ответом на сообщение)");
    }

    try {
        await ensureTables();
        await sql`INSERT INTO moderators (id) VALUES (${newModId}) ON CONFLICT (id) DO NOTHING;`;
        const info = await getTelegramUserInfo(ctx, newModId);
        await replyClean(ctx, `✅ Назначен модератором:\n${info.formatted}`);
    } catch {
        await replyClean(ctx, "❌ Ошибка записи в БД.");
    }
});

bot.command("remove_puller", async (ctx) => {
    if (!(await isAdmin(ctx))) return replyClean(ctx, "⛔ Нет прав.");
    const rawId = ctx.match?.trim() || (ctx.message?.reply_to_message?.from?.id ? String(ctx.message.reply_to_message.from.id) : "");
    const modId = Number(rawId);
    if (!rawId || !Number.isInteger(modId) || modId <= 0) {
        return replyClean(ctx, "Формат: /remove_puller <ID> (или ответом на сообщение)");
    }

    try {
        await ensureTables();
        const { rowCount } = await sql`DELETE FROM moderators WHERE id = ${modId};`;
        await replyClean(ctx, rowCount > 0 ? `🗑️ Модератор ${modId} удален.` : `ℹ️ ID ${modId} не найден.`);
    } catch {
        await replyClean(ctx, "❌ Ошибка удаления из БД.");
    }
});

bot.command("list_pullers", async (ctx) => {
    const admin = await isAdmin(ctx);
    const userId = ctx.from?.id;

    try {
        await ensureTables();
        const { rows } = await sql`SELECT id FROM moderators ORDER BY id;`;
        const ids = rows.map(r => String(r.id));
        const isUserMod = userId ? (Number(userId) === SUPER_MODERATOR_ID || ids.includes(String(userId))) : false;

        if (!admin && !isUserMod) return replyClean(ctx, "⛔ Нет прав.");

        const [superInfo, ...modDetails] = await Promise.all([
            getTelegramUserInfo(ctx, SUPER_MODERATOR_ID),
            ...ids.map((id, idx) => getTelegramUserInfo(ctx, id).then(info => `${idx + 1}. ${info.formatted}`))
        ]);

        const textLines = [
            `👑 Супермодератор: ${superInfo.formatted}`,
            "",
            `📋 Модераторы (${ids.length}):`,
            ...(modDetails.length > 0 ? modDetails : ["Список пуст."])
        ];
        await replyClean(ctx, textLines.join("\n"));
    } catch {
        await replyClean(ctx, "❌ Ошибка чтения списка из БД.");
    }
});

// Одобрение публикации
bot.callbackQuery(/^mod_approve:(\d+)$/, async (ctx) => {
    if (Number(ctx.from.id) !== SUPER_MODERATOR_ID) {
        return ctx.answerCallbackQuery({ text: "⛔ Доступно только супермодератору.", show_alert: true });
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
            return ctx.answerCallbackQuery({ text: "ℹ️ Уже обработано.", show_alert: true });
        }

        const post = rows[0];
        await ctx.answerCallbackQuery({ text: "✅ Опубликовано!" });

        const publishedMsgId = await sendStoredPost(ctx.api, Number(post.chat_id), Number(post.thread_id), post);
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

        await ctx.editMessageText(`✅ Пост #${post.id} (${post.author_name}) опубликован.`).catch(() => {});
        await ctx.api.sendMessage(
            Number(post.author_id),
            `✅ Ваша публикация в теме «Олимпиады» одобрена и опубликована!`
        ).catch(() => {});
    } catch (error) {
        console.error("Ошибка при публикации:", error);
        await ctx.answerCallbackQuery({ text: "❌ Ошибка при публикации.", show_alert: true }).catch(() => {});
    }
});

// Переход к вводу причины отклонения
bot.callbackQuery(/^mod_reject:(\d+)$/, async (ctx) => {
    if (Number(ctx.from.id) !== SUPER_MODERATOR_ID) {
        return ctx.answerCallbackQuery({ text: "⛔ Доступно только супермодератору.", show_alert: true });
    }

    const postId = Number(ctx.match[1]);
    try {
        await ensureTables();
        await sql`UPDATE moderation_queue SET status = 'pending' WHERE status = 'awaiting_reason' AND id <> ${postId};`;
        const { rows } = await sql`
            UPDATE moderation_queue
            SET status = 'awaiting_reason'
            WHERE id = ${postId} AND status IN ('pending', 'awaiting_reason')
            RETURNING *;
        `;
        if (rows.length === 0) {
            return ctx.answerCallbackQuery({ text: "ℹ️ Уже обработано.", show_alert: true });
        }

        const post = rows[0];
        await ctx.answerCallbackQuery({ text: "✍️ Напишите причину отклонения" });
        await ctx.editMessageText(
            `✍️ Напишите причину отклонения для ${post.author_name} (пост #${post.id}):`,
            { reply_markup: new InlineKeyboard().text("↩️ Назад", `mod_back:${post.id}`) }
        ).catch(() => {});
    } catch {
        await ctx.answerCallbackQuery({ text: "❌ Ошибка.", show_alert: true }).catch(() => {});
    }
});

// Возврат из режима ввода причины обратно к кнопкам «Опубликовать / Отменить»
bot.callbackQuery(/^mod_back:(\d+)$/, async (ctx) => {
    if (Number(ctx.from.id) !== SUPER_MODERATOR_ID) {
        return ctx.answerCallbackQuery({ text: "⛔ Доступно только супермодератору.", show_alert: true });
    }

    const postId = Number(ctx.match[1]);
    try {
        await ensureTables();
        const { rows } = await sql`
            UPDATE moderation_queue
            SET status = 'pending'
            WHERE id = ${postId} AND status = 'awaiting_reason'
            RETURNING *;
        `;
        if (rows.length === 0) {
            return ctx.answerCallbackQuery({ text: "ℹ️ Уже обработано.", show_alert: true });
        }

        const post = rows[0];
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(formatModHeader(post), {
            reply_markup: buildModerationKeyboard(post.id)
        }).catch(() => {});
    } catch {
        await ctx.answerCallbackQuery({ text: "❌ Ошибка.", show_alert: true }).catch(() => {});
    }
});

bot.on("message", async (ctx) => {
    const userId = ctx.from?.id ? Number(ctx.from.id) : null;
    const threadId = ctx.message.message_thread_id;

    // 0. Ввод причины отклонения от супермодератора в ЛС
    if (userId === SUPER_MODERATOR_ID && ctx.chat.type === "private" && (ctx.message.text || ctx.message.caption)) {
        const rawText = (ctx.message.text || ctx.message.caption || "").trim();
        if (rawText && !rawText.startsWith("/")) {
            try {
                await ensureTables();
                const { rows } = await sql`
                    SELECT * FROM moderation_queue
                    WHERE status = 'awaiting_reason'
                    ORDER BY id DESC
                    LIMIT 1;
                `;
                if (rows.length > 0) {
                    const post = rows[0];
                    await sql`
                        UPDATE moderation_queue
                        SET status = 'rejected', reject_reason = ${rawText}
                        WHERE id = ${post.id};
                    `;

                    if (post.supermod_msg_id) {
                        await ctx.api.editMessageText(
                            SUPER_MODERATOR_ID,
                            Number(post.supermod_msg_id),
                            `❌ Пост #${post.id} (${post.author_name}) отклонён.`
                        ).catch(() => {});
                    }

                    let dmSent = false;
                    try {
                        const copyMsgId = await sendStoredPost(ctx.api, Number(post.author_id), undefined, post);
                        await ctx.api.sendMessage(
                            Number(post.author_id),
                            `❌ Ваша публикация в тему «Олимпиады» отклонена.\n\n💬 Причина:\n${rawText}`,
                            copyMsgId ? { reply_parameters: { message_id: copyMsgId } } : {}
                        );
                        dmSent = true;
                    } catch {
                        dmSent = false;
                    }

                    await ctx.reply(
                        dmSent
                            ? `✅ Причина отправлена в ЛС автору (${post.author_name}).`
                            : `✅ Отклонено. Автор (${post.author_name}) получит причину, как только откроет бота.`
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
        const hasMedia = ctx.message.photo || ctx.message.video || ctx.message.document || ctx.message.animation || ctx.message.video_note;
        if (!hasMedia) {
            await replyClean(ctx, "⚠️ В этой теме разрешены только картинки и видео. Текст удален.", 5000);
        }
        return;
    }

    // 2. Тема «Олимпиады»: предмодерация и авто-опросы
    if (threadId === OLYMPIAD_THREAD_ID && userId) {
        // 2а. Супермодератор публикует сразу с авто-опросом
        if (userId === SUPER_MODERATOR_ID) {
            if (!(ctx.message.text || ctx.message.caption)) return;
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
                    await ctx.replyWithPoll("Ознакомлен(а)?", ["Да", "Ознакомлюсь позже"], {
                        is_anonymous: false,
                        message_thread_id: OLYMPIAD_THREAD_ID,
                        reply_parameters: { message_id: ctx.message.message_id }
                    });
                }
            } catch (error) {
                console.error("Ошибка создания опроса:", error);
            }
            return;
        }

        // 2б. Остальные модераторы из БД проходят предмодерацию
        try {
            await ensureTables();
            const { rows: modRows } = await sql`SELECT id FROM moderators WHERE id = ${userId};`;
            if (modRows.length === 0) return;

            const msgData = extractMessageData(ctx.message);
            if (!msgData) return;

            await ctx.deleteMessage().catch(() => {});

            const authorName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || "коллега";
            const authorUsername = ctx.from.username || null;
            const mediaGroupId = ctx.message.media_group_id ? String(ctx.message.media_group_id) : null;
            const entitiesJson = msgData.entities ? JSON.stringify(msgData.entities) : null;
            const mediaItemsJson = JSON.stringify(msgData.mediaItems);

            // Атомарная 15-секундная группировка пакета (10 фото + длинный текст) от одного автора
            const { rows: lockRows } = await sql`
                UPDATE moderators
                SET last_poll_at = NOW()
                WHERE id = ${userId}
                  AND (last_poll_at IS NULL OR last_poll_at < NOW() - INTERVAL '15 seconds')
                RETURNING id;
            `;

            if (lockRows.length === 0) {
                await sql`
                    UPDATE moderation_queue
                    SET text_content = COALESCE(moderation_queue.text_content, ${msgData.textContent}),
                        entities = COALESCE(moderation_queue.entities, ${entitiesJson}::jsonb),
                        media_items = moderation_queue.media_items || ${mediaItemsJson}::jsonb
                    WHERE id = (
                        SELECT id FROM moderation_queue
                        WHERE author_id = ${userId}
                          AND status = 'pending'
                          AND created_at > NOW() - INTERVAL '20 seconds'
                        ORDER BY id DESC
                        LIMIT 1
                    );
                `;
                return;
            }

            // Фоновая очистка обработанных записей старше 7 дней
            await sql`
                DELETE FROM moderation_queue
                WHERE status IN ('approved', 'rejected')
                  AND created_at < NOW() - INTERVAL '7 days';
            `.catch(() => {});

            const { rows: insertedRows } = await sql`
                INSERT INTO moderation_queue (
                    chat_id, thread_id, author_id, author_name, author_username,
                    media_group_id, content_type, text_content, entities, media_items
                )
                VALUES (
                    ${ctx.chat.id}, ${OLYMPIAD_THREAD_ID}, ${userId}, ${authorName}, ${authorUsername},
                    ${mediaGroupId}, ${msgData.contentType}, ${msgData.textContent},
                    ${entitiesJson}::jsonb, ${mediaItemsJson}::jsonb
                )
                RETURNING *;
            `;
            let queueRow = insertedRows[0];

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

            await sleep(1500);
            const { rows: updatedRows } = await sql`SELECT * FROM moderation_queue WHERE id = ${queueRow.id};`;
            if (updatedRows[0]) queueRow = updatedRows[0];

            await notifySuperModerator(ctx.api, queueRow);

            const remainingWait = Math.max(0, 8500 - (Date.now() - startTime));
            await sleep(remainingWait);
            await ctx.api.deleteMessage(ctx.chat.id, tempMsg.message_id).catch(() => {});
        } catch (error) {
            console.error("Ошибка предмодерации в теме Олимпиады:", error);
        }
    }
});

export default webhookCallback(bot, 'http', {
    timeoutMilliseconds: 25_000,
    onTimeout: 'return'
});
