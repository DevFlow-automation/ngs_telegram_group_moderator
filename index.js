import { Bot, webhookCallback } from 'grammy';
import { sql } from '@vercel/postgres';

const bot = new Bot(process.env.BOT_TOKEN);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const GALLERY_THREAD_ID = 18;
const OLYMPIAD_THREAD_ID = 15;

// Проверка прав администратора для команд управления
async function isAdmin(ctx) {
    if (!ctx.from) return false;
    if (process.env.ADMIN_ID && String(ctx.from.id) === String(process.env.ADMIN_ID)) {
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

bot.command("start", (ctx) => {
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
        const { rows } = await sql`SELECT id FROM moderators ORDER BY id;`;
        moderatorIds = rows.map(r => String(r.id));
    } catch (error) {
        console.error("Ошибка БД при проверке статуса:", error);
        dbStatus = "❌ Ошибка подключения или таблица не создана (/init_db)";
    }

    const isUserMod = user ? moderatorIds.includes(String(user.id)) : false;
    const userName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Неизвестно";
    const userHandle = user?.username ? ` (@${user.username})` : "";

    const lines = [
        "📊 Статус бота и модератора",
        "",
        "👤 Ваш профиль:",
        `• Имя: ${userName}${userHandle}`,
        `• Ваш ID: ${user?.id ?? "Неизвестно"}`,
        `• Администратор: ${admin ? "✅ Да" : "❌ Нет"}`,
        `• Модератор (авто-опросы): ${isUserMod ? "✅ Да" : "❌ Нет"}`,
    ];

    if (replyUser) {
        const replyName = [replyUser.first_name, replyUser.last_name].filter(Boolean).join(" ") || "Неизвестно";
        const replyHandle = replyUser.username ? ` (@${replyUser.username})` : "";
        const isReplyMod = moderatorIds.includes(String(replyUser.id));
        lines.push(
            "",
            "↩️ Пользователь из ответа:",
            `• Имя: ${replyName}${replyHandle}`,
            `• ID: ${replyUser.id}`,
            `• В базе модераторов: ${isReplyMod ? "✅ Да" : "❌ Нет"}`
        );
    }

    lines.push(
        "",
        "💬 Чат и темы:",
        `• ID чата: ${ctx.chat?.id} (${ctx.chat?.type})`,
        `• ID текущей темы: ${threadId ?? "нет (основной чат)"}`,
        `• Тема «Галерея» (только медиа): ID ${GALLERY_THREAD_ID}`,
        `• Тема «Олимпиады» (авто-опросы): ID ${OLYMPIAD_THREAD_ID}`,
        "",
        "🗄 База данных (Neon):",
        `• Статус: ${dbStatus}`,
        `• Всего модераторов в БД: ${moderatorIds.length}`
    );

    if (admin || isUserMod) {
        const modDetails = await Promise.all(
            moderatorIds.map((id, idx) =>
                getTelegramUserInfo(ctx, id).then(info => `  ${idx + 1}. ${info.formatted}`)
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
            "• /init_db — инициализировать таблицу в БД"
        );
    }

    await ctx.reply(lines.join("\n"), {
        ...(threadId ? { message_thread_id: threadId } : {})
    });
});

// Единоразовая команда для создания таблицы в БД
bot.command("init_db", async (ctx) => {
    if (!(await isAdmin(ctx))) {
        return ctx.reply("⛔ У вас нет прав для выполнения этой команды.");
    }
    try {
        await sql`CREATE TABLE IF NOT EXISTS moderators (id BIGINT PRIMARY KEY, last_poll_at TIMESTAMPTZ);`;
        await sql`ALTER TABLE moderators ADD COLUMN IF NOT EXISTS last_poll_at TIMESTAMPTZ;`;
        ctx.reply("✅ Таблица модераторов успешно создана/обновлена в Neon!");
    } catch (error) {
        console.error(error);
        ctx.reply("❌ Ошибка создания таблицы.");
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
        // ON CONFLICT DO NOTHING защищает от ошибки, если ID уже есть в базе
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
        const { rows } = await sql`SELECT id FROM moderators ORDER BY id;`;
        const ids = rows.map(r => String(r.id));
        const isUserMod = userId ? ids.includes(String(userId)) : false;

        if (!admin && !isUserMod) {
            return ctx.reply("⛔ У вас нет прав для выполнения этой команды.");
        }

        if (ids.length === 0) {
            return ctx.reply("📋 Список модераторов пуст.");
        }

        const modDetails = await Promise.all(
            ids.map((id, idx) =>
                getTelegramUserInfo(ctx, id).then(info => `${idx + 1}. ${info.formatted}`)
            )
        );
        ctx.reply(`📋 Список модераторов (${ids.length}):\n${modDetails.join("\n")}`);
    } catch (error) {
        console.error("Ошибка БД при получении списка:", error);
        ctx.reply("❌ Ошибка чтения списка модераторов из Neon.");
    }
});

bot.on("message", async (ctx) => {
    const threadId = ctx.message.message_thread_id;

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
    
    // 2. Авто-опросы в Олимпиадах
    else if (threadId === OLYMPIAD_THREAD_ID) {
        const userId = ctx.from?.id;
        if (!userId) return;

        // Игнорируем вложения без текста/подписи (например, 9–10 отдельных картинок внутри альбома)
        const hasText = Boolean(ctx.message.text || ctx.message.caption);
        if (!hasText) return;
        
        try {
            // Атомарная проверка модератора и защита от дублей при пересылке альбома + текста (не чаще 1 опроса в 10 секунд)
            let rows;
            try {
                ({ rows } = await sql`
                    UPDATE moderators
                    SET last_poll_at = NOW()
                    WHERE id = ${userId}
                      AND (last_poll_at IS NULL OR last_poll_at < NOW() - INTERVAL '10 seconds')
                    RETURNING id;
                `);
            } catch (dbErr) {
                // Автоматическое добавление колонки, если таблица была создана ранее
                if (dbErr?.code === "42703") {
                    await sql`ALTER TABLE moderators ADD COLUMN IF NOT EXISTS last_poll_at TIMESTAMPTZ;`;
                    ({ rows } = await sql`
                        UPDATE moderators
                        SET last_poll_at = NOW()
                        WHERE id = ${userId}
                          AND (last_poll_at IS NULL OR last_poll_at < NOW() - INTERVAL '10 seconds')
                        RETURNING id;
                    `);
                } else {
                    throw dbErr;
                }
            }

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
            console.error("Ошибка при проверке в Neon:", error);
        }
    }
});

export default webhookCallback(bot, 'http');
