/* ==========================================================================
   StudyHub — theme.js
   Applying the saved theme itself happens in a tiny inline script at the
   top of <head> on every page (so there's no flash of the wrong theme
   before this file even loads). This module just handles toggling it
   afterwards and keeping localStorage / the toggle button in sync.
   ========================================================================== */

(function () {
  'use strict';

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    window.Store.saveSettings({ theme });
    window.dispatchEvent(new CustomEvent('studyhub:themechange', { detail: { theme } }));
    syncToggleIcons();
  }

  function toggle() {
    apply(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function syncToggleIcons() {
    const dark = getTheme() === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.innerHTML = `<i data-lucide="${dark ? 'sun' : 'moon'}" class="icon" aria-hidden="true"></i>`;
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
    window.Utils && window.Utils.refreshIcons();
  }

  function bindToggle(el) {
    if (!el) return;
    el.addEventListener('click', toggle);
    syncToggleIcons();
  }

  window.Theme = { getTheme, apply, toggle, syncToggleIcons, bindToggle };
})();