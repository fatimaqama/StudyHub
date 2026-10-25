/* ==========================================================================
   StudyHub — dashboard.js (index.html only)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  window.Store.init();
  window.Layout.render('dashboard');
  renderGreeting();
  renderStats();
  renderOverallProgress();
  renderWeekChart();
  renderSubjectOverview();
  renderUpcomingDeadlines();
  renderRecentActivity();
  window.Utils.refreshIcons();
});

function renderGreeting() {
  const U = window.Utils;
  const user = window.Auth.getCurrentUser();
  const firstName = user ? user.displayName.split(' ')[0] : 'there';
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greeting').textContent = `${timeGreeting}, ${firstName}`;

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const streak = window.Store.getStudyStreak();
  const streakLine = streak > 0
    ? `You're on a ${streak}-day study streak — keep it going.`
    : 'Log a study session today to start a streak.';
  document.getElementById('greeting-sub').textContent = `${dateStr} · ${streakLine}`;
}

function statCard({ icon, tone, label, value, hint }) {
  return `
    <div class="card stat-card">
      <div class="stat-icon-wrap" style="background:var(--color-${tone}-bg); color:var(--color-${tone});">
        <i data-lucide="${icon}" class="icon" aria-hidden="true"></i>
      </div>
      <div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
        ${hint ? `<div class="stat-trend" style="color:var(--color-text-muted); font-weight:500; margin-top:2px;">${hint}</div>` : ''}
      </div>
    </div>`;
}

function renderStats() {
  const Store = window.Store;
  const U = window.Utils;
  const streak = Store.getStudyStreak();
  const totalMinutes = Store.getTotalStudyMinutes();
  const dueSoon = Store.getTasksDueSoon(7);
  const overdue = Store.getOverdueTasks();
  const overall = Store.getOverallProgress();

  const cards = [
    statCard({ icon: 'flame', tone: 'warning', label: 'Study streak', value: `${streak} ${streak === 1 ? 'day' : 'days'}` }),
    statCard({ icon: 'clock', tone: 'info', label: 'Total study hours', value: U.formatHours(totalMinutes) }),
    statCard({ icon: 'list-todo', tone: 'danger', label: 'Tasks due soon', value: dueSoon.length, hint: overdue.length ? `${overdue.length} overdue` : 'None overdue' }),
    statCard({ icon: 'circle-check-big', tone: 'success', label: 'Tasks completed', value: overall.completed }),
  ];
  document.getElementById('stats-grid').innerHTML = cards.join('');
}

function renderOverallProgress() {
  const overall = window.Store.getOverallProgress();
  document.getElementById('overall-ring').innerHTML = window.Utils.ringSVG(overall.percent, 96) +
    `<div class="ring-label">${overall.percent}%</div>`;
  document.getElementById('completed-count').textContent = overall.completed;
  document.getElementById('remaining-count').textContent = Math.max(0, overall.total - overall.completed);
  document.getElementById('streak-inline').textContent = `${window.Store.getStudyStreak()} days`;
  document.getElementById('progress-subtitle').textContent = overall.total === 0 ? 'No tasks yet' : `${overall.completed} of ${overall.total} tasks completed`;
}

function renderWeekChart() {
  const U = window.Utils;
  const data = window.Store.getWeeklyStudyActivity(7);
  const max = Math.max(60, ...data.map((d) => d.minutes));
  const html = data.map((d) => {
    const barHeight = d.minutes === 0 ? 3 : Math.max(6, Math.round((d.minutes / max) * 90));
    const isToday = U.isToday(d.date);
    return `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:120px; flex:1;" title="${U.formatDateShort(d.date)}: ${U.formatDuration(d.minutes)}">
        <div style="width:100%; max-width:28px; height:${barHeight}px; border-radius:6px 6px 3px 3px; background:${isToday ? 'var(--color-primary)' : 'var(--color-surface-alt)'}; border: 1px solid ${isToday ? 'var(--color-primary)' : 'var(--color-border-strong)'};"></div>
        <div style="font-size:11px; color:${isToday ? 'var(--color-primary)' : 'var(--color-text-muted)'}; font-weight:${isToday ? '600' : '400'}; margin-top:8px;">${U.formatWeekday(d.date)}</div>
      </div>`;
  }).join('');
  document.getElementById('week-chart').innerHTML = html;
}

function renderSubjectOverview() {
  const Store = window.Store;
  const subjects = Store.getSubjects();
  const container = document.getElementById('subject-overview');

  if (subjects.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon"><i data-lucide="book-open" class="icon" aria-hidden="true"></i></div>
        <h3>No subjects yet</h3>
        <p>Add your first subject to start organizing tasks, notes and study sessions.</p>
        <a href="subjects.html?action=new" class="btn btn-primary">Add subject</a>
      </div>`;
    window.Utils.refreshIcons();
    return;
  }

  container.innerHTML = subjects.slice(0, 4).map((s) => {
    const p = Store.getSubjectProgress(s.id);
    return `
      <a class="card card-hover" style="display:block;" href="subjects.html">
        <div class="flex gap-12" style="align-items:center; margin-bottom:14px;">
          <div class="stat-icon-wrap" style="background:color-mix(in srgb, ${s.color} 16%, transparent); color:${s.color};">
            <i data-lucide="${s.icon}" class="icon" aria-hidden="true"></i>
          </div>
          <div style="min-width:0;">
            <div class="card-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${window.Utils.escapeHtml(s.name)}</div>
            <div class="card-subtitle">${p.total} ${p.total === 1 ? 'task' : 'tasks'}</div>
          </div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${p.percent}%; background:${s.color};"></div></div>
        <div class="flex-between mt-8" style="font-size:12px; color:var(--color-text-muted);">
          <span>${p.completed} of ${p.total} done</span>
          <span>${p.percent}%</span>
        </div>
      </a>`;
  }).join('');
  window.Utils.refreshIcons();
}

function renderUpcomingDeadlines() {
  const Store = window.Store;
  const U = window.Utils;
  const tasks = Store.getTasksDueSoon(7).slice(0, 6);
  const container = document.getElementById('upcoming-deadlines');

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="check-check" class="icon" aria-hidden="true"></i></div>
        <h3>Nothing due soon</h3>
        <p>You're all caught up for the next 7 days.</p>
      </div>`;
    window.Utils.refreshIcons();
    return;
  }

  container.innerHTML = tasks.map((t) => {
    const subject = Store.getSubjectById(t.subjectId);
    const overdue = U.daysUntil(t.dueDate) < 0;
    const dueTone = overdue ? 'danger' : U.daysUntil(t.dueDate) <= 1 ? 'warning' : 'neutral';
    return `
      <div class="row-card spine" style="--spine-color:${subject ? subject.color : 'var(--color-border-strong)'};" data-task-id="${t.id}">
        <button type="button" class="row-check" data-toggle-task="${t.id}" aria-label="Mark task complete"></button>
        <div class="row-main">
          <div class="row-title">${U.escapeHtml(t.title)}</div>
          <div class="row-meta">
            ${subject ? `<span class="row-meta-item">${U.escapeHtml(subject.name)}</span>` : ''}
            <span class="badge badge-${dueTone}">${U.dueLabel(t.dueDate)}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-toggle-task]').forEach((btn) => {
    btn.addEventListener('click', () => {
      Store.toggleTaskStatus(btn.getAttribute('data-toggle-task'));
      window.Utils.showToast('Task completed — nice work!', 'success');
      renderStats();
      renderOverallProgress();
      renderUpcomingDeadlines();
      renderSubjectOverview();
      renderRecentActivity();
    });
  });
  window.Utils.refreshIcons();
}

function renderRecentActivity() {
  const U = window.Utils;
  const items = window.Store.getRecentActivity(6);
  const container = document.getElementById('recent-activity');

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="sparkles" class="icon" aria-hidden="true"></i></div>
        <h3>No activity yet</h3>
        <p>Complete a task or log a study session to see it here.</p>
      </div>`;
    window.Utils.refreshIcons();
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="row-card">
      <div class="stat-icon-wrap" style="width:34px; height:34px; background:var(--color-surface-alt); color:var(--color-text-secondary); flex-shrink:0;">
        <i data-lucide="${item.icon}" class="icon" aria-hidden="true" style="width:15px; height:15px;"></i>
      </div>
      <div class="row-main">
        <div class="row-title" style="font-weight:500;">${U.escapeHtml(item.text)}</div>
        <div class="row-meta" style="margin-top:2px;">${U.relativeTime(item.ts)}</div>
      </div>
    </div>`).join('');
  window.Utils.refreshIcons();
}