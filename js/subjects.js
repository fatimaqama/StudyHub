/* ==========================================================================
   StudyHub — subjects.js (subjects.html only)
   ========================================================================== */

const SUBJECT_COLORS = [
  'var(--swatch-red)', 'var(--swatch-blue)', 'var(--swatch-green)', 'var(--swatch-purple)',
  'var(--swatch-amber)', 'var(--swatch-teal)', 'var(--swatch-pink)', 'var(--swatch-slate)',
];

const SUBJECT_ICONS = [
  'book-open', 'code-2', 'flask-conical', 'scale', 'calculator', 'globe-2',
  'atom', 'languages', 'brain', 'music', 'palette', 'landmark',
  'microscope', 'pencil-ruler', 'database', 'dumbbell',
];

document.addEventListener('DOMContentLoaded', () => {
  window.Store.init();
  window.Layout.render('subjects');
  buildPickers();
  renderSubjects();
  wireModal();
  window.Utils.refreshIcons();

  if (new URLSearchParams(location.search).get('action') === 'new') openModal();
});

function buildPickers() {
  const colorGrid = document.getElementById('subject-color-grid');
  colorGrid.innerHTML = SUBJECT_COLORS.map((c) => `<div class="swatch" data-color="${c}" style="background:${c};" role="button" aria-label="Color ${c}"></div>`).join('');
  colorGrid.querySelectorAll('.swatch').forEach((el) => el.addEventListener('click', () => {
    colorGrid.querySelectorAll('.swatch').forEach((s) => { s.classList.remove('selected'); s.innerHTML = ''; });
    el.classList.add('selected');
    el.innerHTML = '<i data-lucide="check" class="icon" aria-hidden="true"></i>';
    window.Utils.refreshIcons();
  }));

  const iconGrid = document.getElementById('subject-icon-grid');
  iconGrid.innerHTML = SUBJECT_ICONS.map((i) => `<div class="icon-option" data-icon="${i}" role="button" aria-label="Icon ${i}"><i data-lucide="${i}" class="icon" aria-hidden="true"></i></div>`).join('');
  iconGrid.querySelectorAll('.icon-option').forEach((el) => el.addEventListener('click', () => {
    iconGrid.querySelectorAll('.icon-option').forEach((s) => s.classList.remove('selected'));
    el.classList.add('selected');
  }));
  window.Utils.refreshIcons();
}

function selectColor(color) {
  const grid = document.getElementById('subject-color-grid');
  grid.querySelectorAll('.swatch').forEach((s) => { s.classList.remove('selected'); s.innerHTML = ''; });
  const target = grid.querySelector(`[data-color="${CSS.escape(color)}"]`) || grid.firstElementChild;
  target.classList.add('selected');
  target.innerHTML = '<i data-lucide="check" class="icon" aria-hidden="true"></i>';
  window.Utils.refreshIcons();
}

function selectIcon(icon) {
  const grid = document.getElementById('subject-icon-grid');
  grid.querySelectorAll('.icon-option').forEach((s) => s.classList.remove('selected'));
  const target = grid.querySelector(`[data-icon="${CSS.escape(icon)}"]`) || grid.firstElementChild;
  target.classList.add('selected');
}

function openModal(subject) {
  const overlay = document.getElementById('subject-modal-overlay');
  const title = document.getElementById('subject-modal-title');
  const saveBtn = document.getElementById('subject-save-btn');
  const nameInput = document.getElementById('subject-name');
  const nameField = document.getElementById('subject-name-field');

  document.getElementById('subject-id').value = subject ? subject.id : '';
  nameInput.value = subject ? subject.name : '';
  nameField.classList.remove('has-error');
  title.textContent = subject ? 'Edit subject' : 'Add subject';
  saveBtn.textContent = subject ? 'Save changes' : 'Add subject';
  selectColor(subject ? subject.color : SUBJECT_COLORS[0]);
  selectIcon(subject ? subject.icon : SUBJECT_ICONS[0]);

  overlay.classList.add('open');
  setTimeout(() => nameInput.focus(), 50);
}

function closeModal() {
  document.getElementById('subject-modal-overlay').classList.remove('open');
}

function wireModal() {
  document.getElementById('add-subject-btn').addEventListener('click', () => openModal());
  document.getElementById('subject-modal-close').addEventListener('click', closeModal);
  document.getElementById('subject-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('subject-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'subject-modal-overlay') closeModal();
  });

  document.getElementById('subject-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('subject-name');
    const nameField = document.getElementById('subject-name-field');
    const name = nameInput.value.trim();
    if (!name) { nameField.classList.add('has-error'); nameInput.focus(); return; }
    nameField.classList.remove('has-error');

    const id = document.getElementById('subject-id').value;
    const color = document.querySelector('#subject-color-grid .swatch.selected')?.dataset.color || SUBJECT_COLORS[0];
    const icon = document.querySelector('#subject-icon-grid .icon-option.selected')?.dataset.icon || SUBJECT_ICONS[0];

    if (id) {
      window.Store.updateSubject(id, { name, color, icon });
      window.Utils.showToast('Subject updated', 'success');
    } else {
      window.Store.addSubject({ name, color, icon });
      window.Utils.showToast('Subject added', 'success');
    }
    closeModal();
    renderSubjects();
  });
}

function renderSubjects() {
  const Store = window.Store;
  const U = window.Utils;
  const subjects = Store.getSubjects();
  const container = document.getElementById('subjects-grid');

  if (subjects.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon"><i data-lucide="book-open" class="icon" aria-hidden="true"></i></div>
        <h3>No subjects yet</h3>
        <p>Subjects group your tasks, notes and study sessions. Add one to get started — it can be anything from "Mathematics" to "Guitar practice".</p>
        <button type="button" class="btn btn-primary" id="empty-add-subject-btn">Add subject</button>
      </div>`;
    document.getElementById('empty-add-subject-btn').addEventListener('click', () => openModal());
    U.refreshIcons();
    return;
  }

  container.innerHTML = subjects.map((s) => {
    const p = Store.getSubjectProgress(s.id);
    return `
      <div class="card">
        <div class="flex-between" style="align-items:flex-start; margin-bottom:14px;">
          <div class="flex gap-12" style="align-items:center; min-width:0;">
            <div class="stat-icon-wrap" style="background:color-mix(in srgb, ${s.color} 16%, transparent); color:${s.color};">
              <i data-lucide="${s.icon}" class="icon" aria-hidden="true"></i>
            </div>
            <div style="min-width:0;">
              <div class="card-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px;">${U.escapeHtml(s.name)}</div>
              <div class="card-subtitle">${p.total} ${p.total === 1 ? 'task' : 'tasks'} · ${U.formatHours(p.minutes)}h logged</div>
            </div>
          </div>
          <div class="row-actions">
            <button type="button" class="icon-btn" style="width:32px; height:32px;" data-edit="${s.id}" aria-label="Edit subject"><i data-lucide="pencil" class="icon" aria-hidden="true" style="width:15px; height:15px;"></i></button>
            <button type="button" class="icon-btn" style="width:32px; height:32px;" data-delete="${s.id}" aria-label="Delete subject"><i data-lucide="trash-2" class="icon" aria-hidden="true" style="width:15px; height:15px;"></i></button>
          </div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${p.percent}%; background:${s.color};"></div></div>
        <div class="flex-between mt-8" style="font-size:12px; color:var(--color-text-muted);">
          <span>${p.completed} of ${p.total} done</span>
          <span>${p.percent}%</span>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(Store.getSubjectById(btn.dataset.edit)));
  });
  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const subject = Store.getSubjectById(btn.dataset.delete);
      const ok = await U.confirmAction(
        `Deleting "${subject.name}" will move its tasks, notes and study sessions to Uncategorized rather than deleting them.`,
        { title: 'Delete subject?', confirmLabel: 'Delete subject' }
      );
      if (!ok) return;
      Store.deleteSubject(subject.id);
      U.showToast('Subject deleted', 'success');
      renderSubjects();
    });
  });
  U.refreshIcons();
}