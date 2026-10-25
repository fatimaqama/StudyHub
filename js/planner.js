/* ==========================================================================
   StudyHub — planner.js (planner.html only)
   ========================================================================== */

let weekOffset = 0; // 0 = this week, +1 = next week, -1 = last week

document.addEventListener('DOMContentLoaded', () => {
  window.Store.init();
  window.Layout.render('planner');
  populateSessionSubjectDropdown();
  wireWeekNav();
  wireModal();
  renderWeek();
  renderUpcomingSessions();
  window.Utils.refreshIcons();

  if (new URLSearchParams(location.search).get('action') === 'new') openModal();
});

function populateSessionSubjectDropdown() {
  const subjects = window.Store.getSubjects();
  const options = subjects.map((s) => `<option value="${s.id}">${window.Utils.escapeHtml(s.name)}</option>`).join('');
  document.getElementById('session-subject').innerHTML = `<option value="">Uncategorized</option>${options}`;
}

/** Returns the Monday..Sunday ISO dates for the currently selected week. */
function getWeekDates() {
  const U = window.Utils;
  const today = U.parseISODate(U.todayISO());
  const dow = today.getDay(); // 0 = Sunday
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = U.addDays(U.todayISO(), diffToMonday + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => U.addDays(monday, i));
}

function wireWeekNav() {
  document.getElementById('week-prev').addEventListener('click', () => { weekOffset -= 1; renderWeek(); });
  document.getElementById('week-next').addEventListener('click', () => { weekOffset += 1; renderWeek(); });
  document.getElementById('week-today').addEventListener('click', () => { weekOffset = 0; renderWeek(); });
  document.getElementById('add-session-btn').addEventListener('click', () => openModal());
}

function renderWeek() {
  const U = window.Utils;
  const Store = window.Store;
  const dates = getWeekDates();

  document.getElementById('week-label').textContent =
    `${U.formatDateShort(dates[0])} – ${U.formatDateShort(dates[6])}`;

  const grid = document.getElementById('week-grid');
  grid.innerHTML = dates.map((date) => {
    const sessions = Store.getSessionsByDate(date).sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
    const isToday = U.isToday(date);
    const chips = sessions.map((s) => {
      const subject = Store.getSubjectById(s.subjectId);
      return `
        <div class="session-chip" style="--spine-color:${subject ? subject.color : 'var(--color-border-strong)'};" data-session="${s.id}">
          <button type="button" class="del" data-delete-session="${s.id}" aria-label="Delete session"><i data-lucide="x" class="icon" aria-hidden="true" style="width:12px; height:12px;"></i></button>
          <div class="time">${U.formatTime(s.startTime)}</div>
          <div class="subj">${subject ? U.escapeHtml(subject.name) : 'Uncategorized'} · ${U.formatDuration(s.durationMinutes)}</div>
        </div>`;
    }).join('');

    return `
      <div class="week-day ${isToday ? 'is-today' : ''}">
        <div class="week-day-head">
          <div class="wd">${U.formatWeekday(date)}</div>
          <div class="dd">${U.parseISODate(date).getDate()}</div>
        </div>
        <div style="flex:1;">${chips || '<p style="font-size:11.5px; color:var(--color-text-muted); text-align:center; margin-top:14px;">No sessions</p>'}</div>
        <button type="button" class="week-day-add" data-add-date="${date}">+ Add</button>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-add-date]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(null, btn.getAttribute('data-add-date')));
  });
  grid.querySelectorAll('[data-delete-session]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleDeleteSession(btn.getAttribute('data-delete-session'));
    });
  });
  grid.querySelectorAll('.session-chip').forEach((chip) => {
    chip.addEventListener('click', () => openModal(window.Store.getStudySessionById(chip.getAttribute('data-session'))));
  });

  window.Utils.refreshIcons();
}

function renderUpcomingSessions() {
  const U = window.Utils;
  const Store = window.Store;
  const sessions = Store.getUpcomingStudySessions(30);
  const container = document.getElementById('upcoming-sessions-list');

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="calendar-days" class="icon" aria-hidden="true"></i></div>
        <h3>No upcoming sessions</h3>
        <p>Log a study session to build your schedule and keep your streak alive.</p>
        <button type="button" class="btn btn-primary" id="empty-add-session-btn">Log session</button>
      </div>`;
    document.getElementById('empty-add-session-btn').addEventListener('click', () => openModal());
    U.refreshIcons();
    return;
  }

  container.innerHTML = sessions.map((s) => {
    const subject = Store.getSubjectById(s.subjectId);
    return `
      <div class="row-card spine" style="--spine-color:${subject ? subject.color : 'var(--color-border-strong)'};">
        <div class="stat-icon-wrap" style="width:40px; height:40px; background:var(--color-surface-alt); color:var(--color-text-secondary); flex-shrink:0;">
          <i data-lucide="calendar-clock" class="icon" aria-hidden="true"></i>
        </div>
        <div class="row-main">
          <div class="row-title">${subject ? U.escapeHtml(subject.name) : 'Uncategorized study session'}</div>
          <div class="row-meta">
            <span class="row-meta-item"><i data-lucide="calendar" class="icon" aria-hidden="true"></i>${U.formatDateShort(s.date)}</span>
            <span class="row-meta-item"><i data-lucide="clock" class="icon" aria-hidden="true"></i>${U.formatTime(s.startTime)}</span>
            <span class="badge badge-neutral">${U.formatDuration(s.durationMinutes)}</span>
          </div>
          ${s.notes ? `<div class="text-secondary" style="font-size:13px; margin-top:6px;">${U.escapeHtml(s.notes)}</div>` : ''}
        </div>
        <div class="row-actions">
          <button type="button" class="icon-btn" style="width:32px; height:32px;" data-edit-session="${s.id}" aria-label="Edit session"><i data-lucide="pencil" class="icon" aria-hidden="true" style="width:15px; height:15px;"></i></button>
          <button type="button" class="icon-btn" style="width:32px; height:32px;" data-delete-session-row="${s.id}" aria-label="Delete session"><i data-lucide="trash-2" class="icon" aria-hidden="true" style="width:15px; height:15px;"></i></button>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-edit-session]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(Store.getStudySessionById(btn.dataset.editSession)));
  });
  container.querySelectorAll('[data-delete-session-row]').forEach((btn) => {
    btn.addEventListener('click', () => handleDeleteSession(btn.dataset.deleteSessionRow));
  });
  U.refreshIcons();
}

async function handleDeleteSession(id) {
  const ok = await window.Utils.confirmAction('This study session will be permanently removed.', { title: 'Delete session?', confirmLabel: 'Delete session' });
  if (!ok) return;
  window.Store.deleteStudySession(id);
  window.Utils.showToast('Session deleted', 'success');
  renderWeek();
  renderUpcomingSessions();
}

function openModal(session, presetDate) {
  const overlay = document.getElementById('session-modal-overlay');
  document.getElementById('session-modal-title').textContent = session ? 'Edit study session' : 'Log study session';
  document.getElementById('session-save-btn').textContent = session ? 'Save changes' : 'Log session';
  document.getElementById('session-id').value = session ? session.id : '';
  document.getElementById('session-subject').value = session ? (session.subjectId || '') : '';
  document.getElementById('session-date').value = session ? session.date : (presetDate || window.Utils.todayISO());
  document.getElementById('session-time').value = session ? session.startTime : '09:00';
  document.getElementById('session-duration').value = session ? session.durationMinutes : 60;
  document.getElementById('session-notes').value = session ? session.notes : '';
  document.getElementById('session-date-field').classList.remove('has-error');
  document.getElementById('session-duration-field').classList.remove('has-error');

  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('session-modal-overlay').classList.remove('open');
}

function wireModal() {
  document.getElementById('session-modal-close').addEventListener('click', closeModal);
  document.getElementById('session-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('session-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'session-modal-overlay') closeModal();
  });

  document.getElementById('session-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const dateInput = document.getElementById('session-date');
    const dateField = document.getElementById('session-date-field');
    const durationInput = document.getElementById('session-duration');
    const durationField = document.getElementById('session-duration-field');

    let valid = true;
    if (!dateInput.value) { dateField.classList.add('has-error'); valid = false; }
    if (!durationInput.value || Number(durationInput.value) <= 0) { durationField.classList.add('has-error'); valid = false; }
    if (!valid) return;

    const id = document.getElementById('session-id').value;
    const payload = {
      subjectId: document.getElementById('session-subject').value || null,
      date: dateInput.value,
      startTime: document.getElementById('session-time').value || '09:00',
      durationMinutes: Number(durationInput.value),
      notes: document.getElementById('session-notes').value.trim(),
    };

    if (id) {
      window.Store.updateStudySession(id, payload);
      window.Utils.showToast('Session updated', 'success');
    } else {
      window.Store.addStudySession(payload);
      window.Utils.showToast('Study session logged', 'success');
    }
    closeModal();
    renderWeek();
    renderUpcomingSessions();
  });
}