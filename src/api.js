import { sql } from '@vercel/postgres';
import {
    ensureTables,
    extractOlympiadTitle,
    seedDemoData,
    upsertClassByName
} from './db.js';
import {
    createAdminToken,
    getAdminPassword,
    isUsingDefaultAdminPassword,
    resolveRequestActor
} from './auth.js';
import {
    buildImportTemplateWorkbook,
    buildRegistrationsWorkbook,
    parseStudentsFromText,
    parseStudentsFromXlsxBuffer,
    parseTeachersFromText,
    parseTeachersFromXlsxBuffer
} from './excel.js';

function sendJson(res, status, data) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
}

function sendXlsx(res, buffer, filename, isHead = false) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(isHead ? undefined : buffer);
}

async function readJsonBody(req, maxBytes = 6 * 1024 * 1024) {
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
        total += chunk.length;
        if (total > maxBytes) {
            throw new Error('Payload too large');
        }
        chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return {};
    return JSON.parse(raw);
}

async function fetchAdminReportData(filters = {}) {
    await ensureTables();

    const olympiadId = filters.olympiadId ? Number(filters.olympiadId) : null;
    const classId = filters.classId ? Number(filters.classId) : null;
    const teacherQuery = (filters.teacher || '').trim().toLowerCase();
    const searchQuery = (filters.q || '').trim().toLowerCase();

    const [olympiadsRes, regsRes, classesRes, studentsRes, teachersRes] = await Promise.all([
        sql`SELECT * FROM olympiads ORDER BY is_active DESC, published_at DESC, id DESC;`,
        sql`
            SELECT
                r.id,
                r.student_id,
                r.olympiad_id,
                r.teacher_id,
                r.registered_by_name,
                r.registered_by_tg_id,
                r.registered_by_tg_username,
                r.created_at,
                s.full_name AS student_name,
                s.class_id,
                c.name AS class_name,
                c.grade AS class_grade,
                o.title AS olympiad_title,
                o.is_active AS olympiad_active
            FROM registrations r
            JOIN students s ON s.id = r.student_id
            JOIN classes c ON c.id = s.class_id
            JOIN olympiads o ON o.id = r.olympiad_id
            ORDER BY r.created_at DESC, r.id DESC;
        `,
        sql`
            SELECT
                c.id,
                c.name,
                c.grade,
                COUNT(DISTINCT s.id)::int AS total_students,
                COUNT(DISTINCT r.student_id)::int AS registered_students,
                COUNT(r.id)::int AS total_registrations
            FROM classes c
            LEFT JOIN students s ON s.class_id = c.id
            LEFT JOIN registrations r ON r.student_id = s.id
            GROUP BY c.id
            ORDER BY c.grade ASC, c.name ASC;
        `,
        sql`
            SELECT s.id, s.class_id, s.full_name, c.name AS class_name
            FROM students s
            JOIN classes c ON c.id = s.class_id
            ORDER BY c.grade ASC, c.name ASC, s.full_name ASC;
        `,
        sql`SELECT * FROM teachers ORDER BY full_name ASC;`
    ]);

    let filteredRegs = regsRes.rows;
    if (olympiadId) {
        filteredRegs = filteredRegs.filter((r) => Number(r.olympiad_id) === olympiadId);
    }
    if (classId) {
        filteredRegs = filteredRegs.filter((r) => Number(r.class_id) === classId);
    }
    if (teacherQuery) {
        filteredRegs = filteredRegs.filter((r) =>
            String(r.registered_by_name || '').toLowerCase().includes(teacherQuery)
        );
    }
    if (searchQuery) {
        filteredRegs = filteredRegs.filter((r) =>
            String(r.student_name || '').toLowerCase().includes(searchQuery) ||
            String(r.class_name || '').toLowerCase().includes(searchQuery) ||
            String(r.olympiad_title || '').toLowerCase().includes(searchQuery) ||
            String(r.registered_by_name || '').toLowerCase().includes(searchQuery)
        );
    }

    const filteredOlympiads = olympiadId
        ? olympiadsRes.rows.filter((o) => Number(o.id) === olympiadId)
        : olympiadsRes.rows;

    // Статистика по учителям
    const teacherMap = new Map();
    for (const reg of filteredRegs) {
        const key = reg.registered_by_name || 'Не указан';
        if (!teacherMap.has(key)) {
            teacherMap.set(key, {
                name: key,
                registrations_count: 0,
                studentsSet: new Set(),
                olympiadsSet: new Set()
            });
        }
        const entry = teacherMap.get(key);
        entry.registrations_count++;
        entry.studentsSet.add(reg.student_id);
        entry.olympiadsSet.add(reg.olympiad_id);
    }

    const teacherStats = [...teacherMap.values()]
        .map((e) => ({
            name: e.name,
            registrations_count: e.registrations_count,
            unique_students: e.studentsSet.size,
            unique_olympiads: e.olympiadsSet.size
        }))
        .sort((a, b) => b.registrations_count - a.registrations_count);

    // Обогащаем олимпиады статистикой и списком учеников
    const regsByOlympiad = new Map();
    for (const reg of regsRes.rows) {
        if (!regsByOlympiad.has(reg.olympiad_id)) regsByOlympiad.set(reg.olympiad_id, []);
        regsByOlympiad.get(reg.olympiad_id).push(reg);
    }

    const olympiadsEnriched = olympiadsRes.rows.map((ol) => {
        const list = regsByOlympiad.get(ol.id) || [];
        const byClass = {};
        for (const r of list) {
            byClass[r.class_name] = (byClass[r.class_name] || 0) + 1;
        }
        return {
            ...ol,
            registrations_count: list.length,
            class_breakdown: byClass,
            participants: list.map((r) => ({
                registration_id: r.id,
                student_id: r.student_id,
                student_name: r.student_name,
                class_name: r.class_name,
                registered_by_name: r.registered_by_name,
                created_at: r.created_at
            }))
        };
    });

    const uniqueStudentsCount = new Set(regsRes.rows.map((r) => r.student_id)).size;

    return {
        kpis: {
            total_olympiads: olympiadsRes.rows.length,
            active_olympiads: olympiadsRes.rows.filter((o) => o.is_active).length,
            total_registrations: regsRes.rows.length,
            unique_students_registered: uniqueStudentsCount,
            total_students: studentsRes.rows.length,
            total_classes: classesRes.rows.length,
            total_teachers: teachersRes.rows.length,
            active_registrars: teacherStats.length
        },
        olympiads: olympiadsEnriched,
        filteredOlympiads,
        registrations: filteredRegs,
        allRegistrations: regsRes.rows,
        classStats: classesRes.rows,
        students: studentsRes.rows,
        teachers: teachersRes.rows,
        teacherStats
    };
}

export async function handleApiRequest(req, res, urlObj) {
    const method = (req.method || 'GET').toUpperCase();
    const pathname = urlObj.pathname;

    if (method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    const actor = resolveRequestActor(req);

    try {
        // Вход в админ-панель (не требует запроса к БД)
        if (pathname === '/api/admin/login' && method === 'POST') {
            if (actor.isAdmin) {
                return sendJson(res, 200, {
                    token: createAdminToken(actor.adminActor || { role: 'admin', name: 'Администратор' }),
                    usingDefaultPassword: isUsingDefaultAdminPassword(),
                    actor: actor.adminActor
                });
            }
            const body = await readJsonBody(req);
            const password = String(body.password || '');
            if (password !== getAdminPassword()) {
                return sendJson(res, 401, { error: 'Неверный пароль администратора' });
            }
            return sendJson(res, 200, {
                token: createAdminToken({ role: 'password_admin', name: 'Администратор' }),
                usingDefaultPassword: isUsingDefaultAdminPassword(),
                actor: { role: 'password_admin', name: 'Администратор' }
            });
        }

        // Скачать шаблон Excel (не требует запроса к БД)
        if (pathname === '/api/admin/template' && (method === 'GET' || method === 'HEAD')) {
            if (!actor.isAdmin) {
                return sendJson(res, 401, { error: 'Требуется авторизация администратора' });
            }
            const buffer = await buildImportTemplateWorkbook();
            return sendXlsx(res, buffer, 'ngs-import-template.xlsx', method === 'HEAD');
        }

        await ensureTables();

        // 1. Bootstrap для Mini App / сайта
        if (pathname === '/api/bootstrap' && method === 'GET') {
            const [olympiadsRes, classesRes, teachersRes, totalRegsRes] = await Promise.all([
                sql`
                    SELECT
                        o.*,
                        COUNT(r.id)::int AS registrations_count
                    FROM olympiads o
                    LEFT JOIN registrations r ON r.olympiad_id = o.id
                    WHERE o.is_active = TRUE
                    GROUP BY o.id
                    ORDER BY o.published_at DESC, o.id DESC;
                `,
                sql`
                    SELECT
                        c.id,
                        c.name,
                        c.grade,
                        COUNT(DISTINCT s.id)::int AS total_students,
                        COUNT(DISTINCT r.student_id)::int AS registered_students,
                        COUNT(r.id)::int AS total_registrations
                    FROM classes c
                    LEFT JOIN students s ON s.class_id = c.id
                    LEFT JOIN registrations r ON r.student_id = s.id
                    GROUP BY c.id
                    ORDER BY c.grade ASC, c.name ASC;
                `,
                sql`SELECT id, full_name, subject, telegram_id, telegram_username FROM teachers ORDER BY full_name ASC;`,
                sql`SELECT COUNT(*)::int AS total FROM registrations;`
            ]);

            let matchedTeacher = null;
            if (actor.tgUser?.id) {
                matchedTeacher = teachersRes.rows.find(
                    (t) => t.telegram_id && Number(t.telegram_id) === Number(actor.tgUser.id)
                ) || null;
            }

            // Проверяем, является ли пользователь модератором в БД (для показа кнопки Админ)
            let isModerator = actor.isAdmin;
            if (!isModerator && actor.tgUser?.id) {
                const { rows } = await sql`SELECT id FROM moderators WHERE id = ${Number(actor.tgUser.id)};`;
                if (rows.length > 0) isModerator = true;
            }

            return sendJson(res, 200, {
                olympiads: olympiadsRes.rows,
                classes: classesRes.rows,
                teachers: teachersRes.rows,
                stats: {
                    total_registrations: totalRegsRes.rows[0]?.total || 0,
                    active_olympiads: olympiadsRes.rows.length
                },
                me: {
                    tgUser: actor.tgUser,
                    matchedTeacher,
                    isAdmin: actor.isAdmin,
                    isModerator,
                    startParam: actor.startParam
                }
            });
        }

        // 2. Список учеников выбранного класса + их текущие регистрации
        const classStudentsMatch = pathname.match(/^\/api\/classes\/(\d+)\/students$/);
        if (classStudentsMatch && method === 'GET') {
            const classId = Number(classStudentsMatch[1]);
            const [classRes, studentsRes, regsRes] = await Promise.all([
                sql`SELECT * FROM classes WHERE id = ${classId};`,
                sql`SELECT id, class_id, full_name FROM students WHERE class_id = ${classId} ORDER BY full_name ASC;`,
                sql`
                    SELECT
                        r.id,
                        r.student_id,
                        r.olympiad_id,
                        r.teacher_id,
                        r.registered_by_name,
                        r.registered_by_tg_username,
                        r.created_at,
                        o.title AS olympiad_title,
                        o.is_active AS olympiad_active
                    FROM registrations r
                    JOIN students s ON s.id = r.student_id
                    JOIN olympiads o ON o.id = r.olympiad_id
                    WHERE s.class_id = ${classId}
                    ORDER BY r.created_at DESC;
                `
            ]);

            if (classRes.rows.length === 0) {
                return sendJson(res, 404, { error: 'Класс не найден' });
            }

            const regsByStudent = new Map();
            for (const reg of regsRes.rows) {
                if (!regsByStudent.has(reg.student_id)) regsByStudent.set(reg.student_id, []);
                regsByStudent.get(reg.student_id).push(reg);
            }

            const students = studentsRes.rows.map((s) => ({
                ...s,
                registrations: regsByStudent.get(s.id) || []
            }));

            return sendJson(res, 200, {
                classInfo: classRes.rows[0],
                students
            });
        }

        // 3. Регистрация ученика на олимпиаду (поддерживает несколько олимпиад на ученика)
        if (pathname === '/api/registrations' && method === 'POST') {
            const body = await readJsonBody(req);
            const studentId = Number(body.student_id);
            const olympiadId = Number(body.olympiad_id);
            const teacherId = body.teacher_id ? Number(body.teacher_id) : null;
            let registeredByName = String(body.teacher_name || '').trim();

            if (!studentId || !olympiadId) {
                return sendJson(res, 400, { error: 'Укажите ученика и олимпиаду' });
            }

            if (teacherId) {
                const { rows: tRows } = await sql`SELECT * FROM teachers WHERE id = ${teacherId};`;
                if (tRows[0]) {
                    registeredByName = tRows[0].full_name;
                    // Привязываем Telegram ID к учителю, если он открыл Mini App из Telegram и ещё не привязан
                    if (actor.tgUser?.id && !tRows[0].telegram_id) {
                        await sql`
                            UPDATE teachers
                            SET telegram_id = ${Number(actor.tgUser.id)},
                                telegram_username = COALESCE(${actor.tgUser.username || null}, telegram_username)
                            WHERE id = ${teacherId}
                              AND NOT EXISTS (SELECT 1 FROM teachers WHERE telegram_id = ${Number(actor.tgUser.id)});
                        `.catch(() => {});
                    }
                }
            }

            if (!registeredByName && actor.tgUser) {
                registeredByName = [actor.tgUser.first_name, actor.tgUser.last_name].filter(Boolean).join(' ')
                    || (actor.tgUser.username ? `@${actor.tgUser.username}` : 'Учитель Telegram');
            }

            if (!registeredByName) {
                return sendJson(res, 400, { error: 'Выберите или укажите ФИО учителя, кто регистрирует' });
            }

            const tgId = actor.tgUser?.id ? Number(actor.tgUser.id) : null;
            const tgUsername = actor.tgUser?.username || null;

            const { rows } = await sql`
                INSERT INTO registrations (
                    student_id, olympiad_id, teacher_id, registered_by_name,
                    registered_by_tg_id, registered_by_tg_username
                )
                VALUES (
                    ${studentId}, ${olympiadId}, ${teacherId}, ${registeredByName},
                    ${tgId}, ${tgUsername}
                )
                ON CONFLICT (student_id, olympiad_id) DO UPDATE
                SET teacher_id = EXCLUDED.teacher_id,
                    registered_by_name = EXCLUDED.registered_by_name,
                    registered_by_tg_id = COALESCE(EXCLUDED.registered_by_tg_id, registrations.registered_by_tg_id),
                    registered_by_tg_username = COALESCE(EXCLUDED.registered_by_tg_username, registrations.registered_by_tg_username)
                RETURNING *;
            `;

            const { rows: olRows } = await sql`SELECT title FROM olympiads WHERE id = ${olympiadId};`;
            return sendJson(res, 200, {
                registration: {
                    ...rows[0],
                    olympiad_title: olRows[0]?.title || ''
                }
            });
        }

        // 4. Отмена регистрации ученика с олимпиады
        if (pathname === '/api/registrations' && method === 'DELETE') {
            const regId = urlObj.searchParams.get('id') ? Number(urlObj.searchParams.get('id')) : null;
            const studentId = urlObj.searchParams.get('student_id') ? Number(urlObj.searchParams.get('student_id')) : null;
            const olympiadId = urlObj.searchParams.get('olympiad_id') ? Number(urlObj.searchParams.get('olympiad_id')) : null;

            if (regId) {
                await sql`DELETE FROM registrations WHERE id = ${regId};`;
                return sendJson(res, 200, { ok: true });
            }
            if (studentId && olympiadId) {
                await sql`DELETE FROM registrations WHERE student_id = ${studentId} AND olympiad_id = ${olympiadId};`;
                return sendJson(res, 200, { ok: true });
            }
            return sendJson(res, 400, { error: 'Передайте id или student_id + olympiad_id' });
        }

        // Все маршруты ниже требуют прав администратора
        if (pathname.startsWith('/api/admin/')) {
            if (!actor.isAdmin) {
                return sendJson(res, 401, { error: 'Требуется авторизация администратора' });
            }

            // 6. Полная сводка и статистика
            if (pathname === '/api/admin/overview' && method === 'GET') {
                const data = await fetchAdminReportData({
                    olympiadId: urlObj.searchParams.get('olympiadId'),
                    classId: urlObj.searchParams.get('classId'),
                    teacher: urlObj.searchParams.get('teacher'),
                    q: urlObj.searchParams.get('q')
                });
                return sendJson(res, 200, {
                    ...data,
                    downloadToken: createAdminToken(actor.adminActor || { role: 'admin', name: 'Администратор' }),
                    usingDefaultPassword: isUsingDefaultAdminPassword()
                });
            }

            // 7. Скачать Excel-отчёт (.xlsx)
            if (pathname === '/api/admin/export' && (method === 'GET' || method === 'HEAD')) {
                const data = await fetchAdminReportData({
                    olympiadId: urlObj.searchParams.get('olympiadId'),
                    classId: urlObj.searchParams.get('classId'),
                    teacher: urlObj.searchParams.get('teacher'),
                    q: urlObj.searchParams.get('q')
                });

                const buffer = await buildRegistrationsWorkbook({
                    olympiads: data.filteredOlympiads,
                    registrations: data.registrations,
                    classStats: data.classStats,
                    teacherStats: data.teacherStats
                });

                const dateStamp = new Date().toISOString().slice(0, 10);
                return sendXlsx(res, buffer, `ngs-olympiads-report-${dateStamp}.xlsx`, method === 'HEAD');
            }

            // 9. CRUD олимпиад
            if (pathname === '/api/admin/olympiads' && method === 'POST') {
                const body = await readJsonBody(req);
                const rawTitle = String(body.title || '').trim();
                const description = String(body.description || '').trim();
                const title = rawTitle || extractOlympiadTitle(description);
                if (!title) return sendJson(res, 400, { error: 'Укажите название олимпиады' });

                const { rows } = await sql`
                    INSERT INTO olympiads (title, description, author_name, thread_id)
                    VALUES (${title}, ${description}, ${actor.adminActor?.name || 'Администратор'}, 15)
                    RETURNING *;
                `;
                return sendJson(res, 200, { olympiad: rows[0] });
            }

            const olympiadMatch = pathname.match(/^\/api\/admin\/olympiads\/(\d+)$/);
            if (olympiadMatch) {
                const id = Number(olympiadMatch[1]);
                if (method === 'PATCH') {
                    const body = await readJsonBody(req);
                    const { rows: existing } = await sql`SELECT * FROM olympiads WHERE id = ${id};`;
                    if (existing.length === 0) return sendJson(res, 404, { error: 'Олимпиада не найдена' });
                    const cur = existing[0];
                    const nextTitle = body.title !== undefined ? String(body.title).trim() || cur.title : cur.title;
                    const nextDesc = body.description !== undefined ? String(body.description).trim() : cur.description;
                    const nextActive = body.is_active !== undefined ? Boolean(body.is_active) : cur.is_active;

                    const { rows } = await sql`
                        UPDATE olympiads
                        SET title = ${nextTitle}, description = ${nextDesc}, is_active = ${nextActive}
                        WHERE id = ${id}
                        RETURNING *;
                    `;
                    return sendJson(res, 200, { olympiad: rows[0] });
                }
                if (method === 'DELETE') {
                    await sql`DELETE FROM olympiads WHERE id = ${id};`;
                    return sendJson(res, 200, { ok: true });
                }
            }

            // 10. CRUD классов
            if (pathname === '/api/admin/classes' && method === 'POST') {
                const body = await readJsonBody(req);
                const cls = await upsertClassByName(body.name);
                if (!cls) return sendJson(res, 400, { error: 'Укажите название класса (например, 9А)' });
                return sendJson(res, 200, { classInfo: cls });
            }

            const classDeleteMatch = pathname.match(/^\/api\/admin\/classes\/(\d+)$/);
            if (classDeleteMatch && method === 'DELETE') {
                await sql`DELETE FROM classes WHERE id = ${Number(classDeleteMatch[1])};`;
                return sendJson(res, 200, { ok: true });
            }

            // 11. CRUD учеников
            if (pathname === '/api/admin/students' && method === 'POST') {
                const body = await readJsonBody(req);
                const fullName = String(body.full_name || '').trim();
                let classId = body.class_id ? Number(body.class_id) : null;
                if (!classId && body.class_name) {
                    const cls = await upsertClassByName(body.class_name);
                    classId = cls?.id || null;
                }
                if (!classId || !fullName) {
                    return sendJson(res, 400, { error: 'Укажите класс и ФИО ученика' });
                }
                const { rows } = await sql`
                    INSERT INTO students (class_id, full_name)
                    VALUES (${classId}, ${fullName})
                    ON CONFLICT (class_id, full_name) DO UPDATE SET full_name = EXCLUDED.full_name
                    RETURNING *;
                `;
                return sendJson(res, 200, { student: rows[0] });
            }

            const studentDeleteMatch = pathname.match(/^\/api\/admin\/students\/(\d+)$/);
            if (studentDeleteMatch && method === 'DELETE') {
                await sql`DELETE FROM students WHERE id = ${Number(studentDeleteMatch[1])};`;
                return sendJson(res, 200, { ok: true });
            }

            // 12. CRUD учителей
            if (pathname === '/api/admin/teachers' && method === 'POST') {
                const body = await readJsonBody(req);
                const fullName = String(body.full_name || '').trim();
                const subject = String(body.subject || '').trim();
                const tgId = body.telegram_id ? Number(body.telegram_id) : null;
                if (!fullName) return sendJson(res, 400, { error: 'Укажите ФИО учителя' });

                const { rows } = await sql`
                    INSERT INTO teachers (full_name, subject, telegram_id)
                    VALUES (${fullName}, ${subject}, ${tgId})
                    ON CONFLICT (full_name) DO UPDATE
                    SET subject = COALESCE(NULLIF(EXCLUDED.subject, ''), teachers.subject),
                        telegram_id = COALESCE(EXCLUDED.telegram_id, teachers.telegram_id)
                    RETURNING *;
                `;
                return sendJson(res, 200, { teacher: rows[0] });
            }

            const teacherDeleteMatch = pathname.match(/^\/api\/admin\/teachers\/(\d+)$/);
            if (teacherDeleteMatch && method === 'DELETE') {
                await sql`DELETE FROM teachers WHERE id = ${Number(teacherDeleteMatch[1])};`;
                return sendJson(res, 200, { ok: true });
            }

            // 13. Массовый импорт учеников (текст/CSV или base64 .xlsx)
            if (pathname === '/api/admin/import/students' && method === 'POST') {
                const body = await readJsonBody(req);
                let parsed = [];
                if (body.fileBase64) {
                    const buffer = Buffer.from(body.fileBase64, 'base64');
                    parsed = await parseStudentsFromXlsxBuffer(buffer);
                } else if (body.text) {
                    parsed = parseStudentsFromText(body.text);
                }

                if (parsed.length === 0) {
                    return sendJson(res, 400, { error: 'Не удалось распознать строки. Формат: Класс; ФИО ученика' });
                }

                const classCache = new Map();
                let imported = 0;
                for (const item of parsed) {
                    let cls = classCache.get(item.className);
                    if (!cls) {
                        cls = await upsertClassByName(item.className);
                        if (cls) classCache.set(item.className, cls);
                    }
                    if (!cls || !item.fullName) continue;
                    const { rowCount } = await sql`
                        INSERT INTO students (class_id, full_name)
                        VALUES (${cls.id}, ${item.fullName})
                        ON CONFLICT (class_id, full_name) DO NOTHING;
                    `;
                    imported += rowCount;
                }

                return sendJson(res, 200, {
                    parsed: parsed.length,
                    imported,
                    classesProcessed: classCache.size
                });
            }

            // 14. Массовый импорт учителей (текст/CSV или base64 .xlsx)
            if (pathname === '/api/admin/import/teachers' && method === 'POST') {
                const body = await readJsonBody(req);
                let parsed = [];
                if (body.fileBase64) {
                    const buffer = Buffer.from(body.fileBase64, 'base64');
                    parsed = await parseTeachersFromXlsxBuffer(buffer);
                } else if (body.text) {
                    parsed = parseTeachersFromText(body.text);
                }

                if (parsed.length === 0) {
                    return sendJson(res, 400, { error: 'Не удалось распознать учителей. Формат: ФИО; Предмет' });
                }

                let imported = 0;
                for (const item of parsed) {
                    const { rowCount } = await sql`
                        INSERT INTO teachers (full_name, subject, telegram_id)
                        VALUES (${item.fullName}, ${item.subject || ''}, ${item.telegramId || null})
                        ON CONFLICT (full_name) DO UPDATE
                        SET subject = COALESCE(NULLIF(EXCLUDED.subject, ''), teachers.subject),
                            telegram_id = COALESCE(EXCLUDED.telegram_id, teachers.telegram_id);
                    `;
                    imported += rowCount;
                }

                return sendJson(res, 200, { parsed: parsed.length, imported });
            }

            // 15. Демо-данные для быстрого старта и кнопка полной очистки перед реальным импортом
            if (pathname === '/api/admin/demo/seed' && method === 'POST') {
                const result = await seedDemoData();
                return sendJson(res, 200, result);
            }

            if (pathname === '/api/admin/demo/clear' && method === 'POST') {
                const body = await readJsonBody(req);
                await sql`DELETE FROM registrations;`;
                await sql`DELETE FROM students;`;
                await sql`DELETE FROM classes;`;
                await sql`DELETE FROM teachers;`;
                if (body.clearOlympiads) {
                    await sql`DELETE FROM olympiads;`;
                }
                return sendJson(res, 200, { ok: true });
            }
        }

        return sendJson(res, 404, { error: 'API endpoint not found' });
    } catch (error) {
        console.error(`API error [${method} ${pathname}]:`, error);
        return sendJson(res, 500, { error: error?.message || 'Внутренняя ошибка сервера' });
    }
}
