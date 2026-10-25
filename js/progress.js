/* ==========================================================================
   StudyHub — progress.js (progress.html only)
   ========================================================================== */

let weeklyChartInstance = null;
let completionChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  window.Store.init();
  window.Layout.render('progress');
  renderStatCards();
  buildWeeklyChart();
  buildCompletionChart();
  renderSubjectProgress();
  renderActivity();
  window.Utils.refreshIcons();

  // Charts are drawn with literal colors read from CSS variables, so they
  // need to be rebuilt (not just left alone) whenever the theme changes.
  window.addEventListener('studyhub:themechange', () => {
    buildWeeklyChart();
    buildCompletionChart();
  });
});

function getVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function statCard({ icon, tone, label, value }) {
  return `
    <div class="card stat-card">
      <div class="stat-icon-wrap" style="background:var(--color-${tone}-bg); color:var(--color-${tone});">
        <i data-lucide="${icon}" class="icon" aria-hidden="true"></i>
      </div>
      <div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    </div>`;
}

function renderStatCards() {
  const Store = window.Store;
  const U = window.Utils;
  const overall = Store.getOverallProgress();
  const cards = [
    statCard({ icon: 'clock', tone: 'info', label: 'Total study hours', value: U.formatHours(Store.getTotalStudyMinutes()) }),
    statCard({ icon: 'circle-check-big', tone: 'success', label: 'Tasks completed', value: overall.completed }),
    statCard({ icon: 'list-todo', tone: 'warning', label: 'Tasks remaining', value: Math.max(0, overall.total - overall.completed) }),
    statCard({ icon: 'flame', tone: 'danger', label: 'Study streak', value: `${Store.getStudyStreak()} days` }),
  ];
  document.getElementById('progress-stats-grid').innerHTML = cards.join('');
  window.Utils.refreshIcons();
}

function buildWeeklyChart() {
  const canvas = document.getElementById('weekly-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const data = window.Store.getWeeklyStudyActivity(7);
  const labels = data.map((d) => window.Utils.formatWeekday(d.date));
  const hours = data.map((d) => Math.round((d.minutes / 60) * 100) / 100);

  const primary = getVar('--color-primary');
  const gridColor = getVar('--color-border');
  const textColor = getVar('--color-text-secondary');

  if (weeklyChartInstance) weeklyChartInstance.destroy();
  weeklyChartInstance = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Hours', data: hours, backgroundColor: primary, borderRadius: 6, maxBarThickness: 34 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${c.parsed.y}h studied` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { size: 12 } } },
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 12 }, precision: 0 } },
      },
    },
  });
}

function buildCompletionChart() {
  const canvas = document.getElementById('completion-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const overall = window.Store.getOverallProgress();
  const completed = overall.completed;
  const remaining = Math.max(0, overall.total - overall.completed);
  const hasData = overall.total > 0;

  const successColor = getVar('--color-success');
  const trackColor = getVar('--color-surface-alt');

  document.getElementById('completion-center-num').textContent = `${overall.percent}%`;

  if (completionChartInstance) completionChartInstance.destroy();
  completionChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Remaining'],
      datasets: [{
        data: hasData ? [completed, remaining] : [1],
        backgroundColor: hasData ? [successColor, trackColor] : [trackColor],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { enabled: hasData } },
    },
  });
}

function renderSubjectProgress() {
  const Store = window.Store;
  const U = window.Utils;
  const subjects = Store.getSubjects();
  const container = document.getElementById('subject-progress-list');

  if (subjects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="book-open" class="icon" aria-hidden="true"></i></div>
        <h3>No subjects to show yet</h3>
        <p>Add a subject and a few tasks to see progress broken down here.</p>
        <a href="subjects.html" class="btn btn-primary">Go to subjects</a>
      </div>`;
    U.refreshIcons();
    return;
  }

  container.innerHTML = subjects.map((s, i) => {
    const p = Store.getSubjectProgress(s.id);
    const isLast = i === subjects.length - 1;
    return `
      <div class="subject-progress-row" style="padding:14px 0; ${isLast ? '' : 'border-bottom:1px solid var(--color-border);'}">
        <div class="name-col">
          <div class="stat-icon-wrap" style="width:32px; height:32px; background:color-mix(in srgb, ${s.color} 16%, transparent); color:${s.color};">
            <i data-lucide="${s.icon}" class="icon" aria-hidden="true" style="width:15px; height:15px;"></i>
          </div>
          <span>${U.escapeHtml(s.name)}</span>
        </div>
        <div class="bar-col">
          <div class="progress-track"><div class="progress-fill" style="width:${p.percent}%; background:${s.color};"></div></div>
        </div>
        <div class="pct-col">${p.percent}%</div>
      </div>`;
  }).join('');
  U.refreshIcons();
}

function renderActivity() {
  const U = window.Utils;
  const items = window.Store.getRecentActivity(6);
  const container = document.getElementById('progress-activity-list');

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="sparkles" class="icon" aria-hidden="true"></i></div>
        <h3>No activity yet</h3>
        <p>Complete a task or log a study session to see it here.</p>
      </div>`;
    U.refreshIcons();
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
  U.refreshIcons();
}