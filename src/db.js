import { sql } from '@vercel/postgres';

let dbInitialized = false;

export function parseGradeNumber(className) {
    const match = String(className || '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 99;
}

export function extractOlympiadTitle(text, fallbackId = '') {
    const clean = String(text || '').replace(/\r/g, '').trim();
    if (!clean) return fallbackId ? `Олимпиада #${fallbackId}` : 'Новая олимпиада';

    const lines = clean
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    const firstLine = lines[0] || clean;
    if (firstLine.length <= 110) return firstLine;
    return `${firstLine.slice(0, 107).trimEnd()}...`;
}

export async function ensureTables(force = false) {
    if (dbInitialized && !force) return;

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

    await sql`
        CREATE TABLE IF NOT EXISTS olympiads (
            id SERIAL PRIMARY KEY,
            queue_id INT UNIQUE,
            chat_id BIGINT,
            thread_id INT NOT NULL DEFAULT 15,
            tg_message_id BIGINT,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            author_id BIGINT,
            author_name TEXT NOT NULL DEFAULT 'Модератор',
            author_username TEXT,
            media_count INT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS classes (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            grade INT NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS students (
            id SERIAL PRIMARY KEY,
            class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
            full_name TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (class_id, full_name)
        );
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS teachers (
            id SERIAL PRIMARY KEY,
            full_name TEXT NOT NULL UNIQUE,
            subject TEXT NOT NULL DEFAULT '',
            telegram_id BIGINT UNIQUE,
            telegram_username TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS registrations (
            id SERIAL PRIMARY KEY,
            student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            olympiad_id INT NOT NULL REFERENCES olympiads(id) ON DELETE CASCADE,
            teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
            registered_by_name TEXT NOT NULL,
            registered_by_tg_id BIGINT,
            registered_by_tg_username TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (student_id, olympiad_id)
        );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reg_student_id ON registrations(student_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reg_olympiad_id ON registrations(olympiad_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_olympiads_published ON olympiads(published_at DESC);`;

    dbInitialized = true;
}

export async function createOlympiadFromPost({
    queueId = null,
    chatId = null,
    threadId = 15,
    tgMessageId = null,
    textContent = '',
    authorId = null,
    authorName = 'Модератор',
    authorUsername = null,
    mediaCount = 0
}) {
    await ensureTables();
    const title = extractOlympiadTitle(textContent, queueId || tgMessageId || '');
    const description = String(textContent || '').trim();

    if (queueId) {
        const { rows } = await sql`
            INSERT INTO olympiads (
                queue_id, chat_id, thread_id, tg_message_id, title, description,
                author_id, author_name, author_username, media_count
            )
            VALUES (
                ${queueId}, ${chatId}, ${threadId}, ${tgMessageId}, ${title}, ${description},
                ${authorId}, ${authorName}, ${authorUsername}, ${mediaCount}
            )
            ON CONFLICT (queue_id) DO UPDATE
            SET tg_message_id = COALESCE(EXCLUDED.tg_message_id, olympiads.tg_message_id),
                title = EXCLUDED.title,
                description = EXCLUDED.description
            RETURNING *;
        `;
        return rows[0];
    }

    const { rows } = await sql`
        INSERT INTO olympiads (
            chat_id, thread_id, tg_message_id, title, description,
            author_id, author_name, author_username, media_count
        )
        VALUES (
            ${chatId}, ${threadId}, ${tgMessageId}, ${title}, ${description},
            ${authorId}, ${authorName}, ${authorUsername}, ${mediaCount}
        )
        RETURNING *;
    `;
    return rows[0];
}

export async function upsertClassByName(rawName) {
    const name = String(rawName || '').trim().replace(/\s+/g, ' ');
    if (!name) return null;
    const grade = parseGradeNumber(name);
    const { rows } = await sql`
        INSERT INTO classes (name, grade)
        VALUES (${name}, ${grade})
        ON CONFLICT (name) DO UPDATE SET grade = EXCLUDED.grade
        RETURNING *;
    `;
    return rows[0];
}

export async function seedDemoData() {
    await ensureTables();

    const demoClasses = [
        {
            name: '7А',
            students: ['Алихан Серикбаев', 'Амина Нурланова', 'Даниал Касымов', 'София Ким', 'Тимур Абдрахманов']
        },
        {
            name: '8Б',
            students: ['Айзере Тулегенова', 'Артем Ли', 'Ерасыл Бекмуратов', 'Мадина Сатыбалды', 'Нурислам Омаров']
        },
        {
            name: '9А',
            students: ['Адия Мухамеджанова', 'Богдан Смирнов', 'Диас Жумабаев', 'Камила Ахметова', 'Санжар Искаков']
        },
        {
            name: '10А',
            students: ['Аружан Байжанова', 'Илья Волков', 'Мансур Кенжебаев', 'Томирис Есенова', 'Ярослав Цой']
        },
        {
            name: '11А',
            students: ['Айдана Сулейменова', 'Алдияр Тасмагамбетов', 'Дарья Морозова', 'Нурдаулет Рахимов', 'Элина Пак']
        }
    ];

    const demoTeachers = [
        { full_name: 'Абдуллина Гульнара Сериковна', subject: 'Математика' },
        { full_name: 'Ким Александр Викторович', subject: 'Информатика' },
        { full_name: 'Нурпеисова Айгуль Маратовна', subject: 'Физика' },
        { full_name: 'Смирнова Елена Олеговна', subject: 'Английский язык' },
        { full_name: 'Жаксылыков Бауыржан Ерланович', subject: 'Химия и биология' }
    ];

    const demoOlympiads = [
        {
            title: 'Республиканская олимпиада по математике (школьный этап)',
            description: 'Приглашаем учеников 7–11 классов принять участие в отборочном туре Республиканской олимпиады по математике. Регистрация открыта до пятницы.',
            author_name: 'Учебная часть NGS'
        },
        {
            title: 'Международный конкурс по информатике «Bebras / Бобёр»',
            description: 'Онлайн-турнир по алгоритмическому мышлению и программированию для всех классов. Необходимо заранее внести участников в общий реестр.',
            author_name: 'Кафедра IT'
        },
        {
            title: 'Городской турнир юных физиков и естествоиспытателей',
            description: 'Командный и индивидуальный зачёт по физике, химии и STEM-проектам. Просьба классным руководителям и предметникам отметить участников.',
            author_name: 'Методический центр'
        }
    ];

    let classesAdded = 0;
    let studentsAdded = 0;
    let teachersAdded = 0;
    let olympiadsAdded = 0;

    for (const cls of demoClasses) {
        const classRow = await upsertClassByName(cls.name);
        if (classRow) classesAdded++;
        for (const studentName of cls.students) {
            const { rowCount } = await sql`
                INSERT INTO students (class_id, full_name)
                VALUES (${classRow.id}, ${studentName})
                ON CONFLICT (class_id, full_name) DO NOTHING;
            `;
            studentsAdded += rowCount;
        }
    }

    for (const t of demoTeachers) {
        const { rowCount } = await sql`
            INSERT INTO teachers (full_name, subject)
            VALUES (${t.full_name}, ${t.subject})
            ON CONFLICT (full_name) DO NOTHING;
        `;
        teachersAdded += rowCount;
    }

    const { rows: existingOlympiads } = await sql`SELECT COUNT(*)::int AS cnt FROM olympiads;`;
    if ((existingOlympiads[0]?.cnt || 0) === 0) {
        for (const ol of demoOlympiads) {
            await sql`
                INSERT INTO olympiads (title, description, author_name, thread_id)
                VALUES (${ol.title}, ${ol.description}, ${ol.author_name}, 15);
            `;
            olympiadsAdded++;
        }
    }

    return { classesAdded, studentsAdded, teachersAdded, olympiadsAdded };
}
