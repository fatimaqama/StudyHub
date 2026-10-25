/* ==========================================================================
   StudyHub — notes.js (notes.html only)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  window.Store.init();
  window.Layout.render('notes');
  populateNoteSubjectDropdowns();
  wireToolbar();
  wireModal();
  renderNotes();
  window.Utils.refreshIcons();

  if (new URLSearchParams(location.search).get('action') === 'new') openModal();
});

function populateNoteSubjectDropdowns() {
  const subjects = window.Store.getSubjects();
  const options = subjects.map((s) => `<option value="${s.id}">${window.Utils.escapeHtml(s.name)}</option>`).join('');

  document.getElementById('note-filter-subject').innerHTML =
    `<option value="all">All subjects</option><option value="uncategorized">Uncategorized</option>${options}`;
  document.getElementById('note-subject').innerHTML = `<option value="">Uncategorized</option>${options}`;
}

function wireToolbar() {
  document.getElementById('note-search').addEventListener('input', window.Utils.debounce(renderNotes, 200));
  document.getElementById('note-filter-subject').addEventListener('change', renderNotes);
  document.getElementById('add-note-btn').addEventListener('click', () => openModal());
}

function getFilteredNotes() {
  const query = document.getElementById('note-search').value.trim().toLowerCase();
  const subjectFilter = document.getElementById('note-filter-subject').value;
  let notes = window.Store.getNotes();

  if (query) {
    notes = notes.filter((n) => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
  }
  if (subjectFilter === 'uncategorized') {
    notes = notes.filter((n) => !n.subjectId);
  } else if (subjectFilter !== 'all') {
    notes = notes.filter((n) => n.subjectId === subjectFilter);
  }
  return notes;
}

function noteCardHTML(n) {
  const U = window.Utils;
  const Store = window.Store;
  const subject = Store.getSubjectById(n.subjectId);
  return `
    <div class="card spine note-card" style="--spine-color:${subject ? subject.color : 'var(--color-border-strong)'};">
      <div class="note-card-head">
        <div class="note-title">${U.escapeHtml(n.title)}</div>
        <button type="button" class="pin-btn ${n.pinned ? 'pinned' : ''}" data-pin="${n.id}" aria-label="${n.pinned ? 'Unpin note' : 'Pin note'}">
          <i data-lucide="pin" class="icon" aria-hidden="true"></i>
        </button>
      </div>
      ${subject
        ? `<span class="subject-chip" style="--chip-color:${subject.color}; margin-bottom:10px;"><span class="dot"></span>${U.escapeHtml(subject.name)}</span>`
        : `<span class="text-muted" style="margin-bottom:10px; font-size:12.5px; display:inline-block;">Uncategorized</span>`}
      <div class="note-content">${U.escapeHtml(n.content)}</div>
      <div class="note-footer">
        <span>Updated ${U.relativeTime(n.updatedAt)}</span>
        <div class="row-actions">
          <button type="button" class="icon-btn" style="width:30px; height:30px;" data-edit="${n.id}" aria-label="Edit note"><i data-lucide="pencil" class="icon" aria-hidden="true" style="width:14px; height:14px;"></i></button>
          <button type="button" class="icon-btn" style="width:30px; height:30px;" data-delete="${n.id}" aria-label="Delete note"><i data-lucide="trash-2" class="icon" aria-hidden="true" style="width:14px; height:14px;"></i></button>
        </div>
      </div>
    </div>`;
}

function renderNotes() {
  const U = window.Utils;
  const Store = window.Store;
  const totalNotes = Store.getNotes().length;
  const filtered = getFilteredNotes();
  const pinned = filtered.filter((n) => n.pinned).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const others = filtered.filter((n) => !n.pinned).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const pinnedSection = document.getElementById('pinned-section');
  const allSection = document.getElementById('all-notes-section');
  const allHeading = document.getElementById('all-notes-heading');
  const pinnedGrid = document.getElementById('pinned-notes-grid');
  const allGrid = document.getElementById('all-notes-grid');

  if (totalNotes === 0) {
    pinnedSection.classList.add('hidden');
    allHeading.textContent = 'All notes';
    allGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon"><i data-lucide="notebook-pen" class="icon" aria-hidden="true"></i></div>
        <h3>No notes yet</h3>
        <p>Capture key ideas, formulas or reminders and pin the ones you need most often.</p>
        <button type="button" class="btn btn-primary" id="empty-add-note-btn">New note</button>
      </div>`;
    document.getElementById('empty-add-note-btn').addEventListener('click', () => openModal());
    U.refreshIcons();
    return;
  }

  if (filtered.length === 0) {
    pinnedSection.classList.add('hidden');
    allHeading.textContent = 'All notes';
    allGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="empty-icon"><i data-lucide="search-x" class="icon" aria-hidden="true"></i></div>
        <h3>No matching notes</h3>
        <p>Try a different search term or subject filter.</p>
      </div>`;
    U.refreshIcons();
    return;
  }

  if (pinned.length > 0) {
    pinnedSection.classList.remove('hidden');
    pinnedGrid.innerHTML = pinned.map(noteCardHTML).join('');
  } else {
    pinnedSection.classList.add('hidden');
  }

  allHeading.textContent = pinned.length > 0 ? 'All notes' : 'All notes';
  if (others.length === 0) {
    allSection.classList.add('hidden');
  } else {
    allSection.classList.remove('hidden');
    allGrid.innerHTML = others.map(noteCardHTML).join('');
  }

  wireCardActions(pinnedGrid);
  wireCardActions(allGrid);
  U.refreshIcons();
}

function wireCardActions(container) {
  container.querySelectorAll('[data-pin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.Store.toggleNotePin(btn.getAttribute('data-pin'));
      renderNotes();
    });
  });
  container.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(window.Store.getNoteById(btn.dataset.edit)));
  });
  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const note = window.Store.getNoteById(btn.dataset.delete);
      const ok = await window.Utils.confirmAction(`"${note.title}" will be permanently deleted.`, { title: 'Delete note?', confirmLabel: 'Delete note' });
      if (!ok) return;
      window.Store.deleteNote(note.id);
      window.Utils.showToast('Note deleted', 'success');
      renderNotes();
    });
  });
}

function openModal(note) {
  const overlay = document.getElementById('note-modal-overlay');
  document.getElementById('note-modal-title').textContent = note ? 'Edit note' : 'New note';
  document.getElementById('note-save-btn').textContent = note ? 'Save changes' : 'Save note';
  document.getElementById('note-id').value = note ? note.id : '';
  document.getElementById('note-title').value = note ? note.title : '';
  document.getElementById('note-subject').value = note ? (note.subjectId || '') : '';
  document.getElementById('note-content').value = note ? note.content : '';
  document.getElementById('note-pinned').checked = note ? !!note.pinned : false;
  document.getElementById('note-title-field').classList.remove('has-error');
  document.getElementById('note-content-field').classList.remove('has-error');

  overlay.classList.add('open');
  setTimeout(() => document.getElementById('note-title').focus(), 50);
}

function closeModal() {
  document.getElementById('note-modal-overlay').classList.remove('open');
}

function wireModal() {
  document.getElementById('note-modal-close').addEventListener('click', closeModal);
  document.getElementById('note-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('note-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'note-modal-overlay') closeModal();
  });

  document.getElementById('note-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('note-title');
    const titleField = document.getElementById('note-title-field');
    const contentInput = document.getElementById('note-content');
    const contentField = document.getElementById('note-content-field');

    let valid = true;
    if (!titleInput.value.trim()) { titleField.classList.add('has-error'); valid = false; }
    if (!contentInput.value.trim()) { contentField.classList.add('has-error'); valid = false; }
    if (!valid) return;

    const id = document.getElementById('note-id').value;
    const payload = {
      title: titleInput.value.trim(),
      content: contentInput.value.trim(),
      subjectId: document.getElementById('note-subject').value || null,
      pinned: document.getElementById('note-pinned').checked,
    };

    if (id) {
      window.Store.updateNote(id, payload);
      window.Utils.showToast('Note updated', 'success');
    } else {
      window.Store.addNote(payload);
      window.Utils.showToast('Note saved', 'success');
    }
    closeModal();
    renderNotes();
  });
}