import { SHARED_STYLES, TELEGRAM_WEBAPP_INIT } from './shared-styles.js';

export function renderMiniAppHtml() {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>NGS Олимпиадник — Регистрация учеников</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    ${SHARED_STYLES}

    .hero-grid {
      display: grid;
      grid-template-columns: 1.35fr 1fr;
      gap: 14px;
      margin-top: 16px;
    }

    .spotlight-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 18px 20px;
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
    }

    .spotlight-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      background: linear-gradient(180deg, var(--gold-bright), var(--pine));
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 8px;
    }

    .spotlight-title {
      font-family: var(--font-display);
      font-size: 16px;
      line-height: 1.35;
      margin: 0 0 8px;
      color: var(--pine);
    }

    .spotlight-desc {
      font-size: 13.5px;
      color: var(--ink-2);
      margin: 0 0 12px;
      white-space: pre-line;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .spotlight-desc.expanded {
      -webkit-line-clamp: unset;
      display: block;
    }

    .spotlight-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
    }

    .expand-link {
      background: none;
      border: none;
      padding: 0;
      color: var(--pine);
      font-weight: 600;
      font-size: 12.5px;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .teacher-card {
      background: var(--bg-elevated);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    }

    .field-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }

    /* Custom Floating Select */
    .floating-select-wrap {
      position: relative;
    }

    .select-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 16px;
      background: var(--surface);
      border: 1.5px solid var(--line-strong);
      border-radius: 15px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.12s ease;
    }

    .select-trigger:hover {
      border-color: var(--pine);
    }

    .select-trigger.open {
      border-color: var(--pine);
      box-shadow: 0 0 0 4px rgba(18, 55, 42, 0.1);
    }

    .select-trigger-main {
      display: flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
    }

    .class-badge-lg {
      min-width: 48px;
      height: 36px;
      padding: 0 10px;
      border-radius: 10px;
      background: var(--pine);
      color: #FFFDF8;
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 600;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .class-badge-lg.placeholder {
      background: var(--gold-soft);
      color: #9A5104;
    }

    .trigger-text-title {
      font-weight: 700;
      font-size: 15px;
      color: var(--ink);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trigger-text-sub {
      font-size: 12.5px;
      color: var(--muted);
    }

    .chevron {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--surface-tint);
      display: grid;
      place-items: center;
      flex-shrink: 0;
      transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), background 0.16s ease;
    }

    .select-trigger.open .chevron {
      transform: rotate(180deg);
      background: var(--pine-soft);
      color: var(--pine);
    }

    .popover-panel {
      position: absolute;
      left: 0;
      right: 0;
      top: calc(100% + 8px);
      z-index: 80;
      background: var(--surface);
      border: 1.5px solid var(--pine);
      border-radius: 18px;
      box-shadow: var(--shadow-pop);
      padding: 12px;
      display: none;
      animation: popIn 0.18s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .popover-panel.open { display: block; }

    .grade-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 10px 0;
    }

    .grade-pill {
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--surface-tint);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.14s ease;
    }

    .grade-pill.active {
      background: var(--pine);
      color: #FFFDF8;
      border-color: var(--pine);
    }

    .class-options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 8px;
      max-height: 280px;
      overflow-y: auto;
      padding: 2px;
    }

    .class-option {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 11px 12px;
      border-radius: 13px;
      border: 1.5px solid var(--line);
      background: var(--bg-elevated);
      cursor: pointer;
      text-align: left;
      transition: all 0.14s ease;
    }

    .class-option:hover {
      border-color: var(--pine);
      background: var(--pine-soft);
      transform: translateY(-1px);
    }

    .class-option.selected {
      border-color: var(--pine);
      background: var(--pine);
      color: #FFFDF8;
    }

    .class-option-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .class-option-name {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 600;
    }

    .class-option-stats {
      font-size: 11.5px;
      opacity: 0.78;
    }

    .teacher-options-list {
      max-height: 240px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
    }

    .teacher-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 11px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      text-align: left;
      width: 100%;
    }

    .teacher-option:hover {
      background: var(--surface-tint);
      border-color: var(--line);
    }

    .teacher-option.selected {
      background: var(--pine-soft);
      border-color: var(--pine);
      font-weight: 600;
    }

    /* Olympiad Ticker Strip */
    .olympiad-strip-card {
      margin-top: 14px;
      padding: 14px 18px;
    }

    .strip-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .strip-scroll {
      display: flex;
      gap: 9px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: thin;
    }

    .ol-chip {
      flex: 0 0 auto;
      max-width: 280px;
      padding: 9px 13px;
      border-radius: 13px;
      border: 1.5px solid var(--line);
      background: var(--bg-elevated);
      cursor: pointer;
      text-align: left;
      transition: all 0.14s ease;
    }

    .ol-chip:hover { border-color: var(--pine); }

    .ol-chip.active {
      border-color: var(--pine);
      background: var(--pine);
      color: #FFFDF8;
    }

    .ol-chip-title {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ol-chip-meta {
      font-size: 11.5px;
      opacity: 0.76;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Selector + Students Table Card */
    .workspace-card {
      margin-top: 14px;
      padding: 20px;
    }

    .class-selector-row {
      display: grid;
      grid-template-columns: minmax(260px, 420px) 1fr;
      gap: 14px;
      align-items: end;
    }

    .table-tools {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
    }

    .filter-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .filter-btn {
      padding: 7px 12px;
      border-radius: 10px;
      border: 1px solid var(--line);
      background: var(--surface-tint);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }

    .filter-btn.active {
      background: var(--pine);
      color: #FFFDF8;
      border-color: var(--pine);
    }

    .students-table-wrap {
      margin-top: 14px;
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: visible;
      background: var(--surface);
    }

    table.students-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .students-table thead th {
      text-align: left;
      padding: 12px 14px;
      background: var(--surface-tint);
      border-bottom: 1.5px solid var(--line);
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .students-table thead th:first-child { border-top-left-radius: 15px; width: 52px; }
    .students-table thead th:last-child { border-top-right-radius: 15px; width: 300px; }

    .students-table tbody tr {
      transition: background 0.14s ease;
    }

    .students-table tbody tr:hover {
      background: #FCFBF7;
    }

    .students-table tbody td {
      padding: 13px 14px;
      border-bottom: 1px solid #EFEAE0;
      vertical-align: top;
    }

    .students-table tbody tr:last-child td {
      border-bottom: none;
    }

    .student-idx {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--muted);
      padding-top: 2px;
    }

    .student-name {
      font-weight: 700;
      font-size: 15px;
      color: var(--ink);
    }

    .student-sub {
      font-size: 12px;
      color: var(--muted);
      margin-top: 2px;
    }

    .reg-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .reg-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 9px 5px 10px;
      border-radius: 10px;
      background: var(--emerald-soft);
      border: 1px solid rgba(22, 110, 76, 0.22);
      color: #0E4D35;
      font-size: 12.5px;
      font-weight: 600;
      max-width: 100%;
    }

    .reg-tag-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 240px;
    }

    .reg-tag-by {
      font-size: 11px;
      font-weight: 500;
      color: #2B6D53;
      opacity: 0.85;
    }

    .reg-tag-remove {
      border: none;
      background: rgba(14, 77, 53, 0.12);
      color: #0E4D35;
      width: 19px;
      height: 19px;
      border-radius: 6px;
      display: grid;
      place-items: center;
      cursor: pointer;
      font-size: 13px;
      line-height: 1;
      flex-shrink: 0;
    }

    .reg-tag-remove:hover {
      background: var(--coral);
      color: #FFF;
    }

    /* Row Olympiad Select Control */
    .row-select-cell {
      display: flex;
      align-items: center;
      gap: 7px;
      position: relative;
    }

    .row-ol-trigger {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 11px;
      border: 1.5px solid var(--line-strong);
      background: var(--bg-elevated);
      font-size: 13px;
      font-weight: 600;
      color: var(--pine);
      cursor: pointer;
      transition: all 0.14s ease;
    }

    .row-ol-trigger:hover {
      border-color: var(--pine);
      background: var(--pine-soft);
    }

    .quick-pin-btn {
      padding: 8px 10px;
      border-radius: 11px;
      border: 1.5px solid var(--line);
      background: var(--surface);
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.14s ease;
    }

    .quick-pin-btn.registered {
      background: var(--emerald);
      border-color: var(--emerald);
      color: #FFF;
    }

    .quick-pin-btn:not(.registered):hover {
      border-color: var(--gold);
      background: var(--gold-soft);
      color: #9A5104;
    }

    /* Floating Olympiad Multi-Select Popover (Portal fixed) */
    .ol-popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: 190;
      background: rgba(18, 55, 42, 0.22);
      display: none;
    }

    .ol-popover-backdrop.open { display: block; }

    .ol-popover {
      position: fixed;
      z-index: 200;
      width: min(390px, calc(100vw - 24px));
      background: var(--surface);
      border: 1.5px solid var(--pine);
      border-radius: 18px;
      box-shadow: var(--shadow-pop);
      padding: 12px;
      display: none;
      animation: popIn 0.16s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .ol-popover.open { display: block; }

    .ol-popover-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .ol-popover-student {
      font-weight: 700;
      font-size: 13.5px;
      color: var(--pine);
    }

    .ol-popover-list {
      margin-top: 8px;
      max-height: 290px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .ol-option {
      width: 100%;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 11px;
      border-radius: 12px;
      border: 1.5px solid var(--line);
      background: var(--bg-elevated);
      cursor: pointer;
      text-align: left;
      transition: all 0.14s ease;
    }

    .ol-option:hover {
      border-color: var(--pine);
      background: var(--surface);
    }

    .ol-option.checked {
      border-color: var(--emerald);
      background: var(--emerald-soft);
    }

    .ol-checkbox {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 2px solid var(--line-strong);
      display: grid;
      place-items: center;
      flex-shrink: 0;
      margin-top: 1px;
      font-size: 12px;
      font-weight: 800;
      background: var(--surface);
    }

    .ol-option.checked .ol-checkbox {
      background: var(--emerald);
      border-color: var(--emerald);
      color: #FFF;
    }

    .ol-option-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.35;
    }

    .ol-option-sub {
      font-size: 11.5px;
      color: var(--muted);
      margin-top: 3px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    .star-badge {
      background: var(--gold-soft);
      color: #9A5104;
      padding: 1px 6px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 10.5px;
    }

    @media (max-width: 860px) {
      .hero-grid { grid-template-columns: 1fr; }
      .class-selector-row { grid-template-columns: 1fr; }
    }

    @media (max-width: 700px) {
      .workspace-card { padding: 14px; }
      .students-table thead { display: none; }
      .students-table, .students-table tbody, .students-table tr, .students-table td {
        display: block;
        width: 100%;
      }
      .students-table tbody tr {
        padding: 12px 12px 14px;
        border-bottom: 1.5px solid var(--line);
      }
      .students-table tbody tr:last-child { border-bottom: none; }
      .students-table tbody td {
        padding: 4px 0;
        border: none;
      }
      .student-idx { display: none !important; }
      .row-select-cell { margin-top: 6px; }
      .ol-popover {
        left: 12px !important;
        right: 12px !important;
        width: auto !important;
        bottom: 14px !important;
        top: auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark">NGS</div>
        <div class="brand-text">
          <div class="brand-title">NGS Олимпиадник</div>
          <div class="brand-sub">Регистрация учеников • Тема «Олимпиады» #15</div>
        </div>
      </div>
      <div class="topbar-actions">
        <span id="topStatBadge" class="pill pill-gold mono" style="display:none;">0 зап.</span>
        <a href="/admin" class="btn btn-ghost-dark btn-sm">📊 Админ</a>
      </div>
    </header>

    <section class="hero-grid">
      <div class="spotlight-card" id="spotlightCard">
        <div class="eyebrow">★ Актуальная олимпиада из темы #15</div>
        <h1 class="spotlight-title" id="spotlightTitle">Загрузка олимпиад...</h1>
        <p class="spotlight-desc" id="spotlightDesc"></p>
        <div class="spotlight-meta" id="spotlightMeta"></div>
      </div>

      <div class="teacher-card">
        <div>
          <div class="field-label">
            <span>Кто регистрирует (Учитель)</span>
            <span id="tgIdentityBadge" class="pill pill-pine" style="display:none;">Telegram</span>
          </div>
          <div class="floating-select-wrap" id="teacherSelectWrap">
            <button type="button" class="select-trigger" id="teacherTrigger" style="padding:10px 13px;">
              <div class="select-trigger-main">
                <div>
                  <div class="trigger-text-title" id="teacherTriggerTitle">Выберите ФИО учителя...</div>
                  <div class="trigger-text-sub" id="teacherTriggerSub">Нужно для учёта кто кого записал</div>
                </div>
              </div>
              <span class="chevron">▾</span>
            </button>
            <div class="popover-panel" id="teacherPopover">
              <input type="text" class="input" id="teacherSearch" placeholder="Поиск учителя или введите ФИО..." />
              <div class="teacher-options-list" id="teacherOptions"></div>
              <div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--line); display:flex; gap:6px;">
                <input type="text" class="input" id="customTeacherInput" placeholder="Или введите своё ФИО вручную" style="padding:8px 10px; font-size:13px;" />
                <button type="button" class="btn btn-primary btn-sm" id="applyCustomTeacher">ОК</button>
              </div>
            </div>
          </div>
        </div>
        <div style="font-size:12px; color:var(--muted);">
          Один ученик может быть зарегистрирован сразу на несколько олимпиад и конкурсов.
        </div>
      </div>
    </section>

    <section class="card olympiad-strip-card" id="olympiadStripCard" style="display:none;">
      <div class="strip-head">
        <div class="field-label" style="margin:0;">
          <span>Все активные олимпиады и конкурсы (Тема 15)</span>
        </div>
        <span class="pill pill-muted mono" id="olympiadsCountBadge">0</span>
      </div>
      <div class="strip-scroll" id="olympiadStrip"></div>
    </section>

    <section class="card workspace-card">
      <div class="class-selector-row">
        <div>
          <div class="field-label">
            <span>Шаг 1 — Выберите класс</span>
            <span class="mono" id="classesCountLabel"></span>
          </div>
          <div class="floating-select-wrap" id="classSelectWrap">
            <button type="button" class="select-trigger" id="classTrigger">
              <div class="select-trigger-main">
                <div class="class-badge-lg placeholder" id="classBadgeLg">?</div>
                <div style="min-width:0;">
                  <div class="trigger-text-title" id="classTriggerTitle">Выберите класс из списка</div>
                  <div class="trigger-text-sub" id="classTriggerSub">Нажмите, чтобы открыть всплывающий список классов</div>
                </div>
              </div>
              <span class="chevron">▾</span>
            </button>

            <div class="popover-panel" id="classPopover">
              <input type="text" class="input" id="classSearch" placeholder="Быстрый поиск класса (например: 9А, 10Б)..." />
              <div class="grade-pills" id="gradePills"></div>
              <div class="class-options-grid" id="classOptionsGrid"></div>
            </div>
          </div>
        </div>

        <div id="classSummaryBox" style="display:none; padding: 12px 16px; border-radius: 15px; background: var(--surface-tint); border: 1px solid var(--line);">
          <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px;">
            <div>
              <div style="font-weight:700; font-size:14px; color:var(--pine);" id="classSummaryTitle"></div>
              <div style="font-size:12.5px; color:var(--muted);" id="classSummarySub"></div>
            </div>
            <span class="pill pill-emerald mono" id="classSummaryBadge"></span>
          </div>
        </div>
      </div>

      <div id="studentsSection" style="display:none;">
        <div class="table-tools">
          <div style="flex:1; min-width:210px; max-width:340px;">
            <input type="text" class="input" id="studentSearch" placeholder="🔎 Поиск ученика по фамилии..." style="padding:8px 12px; font-size:13.5px;" />
          </div>
          <div class="filter-group" id="studentFilterGroup">
            <button type="button" class="filter-btn active" data-filter="all">Все</button>
            <button type="button" class="filter-btn" data-filter="registered">С олимпиадами</button>
            <button type="button" class="filter-btn" data-filter="none">Без олимпиад</button>
          </div>
        </div>

        <div class="students-table-wrap">
          <table class="students-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ученик</th>
                <th>Зарегистрирован на олимпиады</th>
                <th>Выбрать олимпиаду</th>
              </tr>
            </thead>
            <tbody id="studentsTbody"></tbody>
          </table>
        </div>
      </div>

      <div id="studentsPlaceholder" class="empty-state">
        <div class="empty-state-icon">🎓</div>
        <h3>Выберите класс выше</h3>
        <p>После выбора класса здесь появится таблица учеников с выпадающим списком олимпиад для быстрой регистрации.</p>
      </div>
    </section>
  </div>

  <!-- Floating Olympiad Multi-Select Popover -->
  <div class="ol-popover-backdrop" id="olBackdrop"></div>
  <div class="ol-popover" id="olPopover">
    <div class="ol-popover-head">
      <div>
        <div class="ol-popover-student" id="olPopoverStudent">Ученик</div>
        <div style="font-size:11.5px; color:var(--muted);">Отметьте одну или несколько олимпиад</div>
      </div>
      <button type="button" class="btn btn-outline btn-sm" id="olPopoverClose">Готово</button>
    </div>
    <input type="text" class="input" id="olPopoverSearch" placeholder="Фильтр по названию олимпиады..." style="padding:8px 11px; font-size:13px;" />
    <div class="ol-popover-list" id="olPopoverList"></div>
  </div>

  <div class="toast-stack" id="toastStack"></div>

  <script>${TELEGRAM_WEBAPP_INIT}

    const state = {
      olympiads: [],
      classes: [],
      teachers: [],
      me: null,
      spotlightOlympiadId: null,
      selectedClassId: null,
      students: [],
      selectedGradeFilter: 'all',
      studentFilter: 'all',
      studentSearch: '',
      selectedTeacherId: null,
      selectedTeacherName: '',
      activePopoverStudentId: null,
      descExpanded: false
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

    function haptic(type = 'light') {
      try {
        if (tg && tg.HapticFeedback) {
          if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
          else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
          else tg.HapticFeedback.impactOccurred(type);
        }
      } catch {}
    }

    function toast(message, isError = false) {
      const el = document.createElement('div');
      el.className = 'toast' + (isError ? ' error' : '');
      el.textContent = message;
      $('toastStack').appendChild(el);
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.25s ease';
        setTimeout(() => el.remove(), 260);
      }, 3200);
    }

    function apiHeaders(extra = {}) {
      const headers = { 'Content-Type': 'application/json', ...extra };
      if (tg && tg.initData) {
        headers['X-Telegram-Init-Data'] = tg.initData;
      }
      return headers;
    }

    async function apiFetch(url, options = {}) {
      const res = await fetch(url, {
        ...options,
        headers: apiHeaders(options.headers || {})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
      return data;
    }

    function formatShortDate(iso) {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    }

    function parseStartOlympiadId() {
      const urlParams = new URLSearchParams(window.location.search);
      const fromQuery = urlParams.get('olympiad');
      if (fromQuery && /^\\d+$/.test(fromQuery)) return Number(fromQuery);

      const startParam =
        (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ||
        urlParams.get('tgWebAppStartParam') ||
        (state.me && state.me.startParam) ||
        '';
      const match = String(startParam).match(/^ol_(\\d+)$/);
      return match ? Number(match[1]) : null;
    }

    function renderSpotlight() {
      const ol = state.olympiads.find((o) => Number(o.id) === Number(state.spotlightOlympiadId)) || state.olympiads[0];
      if (!ol) {
        $('spotlightTitle').textContent = 'Пока нет опубликованных олимпиад';
        $('spotlightDesc').textContent = 'Как только супермодератор одобрит пост в теме «Олимпиады» (#15), он автоматически появится здесь.';
        $('spotlightMeta').innerHTML = '<span class="pill pill-muted">Ожидание публикаций из темы #15</span>';
        return;
      }

      state.spotlightOlympiadId = ol.id;
      $('spotlightTitle').textContent = ol.title;
      const descEl = $('spotlightDesc');
      descEl.textContent = ol.description || 'Подробности в посте Telegram-группы.';
      descEl.classList.toggle('expanded', state.descExpanded);

      const longText = (ol.description || '').length > 170;
      $('spotlightMeta').innerHTML =
        '<span class="pill pill-emerald mono">Записано: ' + (ol.registrations_count || 0) + '</span>' +
        '<span class="pill pill-muted">' + escapeHtml(ol.author_name || 'Модератор') + '</span>' +
        '<span class="mono">' + escapeHtml(formatShortDate(ol.published_at)) + '</span>' +
        (longText ? '<button type="button" class="expand-link" id="toggleDescBtn">' + (state.descExpanded ? 'Свернуть' : 'Читать полностью') + '</button>' : '');

      const toggleBtn = $('toggleDescBtn');
      if (toggleBtn) {
        toggleBtn.onclick = () => {
          state.descExpanded = !state.descExpanded;
          renderSpotlight();
        };
      }
    }

    function renderOlympiadStrip() {
      const card = $('olympiadStripCard');
      if (state.olympiads.length <= 1) {
        card.style.display = 'none';
        return;
      }
      card.style.display = 'block';
      $('olympiadsCountBadge').textContent = state.olympiads.length + ' шт.';
      $('olympiadStrip').innerHTML = state.olympiads.map((ol) => {
        const active = Number(ol.id) === Number(state.spotlightOlympiadId);
        return (
          '<button type="button" class="ol-chip' + (active ? ' active' : '') + '" data-ol-id="' + ol.id + '">' +
            '<div class="ol-chip-title">' + (active ? '★ ' : '') + escapeHtml(ol.title) + '</div>' +
            '<div class="ol-chip-meta">' +
              '<span class="mono">' + (ol.registrations_count || 0) + ' уч.</span>' +
              '<span>• ' + escapeHtml(formatShortDate(ol.published_at)) + '</span>' +
            '</div>' +
          '</button>'
        );
      }).join('');

      $('olympiadStrip').querySelectorAll('.ol-chip').forEach((btn) => {
        btn.onclick = () => {
          state.spotlightOlympiadId = Number(btn.dataset.olId);
          state.descExpanded = false;
          renderSpotlight();
          renderOlympiadStrip();
          if (state.selectedClassId) renderStudentsTable();
          haptic('light');
        };
      });
    }

    function renderTeacherSelector() {
      const titleEl = $('teacherTriggerTitle');
      const subEl = $('teacherTriggerSub');

      if (state.selectedTeacherName) {
        const matched = state.teachers.find((t) => Number(t.id) === Number(state.selectedTeacherId));
        titleEl.textContent = state.selectedTeacherName;
        subEl.textContent = matched && matched.subject ? matched.subject : 'Будет записан как регистратор';
      } else {
        titleEl.textContent = 'Выберите ФИО учителя...';
        subEl.textContent = state.teachers.length > 0
          ? 'Доступно учителей в списке: ' + state.teachers.length
          : 'Введите своё ФИО для учёта регистраций';
      }

      if (state.me && state.me.tgUser) {
        const tgLabel = state.me.tgUser.username
          ? '@' + state.me.tgUser.username
          : (state.me.tgUser.first_name || 'Telegram');
        $('tgIdentityBadge').textContent = tgLabel;
        $('tgIdentityBadge').style.display = 'inline-flex';
      }

      const query = ($('teacherSearch').value || '').trim().toLowerCase();
      const filtered = state.teachers.filter((t) =>
        !query ||
        t.full_name.toLowerCase().includes(query) ||
        (t.subject || '').toLowerCase().includes(query)
      );

      if (filtered.length === 0) {
        $('teacherOptions').innerHTML =
          '<div style="padding:10px; font-size:12.5px; color:var(--muted); text-align:center;">' +
            (state.teachers.length === 0 ? 'Список учителей пока не загружен — введите ФИО ниже.' : 'Учитель не найден — можете ввести ФИО ниже.') +
          '</div>';
        return;
      }

      $('teacherOptions').innerHTML = filtered.map((t) => {
        const sel = Number(t.id) === Number(state.selectedTeacherId);
        return (
          '<button type="button" class="teacher-option' + (sel ? ' selected' : '') + '" data-tid="' + t.id + '">' +
            '<div>' +
              '<div style="font-size:13.5px;">' + escapeHtml(t.full_name) + '</div>' +
              (t.subject ? '<div style="font-size:11.5px; color:var(--muted);">' + escapeHtml(t.subject) + '</div>' : '') +
            '</div>' +
            (sel ? '<span style="color:var(--emerald); font-weight:800;">✓</span>' : '') +
          '</button>'
        );
      }).join('');

      $('teacherOptions').querySelectorAll('.teacher-option').forEach((btn) => {
        btn.onclick = () => {
          const t = state.teachers.find((x) => Number(x.id) === Number(btn.dataset.tid));
          if (!t) return;
          state.selectedTeacherId = t.id;
          state.selectedTeacherName = t.full_name;
          localStorage.setItem('ngs_teacher_id', String(t.id));
          localStorage.setItem('ngs_teacher_name', t.full_name);
          closePopovers();
          renderTeacherSelector();
          haptic('light');
        };
      });
    }

    function renderClassPopover() {
      $('classesCountLabel').textContent = state.classes.length ? state.classes.length + ' кл.' : '';
      const grades = [...new Set(state.classes.map((c) => c.grade).filter((g) => g > 0 && g < 99))].sort((a, b) => a - b);

      $('gradePills').innerHTML =
        '<button type="button" class="grade-pill' + (state.selectedGradeFilter === 'all' ? ' active' : '') + '" data-grade="all">Все</button>' +
        grades.map((g) =>
          '<button type="button" class="grade-pill' + (String(state.selectedGradeFilter) === String(g) ? ' active' : '') + '" data-grade="' + g + '">' + g + ' кл.</button>'
        ).join('');

      $('gradePills').querySelectorAll('.grade-pill').forEach((btn) => {
        btn.onclick = () => {
          state.selectedGradeFilter = btn.dataset.grade;
          renderClassPopover();
        };
      });

      const query = ($('classSearch').value || '').trim().toLowerCase();
      const filtered = state.classes.filter((c) => {
        const matchGrade = state.selectedGradeFilter === 'all' || String(c.grade) === String(state.selectedGradeFilter);
        const matchSearch = !query || c.name.toLowerCase().includes(query);
        return matchGrade && matchSearch;
      });

      if (filtered.length === 0) {
        $('classOptionsGrid').innerHTML =
          '<div style="grid-column:1/-1; padding:18px; text-align:center; color:var(--muted); font-size:13px;">' +
            (state.classes.length === 0 ? 'Классы ещё не загружены. Импортируйте их в Админ-панели.' : 'Классы по запросу не найдены.') +
          '</div>';
        return;
      }

      $('classOptionsGrid').innerHTML = filtered.map((c) => {
        const sel = Number(c.id) === Number(state.selectedClassId);
        return (
          '<button type="button" class="class-option' + (sel ? ' selected' : '') + '" data-cid="' + c.id + '">' +
            '<div class="class-option-top">' +
              '<span class="class-option-name">' + escapeHtml(c.name) + '</span>' +
              '<span class="mono" style="font-size:11px; padding:2px 6px; border-radius:7px; background:' + (sel ? 'rgba(255,255,255,0.18)' : 'var(--emerald-soft)') + '; color:' + (sel ? '#FFF' : 'var(--emerald)') + ';">' + (c.total_registrations || 0) + ' зап.</span>' +
            '</div>' +
            '<div class="class-option-stats">Учеников: ' + (c.total_students || 0) + ' • Участ.: ' + (c.registered_students || 0) + '</div>' +
          '</button>'
        );
      }).join('');

      $('classOptionsGrid').querySelectorAll('.class-option').forEach((btn) => {
        btn.onclick = () => {
          selectClass(Number(btn.dataset.cid));
          closePopovers();
          haptic('light');
        };
      });
    }

    async function selectClass(classId) {
      state.selectedClassId = classId;
      const cls = state.classes.find((c) => Number(c.id) === Number(classId));
      if (cls) {
        $('classBadgeLg').textContent = cls.name;
        $('classBadgeLg').classList.remove('placeholder');
        $('classTriggerTitle').textContent = 'Класс ' + cls.name;
        $('classTriggerSub').textContent = 'Учеников в списке: ' + cls.total_students;
      }

      $('studentsPlaceholder').style.display = 'none';
      $('studentsSection').style.display = 'block';
      $('studentsTbody').innerHTML = '<tr><td colspan="4" style="text-align:center; padding:26px; color:var(--muted);">Загрузка списка учеников...</td></tr>';

      try {
        const data = await apiFetch('/api/classes/' + classId + '/students');
        state.students = data.students || [];
        renderClassSummary();
        renderStudentsTable();
        renderClassPopover();
      } catch (err) {
        toast(err.message, true);
      }
    }

    function renderClassSummary() {
      const cls = state.classes.find((c) => Number(c.id) === Number(state.selectedClassId));
      if (!cls) return;
      const total = state.students.length;
      const withRegs = state.students.filter((s) => s.registrations && s.registrations.length > 0).length;
      const totalRegs = state.students.reduce((acc, s) => acc + (s.registrations ? s.registrations.length : 0), 0);

      $('classSummaryBox').style.display = 'block';
      $('classSummaryTitle').textContent = 'Класс ' + cls.name + ' — ' + total + ' учеников';
      $('classSummarySub').textContent = 'Участвуют в олимпиадах: ' + withRegs + ' из ' + total;
      $('classSummaryBadge').textContent = totalRegs + ' регистраций';

      // Обновляем кеш счётчиков класса
      cls.total_students = total;
      cls.registered_students = withRegs;
      cls.total_registrations = totalRegs;
    }

    function renderStudentsTable() {
      const q = state.studentSearch.trim().toLowerCase();
      const filtered = state.students.filter((s) => {
        const matchQ = !q || s.full_name.toLowerCase().includes(q);
        const count = s.registrations ? s.registrations.length : 0;
        const matchF =
          state.studentFilter === 'all' ||
          (state.studentFilter === 'registered' && count > 0) ||
          (state.studentFilter === 'none' && count === 0);
        return matchQ && matchF;
      });

      if (filtered.length === 0) {
        $('studentsTbody').innerHTML =
          '<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--muted);">Нет учеников по выбранному фильтру.</td></tr>';
        return;
      }

      const spotlightOl = state.olympiads.find((o) => Number(o.id) === Number(state.spotlightOlympiadId));

      $('studentsTbody').innerHTML = filtered.map((student, idx) => {
        const regs = student.registrations || [];
        const isOnSpotlight = spotlightOl && regs.some((r) => Number(r.olympiad_id) === Number(spotlightOl.id));

        const tagsHtml = regs.length > 0
          ? '<div class="reg-tags">' + regs.map((r) => (
              '<span class="reg-tag" title="Зарегистрировал: ' + escapeHtml(r.registered_by_name) + '">' +
                '<span class="reg-tag-text">' + escapeHtml(r.olympiad_title) + '</span>' +
                '<span class="reg-tag-by">• ' + escapeHtml(shortTeacherName(r.registered_by_name)) + '</span>' +
                '<button type="button" class="reg-tag-remove" data-remove-student="' + student.id + '" data-remove-ol="' + r.olympiad_id + '" title="Снять с олимпиады">×</button>' +
              '</span>'
            )).join('') + '</div>'
          : '<span style="font-size:12.5px; color:var(--muted);">Пока не зарегистрирован</span>';

        const quickBtn = spotlightOl
          ? '<button type="button" class="quick-pin-btn' + (isOnSpotlight ? ' registered' : '') + '" data-quick-student="' + student.id + '" data-quick-ol="' + spotlightOl.id + '" title="' + escapeHtml(spotlightOl.title) + '">' +
              (isOnSpotlight ? '✓ На текущей' : '★ На текущую') +
            '</button>'
          : '';

        const selectLabel = regs.length > 0
          ? 'Олимпиады (' + regs.length + ')'
          : 'Выбрать олимпиаду...';

        return (
          '<tr>' +
            '<td class="student-idx">' + String(idx + 1).padStart(2, '0') + '</td>' +
            '<td>' +
              '<div class="student-name">' + escapeHtml(student.full_name) + '</div>' +
              (regs.length > 0 ? '<div class="student-sub">Олимпиад: ' + regs.length + '</div>' : '') +
            '</td>' +
            '<td>' + tagsHtml + '</td>' +
            '<td>' +
              '<div class="row-select-cell">' +
                quickBtn +
                '<button type="button" class="row-ol-trigger" data-open-ol-select="' + student.id + '">' +
                  '<span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + selectLabel + '</span>' +
                  '<span>▾</span>' +
                '</button>' +
              '</div>' +
            '</td>' +
          '</tr>'
        );
      }).join('');

      // Обработчики быстрого удаления тега
      $('studentsTbody').querySelectorAll('[data-remove-student]').forEach((btn) => {
        btn.onclick = () => toggleRegistration(Number(btn.dataset.removeStudent), Number(btn.dataset.removeOl), false);
      });

      // Обработчики быстрой кнопки текущей олимпиады
      $('studentsTbody').querySelectorAll('[data-quick-student]').forEach((btn) => {
        btn.onclick = () => {
          const sid = Number(btn.dataset.quickStudent);
          const oid = Number(btn.dataset.quickOl);
          const st = state.students.find((x) => Number(x.id) === sid);
          const already = st && st.registrations.some((r) => Number(r.olympiad_id) === oid);
          toggleRegistration(sid, oid, !already);
        };
      });

      // Обработчики открытия всплывающего селекта олимпиад в строке таблицы
      $('studentsTbody').querySelectorAll('[data-open-ol-select]').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          openOlympiadPopover(Number(btn.dataset.openOlSelect), btn);
        };
      });
    }

    function shortTeacherName(full) {
      const parts = String(full || '').trim().split(/\\s+/);
      if (parts.length <= 1) return parts[0] || '';
      return parts[0] + ' ' + parts.slice(1).map((p) => p[0] + '.').join('');
    }

    function openOlympiadPopover(studentId, anchorBtn) {
      state.activePopoverStudentId = studentId;
      const student = state.students.find((s) => Number(s.id) === Number(studentId));
      if (!student) return;

      $('olPopoverStudent').textContent = student.full_name;
      $('olPopoverSearch').value = '';
      renderOlympiadPopoverList();

      const pop = $('olPopover');
      const backdrop = $('olBackdrop');
      backdrop.classList.add('open');
      pop.classList.add('open');

      if (window.innerWidth > 700 && anchorBtn) {
        const rect = anchorBtn.getBoundingClientRect();
        const popW = Math.min(390, window.innerWidth - 24);
        const left = Math.max(12, Math.min(rect.right - popW, window.innerWidth - popW - 12));
        const spaceBelow = window.innerHeight - rect.bottom;
        const popH = Math.min(410, pop.offsetHeight || 360);
        const top = spaceBelow < popH + 20
          ? Math.max(12, rect.top - popH - 8)
          : Math.min(window.innerHeight - popH - 12, rect.bottom + 8);
        pop.style.left = left + 'px';
        pop.style.top = top + 'px';
        pop.style.bottom = 'auto';
      }
      setTimeout(() => $('olPopoverSearch').focus(), 40);
    }

    function closeOlympiadPopover() {
      state.activePopoverStudentId = null;
      $('olPopover').classList.remove('open');
      $('olBackdrop').classList.remove('open');
    }

    function renderOlympiadPopoverList() {
      const student = state.students.find((s) => Number(s.id) === Number(state.activePopoverStudentId));
      if (!student) return;

      const q = ($('olPopoverSearch').value || '').trim().toLowerCase();
      const sorted = [...state.olympiads].sort((a, b) => {
        if (Number(a.id) === Number(state.spotlightOlympiadId)) return -1;
        if (Number(b.id) === Number(state.spotlightOlympiadId)) return 1;
        return 0;
      }).filter((o) => !q || o.title.toLowerCase().includes(q) || (o.description || '').toLowerCase().includes(q));

      if (sorted.length === 0) {
        $('olPopoverList').innerHTML =
          '<div style="padding:20px; text-align:center; color:var(--muted); font-size:13px;">Активные олимпиады не найдены.</div>';
        return;
      }

      $('olPopoverList').innerHTML = sorted.map((ol) => {
        const reg = (student.registrations || []).find((r) => Number(r.olympiad_id) === Number(ol.id));
        const isChecked = Boolean(reg);
        const isSpotlight = Number(ol.id) === Number(state.spotlightOlympiadId);
        return (
          '<button type="button" class="ol-option' + (isChecked ? ' checked' : '') + '" data-toggle-ol="' + ol.id + '">' +
            '<span class="ol-checkbox">' + (isChecked ? '✓' : '') + '</span>' +
            '<div style="min-width:0; flex:1;">' +
              '<div class="ol-option-title">' + escapeHtml(ol.title) + '</div>' +
              '<div class="ol-option-sub">' +
                (isSpotlight ? '<span class="star-badge">★ Текущий пост</span>' : '') +
                '<span class="mono">' + formatShortDate(ol.published_at) + '</span>' +
                (reg ? '<span>• Записал(а): ' + escapeHtml(shortTeacherName(reg.registered_by_name)) + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</button>'
        );
      }).join('');

      $('olPopoverList').querySelectorAll('[data-toggle-ol]').forEach((btn) => {
        btn.onclick = () => {
          const oid = Number(btn.dataset.toggleOl);
          const already = (student.registrations || []).some((r) => Number(r.olympiad_id) === oid);
          toggleRegistration(student.id, oid, !already);
        };
      });
    }

    async function toggleRegistration(studentId, olympiadId, shouldRegister) {
      const student = state.students.find((s) => Number(s.id) === Number(studentId));
      const olympiad = state.olympiads.find((o) => Number(o.id) === Number(olympiadId));
      if (!student || !olympiad) return;

      if (shouldRegister && !state.selectedTeacherName) {
        toast('Сначала выберите ФИО учителя в блоке «Кто регистрирует»', true);
        closeOlympiadPopover();
        openTeacherPopover();
        haptic('error');
        return;
      }

      try {
        if (shouldRegister) {
          const data = await apiFetch('/api/registrations', {
            method: 'POST',
            body: JSON.stringify({
              student_id: studentId,
              olympiad_id: olympiadId,
              teacher_id: state.selectedTeacherId,
              teacher_name: state.selectedTeacherName
            })
          });
          const reg = data.registration;
          student.registrations = [
            reg,
            ...(student.registrations || []).filter((r) => Number(r.olympiad_id) !== olympiadId)
          ];
          olympiad.registrations_count = Number(olympiad.registrations_count || 0) + 1;
          haptic('success');
          toast('✓ ' + student.full_name + ' → ' + olympiad.title);
        } else {
          await apiFetch('/api/registrations?student_id=' + studentId + '&olympiad_id=' + olympiadId, {
            method: 'DELETE'
          });
          student.registrations = (student.registrations || []).filter((r) => Number(r.olympiad_id) !== olympiadId);
          olympiad.registrations_count = Math.max(0, Number(olympiad.registrations_count || 0) - 1);
          haptic('light');
          toast('Снята запись: ' + student.full_name);
        }

        renderSpotlight();
        renderOlympiadStrip();
        renderClassSummary();
        renderStudentsTable();
        if (state.activePopoverStudentId) renderOlympiadPopoverList();
        updateTopStatBadge();
      } catch (err) {
        haptic('error');
        toast(err.message, true);
      }
    }

    function updateTopStatBadge() {
      const total = state.olympiads.reduce((acc, o) => acc + Number(o.registrations_count || 0), 0);
      $('topStatBadge').textContent = total + ' зап.';
      $('topStatBadge').style.display = 'inline-flex';
    }

    function closePopovers() {
      $('classPopover').classList.remove('open');
      $('classTrigger').classList.remove('open');
      $('teacherPopover').classList.remove('open');
      $('teacherTrigger').classList.remove('open');
    }

    function openTeacherPopover() {
      closePopovers();
      $('teacherPopover').classList.add('open');
      $('teacherTrigger').classList.add('open');
      setTimeout(() => $('teacherSearch').focus(), 40);
    }

    $('classTrigger').onclick = (e) => {
      e.stopPropagation();
      const isOpen = $('classPopover').classList.contains('open');
      closePopovers();
      if (!isOpen) {
        $('classPopover').classList.add('open');
        $('classTrigger').classList.add('open');
        setTimeout(() => $('classSearch').focus(), 40);
      }
    };

    $('teacherTrigger').onclick = (e) => {
      e.stopPropagation();
      const isOpen = $('teacherPopover').classList.contains('open');
      if (isOpen) closePopovers();
      else openTeacherPopover();
    };

    $('applyCustomTeacher').onclick = () => {
      const val = ($('customTeacherInput').value || '').trim();
      if (!val) return;
      state.selectedTeacherId = null;
      state.selectedTeacherName = val;
      localStorage.removeItem('ngs_teacher_id');
      localStorage.setItem('ngs_teacher_name', val);
      $('customTeacherInput').value = '';
      closePopovers();
      renderTeacherSelector();
      haptic('light');
    };

    $('classSearch').oninput = () => renderClassPopover();
    $('teacherSearch').oninput = () => renderTeacherSelector();
    $('studentSearch').oninput = (e) => {
      state.studentSearch = e.target.value;
      renderStudentsTable();
    };
    $('olPopoverSearch').oninput = () => renderOlympiadPopoverList();
    $('olPopoverClose').onclick = closeOlympiadPopover;
    $('olBackdrop').onclick = closeOlympiadPopover;

    $('studentFilterGroup').querySelectorAll('.filter-btn').forEach((btn) => {
      btn.onclick = () => {
        state.studentFilter = btn.dataset.filter;
        $('studentFilterGroup').querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderStudentsTable();
      };
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#classSelectWrap') && !e.target.closest('#teacherSelectWrap')) {
        closePopovers();
      }
    });

    async function init() {
      try {
        const data = await apiFetch('/api/bootstrap');
        state.olympiads = data.olympiads || [];
        state.classes = data.classes || [];
        state.teachers = data.teachers || [];
        state.me = data.me || null;

        // Восстанавливаем выбранного учителя: приоритет Telegram match -> localStorage -> имя из Telegram
        if (state.me && state.me.matchedTeacher) {
          state.selectedTeacherId = state.me.matchedTeacher.id;
          state.selectedTeacherName = state.me.matchedTeacher.full_name;
        } else {
          const savedId = localStorage.getItem('ngs_teacher_id');
          const savedName = localStorage.getItem('ngs_teacher_name');
          if (savedId && state.teachers.some((t) => String(t.id) === savedId)) {
            const t = state.teachers.find((x) => String(x.id) === savedId);
            state.selectedTeacherId = t.id;
            state.selectedTeacherName = t.full_name;
          } else if (savedName) {
            state.selectedTeacherName = savedName;
          } else if (state.me && state.me.tgUser) {
            state.selectedTeacherName = [state.me.tgUser.first_name, state.me.tgUser.last_name].filter(Boolean).join(' ');
          }
        }

        const startOlId = parseStartOlympiadId();
        if (startOlId && state.olympiads.some((o) => Number(o.id) === startOlId)) {
          state.spotlightOlympiadId = startOlId;
        } else if (state.olympiads[0]) {
          state.spotlightOlympiadId = state.olympiads[0].id;
        }

        renderSpotlight();
        renderOlympiadStrip();
        renderTeacherSelector();
        renderClassPopover();
        updateTopStatBadge();
      } catch (err) {
        $('spotlightTitle').textContent = 'Ошибка подключения к базе данных';
        $('spotlightDesc').textContent = err.message;
        toast(err.message, true);
      }
    }

    init();
  </script>
</body>
</html>`;
}
