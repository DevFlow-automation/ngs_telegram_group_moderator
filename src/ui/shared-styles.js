export const SHARED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Unbounded:wght@500;600;700&display=swap');

:root {
  --bg: #F5F1E8;
  --bg-elevated: #FFFDF9;
  --surface: #FFFFFF;
  --surface-tint: #F9F6EE;
  --pine: #12372A;
  --pine-hover: #1B4D3B;
  --pine-soft: #E5EFEA;
  --gold: #D97706;
  --gold-bright: #F0B43B;
  --gold-soft: #FEF3D9;
  --emerald: #166E4C;
  --emerald-soft: #E3F5EC;
  --coral: #C6472E;
  --coral-soft: #FCECE8;
  --ink: #181A18;
  --ink-2: #4A4F47;
  --muted: #767B71;
  --line: #DFD8C8;
  --line-strong: #C9BFA9;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --shadow-sm: 0 2px 8px rgba(18, 55, 42, 0.05);
  --shadow-md: 0 10px 30px rgba(18, 55, 42, 0.09);
  --shadow-pop: 0 20px 50px rgba(18, 55, 42, 0.18), 0 2px 8px rgba(18, 55, 42, 0.08);
  --font-display: 'Unbounded', system-ui, sans-serif;
  --font-body: 'Golos Text', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  background-color: var(--bg);
  background-image:
    radial-gradient(rgba(18, 55, 42, 0.07) 1px, transparent 1px),
    radial-gradient(circle at 92% 4%, rgba(217, 119, 6, 0.11), transparent 36%),
    radial-gradient(circle at 6% 96%, rgba(18, 55, 42, 0.08), transparent 40%);
  background-size: 24px 24px, 100% 100%, 100% 100%;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }

button, input, select, textarea {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.shell {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 18px 18px 80px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
  background: var(--pine);
  color: #FFFDF8;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.topbar::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 88% 20%, rgba(240, 180, 59, 0.24), transparent 44%),
    linear-gradient(120deg, transparent 60%, rgba(255,255,255,0.04) 100%);
  pointer-events: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
  min-width: 0;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: linear-gradient(145deg, var(--gold-bright), var(--gold));
  color: var(--pine);
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -0.04em;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);
}

.brand-text {
  min-width: 0;
}

.brand-title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-sub {
  font-size: 12px;
  color: rgba(255, 253, 248, 0.72);
  margin-top: 2px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 15px;
  border-radius: 12px;
  border: 1px solid transparent;
  font-weight: 600;
  font-size: 13.5px;
  cursor: pointer;
  transition: transform 0.14s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  white-space: nowrap;
}

.btn:active { transform: scale(0.98); }

.btn-primary {
  background: var(--pine);
  color: #FFFDF8;
}
.btn-primary:hover { background: var(--pine-hover); }

.btn-gold {
  background: linear-gradient(135deg, var(--gold-bright), var(--gold));
  color: #17231C;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.28);
}
.btn-gold:hover { filter: brightness(1.04); }

.btn-ghost-dark {
  background: rgba(255, 255, 255, 0.11);
  color: #FFFDF8;
  border-color: rgba(255, 255, 255, 0.18);
}
.btn-ghost-dark:hover { background: rgba(255, 255, 255, 0.19); }

.btn-outline {
  background: var(--surface);
  color: var(--ink);
  border-color: var(--line-strong);
}
.btn-outline:hover { border-color: var(--pine); background: var(--surface-tint); }

.btn-danger {
  background: var(--coral-soft);
  color: var(--coral);
  border-color: rgba(198, 71, 46, 0.25);
}
.btn-danger:hover { background: #F8DDD6; }

.btn-sm {
  padding: 6px 11px;
  font-size: 12.5px;
  border-radius: 9px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.pill-pine { background: var(--pine-soft); color: var(--pine); }
.pill-gold { background: var(--gold-soft); color: #9A5104; }
.pill-emerald { background: var(--emerald-soft); color: var(--emerald); }
.pill-coral { background: var(--coral-soft); color: var(--coral); }
.pill-muted { background: #EFECE4; color: var(--ink-2); }

.input, .textarea, .native-select {
  width: 100%;
  padding: 10px 13px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  color: var(--ink);
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
}

.input:focus, .textarea:focus, .native-select:focus {
  border-color: var(--pine);
  background: var(--surface);
  box-shadow: 0 0 0 3px rgba(18, 55, 42, 0.1);
}

.toast-stack {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(400px, calc(100vw - 36px));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  padding: 12px 15px;
  border-radius: 14px;
  background: var(--pine);
  color: #FFFDF8;
  font-size: 13.5px;
  font-weight: 500;
  box-shadow: var(--shadow-pop);
  border-left: 4px solid var(--gold-bright);
  animation: toastIn 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.toast.error {
  background: #3B1812;
  border-left-color: #F87171;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes popIn {
  from { opacity: 0; transform: translateY(-6px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.empty-state {
  padding: 44px 24px;
  text-align: center;
  color: var(--muted);
}

.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--surface-tint);
  border: 1px dashed var(--line-strong);
  display: grid;
  place-items: center;
  font-size: 24px;
  margin: 0 auto 14px;
}

.empty-state h3 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 15px;
  color: var(--ink);
}

.empty-state p {
  margin: 0 auto;
  max-width: 440px;
  font-size: 13.5px;
}

@media (max-width: 640px) {
  .shell { padding: 12px 12px 76px; }
  .topbar { padding: 12px 14px; border-radius: 18px; }
  .brand-mark { width: 36px; height: 36px; font-size: 13px; border-radius: 11px; }
  .brand-title { font-size: 13.5px; }
  .brand-sub { font-size: 11px; }
}
`;
