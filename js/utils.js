/* ==========================================================================
   StudyHub — utils.js
   Small, dependency-free helpers shared by every page. Attached to
   `window.Utils` so plain <script> tags can use it without a bundler.
   ========================================================================== */

(function () {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function generateId(prefix) {
    const rand = Math.random().toString(36).slice(2, 9);
    const time = Date.now().toString(36).slice(-5);
    return `${prefix || 'id'}_${time}${rand}`;
  }

  /** Returns today's date as an ISO date string (YYYY-MM-DD), local time. */
  function todayISO() {
    return toISODate(new Date());
  }

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Adds `days` (can be negative) to an ISO date string and returns a new ISO date string. */
  function addDays(isoDate, days) {
    const d = parseISODate(isoDate);
    d.setDate(d.getDate() + days);
    return toISODate(d);
  }

  /** Parses "YYYY-MM-DD" as a local-time Date (avoids UTC off-by-one issues). */
  function parseISODate(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function formatDate(isoDate, opts) {
    if (!isoDate) return '';
    const d = parseISODate(isoDate);
    const options = opts || { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  }

  function formatDateShort(isoDate) {
    return formatDate(isoDate, { month: 'short', day: 'numeric' });
  }

  function formatWeekday(isoDate) {
    const d = parseISODate(isoDate);
    return WEEKDAY_LABELS[d.getDay()];
  }

  /** Formats "HH:MM" (24h) as "2:30 PM". */
  function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  function formatDuration(minutes) {
    minutes = Math.max(0, Math.round(minutes));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function formatHours(minutes) {
    return (minutes / 60).toFixed(1).replace(/\.0$/, '');
  }

  function isToday(isoDate) { return isoDate === todayISO(); }

  function isPastDate(isoDate) { return isoDate < todayISO(); }

  function daysUntil(isoDate) {
    const a = parseISODate(todayISO());
    const b = parseISODate(isoDate);
    return Math.round((b - a) / DAY_MS);
  }

  function dueLabel(isoDate) {
    const diff = daysUntil(isoDate);
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    if (diff === -1) return 'Overdue by 1 day';
    if (diff < -1) return `Overdue by ${Math.abs(diff)} days`;
    if (diff > 1 && diff <= 6) return `Due in ${diff} days`;
    return `Due ${formatDateShort(isoDate)}`;
  }

  /** "2 hours ago" / "3 days ago" style relative time from an ISO timestamp. */
  function relativeTime(isoTimestamp) {
    if (!isoTimestamp) return '';
    const then = new Date(isoTimestamp).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.round((now - then) / 1000));
    if (diffSec < 60) return 'just now';
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.round(diffHr / 24);
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDateShort(toISODate(new Date(then)));
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function formatPercent(n) { return `${Math.round(clamp(n, 0, 100))}%`; }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait || 250);
    };
  }

  /** Re-renders any Lucide <i data-lucide="..."> icons added to the DOM since the last call. */
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  /* ---- Toasts ---------------------------------------------------------- */

  function ensureToastRoot() {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      root.className = 'toast-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function showToast(message, type) {
    const root = ensureToastRoot();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type || 'default'}`;
    const iconName = type === 'success' ? 'circle-check' : type === 'error' ? 'circle-alert' : 'info';
    toast.innerHTML = `<i data-lucide="${iconName}" class="icon" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`;
    root.appendChild(toast);
    refreshIcons();
    setTimeout(() => {
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 220);
    }, 3200);
  }

  /* ---- Confirm dialog ---------------------------------------------------
     Renders (once) a reusable confirm modal into #app-globals and returns
     a promise that resolves true/false based on the user's choice. */

  function ensureConfirmModal() {
    let overlay = document.getElementById('confirm-modal-overlay');
    if (overlay) return overlay;

    const globals = document.getElementById('app-globals') || document.body;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal-overlay" id="confirm-modal-overlay">
        <div class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div class="modal-body">
            <div class="confirm-icon"><i data-lucide="triangle-alert" class="icon" aria-hidden="true"></i></div>
            <h3 id="confirm-modal-title">Are you sure?</h3>
            <p id="confirm-modal-message">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
            <button type="button" class="btn btn-danger" id="confirm-modal-ok">Confirm</button>
          </div>
        </div>
      </div>`;
    globals.appendChild(wrap.firstElementChild);
    overlay = document.getElementById('confirm-modal-overlay');
    refreshIcons();
    return overlay;
  }

  function confirmAction(message, opts) {
    opts = opts || {};
    const overlay = ensureConfirmModal();
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');

    titleEl.textContent = opts.title || 'Are you sure?';
    msgEl.textContent = message || 'This action cannot be undone.';
    okBtn.textContent = opts.confirmLabel || 'Confirm';

    return new Promise((resolve) => {
      function cleanup(result) {
        overlay.classList.remove('open');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }
      function onOverlay(e) { if (e.target === overlay) cleanup(false); }
      function onKey(e) { if (e.key === 'Escape') cleanup(false); }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onKey);
      overlay.classList.add('open');
      okBtn.focus();
    });
  }

  /** Builds a circular progress ring's inner SVG markup. Wrap in a `.ring` div with a `.ring-label` sibling. */
  function ringSVG(percent, size) {
    const s = size || 88;
    const r = (s - 9) / 2;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - clamp(percent, 0, 100) / 100);
    const cx = s / 2;
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <circle class="ring-bg" cx="${cx}" cy="${cx}" r="${r}"></circle>
      <circle class="ring-value" cx="${cx}" cy="${cx}" r="${r}" style="stroke-dasharray:${c};stroke-dashoffset:${offset};"></circle>
    </svg>`;
  }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  window.Utils = {
    generateId, todayISO, toISODate, parseISODate, addDays,
    formatDate, formatDateShort, formatWeekday, formatTime, formatDuration, formatHours,
    isToday, isPastDate, daysUntil, dueLabel, relativeTime,
    escapeHtml, initials, clamp, formatPercent, debounce, refreshIcons,
    showToast, confirmAction, ringSVG, qs, qsa,
    MONTH_LABELS, WEEKDAY_LABELS,
  };
})();