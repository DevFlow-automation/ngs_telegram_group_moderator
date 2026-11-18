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
        lines.push(
            `• Список ID модераторов: ${moderatorIds.length > 0 ? moderatorIds.join(", ") : "пусто"}`,
            "",
            "🛠 Команды:",
            "• /status — общая сводка (можно ответом на чужое сообщение, чтобы узнать ID автора)",
            "• /set_puller <ID> — добавить модератора в БД",
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
        await sql`CREATE TABLE IF NOT EXISTS moderators (id BIGINT PRIMARY KEY);`;
        ctx.reply("✅ Таблица модераторов успешно создана в Neon!");
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
    if (!match) return ctx.reply("Формат: /set_puller <ID>");
    
    const newModId = Number(match);
    if (!Number.isInteger(newModId) || newModId <= 0) return ctx.reply("ID должен быть положительным числом.");

    try {
        // ON CONFLICT DO NOTHING защищает от ошибки, если ID уже есть в базе
        await sql`INSERT INTO moderators (id) VALUES (${newModId}) ON CONFLICT (id) DO NOTHING;`;
        ctx.reply(`✅ Пользователь ${newModId} назначен модератором и сохранен в БД!`);
    } catch (error) {
        console.error("Ошибка БД:", error);
        ctx.reply("❌ Ошибка записи в Neon.");
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
        
        try {
            // Ищем пользователя в базе
            const { rows } = await sql`SELECT id FROM moderators WHERE id = ${userId};`;

            // Если вернулась хотя бы одна строка, отправляем опрос
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
