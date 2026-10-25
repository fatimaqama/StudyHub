/* ==========================================================================
   StudyHub — auth.js
   This is a client-side *simulation* of authentication for portfolio
   purposes — there is no server, so "security" here means gating
   navigation and remembering a session, not protecting real secrets.

   The actual redirect-if-not-logged-in guard runs as a tiny inline
   <script> at the very top of <head> on every protected page (see any
   protected .html file) so it can block the page before first paint —
   waiting for this file to load would cause a visible flash of
   protected content. This module supplies the reusable login/logout
   logic that both that guard and the login page rely on.
   ========================================================================== */

(function () {
  'use strict';

  function login(email, password, remember) {
    if (!email || !email.trim()) return { success: false, error: 'Enter your email address.' };
    if (!password) return { success: false, error: 'Enter your password.' };

    const user = window.Store.validateCredentials(email.trim(), password);
    if (!user) return { success: false, error: 'That email and password don\u2019t match our records.' };

    window.Store.setSession({ userId: user.id, isAuthenticated: true, loginAt: new Date().toISOString() }, remember !== false);
    return { success: true, user };
  }

  /** Creates a brand-new account (used when someone logs in with an email we haven't seen before). */
  function registerAndLogin(email, password, remember) {
    const existing = window.Store.findUserByEmail(email);
    if (existing) return login(email, password, remember);
    const user = window.Store.createUser({ email, password, displayName: email.split('@')[0] });
    window.Store.setSession({ userId: user.id, isAuthenticated: true, loginAt: new Date().toISOString() }, remember !== false);
    return { success: true, user, isNewAccount: true };
  }

  function logout() {
    window.Store.clearSession();
    window.location.href = 'login.html';
  }

  function getCurrentUser() {
    return window.Store.getCurrentUser();
  }

  window.Auth = { login, registerAndLogin, logout, getCurrentUser };
})();