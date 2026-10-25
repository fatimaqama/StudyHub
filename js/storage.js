/* ==========================================================================
   StudyHub — storage.js
   The single place that reads/writes localStorage. Every page script goes
   through `Store.*` instead of touching localStorage directly, so the data
   shape only has to be right in one place.
   ========================================================================== */

(function () {
  'use strict';

  const KEYS = {
    USERS: 'studyhub_users',
    SESSION: 'studyhub_session',
    SUBJECTS: 'studyhub_subjects',
    TASKS: 'studyhub_tasks',
    STUDY_SESSIONS: 'studyhub_study_sessions',
    NOTES: 'studyhub_notes',
    SETTINGS: 'studyhub_settings',
    SEEDED: 'studyhub_seeded',
  };

  const U = () => window.Utils; // lazy — utils.js loads before storage.js, but keeps this file order-tolerant

  /* ---- Low-level read/write --------------------------------------------- */

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.error(`StudyHub: failed to read "${key}" from localStorage`, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error(`StudyHub: failed to write "${key}" to localStorage`, e);
      return false;
    }
  }

  /* ---- Users & session ---------------------------------------------------- */

  function getUsers() { return read(KEYS.USERS, []); }
  function saveUsers(list) { return write(KEYS.USERS, list); }

  function findUserByEmail(email) {
    if (!email) return null;
    const target = email.trim().toLowerCase();
    return getUsers().find((u) => u.email.toLowerCase() === target) || null;
  }

  function createUser({ email, password, displayName }) {
    const user = {
      id: U().generateId('user'),
      email: email.trim(),
      password, // NOTE: plain text — this app simulates auth client-side only, with no backend.
      displayName: displayName || email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    const users = getUsers();
    users.push(user);
    saveUsers(users);
    return user;
  }

  function validateCredentials(email, password) {
    const user = findUserByEmail(email);
    if (!user || user.password !== password) return null;
    return user;
  }

  function getSession() {
    const persisted = read(KEYS.SESSION, null);
    if (persisted) return persisted;
    try {
      const raw = sessionStorage.getItem(KEYS.SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  /** remember=true persists across browser restarts (localStorage); false clears on tab close (sessionStorage). */
  function setSession(session, remember) {
    if (remember === false) {
      try { sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session)); } catch (e) { /* ignore */ }
      localStorage.removeItem(KEYS.SESSION);
      return true;
    }
    localStorage.removeItem(KEYS.SESSION); // avoid a stale copy in the other store
    return write(KEYS.SESSION, session);
  }
  function clearSession() {
    localStorage.removeItem(KEYS.SESSION);
    try { sessionStorage.removeItem(KEYS.SESSION); } catch (e) { /* ignore */ }
  }
  function isAuthenticated() {
    const s = getSession();
    return !!(s && s.isAuthenticated && s.userId);
  }
  function getCurrentUser() {
    const s = getSession();
    if (!s || !s.userId) return null;
    return getUsers().find((u) => u.id === s.userId) || null;
  }
  function updateCurrentUser(patch) {
    const user = getCurrentUser();
    if (!user) return null;
    const users = getUsers().map((u) => (u.id === user.id ? { ...u, ...patch } : u));
    saveUsers(users);
    return { ...user, ...patch };
  }

  /* ---- Subjects ------------------------------------------------------------ */

  function getSubjects() { return read(KEYS.SUBJECTS, []); }
  function saveSubjects(list) { return write(KEYS.SUBJECTS, list); }
  function getSubjectById(id) { return getSubjects().find((s) => s.id === id) || null; }

  function addSubject({ name, color, icon }) {
    const subject = {
      id: U().generateId('subj'),
      name: name.trim(),
      color: color || 'var(--swatch-red)',
      icon: icon || 'book-open',
      createdAt: new Date().toISOString(),
    };
    const list = getSubjects();
    list.push(subject);
    saveSubjects(list);
    return subject;
  }

  function updateSubject(id, patch) {
    const list = getSubjects().map((s) => (s.id === id ? { ...s, ...patch } : s));
    saveSubjects(list);
    return getSubjectById(id);
  }

  /** Deletes a subject and un-assigns (never silently deletes) anything that referenced it. */
  function deleteSubject(id) {
    saveSubjects(getSubjects().filter((s) => s.id !== id));
    saveTasks(getTasks().map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)));
    saveStudySessions(getStudySessions().map((s) => (s.subjectId === id ? { ...s, subjectId: null } : s)));
    saveNotes(getNotes().map((n) => (n.subjectId === id ? { ...n, subjectId: null } : n)));
  }

  /* ---- Tasks --------------------------------------------------------------- */

  function getTasks() { return read(KEYS.TASKS, []); }
  function saveTasks(list) { return write(KEYS.TASKS, list); }
  function getTaskById(id) { return getTasks().find((t) => t.id === id) || null; }

  function addTask({ title, description, subjectId, priority, dueDate }) {
    const task = {
      id: U().generateId('task'),
      title: title.trim(),
      description: (description || '').trim(),
      subjectId: subjectId || null,
      priority: priority || 'medium',
      dueDate: dueDate || U().todayISO(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    const list = getTasks();
    list.push(task);
    saveTasks(list);
    return task;
  }

  function updateTask(id, patch) {
    const list = getTasks().map((t) => (t.id === id ? { ...t, ...patch } : t));
    saveTasks(list);
    return getTaskById(id);
  }

  function deleteTask(id) { saveTasks(getTasks().filter((t) => t.id !== id)); }

  function toggleTaskStatus(id) {
    const task = getTaskById(id);
    if (!task) return null;
    const completed = task.status !== 'completed';
    return updateTask(id, {
      status: completed ? 'completed' : 'pending',
      completedAt: completed ? new Date().toISOString() : null,
    });
  }

  function getTasksBySubject(subjectId) { return getTasks().filter((t) => t.subjectId === subjectId); }

  /* ---- Study sessions -------------------------------------------------------- */

  function getStudySessions() { return read(KEYS.STUDY_SESSIONS, []); }
  function saveStudySessions(list) { return write(KEYS.STUDY_SESSIONS, list); }
  function getStudySessionById(id) { return getStudySessions().find((s) => s.id === id) || null; }

  function addStudySession({ subjectId, date, startTime, durationMinutes, notes }) {
    const session = {
      id: U().generateId('sess'),
      subjectId: subjectId || null,
      date: date || U().todayISO(),
      startTime: startTime || '09:00',
      durationMinutes: Number(durationMinutes) || 30,
      notes: (notes || '').trim(),
      createdAt: new Date().toISOString(),
    };
    const list = getStudySessions();
    list.push(session);
    saveStudySessions(list);
    return session;
  }

  function updateStudySession(id, patch) {
    const list = getStudySessions().map((s) => (s.id === id ? { ...s, ...patch } : s));
    saveStudySessions(list);
    return getStudySessionById(id);
  }

  function deleteStudySession(id) { saveStudySessions(getStudySessions().filter((s) => s.id !== id)); }
  function getSessionsByDate(dateISO) { return getStudySessions().filter((s) => s.date === dateISO); }

  /* ---- Notes ----------------------------------------------------------------- */

  function getNotes() { return read(KEYS.NOTES, []); }
  function saveNotes(list) { return write(KEYS.NOTES, list); }
  function getNoteById(id) { return getNotes().find((n) => n.id === id) || null; }

  function addNote({ title, content, subjectId, pinned }) {
    const note = {
      id: U().generateId('note'),
      title: title.trim(),
      content: (content || '').trim(),
      subjectId: subjectId || null,
      pinned: !!pinned,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const list = getNotes();
    list.push(note);
    saveNotes(list);
    return note;
  }

  function updateNote(id, patch) {
    const list = getNotes().map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n));
    saveNotes(list);
    return getNoteById(id);
  }

  function deleteNote(id) { saveNotes(getNotes().filter((n) => n.id !== id)); }
  function toggleNotePin(id) {
    const note = getNoteById(id);
    if (!note) return null;
    return updateNote(id, { pinned: !note.pinned });
  }

  /* ---- Settings --------------------------------------------------------------- */

  function getSettings() {
    return read(KEYS.SETTINGS, { theme: 'light', notificationsEnabled: true });
  }
  function saveSettings(patch) {
    const merged = { ...getSettings(), ...patch };
    write(KEYS.SETTINGS, merged);
    return merged;
  }

  /* ---- Derived analytics -------------------------------------------------------- */

  function getSubjectProgress(subjectId) {
    const tasks = getTasksBySubject(subjectId);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const minutes = getStudySessions()
      .filter((s) => s.subjectId === subjectId)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    return {
      total,
      completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      minutes,
    };
  }

  function getOverallProgress() {
    const tasks = getTasks();
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return { total, completed, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
  }

  function getTotalStudyMinutes() {
    return getStudySessions().reduce((sum, s) => sum + s.durationMinutes, 0);
  }

  /** Consecutive days (including today) with at least one logged study session. */
  function getStudyStreak() {
    const sessions = getStudySessions();
    if (sessions.length === 0) return 0;
    const datesWithSessions = new Set(sessions.filter((s) => s.date <= U().todayISO()).map((s) => s.date));
    let streak = 0;
    let cursor = U().todayISO();
    // If nothing happened today yet, the streak can still count from yesterday backwards.
    if (!datesWithSessions.has(cursor)) cursor = U().addDays(cursor, -1);
    while (datesWithSessions.has(cursor)) {
      streak += 1;
      cursor = U().addDays(cursor, -1);
    }
    return streak;
  }

  function getTasksDueSoon(days) {
    const horizon = U().addDays(U().todayISO(), days == null ? 7 : days);
    return getTasks()
      .filter((t) => t.status !== 'completed' && t.dueDate <= horizon)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  }

  function getOverdueTasks() {
    const today = U().todayISO();
    return getTasks().filter((t) => t.status !== 'completed' && t.dueDate < today);
  }

  /** Minutes studied per day for the last N days (oldest first) — feeds the weekly activity chart. */
  function getWeeklyStudyActivity(days) {
    const n = days || 7;
    const sessions = getStudySessions();
    const out = [];
    for (let i = n - 1; i >= 0; i -= 1) {
      const date = U().addDays(U().todayISO(), -i);
      const minutes = sessions.filter((s) => s.date === date).reduce((sum, s) => sum + s.durationMinutes, 0);
      out.push({ date, minutes });
    }
    return out;
  }

  function getUpcomingStudySessions(days) {
    const today = U().todayISO();
    const horizon = U().addDays(today, days == null ? 14 : days);
    return getStudySessions()
      .filter((s) => s.date >= today && s.date <= horizon)
      .sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? -1 : 1));
  }

  function getRecentActivity(limit) {
    const items = [];
    getTasks().filter((t) => t.completedAt).forEach((t) => items.push({
      type: 'task', icon: 'circle-check', ts: t.completedAt, text: `Completed "${t.title}"`,
    }));
    getStudySessions().forEach((s) => items.push({
      type: 'session', icon: 'clock', ts: s.createdAt, text: `Logged ${U().formatDuration(s.durationMinutes)} study session${subjectSuffix(s.subjectId)}`,
    }));
    getNotes().forEach((n) => items.push({
      type: 'note', icon: 'file-text', ts: n.createdAt, text: `Added note "${n.title}"`,
    }));
    getSubjects().forEach((sub) => items.push({
      type: 'subject', icon: 'book-open', ts: sub.createdAt, text: `Added subject "${sub.name}"`,
    }));
    items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return items.slice(0, limit || 6);
  }

  function subjectSuffix(subjectId) {
    const s = getSubjectById(subjectId);
    return s ? ` — ${s.name}` : '';
  }

  /* ---- First-run seed data ------------------------------------------------------- */

  function seedDemoData(userId) {
    const today = U().todayISO();
    const addD = (n) => U().addDays(today, n);

    const subjects = [
      { id: U().generateId('subj'), name: 'Information Technology', color: 'var(--swatch-blue)', icon: 'code-2', createdAt: new Date().toISOString() },
      { id: U().generateId('subj'), name: 'Applied Science', color: 'var(--swatch-green)', icon: 'flask-conical', createdAt: new Date().toISOString() },
      { id: U().generateId('subj'), name: 'Law', color: 'var(--swatch-purple)', icon: 'scale', createdAt: new Date().toISOString() },
      { id: U().generateId('subj'), name: 'Mathematics', color: 'var(--swatch-amber)', icon: 'calculator', createdAt: new Date().toISOString() },
    ];
    saveSubjects(subjects);
    const [it, science, law, math] = subjects;

    const tasks = [
      { title: 'Finish network security assignment', subjectId: it.id, priority: 'high', dueDate: addD(1), status: 'pending' },
      { title: 'Read Chapter 4: Data Structures', subjectId: it.id, priority: 'medium', dueDate: addD(4), status: 'pending' },
      { title: 'Submit Python project proposal', subjectId: it.id, priority: 'medium', dueDate: addD(-1), status: 'pending' },
      { title: 'Lab report: titration experiment', subjectId: science.id, priority: 'high', dueDate: addD(2), status: 'pending' },
      { title: 'Group presentation slides', subjectId: science.id, priority: 'low', dueDate: addD(5), status: 'pending' },
      { title: 'Prepare case brief: Donoghue v Stevenson', subjectId: law.id, priority: 'medium', dueDate: addD(3), status: 'pending' },
      { title: 'Revise for contract law quiz', subjectId: law.id, priority: 'low', dueDate: addD(6), status: 'pending' },
      { title: 'Problem set 6: integration techniques', subjectId: math.id, priority: 'high', dueDate: addD(1), status: 'pending' },
      { title: 'Practice past paper: calculus', subjectId: math.id, priority: 'medium', dueDate: addD(7), status: 'pending' },
      { title: 'Set up development environment', subjectId: it.id, priority: 'low', dueDate: addD(-6), status: 'completed', completedAt: addD(-5) },
      { title: 'Balance chemical equations worksheet', subjectId: science.id, priority: 'medium', dueDate: addD(-4), status: 'completed', completedAt: addD(-3) },
      { title: 'Literature review outline', subjectId: law.id, priority: 'medium', dueDate: addD(-3), status: 'completed', completedAt: addD(-2) },
    ].map((t) => ({
      id: U().generateId('task'),
      description: '',
      createdAt: new Date().toISOString(),
      completedAt: null,
      ...t,
      completedAt: t.completedAt ? new Date(U().parseISODate(t.completedAt)).toISOString() : null,
    }));
    saveTasks(tasks);

    const sessions = [
      { subjectId: math.id, date: addD(-5), startTime: '09:00', durationMinutes: 60, notes: 'Practice integration problems' },
      { subjectId: it.id, date: addD(-4), startTime: '14:00', durationMinutes: 90, notes: 'Read networking chapter' },
      { subjectId: law.id, date: addD(-3), startTime: '10:00', durationMinutes: 45, notes: 'Case law review' },
      { subjectId: science.id, date: addD(-2), startTime: '16:00', durationMinutes: 75, notes: 'Lab prep' },
      { subjectId: math.id, date: addD(-1), startTime: '09:30', durationMinutes: 50, notes: '' },
      { subjectId: it.id, date: addD(0), startTime: '15:00', durationMinutes: 60, notes: '' },
      { subjectId: science.id, date: addD(1), startTime: '11:00', durationMinutes: 90, notes: 'Titration lab practice run' },
      { subjectId: law.id, date: addD(3), startTime: '13:00', durationMinutes: 60, notes: 'Statute reading' },
    ].map((s) => ({ id: U().generateId('sess'), createdAt: new Date().toISOString(), ...s }));
    saveStudySessions(sessions);

    const notes = [
      { title: 'Exam format reminder', subjectId: law.id, pinned: true, content: 'Two-hour paper: one problem question, one essay question. Bring the annotated statute book.' },
      { title: 'Integration by parts formula', subjectId: math.id, pinned: true, content: '∫u dv = uv − ∫v du. Pick u as the term that gets simpler when differentiated.' },
      { title: 'Useful regex cheatsheet', subjectId: it.id, pinned: false, content: '^ start, $ end, \\d digit, \\w word char, + one or more, * zero or more, ? optional.' },
      { title: 'Titration calculation steps', subjectId: science.id, pinned: false, content: '1) Note the burette start/end readings. 2) Calculate the titre volume. 3) Use moles = concentration × volume.' },
    ].map((n) => ({
      id: U().generateId('note'), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...n,
    }));
    saveNotes(notes);

    write(KEYS.SEEDED, true);
  }

  /** Called once per page load. Creates a demo account + demo data the first time StudyHub is ever opened. */
  function init() {
    if (getUsers().length === 0) {
      createUser({ email: 'demo@studyhub.app', password: 'demo1234', displayName: 'Jordan Avery' });
    }
    if (!read(KEYS.SEEDED, false)) {
      const demoUser = getUsers()[0];
      seedDemoData(demoUser.id);
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      saveSettings({ theme: 'light', notificationsEnabled: true });
    }
  }

  /** Wipes all study data (subjects/tasks/sessions/notes) but keeps the account and session. */
  function resetAllData() {
    saveSubjects([]);
    saveTasks([]);
    saveStudySessions([]);
    saveNotes([]);
  }

  window.Store = {
    KEYS,
    init,
    // users / session
    getUsers, findUserByEmail, createUser, validateCredentials,
    getSession, setSession, clearSession, isAuthenticated, getCurrentUser, updateCurrentUser,
    // subjects
    getSubjects, getSubjectById, addSubject, updateSubject, deleteSubject,
    // tasks
    getTasks, getTaskById, addTask, updateTask, deleteTask, toggleTaskStatus, getTasksBySubject,
    // sessions
    getStudySessions, getStudySessionById, addStudySession, updateStudySession, deleteStudySession, getSessionsByDate, getUpcomingStudySessions,
    // notes
    getNotes, getNoteById, addNote, updateNote, deleteNote, toggleNotePin,
    // settings
    getSettings, saveSettings,
    // analytics
    getSubjectProgress, getOverallProgress, getTotalStudyMinutes, getStudyStreak,
    getTasksDueSoon, getOverdueTasks, getWeeklyStudyActivity, getRecentActivity,
    // maintenance
    resetAllData, seedDemoData,
  };
})();