/* ==========================================================================
   StudyHub — tasks.js (tasks.html only)
   ========================================================================== */

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_BADGE = { high: 'danger', medium: 'warning', low: 'info' };

document.addEventListener('DOMContentLoaded', () => {
  window.Store.init();
  window.Layout.render('tasks');
  populateSubjectDropdowns();
  wireToolbar();
  wireModal();
  renderTasks();
  window.Utils.refreshIcons();

  if (new URLSearchParams(location.search).get('action') === 'new') openModal();
});

function populateSubjectDropdowns() {
  const subjects = window.Store.getSubjects();
  const options = subjects.map((s) => `<option value="${s.id}">${window.Utils.escapeHtml(s.name)}</option>`).join('');

  const filterSelect = document.getElementById('task-filter-subject');
  filterSelect.innerHTML = `<option value="all">All subjects</option><option value="uncategorized">Uncategorized</option>${options}`;

  const modalSelect = document.getElementById('task-subject');
  modalSelect.innerHTML = `<option value="">Uncategorized</option>${options}`;
}

function wireToolbar() {
  document.getElementById('task-search').addEventListener('input', window.Utils.debounce(renderTasks, 200));
  ['task-filter-subject', 'task-filter-priority', 'task-filter-status', 'task-sort'].forEach((id) => {
    document.getElementById(id).addEventListener('change', renderTasks);
  });
  document.getElementById('add-task-btn').addEventListener('click', () => openModal());
}

function getFilteredSortedTasks() {
  const Store = window.Store;
  const query = document.getElementById('task-search').value.trim().toLowerCase();
  const subjectFilter = document.getElementById('task-filter-subject').value;
  const priorityFilter = document.getElementById('task-filter-priority').value;
  const statusFilter = document.getElementById('task-filter-status').value;
  const sortBy = document.getElementById('task-sort').value;

  let tasks = Store.getTasks();

  if (query) {
    tasks = tasks.filter((t) => t.title.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query));
  }
  if (subjectFilter === 'uncategorized') {
    tasks = tasks.filter((t) => !t.subjectId);
  } else if (subjectFilter !== 'all') {
    tasks = tasks.filter((t) => t.subjectId === subjectFilter);
  }
  if (priorityFilter !== 'all') tasks = tasks.filter((t) => t.priority === priorityFilter);
  if (statusFilter !== 'all') tasks = tasks.filter((t) => t.status === statusFilter);

  tasks.sort((a, b) => {
    if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (sortBy === 'created') return a.createdAt < b.createdAt ? 1 : -1;
    if (sortBy === 'alpha') return a.title.localeCompare(b.title);
    return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0; // due date default
  });

  return tasks;
}

function renderTasks() {
  const Store = window.Store;
  const U = window.Utils;
  const allTasksCount = Store.getTasks().length;
  const tasks = getFilteredSortedTasks();
  const container = document.getElementById('tasks-list');
  const countLabel = document.getElementById('task-count-label');

  countLabel.textContent = allTasksCount === 0 ? '' : `${tasks.length} of ${allTasksCount} task${allTasksCount === 1 ? '' : 's'}`;

  if (allTasksCount === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="list-checks" class="icon" aria-hidden="true"></i></div>
        <h3>No tasks yet</h3>
        <p>Add your first task to start tracking assignments and deadlines.</p>
        <button type="button" class="btn btn-primary" id="empty-add-task-btn">Add task</button>
      </div>`;
    document.getElementById('empty-add-task-btn').addEventListener('click', () => openModal());
    U.refreshIcons();
    return;
  }

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="search-x" class="icon" aria-hidden="true"></i></div>
        <h3>No matching tasks</h3>
        <p>Try a different search term or clear your filters.</p>
      </div>`;
    U.refreshIcons();
    return;
  }

  container.innerHTML = tasks.map((t) => {
    const subject = Store.getSubjectById(t.subjectId);
    const completed = t.status === 'completed';
    const overdue = !completed && U.isPastDate(t.dueDate);
    return `
      <div class="row-card spine ${completed ? 'completed' : ''}" style="--spine-color:${subject ? subject.color : 'var(--color-border-strong)'};">
        <button type="button" class="row-check ${completed ? 'checked' : ''}" data-toggle="${t.id}" aria-label="${completed ? 'Mark as pending' : 'Mark as complete'}">
          ${completed ? '<i data-lucide="check" class="icon" aria-hidden="true"></i>' : ''}
        </button>
        <div class="row-main">
          <div class="row-title">${U.escapeHtml(t.title)}</div>
          ${t.description ? `<div class="text-secondary" style="font-size:13px; margin-top:2px;">${U.escapeHtml(t.description)}</div>` : ''}
          <div class="row-meta">
            ${subject ? `<span class="subject-chip" style="--chip-color:${subject.color};"><span class="dot"></span>${U.escapeHtml(subject.name)}</span>` : '<span class="row-meta-item text-muted">Uncategorized</span>'}
            <span class="badge badge-${PRIORITY_BADGE[t.priority]}">${t.priority[0].toUpperCase() + t.priority.slice(1)}</span>
            ${!completed ? `<span class="badge ${overdue ? 'badge-danger' : 'badge-neutral'}">${U.dueLabel(t.dueDate)}</span>` : `<span class="row-meta-item"><i data-lucide="check" class="icon" aria-hidden="true"></i>Completed</span>`}
          </div>
        </div>
        <div class="row-actions">
          <button type="button" class="icon-btn" style="width:32px; height:32px;" data-edit="${t.id}" aria-label="Edit task"><i data-lucide="pencil" class="icon" aria-hidden="true" style="width:15px; height:15px;"></i></button>
          <button type="button" class="icon-btn" style="width:32px; height:32px;" data-delete="${t.id}" aria-label="Delete task"><i data-lucide="trash-2" class="icon" aria-hidden="true" style="width:15px; height:15px;"></i></button>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wasCompleted = btn.classList.contains('checked');
      Store.toggleTaskStatus(btn.getAttribute('data-toggle'));
      U.showToast(wasCompleted ? 'Task marked as pending' : 'Task completed — nice work!', 'success');
      renderTasks();
    });
  });
  container.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(Store.getTaskById(btn.dataset.edit)));
  });
  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const task = Store.getTaskById(btn.dataset.delete);
      const ok = await U.confirmAction(`"${task.title}" will be permanently deleted.`, { title: 'Delete task?', confirmLabel: 'Delete task' });
      if (!ok) return;
      Store.deleteTask(task.id);
      U.showToast('Task deleted', 'success');
      renderTasks();
    });
  });
  U.refreshIcons();
}

function openModal(task) {
  const overlay = document.getElementById('task-modal-overlay');
  document.getElementById('task-modal-title').textContent = task ? 'Edit task' : 'Add task';
  document.getElementById('task-save-btn').textContent = task ? 'Save changes' : 'Add task';
  document.getElementById('task-id').value = task ? task.id : '';
  document.getElementById('task-title').value = task ? task.title : '';
  document.getElementById('task-description').value = task ? task.description : '';
  document.getElementById('task-subject').value = task ? (task.subjectId || '') : '';
  document.getElementById('task-due').value = task ? task.dueDate : window.Utils.todayISO();
  document.getElementById('task-title-field').classList.remove('has-error');
  document.getElementById('task-due-field').classList.remove('has-error');

  const priority = task ? task.priority : 'medium';
  document.querySelectorAll('#task-form input[name="priority"]').forEach((r) => { r.checked = r.value === priority; });

  overlay.classList.add('open');
  setTimeout(() => document.getElementById('task-title').focus(), 50);
}

function closeModal() {
  document.getElementById('task-modal-overlay').classList.remove('open');
}

function wireModal() {
  document.getElementById('task-modal-close').addEventListener('click', closeModal);
  document.getElementById('task-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('task-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'task-modal-overlay') closeModal();
  });

  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('task-title');
    const titleField = document.getElementById('task-title-field');
    const dueInput = document.getElementById('task-due');
    const dueField = document.getElementById('task-due-field');

    let valid = true;
    if (!titleInput.value.trim()) { titleField.classList.add('has-error'); valid = false; }
    if (!dueInput.value) { dueField.classList.add('has-error'); valid = false; }
    if (!valid) return;

    const id = document.getElementById('task-id').value;
    const payload = {
      title: titleInput.value.trim(),
      description: document.getElementById('task-description').value.trim(),
      subjectId: document.getElementById('task-subject').value || null,
      priority: document.querySelector('#task-form input[name="priority"]:checked').value,
      dueDate: dueInput.value,
    };

    if (id) {
      window.Store.updateTask(id, payload);
      window.Utils.showToast('Task updated', 'success');
    } else {
      window.Store.addTask(payload);
      window.Utils.showToast('Task added', 'success');
    }
    closeModal();
    renderTasks();
  });
}