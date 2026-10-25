/* ==========================================================================
   StudyHub — login.js (login.html only)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  window.Store.init();
  window.Utils.refreshIcons();
  window.Theme.bindToggle(document.querySelector('[data-theme-toggle]'));

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailField = document.getElementById('email-field');
  const passwordField = document.getElementById('password-field');
  const errorBox = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');
  const submitBtn = document.getElementById('login-submit');
  const toggleBtn = document.getElementById('toggle-password');

  toggleBtn.addEventListener('click', () => {
    const showing = passwordInput.type === 'text';
    passwordInput.type = showing ? 'password' : 'text';
    toggleBtn.innerHTML = `<i data-lucide="${showing ? 'eye' : 'eye-off'}" class="icon" aria-hidden="true"></i>`;
    toggleBtn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    window.Utils.refreshIcons();
  });

  function setFieldError(field, hasError) {
    field.classList.toggle('has-error', hasError);
  }

  function showFormError(message) {
    errorText.textContent = message;
    errorBox.classList.add('visible');
  }

  function hideFormError() {
    errorBox.classList.remove('visible');
  }

  [emailInput, passwordInput].forEach((el) => {
    el.addEventListener('input', () => {
      setFieldError(el === emailInput ? emailField : passwordField, false);
      hideFormError();
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    hideFormError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const remember = document.getElementById('remember').checked;

    let valid = true;
    if (!email) { setFieldError(emailField, true); valid = false; }
    if (!password) { setFieldError(passwordField, true); valid = false; }
    if (!valid) { showFormError('Fill in both fields to continue.'); return; }

    submitBtn.disabled = true;

    const existingUser = window.Store.findUserByEmail(email);
    const result = existingUser
      ? window.Auth.login(email, password, remember)
      : window.Auth.registerAndLogin(email, password, remember);

    if (!result.success) {
      submitBtn.disabled = false;
      setFieldError(passwordField, true);
      showFormError(result.error);
      return;
    }

    window.Utils.showToast(result.isNewAccount ? 'Account created — welcome to StudyHub!' : 'Welcome back!', 'success');
    window.location.href = 'dashboard.html';
  });
});