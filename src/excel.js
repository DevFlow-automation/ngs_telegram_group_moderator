import ExcelJS from 'exceljs';

function formatDateRu(value) {
    if (!value) return '—';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleString('ru-RU', {
        timeZone: 'Asia/Almaty',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function styleHeaderRow(row) {
    row.height = 26;
    row.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF12372A' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF0B241B' } },
            bottom: { style: 'medium', color: { argb: 'FFD97706' } },
            left: { style: 'thin', color: { argb: 'FF1E4D3B' } },
            right: { style: 'thin', color: { argb: 'FF1E4D3B' } }
        };
    });
}

function styleDataRows(sheet, startRow = 2) {
    for (let r = startRow; r <= sheet.rowCount; r++) {
        const row = sheet.getRow(r);
        const isEven = r % 2 === 0;
        row.eachCell((cell) => {
            cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF181A18' } };
            if (!isEven) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F3EC' } };
            }
            cell.alignment = { vertical: 'middle', wrapText: true };
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFE2DDD2' } },
                left: { style: 'thin', color: { argb: 'FFEDE9DF' } },
                right: { style: 'thin', color: { argb: 'FFEDE9DF' } }
            };
        });
    }
}

export async function buildRegistrationsWorkbook({ olympiads, registrations, classStats, teacherStats }) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'NGS Olympiad Portal';
    wb.created = new Date();

    // Лист 1: Сводка по олимпиадам
    const wsOlympiads = wb.addWorksheet('Сводка по олимпиадам', {
        views: [{ state: 'frozen', ySplit: 1 }]
    });
    wsOlympiads.columns = [
        { header: '№', key: 'idx', width: 6 },
        { header: 'Олимпиада / Конкурс', key: 'title', width: 46 },
        { header: 'Статус', key: 'status', width: 14 },
        { header: 'Зарегистрировано учеников', key: 'reg_count', width: 24 },
        { header: 'Классы (разбивка)', key: 'classes_breakdown', width: 32 },
        { header: 'Список учеников', key: 'students_list', width: 52 },
        { header: 'Дата публикации', key: 'published_at', width: 18 },
        { header: 'Автор поста', key: 'author_name', width: 22 }
    ];
    styleHeaderRow(wsOlympiads.getRow(1));

    const regsByOlympiad = new Map();
    for (const reg of registrations) {
        if (!regsByOlympiad.has(reg.olympiad_id)) regsByOlympiad.set(reg.olympiad_id, []);
        regsByOlympiad.get(reg.olympiad_id).push(reg);
    }

    olympiads.forEach((ol, i) => {
        const list = regsByOlympiad.get(ol.id) || [];
        const classCounts = new Map();
        for (const r of list) {
            classCounts.set(r.class_name, (classCounts.get(r.class_name) || 0) + 1);
        }
        const breakdown = [...classCounts.entries()]
            .map(([cls, cnt]) => `${cls}: ${cnt}`)
            .join(', ');
        const studentsList = list
            .map((r) => `${r.student_name} (${r.class_name})`)
            .join('; ');

        wsOlympiads.addRow({
            idx: i + 1,
            title: ol.title,
            status: ol.is_active ? 'Активна' : 'Архив',
            reg_count: list.length,
            classes_breakdown: breakdown || '—',
            students_list: studentsList || 'Нет регистраций',
            published_at: formatDateRu(ol.published_at),
            author_name: ol.author_name || '—'
        });
    });

    const totalRow = wsOlympiads.addRow({
        idx: '',
        title: 'ИТОГО РЕГИСТРАЦИЙ',
        status: '',
        reg_count: registrations.length,
        classes_breakdown: '',
        students_list: '',
        published_at: '',
        author_name: ''
    });
    styleDataRows(wsOlympiads, 2);
    totalRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF12372A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8C8' } };
    });
    wsOlympiads.autoFilter = { from: 'A1', to: 'H1' };

    // Лист 2: Детальный журнал (кто кого и куда зарегистрировал)
    const wsJournal = wb.addWorksheet('Список регистраций', {
        views: [{ state: 'frozen', ySplit: 1 }]
    });
    wsJournal.columns = [
        { header: '№', key: 'idx', width: 6 },
        { header: 'Класс', key: 'class_name', width: 12 },
        { header: 'ФИО ученика', key: 'student_name', width: 32 },
        { header: 'Олимпиада / Конкурс', key: 'olympiad_title', width: 44 },
        { header: 'Кто зарегистрировал', key: 'registered_by', width: 30 },
        { header: 'Telegram', key: 'tg_username', width: 18 },
        { header: 'Дата и время', key: 'created_at', width: 20 }
    ];
    styleHeaderRow(wsJournal.getRow(1));

    registrations.forEach((reg, i) => {
        wsJournal.addRow({
            idx: i + 1,
            class_name: reg.class_name,
            student_name: reg.student_name,
            olympiad_title: reg.olympiad_title,
            registered_by: reg.registered_by_name,
            tg_username: reg.registered_by_tg_username ? `@${reg.registered_by_tg_username}` : '—',
            created_at: formatDateRu(reg.created_at)
        });
    });
    styleDataRows(wsJournal, 2);
    wsJournal.autoFilter = { from: 'A1', to: 'G1' };

    // Лист 3: Статистика по классам
    const wsClasses = wb.addWorksheet('По классам', {
        views: [{ state: 'frozen', ySplit: 1 }]
    });
    wsClasses.columns = [
        { header: '№', key: 'idx', width: 6 },
        { header: 'Класс', key: 'name', width: 14 },
        { header: 'Всего учеников', key: 'total_students', width: 18 },
        { header: 'Участвуют (уник.)', key: 'registered_students', width: 20 },
        { header: 'Охват (%)', key: 'coverage', width: 14 },
        { header: 'Всего регистраций', key: 'total_registrations', width: 20 }
    ];
    styleHeaderRow(wsClasses.getRow(1));

    classStats.forEach((cls, i) => {
        const pct = cls.total_students > 0
            ? Math.round((cls.registered_students / cls.total_students) * 100)
            : 0;
        wsClasses.addRow({
            idx: i + 1,
            name: cls.name,
            total_students: cls.total_students,
            registered_students: cls.registered_students,
            coverage: `${pct}%`,
            total_registrations: cls.total_registrations
        });
    });
    styleDataRows(wsClasses, 2);
    wsClasses.autoFilter = { from: 'A1', to: 'F1' };

    // Лист 4: Статистика по учителям
    const wsTeachers = wb.addWorksheet('По учителям', {
        views: [{ state: 'frozen', ySplit: 1 }]
    });
    wsTeachers.columns = [
        { header: '№', key: 'idx', width: 6 },
        { header: 'Учитель / Регистратор', key: 'name', width: 34 },
        { header: 'Всего регистраций', key: 'registrations_count', width: 20 },
        { header: 'Уникальных учеников', key: 'unique_students', width: 22 },
        { header: 'Олимпиад охвачено', key: 'unique_olympiads', width: 22 }
    ];
    styleHeaderRow(wsTeachers.getRow(1));

    teacherStats.forEach((t, i) => {
        wsTeachers.addRow({
            idx: i + 1,
            name: t.name,
            registrations_count: t.registrations_count,
            unique_students: t.unique_students,
            unique_olympiads: t.unique_olympiads
        });
    });
    styleDataRows(wsTeachers, 2);
    wsTeachers.autoFilter = { from: 'A1', to: 'E1' };

    return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildImportTemplateWorkbook() {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'NGS Olympiad Portal';

    const wsStudents = wb.addWorksheet('Ученики');
    wsStudents.columns = [
        { header: 'Класс', key: 'class_name', width: 14 },
        { header: 'ФИО ученика', key: 'full_name', width: 36 }
    ];
    styleHeaderRow(wsStudents.getRow(1));
    wsStudents.addRow({ class_name: '7А', full_name: 'Иванов Артем Сергеевич' });
    wsStudents.addRow({ class_name: '7А', full_name: 'Нурланова Амина Ерлановна' });
    wsStudents.addRow({ class_name: '10Б', full_name: 'Ким Даниил Александрович' });

    const wsTeachers = wb.addWorksheet('Учителя');
    wsTeachers.columns = [
        { header: 'ФИО учителя', key: 'full_name', width: 36 },
        { header: 'Предмет (необязательно)', key: 'subject', width: 24 },
        { header: 'Telegram ID (необязательно)', key: 'telegram_id', width: 24 }
    ];
    styleHeaderRow(wsTeachers.getRow(1));
    wsTeachers.addRow({ full_name: 'Абдуллина Гульнара Сериковна', subject: 'Математика', telegram_id: '' });
    wsTeachers.addRow({ full_name: 'Ким Александр Викторович', subject: 'Информатика', telegram_id: '' });

    return Buffer.from(await wb.xlsx.writeBuffer());
}

function cellText(val) {
    if (val == null) return '';
    if (typeof val === 'object') {
        if (val.text) return String(val.text).trim();
        if (Array.isArray(val.richText)) return val.richText.map(p => p.text).join('').trim();
        if (val.result != null) return String(val.result).trim();
    }
    return String(val).trim();
}

export async function parseStudentsFromXlsxBuffer(buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.getWorksheet('Ученики') || wb.worksheets[0];
    if (!sheet) return [];

    const items = [];
    sheet.eachRow((row, rowNumber) => {
        const col1 = cellText(row.getCell(1).value);
        const col2 = cellText(row.getCell(2).value);
        if (!col1 || !col2) return;
        const lower1 = col1.toLowerCase();
        const lower2 = col2.toLowerCase();
        if (rowNumber === 1 && (lower1.includes('класс') || lower1 === 'class' || lower2.includes('фио') || lower2.includes('ученик'))) {
            return;
        }
        // Автоопределение порядка колонок: если во второй колонке короткое имя класса (например "7А"), а в первой ФИО
        const col1LooksClass = /^\d{1,2}\s*[А-ЯA-Zа-яa-z]?$/.test(col1);
        const col2LooksClass = /^\d{1,2}\s*[А-ЯA-Zа-яa-z]?$/.test(col2);
        if (!col1LooksClass && col2LooksClass) {
            items.push({ className: col2, fullName: col1 });
        } else {
            items.push({ className: col1, fullName: col2 });
        }
    });
    return items;
}

export async function parseTeachersFromXlsxBuffer(buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.getWorksheet('Учителя') || wb.worksheets[0];
    if (!sheet) return [];

    const items = [];
    sheet.eachRow((row, rowNumber) => {
        const fullName = cellText(row.getCell(1).value);
        const subject = cellText(row.getCell(2).value);
        const tgRaw = cellText(row.getCell(3).value);
        if (!fullName) return;
        const lower = fullName.toLowerCase();
        if (rowNumber === 1 && (lower.includes('фио') || lower.includes('учител') || lower === 'name')) {
            return;
        }
        const tgNum = /^\d+$/.test(tgRaw) ? Number(tgRaw) : null;
        items.push({ fullName, subject, telegramId: tgNum });
    });
    return items;
}

export function parseStudentsFromText(rawText) {
    const items = [];
    const lines = String(rawText || '').replace(/\r/g, '').split('\n');
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const parts = line.split(/\t|;|,|\s[-–—]\s/).map(s => s.trim()).filter(Boolean);
        if (parts.length < 2) continue;
        const p0 = parts[0];
        const p1 = parts.slice(1).join(' ').trim();
        const lower0 = p0.toLowerCase();
        if (lower0 === 'класс' || lower0 === 'class' || lower0 === 'фио') continue;
        const p0LooksClass = /^\d{1,2}\s*[А-ЯA-Zа-яa-z]?$/.test(p0);
        const p1LooksClass = /^\d{1,2}\s*[А-ЯA-Zа-яa-z]?$/.test(p1);
        if (!p0LooksClass && p1LooksClass) {
            items.push({ className: p1, fullName: p0 });
        } else {
            items.push({ className: p0, fullName: p1 });
        }
    }
    return items;
}

export function parseTeachersFromText(rawText) {
    const items = [];
    const lines = String(rawText || '').replace(/\r/g, '').split('\n');
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        const parts = line.split(/\t|;|,/).map(s => s.trim());
        const fullName = parts[0] || '';
        if (!fullName) continue;
        const lower = fullName.toLowerCase();
        if (lower.includes('фио') || lower === 'учитель' || lower === 'name') continue;
        const subject = parts[1] || '';
        const tgRaw = (parts[2] || '').trim();
        const telegramId = /^\d+$/.test(tgRaw) ? Number(tgRaw) : null;
        items.push({ fullName, subject, telegramId });
    }
    return items;
}
