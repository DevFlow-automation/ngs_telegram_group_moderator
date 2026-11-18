import { Bot, webhookCallback } from 'grammy';
import { sql } from '@vercel/postgres';

const bot = new Bot(process.env.BOT_TOKEN);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    const GALLERY_THREAD_ID = 18;
    const OLYMPIAD_THREAD_ID = 15;
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
