/* ==========================================================================
   StudyHub — settings.js (settings.html only)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  window.Store.init();
  window.Layout.render('settings');
  syncThemeSegmented();
  wireThemeSegmented();
  loadProfileForm();
  wireProfileForm();
  loadNotificationToggle();
  wireNotificationToggle();
  wireDataButtons();
  wireLogout();
  window.Utils.refreshIcons();

  window.addEventListener('studyhub:themechange', syncThemeSegmented);
});

/* ---- Appearance --------------------------------------------------------- */

function syncThemeSegmented() {
  const current = window.Theme.getTheme();
  document.querySelectorAll('#theme-segmented [data-theme-choice]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-choice') === current);
  });
}

function wireThemeSegmented() {
  document.querySelectorAll('#theme-segmented [data-theme-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.Theme.apply(btn.getAttribute('data-theme-choice'));
      syncThemeSegmented();
    });
  });
}

/* ---- Profile -------------------------------------------------------------- */

function loadProfileForm() {
  const user = window.Auth.getCurrentUser();
  if (!user) return;
  document.getElementById('profile-name').value = user.displayName;
  document.getElementById('profile-email').value = user.email;
  document.getElementById('account-email-label').textContent = user.email;
}

function wireProfileForm() {
  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('profile-name');
    const nameField = document.getElementById('profile-name-field');
    const emailInput = document.getElementById('profile-email');
    const emailField = document.getElementById('profile-email-field');
    nameField.classList.remove('has-error');
    emailField.classList.remove('has-error');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    let valid = true;
    if (!name) { nameField.classList.add('has-error'); valid = false; }
    if (!emailValid) { emailField.classList.add('has-error'); valid = false; }

    const currentUser = window.Auth.getCurrentUser();
    if (valid && emailValid && email.toLowerCase() !== currentUser.email.toLowerCase()) {
      const existing = window.Store.findUserByEmail(email);
      if (existing && existing.id !== currentUser.id) {
        emailField.classList.add('has-error');
        valid = false;
      }
    }
    if (!valid) return;

    window.Store.updateCurrentUser({ displayName: name, email });
    window.Utils.showToast('Profile updated', 'success');
    window.Layout.render('settings'); // refresh sidebar/header name + avatar
    syncThemeSegmented();
    document.getElementById('account-email-label').textContent = email;
  });
}

/* ---- Notifications ------------------------------------------------------- */

function loadNotificationToggle() {
  document.getElementById('notif-toggle').checked = !!window.Store.getSettings().notificationsEnabled;
}

function wireNotificationToggle() {
  document.getElementById('notif-toggle').addEventListener('change', (e) => {
    window.Store.saveSettings({ notificationsEnabled: e.target.checked });
    window.Utils.showToast(e.target.checked ? 'Notifications turned on' : 'Notifications turned off', 'success');
    window.Layout.renderNotifications();
  });
}

/* ---- Data management ------------------------------------------------------- */

function wireDataButtons() {
  document.getElementById('reset-demo-btn').addEventListener('click', async () => {
    const ok = await window.Utils.confirmAction(
      'This replaces every subject, task, study session and note with fresh example data.',
      { title: 'Reset to demo data?', confirmLabel: 'Reset data' }
    );
    if (!ok) return;
    const user = window.Auth.getCurrentUser();
    window.Store.resetAllData();
    window.Store.seedDemoData(user ? user.id : null);
    window.Utils.showToast('Demo data restored', 'success');
  });

  document.getElementById('clear-data-btn').addEventListener('click', async () => {
    const ok = await window.Utils.confirmAction(
      'Every subject, task, study session and note will be permanently deleted. This cannot be undone.',
      { title: 'Clear all data?', confirmLabel: 'Clear everything' }
    );
    if (!ok) return;
    window.Store.resetAllData();
    window.Utils.showToast('All data cleared', 'success');
  });
}

/* ---- Account -------------------------------------------------------------- */

function wireLogout() {
  document.getElementById('settings-logout-btn').addEventListener('click', async () => {
    const ok = await window.Utils.confirmAction('You\u2019ll be signed out of StudyHub on this device.', { title: 'Log out?', confirmLabel: 'Log out' });
    if (ok) window.Auth.logout();
  });
}