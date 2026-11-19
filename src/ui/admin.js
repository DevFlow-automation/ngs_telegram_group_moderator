import { SHARED_STYLES } from './shared-styles.js';

export function renderAdminHtml() {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NGS Олимпиадник — Админ-панель и статистика</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    ${SHARED_STYLES}

    .login-wrap {
      max-width: 440px;
      margin: 56px auto 0;
      padding: 28px;
    }

    .login-title {
      font-family: var(--font-display);
      font-size: 19px;
      margin: 0 0 8px;
      color: var(--pine);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px 18px;
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
    }

    .kpi-card::after {
      content: '';
      position: absolute;
      right: -18px;
      top: -18px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--pine-soft);
      opacity: 0.65;
    }

    .kpi-label {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
    }

    .kpi-val {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 700;
      color: var(--pine);
      margin-top: 8px;
      position: relative;
      z-index: 1;
    }

    .kpi-sub {
      font-size: 12px;
      color: var(--muted);
      margin-top: 4px;
      position: relative;
      z-index: 1;
    }

    .tabs-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
      padding: 6px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid var(--line);
      border-radius: 16px;
    }

    .tab-btn {
      padding: 9px 15px;
      border-radius: 12px;
      border: none;
      background: transparent;
      font-weight: 600;
      font-size: 13.5px;
      color: var(--ink-2);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn:hover { background: var(--surface-tint); color: var(--pine); }

    .tab-btn.active {
      background: var(--pine);
      color: #FFFDF8;
      box-shadow: 0 4px 12px rgba(18, 55, 42, 0.22);
    }

    .tab-panel { display: none; margin-top: 16px; }
    .tab-panel.active { display: block; }

    .olympiad-stat-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ol-stat-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    .ol-stat-head {
      padding: 16px 18px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
      cursor: pointer;
    }

    .ol-stat-head:hover { background: #FCFBF7; }

    .ol-stat-title {
      font-family: var(--font-display);
      font-size: 14.5px;
      color: var(--pine);
      margin: 0 0 6px;
    }

    .progress-track {
      height: 8px;
      border-radius: 999px;
      background: #ECE6D9;
      overflow: hidden;
      margin-top: 8px;
      max-width: 420px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--pine), var(--gold));
      transition: width 0.35s ease;
    }

    .ol-stat-body {
      display: none;
      border-top: 1px solid var(--line);
      padding: 14px 18px 18px;
      background: var(--bg-elevated);
    }

    .ol-stat-card.open .ol-stat-body { display: block; }

    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 16px;
    }

    .section-card {
      padding: 18px 20px;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 14.5px;
      color: var(--pine);
      margin: 0 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .data-table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--surface);
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }

    .data-table th {
      text-align: left;
      padding: 10px 12px;
      background: var(--surface-tint);
      border-bottom: 1.5px solid var(--line);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
      white-space: nowrap;
    }

    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #EFEAE0;
      vertical-align: middle;
    }

    .data-table tr:last-child td { border-bottom: none; }

    .filters-bar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
      gap: 10px;
      margin-bottom: 14px;
      align-items: center;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .warn-banner {
      margin-top: 14px;
      padding: 11px 15px;
      border-radius: 14px;
      background: var(--gold-soft);
      border: 1px solid rgba(217, 119, 6, 0.35);
      color: #7D4204;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 300;
      background: rgba(18, 55, 42, 0.38);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-backdrop.open { display: flex; }

    .modal-box {
      width: 100%;
      max-width: 540px;
      background: var(--surface);
      border: 1.5px solid var(--pine);
      border-radius: 20px;
      padding: 22px;
      box-shadow: var(--shadow-pop);
      animation: popIn 0.18s ease;
    }

    .stat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 9px 0;
      border-bottom: 1px solid #EFEAE0;
    }
    .stat-row:last-child { border-bottom: none; }

    @media (max-width: 960px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .two-col, .form-grid { grid-template-columns: 1fr; }
      .filters-bar { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 600px) {
      .filters-bar { grid-template-columns: 1fr; }
      .ol-stat-head { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">NGS</div>
        <div class="brand-text">
          <div class="brand-title">Админ-панель Олимпиад</div>
          <div class="brand-sub">Статистика, реестр регистраций и экспорт в Excel</div>
        </div>
      </div>
      <div class="topbar-actions">
        <button type="button" class="btn btn-gold btn-sm" id="topExportBtn" style="display:none;">📥 Скачать Excel</button>
        <a href="/" class="btn btn-ghost-dark btn-sm">🎓 Портал</a>
        <button type="button" class="btn btn-ghost-dark btn-sm" id="logoutBtn" style="display:none;">Выйти</button>
      </div>
    </header>

    <!-- Login Gate -->
    <section class="card login-wrap" id="loginView">
      <h1 class="login-title">Вход для администратора</h1>
      <p style="margin:0 0 18px; color:var(--muted); font-size:13.5px;">
        Введите пароль администратора для доступа к статистике, управлению базой и выгрузке Excel.
        Если вы супермодератор, откройте админ-панель из Telegram-бота для автоматического входа.
      </p>
      <form id="loginForm" style="display:flex; flex-direction:column; gap:12px;">
        <input type="password" class="input" id="adminPasswordInput" placeholder="Пароль администратора" required />
        <button type="submit" class="btn btn-primary">Войти в админ-панель</button>
      </form>
      <div id="loginError" style="color:var(--coral); font-size:13px; margin-top:10px; display:none;"></div>
    </section>

    <!-- Main Admin Dashboard -->
    <main id="adminApp" style="display:none;">
      <div class="warn-banner" id="defaultPassWarn" style="display:none;">
        <span>⚠️ Используется стандартный пароль (<code class="mono">ngs2026</code>). Задайте переменную окружения <code class="mono">ADMIN_PASSWORD</code> в настройках Vercel.</span>
      </div>

      <section class="kpi-grid" id="kpiGrid"></section>

      <nav class="tabs-bar">
        <button type="button" class="tab-btn active" data-tab="overview">📊 Сводка по олимпиадам</button>
        <button type="button" class="tab-btn" data-tab="journal">📋 Журнал регистраций</button>
        <button type="button" class="tab-btn" data-tab="olympiads">🏆 Олимпиады (Тема 15)</button>
        <button type="button" class="tab-btn" data-tab="directory">🏫 Классы, Ученики, Учителя</button>
      </nav>

      <!-- TAB 1: Overview -->
      <section class="tab-panel active" id="tab-overview">
        <div class="card section-card">
          <div class="section-title">
            <span>Количество учеников по каждой олимпиаде</span>
            <button type="button" class="btn btn-primary btn-sm" id="exportFullBtn2">📥 Полный отчёт Excel (.xlsx)</button>
          </div>
          <p style="margin:-4px 0 14px; font-size:13px; color:var(--muted);">
            Нажмите на любую олимпиаду, чтобы раскрыть точный список зарегистрированных учеников и кто их записал.
          </p>
          <div class="olympiad-stat-list" id="olympiadStatsList"></div>
        </div>

        <div class="two-col">
          <div class="card section-card">
            <div class="section-title"><span>Кто сколько зарегистрировал (Учителя)</span></div>
            <div id="teacherStatsBox"></div>
          </div>
          <div class="card section-card">
            <div class="section-title"><span>Охват по классам</span></div>
            <div id="classStatsBox"></div>
          </div>
        </div>
      </section>

      <!-- TAB 2: Journal -->
      <section class="tab-panel" id="tab-journal">
        <div class="card section-card">
          <div class="section-title">
            <span>Все регистрации — кто кого и куда зарегистрировал</span>
            <span class="pill pill-pine mono" id="journalCountPill">0 записей</span>
          </div>

          <div class="filters-bar">
            <select class="native-select" id="fOlympiad"><option value="">Все олимпиады</option></select>
            <select class="native-select" id="fClass"><option value="">Все классы</option></select>
            <select class="native-select" id="fTeacher"><option value="">Все учителя</option></select>
            <input type="text" class="input" id="fSearch" placeholder="Поиск по ФИО ученика..." />
            <button type="button" class="btn btn-gold" id="exportFilteredBtn">📥 Excel по фильтру</button>
          </div>

          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Класс</th>
                  <th>ФИО ученика</th>
                  <th>Олимпиада / Конкурс</th>
                  <th>Кто зарегистрировал</th>
                  <th>Дата</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="journalTbody"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 3: Olympiads Management -->
      <section class="tab-panel" id="tab-olympiads">
        <div class="card section-card" style="margin-bottom:14px;">
          <div class="section-title"><span>Добавить олимпиаду вручную</span></div>
          <form id="addOlympiadForm" style="display:grid; gap:10px;">
            <input type="text" class="input" id="newOlTitle" placeholder="Название олимпиады или конкурса" required />
            <textarea class="textarea" id="newOlDesc" rows="2" placeholder="Описание (необязательно)"></textarea>
            <div>
              <button type="submit" class="btn btn-primary btn-sm">+ Добавить олимпиаду</button>
            </div>
          </form>
        </div>

        <div class="card section-card">
          <div class="section-title"><span>Опубликованные посты из темы «Олимпиады» (#15)</span></div>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Автор поста</th>
                  <th>Записей</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody id="olympiadsManageTbody"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- TAB 4: Directory (Classes, Students, Teachers + Excel Import) -->
      <section class="tab-panel" id="tab-directory">
        <div class="card section-card" style="margin-bottom:14px;">
          <div class="section-title">
            <span>Быстрый старт и шаблон Excel</span>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              <button type="button" class="btn btn-outline btn-sm" id="downloadTemplateBtn">📄 Скачать шаблон .xlsx</button>
              <button type="button" class="btn btn-outline btn-sm" id="seedDemoBtn">✨ Загрузить демо-данные</button>
              <button type="button" class="btn btn-danger btn-sm" id="clearDataBtn">🧹 Очистить списки</button>
            </div>
          </div>
          <p style="margin:0; font-size:13px; color:var(--muted);">
            Загружайте реальные списки учеников и учителей из Excel (.xlsx) или просто скопируйте два столбца из таблицы и вставьте в поля ниже.
          </p>
        </div>

        <div class="form-grid">
          <!-- Import Students -->
          <div class="card section-card">
            <div class="section-title"><span>Импорт учеников и классов</span></div>
            <div style="margin-bottom:10px;">
              <label class="btn btn-outline btn-sm" style="cursor:pointer;">
                📁 Выбрать Excel файл (.xlsx)
                <input type="file" id="studentsFileInput" accept=".xlsx" style="display:none;" />
              </label>
            </div>
            <textarea class="textarea" id="studentsBulkText" rows="5" placeholder="Или вставьте строки из Excel (Класс; ФИО ученика):&#10;7А; Иванов Артем&#10;7А; Нурланова Амина&#10;10Б; Ким Даниил"></textarea>
            <div style="margin-top:10px; display:flex; gap:8px;">
              <button type="button" class="btn btn-primary btn-sm" id="importStudentsTextBtn">Импортировать учеников</button>
            </div>

            <hr style="border:none; border-top:1px solid var(--line); margin:16px 0;" />
            <div style="font-weight:700; font-size:13px; margin-bottom:8px;">Добавить одного ученика</div>
            <form id="addStudentForm" style="display:flex; gap:8px; flex-wrap:wrap;">
              <input type="text" class="input" id="singleStudentClass" placeholder="Класс (напр. 9А)" style="width:130px;" required />
              <input type="text" class="input" id="singleStudentName" placeholder="ФИО ученика" style="flex:1; min-width:180px;" required />
              <button type="submit" class="btn btn-primary btn-sm">+</button>
            </form>
          </div>

          <!-- Import Teachers -->
          <div class="card section-card">
            <div class="section-title"><span>Импорт списка учителей</span></div>
            <div style="margin-bottom:10px;">
              <label class="btn btn-outline btn-sm" style="cursor:pointer;">
                📁 Выбрать Excel файл (.xlsx)
                <input type="file" id="teachersFileInput" accept=".xlsx" style="display:none;" />
              </label>
            </div>
            <textarea class="textarea" id="teachersBulkText" rows="5" placeholder="Или вставьте строки (ФИО учителя; Предмет; Telegram ID опц.):&#10;Абдуллина Гульнара Сериковна; Математика&#10;Ким Александр Викторович; Информатика"></textarea>
            <div style="margin-top:10px; display:flex; gap:8px;">
              <button type="button" class="btn btn-primary btn-sm" id="importTeachersTextBtn">Импортировать учителей</button>
            </div>

            <hr style="border:none; border-top:1px solid var(--line); margin:16px 0;" />
            <div style="font-weight:700; font-size:13px; margin-bottom:8px;">Добавить одного учителя</div>
            <form id="addTeacherForm" style="display:flex; gap:8px; flex-wrap:wrap;">
              <input type="text" class="input" id="singleTeacherName" placeholder="ФИО учителя" style="flex:1; min-width:180px;" required />
              <input type="text" class="input" id="singleTeacherSubject" placeholder="Предмет" style="width:140px;" />
              <button type="submit" class="btn btn-primary btn-sm">+</button>
            </form>
          </div>
        </div>

        <div class="two-col">
          <div class="card section-card">
            <div class="section-title">
              <span>Ученики по классам</span>
              <span class="pill pill-muted mono" id="dirStudentsCount">0</span>
            </div>
            <div style="display:flex; gap:8px; margin-bottom:10px;">
              <select class="native-select" id="dirClassFilter" style="max-width:160px;"><option value="">Все классы</option></select>
              <input type="text" class="input" id="dirStudentSearch" placeholder="Поиск ученика..." />
            </div>
            <div class="data-table-wrap" style="max-height:360px; overflow-y:auto;">
              <table class="data-table">
                <thead><tr><th>Класс</th><th>ФИО ученика</th><th></th></tr></thead>
                <tbody id="dirStudentsTbody"></tbody>
              </table>
            </div>
          </div>

          <div class="card section-card">
            <div class="section-title">
              <span>Список учителей</span>
              <span class="pill pill-muted mono" id="dirTeachersCount">0</span>
            </div>
            <div class="data-table-wrap" style="max-height:412px; overflow-y:auto;">
              <table class="data-table">
                <thead><tr><th>ФИО учителя</th><th>Предмет</th><th>Telegram</th><th></th></tr></thead>
                <tbody id="dirTeachersTbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <!-- Edit Olympiad Modal -->
  <div class="modal-backdrop" id="editOlModal">
    <div class="modal-box">
      <h3 style="margin:0 0 12px; font-family:var(--font-display); font-size:15px; color:var(--pine);">Редактировать олимпиаду</h3>
      <form id="editOlForm" style="display:grid; gap:10px;">
        <input type="hidden" id="editOlId" />
        <input type="text" class="input" id="editOlTitle" placeholder="Название олимпиады" required />
        <textarea class="textarea" id="editOlDesc" rows="5" placeholder="Описание"></textarea>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:6px;">
          <button type="button" class="btn btn-outline btn-sm" id="closeEditOlModal">Отмена</button>
          <button type="submit" class="btn btn-primary btn-sm">Сохранить</button>
        </div>
      </form>
    </div>
  </div>

  <div class="toast-stack" id="toastStack"></div>

  <script>
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    if (tg) {
      tg.ready();
      tg.expand();
      try { tg.setHeaderColor('#12372A'); } catch {}
    }

    const state = {
      token: localStorage.getItem('ngs_admin_token') || '',
      data: null,
      openOlympiads: new Set()
    };

    const $ = (id) => document.getElementById(id);

    function escapeHtml(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function toast(msg, isError = false) {
      const el = document.createElement('div');
      el.className = 'toast' + (isError ? ' error' : '');
      el.textContent = msg;
      $('toastStack').appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.25s ease';
        setTimeout(() => el.remove(), 260);
      }, 3300);
    }

    function formatDate(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }

    function authHeaders(extra = {}) {
      const h = { 'Content-Type': 'application/json', ...extra };
      if (state.token) h['Authorization'] = 'Bearer ' + state.token;
      if (tg && tg.initData) h['X-Telegram-Init-Data'] = tg.initData;
      return h;
    }

    async function adminFetch(url, options = {}) {
      const res = await fetch(url, { ...options, headers: authHeaders(options.headers || {}) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        showLogin();
        throw new Error(data.error || 'Требуется вход');
      }
      if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
      return data;
    }

    function showLogin() {
      $('loginView').style.display = 'block';
      $('adminApp').style.display = 'none';
      $('topExportBtn').style.display = 'none';
      $('logoutBtn').style.display = 'none';
    }

    function showDashboard() {
      $('loginView').style.display = 'none';
      $('adminApp').style.display = 'block';
      $('topExportBtn').style.display = 'inline-flex';
      $('logoutBtn').style.display = 'inline-flex';
    }

    function downloadExcel(params = {}) {
      const qs = new URLSearchParams();
      if (state.token) qs.set('token', state.token);
      Object.entries(params).forEach(([k, v]) => {
        if (v) qs.set(k, v);
      });
      const url = '/api/admin/export?' + qs.toString();
      // Используем fetch -> blob, чтобы корректно передавались и Telegram initData, и Bearer token
      fetch(url, { headers: authHeaders() })
        .then(async (res) => {
          if (!res.ok) throw new Error('Не удалось сформировать Excel-файл');
          const blob = await res.blob();
          const link = document.createElement('a');
          const objUrl = URL.createObjectURL(blob);
          link.href = objUrl;
          link.download = 'ngs-olympiads-report-' + new Date().toISOString().slice(0, 10) + '.xlsx';
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
          toast('✓ Excel-отчёт (.xlsx) скачан');
        })
        .catch((err) => toast(err.message, true));
    }

    function downloadTemplate() {
      fetch('/api/admin/template', { headers: authHeaders() })
        .then(async (res) => {
          if (!res.ok) throw new Error('Ошибка скачивания шаблона');
          const blob = await res.blob();
          const link = document.createElement('a');
          const objUrl = URL.createObjectURL(blob);
          link.href = objUrl;
          link.download = 'ngs-import-template.xlsx';
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
        })
        .catch((err) => toast(err.message, true));
    }

    async function loadOverview() {
      try {
        const data = await adminFetch('/api/admin/overview');
        state.data = data;
        showDashboard();
        $('defaultPassWarn').style.display = data.usingDefaultPassword ? 'flex' : 'none';
        renderKpis();
        renderOlympiadStats();
        renderTeacherAndClassStats();
        populateJournalFilters();
        renderJournalTable();
        renderOlympiadsManage();
        renderDirectory();
      } catch (err) {
        if ($('adminApp').style.display !== 'none') toast(err.message, true);
      }
    }

    function renderKpis() {
      const k = state.data.kpis;
      const coverage = k.total_students > 0
        ? Math.round((k.unique_students_registered / k.total_students) * 100)
        : 0;
      $('kpiGrid').innerHTML =
        '<div class="kpi-card">' +
          '<div class="kpi-label">Олимпиады (Тема 15)</div>' +
          '<div class="kpi-val mono">' + k.active_olympiads + '</div>' +
          '<div class="kpi-sub">Всего в базе: ' + k.total_olympiads + '</div>' +
        '</div>' +
        '<div class="kpi-card">' +
          '<div class="kpi-label">Всего регистраций</div>' +
          '<div class="kpi-val mono">' + k.total_registrations + '</div>' +
          '<div class="kpi-sub">С учётом нескольких на ученика</div>' +
        '</div>' +
        '<div class="kpi-card">' +
          '<div class="kpi-label">Уникальных учеников</div>' +
          '<div class="kpi-val mono">' + k.unique_students_registered + ' <span style="font-size:15px; color:var(--gold);">(' + coverage + '%)</span></div>' +
          '<div class="kpi-sub">Из ' + k.total_students + ' учеников в ' + k.total_classes + ' классах</div>' +
        '</div>' +
        '<div class="kpi-card">' +
          '<div class="kpi-label">Активных учителей</div>' +
          '<div class="kpi-val mono">' + k.active_registrars + '</div>' +
          '<div class="kpi-sub">В справочнике: ' + k.total_teachers + '</div>' +
        '</div>';
    }

    function renderOlympiadStats() {
      const list = state.data.olympiads || [];
      if (list.length === 0) {
        $('olympiadStatsList').innerHTML = '<div class="empty-state"><h3>Нет олимпиад</h3><p>Опубликованные посты из темы 15 появятся здесь автоматически.</p></div>';
        return;
      }

      const maxRegs = Math.max(1, ...list.map((o) => o.registrations_count || 0));

      $('olympiadStatsList').innerHTML = list.map((ol) => {
        const isOpen = state.openOlympiads.has(ol.id);
        const pct = Math.round(((ol.registrations_count || 0) / maxRegs) * 100);
        const breakdown = Object.entries(ol.class_breakdown || {})
          .map(([cls, cnt]) => '<span class="pill pill-pine mono">' + escapeHtml(cls) + ': ' + cnt + '</span>')
          .join(' ');

        const participantsRows = (ol.participants || []).length > 0
          ? '<div class="data-table-wrap"><table class="data-table">' +
              '<thead><tr><th>#</th><th>Класс</th><th>ФИО ученика</th><th>Кто зарегистрировал</th><th>Дата</th></tr></thead>' +
              '<tbody>' + ol.participants.map((p, i) => (
                '<tr>' +
                  '<td class="mono">' + (i + 1) + '</td>' +
                  '<td><span class="pill pill-pine mono">' + escapeHtml(p.class_name) + '</span></td>' +
                  '<td style="font-weight:600;">' + escapeHtml(p.student_name) + '</td>' +
                  '<td>' + escapeHtml(p.registered_by_name) + '</td>' +
                  '<td class="mono" style="font-size:12px; color:var(--muted);">' + formatDate(p.created_at) + '</td>' +
                '</tr>'
              )).join('') + '</tbody></table></div>'
          : '<div style="font-size:13px; color:var(--muted);">На эту олимпиаду пока никто не зарегистрирован.</div>';

        return (
          '<div class="ol-stat-card' + (isOpen ? ' open' : '') + '" data-ol-card="' + ol.id + '">' +
            '<div class="ol-stat-head" data-toggle-card="' + ol.id + '">' +
              '<div>' +
                '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">' +
                  '<span class="pill ' + (ol.is_active ? 'pill-emerald' : 'pill-muted') + '">' + (ol.is_active ? 'Активна' : 'Архив') + '</span>' +
                  '<span class="mono" style="font-size:12px; color:var(--muted);">' + formatDate(ol.published_at) + '</span>' +
                '</div>' +
                '<h3 class="ol-stat-title">' + escapeHtml(ol.title) + '</h3>' +
                '<div style="display:flex; flex-wrap:wrap; gap:6px;">' + (breakdown || '<span style="font-size:12.5px; color:var(--muted);">Пока 0 регистраций</span>') + '</div>' +
                '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%;"></div></div>' +
              '</div>' +
              '<div style="display:flex; align-items:center; gap:10px;">' +
                '<div style="text-align:right;">' +
                  '<div class="mono" style="font-size:22px; font-weight:700; color:var(--pine);">' + (ol.registrations_count || 0) + '</div>' +
                  '<div style="font-size:11.5px; color:var(--muted);">учеников</div>' +
                '</div>' +
                '<button type="button" class="btn btn-outline btn-sm" data-export-ol="' + ol.id + '">📥 Excel</button>' +
              '</div>' +
            '</div>' +
            '<div class="ol-stat-body">' + participantsRows + '</div>' +
          '</div>'
        );
      }).join('');

      $('olympiadStatsList').querySelectorAll('[data-toggle-card]').forEach((el) => {
        el.onclick = (e) => {
          if (e.target.closest('[data-export-ol]')) return;
          const id = Number(el.dataset.toggleCard);
          if (state.openOlympiads.has(id)) state.openOlympiads.delete(id);
          else state.openOlympiads.add(id);
          renderOlympiadStats();
        };
      });

      $('olympiadStatsList').querySelectorAll('[data-export-ol]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          downloadExcel({ olympiadId: btn.dataset.exportOl });
        };
      });
    }

    function renderTeacherAndClassStats() {
      const tStats = state.data.teacherStats || [];
      $('teacherStatsBox').innerHTML = tStats.length > 0
        ? tStats.map((t, i) => (
            '<div class="stat-row">' +
              '<div>' +
                '<div style="font-weight:600;">' + (i + 1) + '. ' + escapeHtml(t.name) + '</div>' +
                '<div style="font-size:12px; color:var(--muted);">Учеников: ' + t.unique_students + ' • Олимпиад: ' + t.unique_olympiads + '</div>' +
              '</div>' +
              '<span class="pill pill-gold mono">' + t.registrations_count + ' зап.</span>' +
            '</div>'
          )).join('')
        : '<div style="color:var(--muted); font-size:13px;">Пока нет регистраций от учителей.</div>';

      const cStats = state.data.classStats || [];
      $('classStatsBox').innerHTML = cStats.length > 0
        ? cStats.map((c) => {
            const pct = c.total_students > 0 ? Math.round((c.registered_students / c.total_students) * 100) : 0;
            return (
              '<div class="stat-row" style="flex-direction:column; align-items:stretch; gap:5px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                  '<span style="font-weight:700;">Класс ' + escapeHtml(c.name) + '</span>' +
                  '<span class="mono" style="font-size:12.5px; color:var(--pine);">' + c.registered_students + '/' + c.total_students + ' уч. (' + pct + '%) • ' + c.total_registrations + ' зап.</span>' +
                '</div>' +
                '<div class="progress-track" style="max-width:none; margin-top:0;"><div class="progress-fill" style="width:' + pct + '%;"></div></div>' +
              '</div>'
            );
          }).join('')
        : '<div style="color:var(--muted); font-size:13px;">Классы ещё не добавлены.</div>';
    }

    function populateJournalFilters() {
      const curOl = $('fOlympiad').value;
      const curCl = $('fClass').value;
      const curT = $('fTeacher').value;

      $('fOlympiad').innerHTML = '<option value="">Все олимпиады</option>' +
        (state.data.olympiads || []).map((o) => '<option value="' + o.id + '">' + escapeHtml(o.title) + '</option>').join('');
      $('fClass').innerHTML = '<option value="">Все классы</option>' +
        (state.data.classStats || []).map((c) => '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>').join('');

      const teacherNames = [...new Set((state.data.allRegistrations || []).map((r) => r.registered_by_name).filter(Boolean))].sort();
      $('fTeacher').innerHTML = '<option value="">Все учителя</option>' +
        teacherNames.map((n) => '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>').join('');

      $('fOlympiad').value = curOl;
      $('fClass').value = curCl;
      $('fTeacher').value = curT;
    }

    function getFilteredRegistrations() {
      const olId = $('fOlympiad').value;
      const clId = $('fClass').value;
      const tName = $('fTeacher').value;
      const q = ($('fSearch').value || '').trim().toLowerCase();

      return (state.data.allRegistrations || []).filter((r) => {
        if (olId && String(r.olympiad_id) !== olId) return false;
        if (clId && String(r.class_id) !== clId) return false;
        if (tName && r.registered_by_name !== tName) return false;
        if (q && !(
          String(r.student_name || '').toLowerCase().includes(q) ||
          String(r.olympiad_title || '').toLowerCase().includes(q) ||
          String(r.registered_by_name || '').toLowerCase().includes(q)
        )) return false;
        return true;
      });
    }

    function renderJournalTable() {
      const rows = getFilteredRegistrations();
      $('journalCountPill').textContent = rows.length + ' записей';

      if (rows.length === 0) {
        $('journalTbody').innerHTML = '<tr><td colspan="7" style="text-align:center; padding:28px; color:var(--muted);">Регистраций по выбранным фильтрам нет.</td></tr>';
        return;
      }

      $('journalTbody').innerHTML = rows.map((r, i) => (
        '<tr>' +
          '<td class="mono">' + (i + 1) + '</td>' +
          '<td><span class="pill pill-pine mono">' + escapeHtml(r.class_name) + '</span></td>' +
          '<td style="font-weight:600;">' + escapeHtml(r.student_name) + '</td>' +
          '<td>' + escapeHtml(r.olympiad_title) + '</td>' +
          '<td>' +
            '<div>' + escapeHtml(r.registered_by_name) + '</div>' +
            (r.registered_by_tg_username ? '<div class="mono" style="font-size:11.5px; color:var(--muted);">@' + escapeHtml(r.registered_by_tg_username) + '</div>' : '') +
          '</td>' +
          '<td class="mono" style="font-size:12px; color:var(--muted); white-space:nowrap;">' + formatDate(r.created_at) + '</td>' +
          '<td><button type="button" class="btn btn-danger btn-sm" data-del-reg="' + r.id + '">×</button></td>' +
        '</tr>'
      )).join('');

      $('journalTbody').querySelectorAll('[data-del-reg]').forEach((btn) => {
        btn.onclick = async () => {
          if (!confirm('Удалить эту регистрацию?')) return;
          try {
            await adminFetch('/api/registrations?id=' + btn.dataset.delReg, { method: 'DELETE' });
            toast('Регистрация удалена');
            await loadOverview();
          } catch (err) {
            toast(err.message, true);
          }
        };
      });
    }

    function renderOlympiadsManage() {
      const list = state.data.olympiads || [];
      if (list.length === 0) {
        $('olympiadsManageTbody').innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--muted);">Нет олимпиад.</td></tr>';
        return;
      }

      $('olympiadsManageTbody').innerHTML = list.map((o) => (
        '<tr>' +
          '<td class="mono">#' + o.id + '</td>' +
          '<td>' +
            '<div style="font-weight:600;">' + escapeHtml(o.title) + '</div>' +
            '<div style="font-size:12px; color:var(--muted); max-width:420px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(o.description || '') + '</div>' +
          '</td>' +
          '<td>' + escapeHtml(o.author_name || '—') + '</td>' +
          '<td class="mono" style="font-weight:700;">' + (o.registrations_count || 0) + '</td>' +
          '<td><span class="pill ' + (o.is_active ? 'pill-emerald' : 'pill-muted') + '">' + (o.is_active ? 'Активна' : 'Архив') + '</span></td>' +
          '<td style="white-space:nowrap;">' +
            '<button type="button" class="btn btn-outline btn-sm" data-edit-ol="' + o.id + '">Изменить</button> ' +
            '<button type="button" class="btn btn-outline btn-sm" data-toggle-ol-active="' + o.id + '">' + (o.is_active ? 'В архив' : 'Активировать') + '</button> ' +
            '<button type="button" class="btn btn-danger btn-sm" data-del-ol="' + o.id + '">Удалить</button>' +
          '</td>' +
        '</tr>'
      )).join('');

      $('olympiadsManageTbody').querySelectorAll('[data-edit-ol]').forEach((btn) => {
        btn.onclick = () => {
          const ol = list.find((x) => Number(x.id) === Number(btn.dataset.editOl));
          if (!ol) return;
          $('editOlId').value = ol.id;
          $('editOlTitle').value = ol.title;
          $('editOlDesc').value = ol.description || '';
          $('editOlModal').classList.add('open');
        };
      });

      $('olympiadsManageTbody').querySelectorAll('[data-toggle-ol-active]').forEach((btn) => {
        btn.onclick = async () => {
          const ol = list.find((x) => Number(x.id) === Number(btn.dataset.toggleOlActive));
          if (!ol) return;
          try {
            await adminFetch('/api/admin/olympiads/' + ol.id, {
              method: 'PATCH',
              body: JSON.stringify({ is_active: !ol.is_active })
            });
            toast(ol.is_active ? 'Перенесено в архив' : 'Олимпиада активирована');
            await loadOverview();
          } catch (err) { toast(err.message, true); }
        };
      });

      $('olympiadsManageTbody').querySelectorAll('[data-del-ol]').forEach((btn) => {
        btn.onclick = async () => {
          if (!confirm('Удалить олимпиаду и все её регистрации?')) return;
          try {
            await adminFetch('/api/admin/olympiads/' + btn.dataset.delOl, { method: 'DELETE' });
            toast('Олимпиада удалена');
            await loadOverview();
          } catch (err) { toast(err.message, true); }
        };
      });
    }

    function renderDirectory() {
      const curCls = $('dirClassFilter').value;
      $('dirClassFilter').innerHTML = '<option value="">Все классы</option>' +
        (state.data.classStats || []).map((c) => '<option value="' + c.id + '">' + escapeHtml(c.name) + ' (' + c.total_students + ')</option>').join('');
      $('dirClassFilter').value = curCls;

      const clsFilter = $('dirClassFilter').value;
      const q = ($('dirStudentSearch').value || '').trim().toLowerCase();
      const students = (state.data.students || []).filter((s) => {
        if (clsFilter && String(s.class_id) !== clsFilter) return false;
        if (q && !s.full_name.toLowerCase().includes(q) && !s.class_name.toLowerCase().includes(q)) return false;
        return true;
      });

      $('dirStudentsCount').textContent = students.length + ' уч.';
      $('dirStudentsTbody').innerHTML = students.length > 0
        ? students.map((s) => (
            '<tr>' +
              '<td><span class="pill pill-pine mono">' + escapeHtml(s.class_name) + '</span></td>' +
              '<td style="font-weight:500;">' + escapeHtml(s.full_name) + '</td>' +
              '<td style="text-align:right;"><button type="button" class="btn btn-danger btn-sm" data-del-student="' + s.id + '">×</button></td>' +
            '</tr>'
          )).join('')
        : '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--muted);">Список учеников пуст.</td></tr>';

      $('dirStudentsTbody').querySelectorAll('[data-del-student]').forEach((btn) => {
        btn.onclick = async () => {
          try {
            await adminFetch('/api/admin/students/' + btn.dataset.delStudent, { method: 'DELETE' });
            toast('Ученик удалён');
            await loadOverview();
          } catch (err) { toast(err.message, true); }
        };
      });

      const teachers = state.data.teachers || [];
      $('dirTeachersCount').textContent = teachers.length + ' уч.';
      $('dirTeachersTbody').innerHTML = teachers.length > 0
        ? teachers.map((t) => (
            '<tr>' +
              '<td style="font-weight:600;">' + escapeHtml(t.full_name) + '</td>' +
              '<td>' + escapeHtml(t.subject || '—') + '</td>' +
              '<td class="mono" style="font-size:12px;">' + (t.telegram_username ? '@' + escapeHtml(t.telegram_username) : (t.telegram_id || '—')) + '</td>' +
              '<td style="text-align:right;"><button type="button" class="btn btn-danger btn-sm" data-del-teacher="' + t.id + '">×</button></td>' +
            '</tr>'
          )).join('')
        : '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">Список учителей пуст.</td></tr>';

      $('dirTeachersTbody').querySelectorAll('[data-del-teacher]').forEach((btn) => {
        btn.onclick = async () => {
          try {
            await adminFetch('/api/admin/teachers/' + btn.dataset.delTeacher, { method: 'DELETE' });
            toast('Учитель удалён');
            await loadOverview();
          } catch (err) { toast(err.message, true); }
        };
      });
    }

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = String(reader.result || '');
          const idx = res.indexOf(',');
          resolve(idx >= 0 ? res.slice(idx + 1) : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Tabs
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + btn.dataset.tab));
      };
    });

    // Login
    $('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      $('loginError').style.display = 'none';
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ password: $('adminPasswordInput').value })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Неверный пароль');
        state.token = data.token;
        localStorage.setItem('ngs_admin_token', data.token);
        $('adminPasswordInput').value = '';
        await loadOverview();
      } catch (err) {
        $('loginError').textContent = err.message;
        $('loginError').style.display = 'block';
      }
    };

    $('logoutBtn').onclick = () => {
      state.token = '';
      localStorage.removeItem('ngs_admin_token');
      showLogin();
    };

    // Export handlers
    $('topExportBtn').onclick = () => downloadExcel();
    $('exportFullBtn2').onclick = () => downloadExcel();
    $('exportFilteredBtn').onclick = () => downloadExcel({
      olympiadId: $('fOlympiad').value,
      classId: $('fClass').value,
      teacher: $('fTeacher').value,
      q: $('fSearch').value
    });
    $('downloadTemplateBtn').onclick = downloadTemplate;

    ['fOlympiad', 'fClass', 'fTeacher', 'fSearch'].forEach((id) => {
      $(id).addEventListener(id === 'fSearch' ? 'input' : 'change', renderJournalTable);
    });
    $('dirClassFilter').onchange = renderDirectory;
    $('dirStudentSearch').oninput = renderDirectory;

    // Olympiad CRUD
    $('addOlympiadForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await adminFetch('/api/admin/olympiads', {
          method: 'POST',
          body: JSON.stringify({ title: $('newOlTitle').value, description: $('newOlDesc').value })
        });
        $('newOlTitle').value = '';
        $('newOlDesc').value = '';
        toast('✓ Олимпиада добавлена');
        await loadOverview();
      } catch (err) { toast(err.message, true); }
    };

    $('closeEditOlModal').onclick = () => $('editOlModal').classList.remove('open');
    $('editOlForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await adminFetch('/api/admin/olympiads/' + $('editOlId').value, {
          method: 'PATCH',
          body: JSON.stringify({ title: $('editOlTitle').value, description: $('editOlDesc').value })
        });
        $('editOlModal').classList.remove('open');
        toast('✓ Олимпиада обновлена');
        await loadOverview();
      } catch (err) { toast(err.message, true); }
    };

    // Single student / teacher
    $('addStudentForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await adminFetch('/api/admin/students', {
          method: 'POST',
          body: JSON.stringify({ class_name: $('singleStudentClass').value, full_name: $('singleStudentName').value })
        });
        $('singleStudentName').value = '';
        toast('✓ Ученик добавлен');
        await loadOverview();
      } catch (err) { toast(err.message, true); }
    };

    $('addTeacherForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await adminFetch('/api/admin/teachers', {
          method: 'POST',
          body: JSON.stringify({ full_name: $('singleTeacherName').value, subject: $('singleTeacherSubject').value })
        });
        $('singleTeacherName').value = '';
        $('singleTeacherSubject').value = '';
        toast('✓ Учитель добавлен');
        await loadOverview();
      } catch (err) { toast(err.message, true); }
    };

    // Bulk imports
    $('importStudentsTextBtn').onclick = async () => {
      const text = $('studentsBulkText').value.trim();
      if (!text) return toast('Вставьте список учеников', true);
      try {
        const r = await adminFetch('/api/admin/import/students', { method: 'POST', body: JSON.stringify({ text }) });
        $('studentsBulkText').value = '';
        toast('✓ Импортировано учеников: ' + r.imported + ' (классов: ' + r.classesProcessed + ')');
        await loadOverview();
      } catch (err) { toast(err.message, true); }
    };

    $('studentsFileInput').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const fileBase64 = await fileToBase64(file);
        const r = await adminFetch('/api/admin/import/students', { method: 'POST', body: JSON.stringify({ fileBase64 }) });
        toast('✓ Из Excel загружено учеников: ' + r.imported + ' (классов: ' + r.classesProcessed + ')');
        await loadOverview();
      } catch (err) { toast(err.message, true); }
      e.target.value = '';
    };

    $('importTeachersTextBtn').onclick = async () => {
      const text = $('teachersBulkText').value.trim();
      if (!text) return toast('Вставьте список учителей', true);
      try {
        const r = await adminFetch('/api/admin/import/teachers', { method: 'POST', body: JSON.stringify({ text }) });
        $('teachersBulkText').value = '';
        toast('✓ Импортировано учителей: ' + r.imported);
        await loadOverview();
      } catch (err) { toast(err.message, true); }
    };

    $('teachersFileInput').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const fileBase64 = await fileToBase64(file);
        const r = await adminFetch('/api/admin/import/teachers', { method: 'POST', body: JSON.stringify({ fileBase64 }) });
        toast('✓ Из Excel загружено учителей: ' + r.imported);
        await loadOverview();
      } catch (err) { toast(err.message, true); }
      e.target.value = '';
    };

    $('seedDemoBtn').onclick = async () => {
      try {
        const r = await adminFetch('/api/admin/demo/seed', { method: 'POST' });
        toast('✓ Демо-данные загружены (учеников: +' + r.studentsAdded + ', учителей: +' + r.teachersAdded + ')');
        await loadOverview();
      } catch (err) { toast(err.message, true); }
    };

    $('clearDataBtn').onclick = async () => {
      if (!confirm('Очистить все классы, учеников, учителей и регистрации? Олимпиады из темы 15 останутся.')) return;
      try {
        await adminFetch('/api/admin/demo/clear', { method: 'POST', body: JSON.stringify({ clearOlympiads: false }) });
        toast('✓ База учеников и учителей очищена');
        await loadOverview();
      } catch (err) { toast(err.message, true); }
    };

    // Автоматический вход (если токен уже сохранён или открыто из Telegram супермодератором)
    (async function boot() {
      if (state.token || (tg && tg.initData)) {
        try {
          await loadOverview();
          return;
        } catch {}
      }
      showLogin();
    })();
  </script>
</body>
</html>`;
}
