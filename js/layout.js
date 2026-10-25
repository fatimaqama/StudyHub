/* ==========================================================================
   StudyHub — layout.js
   Injects the sidebar + header chrome that's identical on every protected
   page, so it only has to be written once. Each page just needs
   <aside id="sidebar"></aside> and <header id="header"></header> in its
   body, then calls Layout.render('pageKey') on load.
   ========================================================================== */

(function () {
  'use strict';

  const NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: 'layout-dashboard' },
    { key: 'subjects', label: 'Subjects', href: 'subjects.html', icon: 'book-open' },
    { key: 'tasks', label: 'Tasks', href: 'tasks.html', icon: 'list-checks' },
    { key: 'planner', label: 'Planner', href: 'planner.html', icon: 'calendar-days' },
    { key: 'notes', label: 'Notes', href: 'notes.html', icon: 'notebook-pen' },
    { key: 'progress', label: 'Progress', href: 'progress.html', icon: 'chart-column' },
    { key: 'settings', label: 'Settings', href: 'settings.html', icon: 'settings' },
  ];

  const PAGE_TITLES = {
    dashboard: 'Dashboard', subjects: 'Subjects', tasks: 'Tasks', planner: 'Study planner',
    notes: 'Notes', progress: 'Progress', settings: 'Settings',
  };

  function sidebarHTML(activeKey) {
    const links = NAV_ITEMS.map((item) => `
      <a class="nav-link ${item.key === activeKey ? 'active' : ''}" href="${item.href}">
        <i data-lucide="${item.icon}" class="icon" aria-hidden="true"></i>
        <span>${item.label}</span>
      </a>`).join('');

    const user = window.Auth.getCurrentUser();
    const name = user ? user.displayName : 'Guest';
    const email = user ? user.email : '';

    return `
      <div class="brand">
        <div class="brand-mark">SH</div>
        <span class="brand-name">StudyHub</span>
      </div>
      <nav class="nav-section" aria-label="Main navigation">${links}</nav>
      <div class="sidebar-footer">
        <div class="dropdown" id="user-menu-dropdown">
          <div class="user-card" id="user-card-trigger" role="button" tabindex="0" aria-haspopup="true">
            <div class="avatar">${window.Utils.escapeHtml(window.Utils.initials(name))}</div>
            <div class="user-card-info">
              <div class="user-card-name">${window.Utils.escapeHtml(name)}</div>
              <div class="user-card-email">${window.Utils.escapeHtml(email)}</div>
            </div>
          </div>
          <div class="dropdown-menu" id="user-menu" style="right:auto; left:8px; bottom:calc(100% + 8px); top:auto;">
            <button type="button" class="dropdown-item" data-nav="settings.html"><i data-lucide="user" class="icon" aria-hidden="true"></i>Profile settings</button>
            <button type="button" class="dropdown-item" data-nav="settings.html"><i data-lucide="settings" class="icon" aria-hidden="true"></i>Settings</button>
            <div class="dropdown-divider"></div>
            <button type="button" class="dropdown-item danger" id="logout-btn"><i data-lucide="log-out" class="icon" aria-hidden="true"></i>Log out</button>
          </div>
        </div>
      </div>`;
  }

  function headerHTML(activeKey) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    return `
      <div class="topbar-left">
        <button type="button" class="icon-btn menu-toggle" id="menu-toggle" aria-label="Open menu">
          <i data-lucide="menu" class="icon" aria-hidden="true"></i>
        </button>
        <div>
          <div class="page-title">${PAGE_TITLES[activeKey] || ''}</div>
          <div class="page-date">${today}</div>
        </div>
      </div>
      <div class="topbar-right">
        <div class="dropdown" id="notif-dropdown">
          <button type="button" class="icon-btn" id="notif-toggle" aria-label="Notifications" aria-haspopup="true">
            <i data-lucide="bell" class="icon" aria-hidden="true"></i>
          </button>
          <div class="dropdown-menu" id="notif-menu" style="width:280px;"></div>
        </div>
        <button type="button" class="icon-btn" data-theme-toggle aria-label="Toggle theme"></button>
        <div class="dropdown" id="header-user-dropdown">
          <div class="avatar" id="header-avatar" role="button" tabindex="0" style="cursor:pointer; width:38px; height:38px;" aria-haspopup="true"></div>
          <div class="dropdown-menu" id="header-user-menu">
            <button type="button" class="dropdown-item" data-nav="settings.html"><i data-lucide="user" class="icon" aria-hidden="true"></i>Profile settings</button>
            <button type="button" class="dropdown-item" data-nav="settings.html"><i data-lucide="settings" class="icon" aria-hidden="true"></i>Settings</button>
            <div class="dropdown-divider"></div>
            <button type="button" class="dropdown-item danger" id="logout-btn-2"><i data-lucide="log-out" class="icon" aria-hidden="true"></i>Log out</button>
          </div>
        </div>
      </div>`;
  }

  function renderNotifications() {
    const menu = document.getElementById('notif-menu');
    if (!menu) return;
    const settings = window.Store.getSettings();
    const btn = document.getElementById('notif-toggle');

    if (!settings.notificationsEnabled) {
      menu.innerHTML = `<div style="padding:16px; font-size:13px; color:var(--color-text-muted); text-align:center;">Notifications are turned off. Enable them in Settings.</div>`;
      btn.style.position = 'relative';
      const dot = btn.querySelector('.notif-dot');
      if (dot) dot.remove();
      return;
    }

    const dueSoon = window.Store.getTasksDueSoon(2); // due today or tomorrow
    if (dueSoon.length === 0) {
      menu.innerHTML = `<div style="padding:16px; font-size:13px; color:var(--color-text-muted); text-align:center;">You're all caught up. Nothing due in the next 2 days.</div>`;
    } else {
      menu.innerHTML = `<div style="padding:8px 10px 4px; font-size:12px; font-weight:600; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.05em;">Due soon</div>` +
        dueSoon.map((t) => `
          <a class="dropdown-item" href="tasks.html" style="align-items:flex-start;">
            <i data-lucide="clock" class="icon" aria-hidden="true" style="margin-top:2px;"></i>
            <span>${window.Utils.escapeHtml(t.title)}<br><span style="color:var(--color-text-muted); font-weight:400;">${window.Utils.dueLabel(t.dueDate)}</span></span>
          </a>`).join('');
    }

    btn.style.position = 'relative';
    let dot = btn.querySelector('.notif-dot');
    if (dueSoon.length > 0 && settings.notificationsEnabled) {
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'notif-dot';
        dot.style.cssText = 'position:absolute; top:7px; right:7px; width:7px; height:7px; border-radius:50%; background:var(--color-danger);';
        btn.appendChild(dot);
      }
    } else if (dot) {
      dot.remove();
    }
  }

  function closeAllDropdowns(except) {
    document.querySelectorAll('.dropdown-menu.open').forEach((el) => { if (el !== except) el.classList.remove('open'); });
  }

  function wireDropdown(triggerEl, menuEl) {
    if (!triggerEl || !menuEl) return;
    function toggle(e) {
      e.stopPropagation();
      const willOpen = !menuEl.classList.contains('open');
      closeAllDropdowns();
      menuEl.classList.toggle('open', willOpen);
    }
    triggerEl.addEventListener('click', toggle);
    triggerEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
  }

  function wireSidebarDrawer() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('menu-toggle');
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }
    function open() { sidebar.classList.add('open'); backdrop.classList.add('open'); }
    function close() { sidebar.classList.remove('open'); backdrop.classList.remove('open'); }
    if (toggleBtn) toggleBtn.addEventListener('click', open);
    backdrop.addEventListener('click', close);
    sidebar.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', close));
  }

  function render(activeKey) {
    const sidebarEl = document.getElementById('sidebar');
    const headerEl = document.getElementById('header');
    if (sidebarEl) sidebarEl.innerHTML = sidebarHTML(activeKey);
    if (headerEl) headerEl.innerHTML = headerHTML(activeKey);

    window.Utils.refreshIcons();
    window.Theme.syncToggleIcons();

    // Header avatar initials
    const user = window.Auth.getCurrentUser();
    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar && user) headerAvatar.textContent = window.Utils.initials(user.displayName);

    // Dropdowns
    wireDropdown(document.getElementById('user-card-trigger'), document.getElementById('user-menu'));
    wireDropdown(document.getElementById('header-avatar'), document.getElementById('header-user-menu'));
    wireDropdown(document.getElementById('notif-toggle'), document.getElementById('notif-menu'));
    document.addEventListener('click', () => closeAllDropdowns());
    renderNotifications();

    // Nav-to-page buttons inside dropdowns
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => { window.location.href = btn.getAttribute('data-nav'); });
    });

    // Logout
    ['logout-btn', 'logout-btn-2'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', async () => {
        const ok = await window.Utils.confirmAction('You\u2019ll be signed out of StudyHub on this device.', { title: 'Log out?', confirmLabel: 'Log out' });
        if (ok) window.Auth.logout();
      });
    });

    // Theme toggle
    window.Theme.bindToggle(document.querySelector('[data-theme-toggle]'));

    // Mobile drawer
    wireSidebarDrawer();
  }

  window.Layout = { render, NAV_ITEMS, renderNotifications };
})();