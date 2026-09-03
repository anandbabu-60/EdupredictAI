/**
 * ==========================================================================
 * EDUPREDICT AI — AUTHENTICATION & SESSION SERVICE
 * Real Flask Backend & SQLite Database Authentication Interface
 * ==========================================================================
 */

const AuthService = (function() {
  const TOKEN_KEY = 'edupredict_token';
  const USER_SESSION_KEY = 'edupredict_user';

  /**
   * Fast synchronous check for initial rendering
   */
  function isAuthenticated() {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    const user = localStorage.getItem(USER_SESSION_KEY) || sessionStorage.getItem(USER_SESSION_KEY);
    return Boolean(token && user);
  }

  /**
   * Get the active authenticated/demo user session object
   */
  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_SESSION_KEY) || sessionStorage.getItem(USER_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Asynchronously verify session against backend /api/auth/me (Auto-Login check)
   */
  async function checkAuth() {
    const localUser = getCurrentUser();
    
    // If running in local Demo Mode, allow immediately without server token
    if (localUser && localUser.isDemo) {
      return { authenticated: true, isDemo: true, user: localUser };
    }

    if (!window.ApiService) {
      return { authenticated: isAuthenticated(), isDemo: false, user: localUser };
    }

    try {
      const res = await ApiService.getMe();
      if (res && res.authenticated && res.user) {
        const sessionUser = {
          isAuthenticated: true,
          isDemo: false,
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role || 'Student'
        };
        // Refresh local cache
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));
        return { authenticated: true, isDemo: false, user: sessionUser };
      }
    } catch (err) {
      console.warn('Backend session verification error:', err.message);
    }

    // If server says not authenticated and not a demo session, clear tokens
    if (localUser && !localUser.isDemo) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_SESSION_KEY);
    }

    return { authenticated: false, isDemo: false, user: null };
  }

  /**
   * Used on Login / Register pages: Auto-redirects already logged-in users to Dashboard
   */
  async function checkAutoLogin() {
    const authState = await checkAuth();
    if (authState.authenticated) {
      window.location.href = 'dashboard.html';
      return true;
    }
    return false;
  }

  /**
   * Route Guard: Ensures user is authenticated before viewing protected pages
   */
  async function requireAuth() {
    const authState = await checkAuth();
    if (!authState.authenticated) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  /**
   * Register a new user account on the Flask Backend Database
   * @param {Object} userData - { name, email, password }
   */
  async function registerUser(userData) {
    if (!window.ApiService) {
      throw new Error('API service unavailable.');
    }

    const res = await ApiService.register({
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      password: userData.password
    });

    if (res && res.status === 'success' && res.user) {
      // Auto-authenticate immediately after successful registration
      const sessionUser = {
        isAuthenticated: true,
        isDemo: false,
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role || 'Student'
      };

      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_SESSION_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_SESSION_KEY);

      localStorage.setItem(TOKEN_KEY, res.token || ('token-' + Date.now()));
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));

      return {
        status: 'success',
        message: 'Account created successfully! Redirecting...',
        user: sessionUser
      };
    }

    return {
      status: 'success',
      message: res?.message || 'Account created successfully!'
    };
  }

  /**
   * Authenticate user against the Flask Backend Database
   * @param {string} email
   * @param {string} password
   * @param {boolean} rememberMe
   */
  async function loginUser(email, password, rememberMe = true) {
    if (!window.ApiService) {
      throw new Error('API service unavailable.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await ApiService.login({
      email: cleanEmail,
      password: password
    });

    if (!result || result.status !== 'success' || !result.user) {
      throw new Error(result?.message || 'Invalid email or password.');
    }

    // Create session object
    const sessionUser = {
      isAuthenticated: true,
      isDemo: false,
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role || 'Student'
    };

    // Clear any previous session
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_SESSION_KEY);

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, result.token || ('token-' + Date.now()));
    storage.setItem(USER_SESSION_KEY, JSON.stringify(sessionUser));

    return {
      status: 'success',
      user: sessionUser
    };
  }

  /**
   * Continue as Demo User (Instant 1-Click Access for Evaluation)
   */
  function continueAsDemo() {
    const demoUser = {
      isAuthenticated: true,
      isDemo: true,
      name: 'Demo Student',
      email: 'demo@edupredict.local',
      role: 'Student'
    };

    const demoToken = 'demo-token-' + Date.now();

    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_SESSION_KEY);
    localStorage.setItem(TOKEN_KEY, demoToken);
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(demoUser));

    // Ensure sample demo predictions exist
    initDemoDataset();

    if (window.App) {
      App.showToast('Demo session active! Welcome, Demo Student.', 'success', 'Demo Access');
    }

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 300);
  }

  /**
   * End session and logout (Clears token, destroys server session, does NOT delete accounts)
   */
  async function logoutUser() {
    if (window.ApiService) {
      await ApiService.logout();
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_SESSION_KEY);

    if (window.App) {
      App.showToast('You have been logged out.', 'info');
    }

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 250);
  }

  /**
   * Initialize realistic sample dataset for demonstration
   */
  function initDemoDataset() {
    const existing = localStorage.getItem('edupredict_predictions');
    if (!existing || JSON.parse(existing).length < 4) {
      const sampleData = [
        {
          id: 'pred-demo-01',
          studentName: 'Student A (Sample)',
          age: 20,
          gender: 'Female',
          gradeClass: 'B.Tech CSE - 6th Sem',
          studyTime: 18,
          attendance: 94,
          previousScore: 88,
          assignmentScore: 92,
          internalScore: 85,
          extracurricular: 'Yes',
          internetAccess: 'Yes',
          parentSupport: 'High',
          predictedScore: 89,
          category: 'Excellent',
          confidence: 94,
          date: '2026-09-01',
          insights: [
            'Sample Metric: High attendance (94%) contributes strongly to retention.',
            'Continuous assignment marks indicate strong coursework consistency.'
          ],
          recommendations: [
            'Maintain current study schedule and consider competitive coding challenges.'
          ]
        },
        {
          id: 'pred-demo-02',
          studentName: 'Student B (Sample)',
          age: 19,
          gender: 'Male',
          gradeClass: 'B.Tech CSE - 4th Sem',
          studyTime: 12,
          attendance: 80,
          previousScore: 75,
          assignmentScore: 78,
          internalScore: 76,
          extracurricular: 'No',
          internetAccess: 'Yes',
          parentSupport: 'Medium',
          predictedScore: 77,
          category: 'Good',
          confidence: 88,
          date: '2026-09-01',
          insights: [
            'Sample Metric: Stable continuous scores demonstrate steady progress.',
            'Attendance is healthy above the 75% threshold.'
          ],
          recommendations: [
            'Increase weekly revision hours prior to mid-term assessments.'
          ]
        },
        {
          id: 'pred-demo-03',
          studentName: 'Student C (Sample)',
          age: 21,
          gender: 'Male',
          gradeClass: 'B.Tech CSE - 8th Sem',
          studyTime: 6,
          attendance: 60,
          previousScore: 52,
          assignmentScore: 56,
          internalScore: 50,
          extracurricular: 'No',
          internetAccess: 'Yes',
          parentSupport: 'Low',
          predictedScore: 54,
          category: 'Needs Improvement',
          confidence: 86,
          date: '2026-08-31',
          insights: [
            'Sample Metric: Attendance at 60% falls below the 75% institutional threshold.',
            'Low study hours directly impact internal assessment results.'
          ],
          recommendations: [
            'Schedule academic advising and commit to attending theory lectures.'
          ]
        },
        {
          id: 'pred-demo-04',
          studentName: 'Student D (Sample)',
          age: 20,
          gender: 'Female',
          gradeClass: 'B.Tech CSE - 6th Sem',
          studyTime: 11,
          attendance: 78,
          previousScore: 66,
          assignmentScore: 72,
          internalScore: 68,
          extracurricular: 'Yes',
          internetAccess: 'Yes',
          parentSupport: 'Medium',
          predictedScore: 70,
          category: 'Average',
          confidence: 85,
          date: '2026-08-30',
          insights: [
            'Performance is consistent across exam and assignment components.'
          ],
          recommendations: [
            'Focus on specific subject bottlenecks in previous examination papers.'
          ]
        }
      ];
      localStorage.setItem('edupredict_predictions', JSON.stringify(sampleData));
    }
  }

  /**
   * Reset Password in Backend Database
   * @param {string} email
   * @param {string} newPassword
   */
  async function resetPassword(email, newPassword) {
    if (!window.ApiService) {
      throw new Error('API service unavailable.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const res = await ApiService.resetPassword({
      email: cleanEmail,
      newPassword: newPassword
    });

    if (!res || res.status !== 'success') {
      throw new Error(res?.message || 'Failed to reset password.');
    }

    return res;
  }

  function isDemoUser() {
    const user = getCurrentUser();
    return Boolean(user && (user.isDemo === true || user.email === 'demo@edupredict.local'));
  }

  return {
    registerUser,
    loginUser,
    resetPassword,
    checkAuth,
    checkAutoLogin,
    continueAsDemo,
    logoutUser,
    isAuthenticated,
    getCurrentUser,
    requireAuth,
    initDemoDataset,
    isDemoUser
  };
})();

// Attach globally
window.AuthService = AuthService;

/**
 * Page-Level DOM Initializers for Auth Pages
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Password Visibility Toggles
  initPasswordToggles();

  // Demo User Button on Login Page
  const demoUserBtn = document.getElementById('continueDemoBtn');
  if (demoUserBtn) {
    demoUserBtn.addEventListener('click', (e) => {
      e.preventDefault();
      AuthService.continueAsDemo();
    });
  }

  // Forgot Password Modal Triggers
  const openForgotModalBtn = document.getElementById('openForgotModalBtn');
  const forgotModal = document.getElementById('forgotPasswordModal');
  const closeForgotModalBtn = document.getElementById('closeForgotModalBtn');
  const cancelForgotBtn = document.getElementById('cancelForgotBtn');

  if (openForgotModalBtn && forgotModal) {
    openForgotModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      forgotModal.classList.add('active');
      const emailInput = document.getElementById('forgotEmail');
      const loginEmail = document.getElementById('email');
      if (emailInput && loginEmail && loginEmail.value.trim()) {
        emailInput.value = loginEmail.value.trim();
      }
    });
  }

  if (closeForgotModalBtn && forgotModal) {
    closeForgotModalBtn.addEventListener('click', () => {
      forgotModal.classList.remove('active');
    });
  }

  if (cancelForgotBtn && forgotModal) {
    cancelForgotBtn.addEventListener('click', () => {
      forgotModal.classList.remove('active');
    });
  }

  // Forgot Password Form Submission (Modal or Dedicated Page)
  const forgotForm = document.getElementById('forgotPasswordForm');
  if (forgotForm) {
    initForgotPasswordForm(forgotForm);
  }

  // Login Form Submission
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    // Check auto-login
    await AuthService.checkAutoLogin();
    initLoginForm(loginForm);
  }

  // Register Form Submission
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    // Check auto-login
    await AuthService.checkAutoLogin();
    initRegisterForm(registerForm);
  }
});

function initPasswordToggles() {
  document.querySelectorAll('.input-action-btn[data-action="toggle-password"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          if (icon) icon.className = 'fa-solid fa-eye-slash';
        } else {
          input.type = 'password';
          if (icon) icon.className = 'fa-solid fa-eye';
        }
      }
    });
  });
}

function initLoginForm(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeInput = document.getElementById('rememberMe');
    const submitBtn = form.querySelector('button[type="submit"]');

    let isValid = true;

    if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
      emailInput.classList.add('is-invalid');
      isValid = false;
    } else {
      emailInput.classList.remove('is-invalid');
    }

    if (!passwordInput.value) {
      passwordInput.classList.add('is-invalid');
      isValid = false;
    } else {
      passwordInput.classList.remove('is-invalid');
    }

    if (!isValid) {
      App.showToast('Please check the email and password fields.', 'danger', 'Validation Error');
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';

    try {
      const result = await AuthService.loginUser(
        emailInput.value.trim(),
        passwordInput.value,
        rememberMeInput ? rememberMeInput.checked : true
      );

      App.showToast(`Login successful! Welcome, ${result.user.name}.`, 'success', 'Authenticated');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 400);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      const msg = err.message || 'Invalid email or password.';
      App.showToast(msg, 'danger', 'Login Failed');
    }
  });
}

function initRegisterForm(form) {
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const strengthContainer = document.getElementById('passwordStrength');
  const submitBtn = form.querySelector('button[type="submit"]');

  if (passwordInput && strengthContainer) {
    passwordInput.addEventListener('input', () => {
      const strength = evaluatePasswordStrength(passwordInput.value);
      updateStrengthUI(strengthContainer, strength);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let isValid = true;

    if (!fullNameInput.value.trim() || fullNameInput.value.trim().length < 2) {
      fullNameInput.classList.add('is-invalid');
      isValid = false;
    } else {
      fullNameInput.classList.remove('is-invalid');
    }

    if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
      emailInput.classList.add('is-invalid');
      isValid = false;
    } else {
      emailInput.classList.remove('is-invalid');
    }

    if (!passwordInput.value || passwordInput.value.length < 6) {
      passwordInput.classList.add('is-invalid');
      isValid = false;
    } else {
      passwordInput.classList.remove('is-invalid');
    }

    if (confirmPasswordInput.value !== passwordInput.value) {
      confirmPasswordInput.classList.add('is-invalid');
      isValid = false;
    } else {
      confirmPasswordInput.classList.remove('is-invalid');
    }

    if (!isValid) {
      App.showToast('Please fix the highlighted form errors.', 'danger', 'Validation Error');
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

    try {
      const result = await AuthService.registerUser({
        name: fullNameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value
      });

      App.showToast(result.message, 'success', 'Account Created');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      const msg = err.message || 'Registration failed.';
      App.showToast(msg, 'danger', 'Registration Failed');
    }
  });
}

function initForgotPasswordForm(form) {
  const emailInput = document.getElementById('forgotEmail');
  const newPasswordInput = document.getElementById('forgotNewPassword');
  const confirmPasswordInput = document.getElementById('forgotConfirmPassword');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let isValid = true;

    if (!emailInput.value.trim() || !validateEmail(emailInput.value.trim())) {
      emailInput.classList.add('is-invalid');
      isValid = false;
    } else {
      emailInput.classList.remove('is-invalid');
    }

    if (!newPasswordInput.value || newPasswordInput.value.length < 6) {
      newPasswordInput.classList.add('is-invalid');
      isValid = false;
    } else {
      newPasswordInput.classList.remove('is-invalid');
    }

    if (newPasswordInput.value !== confirmPasswordInput.value) {
      confirmPasswordInput.classList.add('is-invalid');
      App.showToast('Passwords do not match. Please re-enter.', 'danger', 'Password Mismatch');
      return;
    } else {
      confirmPasswordInput.classList.remove('is-invalid');
    }

    if (!isValid) {
      App.showToast('Please provide a valid email and a new password (min 6 characters).', 'danger', 'Validation Error');
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating Password...';

    try {
      const res = await AuthService.resetPassword(
        emailInput.value.trim(),
        newPasswordInput.value
      );

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      App.showToast(res.message || 'Password reset successfully! You can now log in.', 'success', 'Password Updated');

      // Close modal if open
      const modal = document.getElementById('forgotPasswordModal');
      if (modal) modal.classList.remove('active');

      // Autofill email in login form
      const loginEmail = document.getElementById('email');
      const loginPassword = document.getElementById('password');
      if (loginEmail) loginEmail.value = emailInput.value.trim();
      if (loginPassword) loginPassword.value = '';

      // If on dedicated reset-password.html or forgot-password.html page, redirect to login.html
      if (window.location.pathname.includes('reset-password') || window.location.pathname.includes('forgot-password')) {
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
      }
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      const msg = err.message || 'Could not reset password. Please check the email.';
      App.showToast(msg, 'danger', 'Reset Failed');
    }
  });
}

function evaluatePasswordStrength(password) {
  if (!password) return { level: 'none', label: 'None' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { level: 'weak', label: 'Weak' };
  if (score === 3) return { level: 'medium', label: 'Medium' };
  return { level: 'strong', label: 'Strong' };
}

function updateStrengthUI(container, strength) {
  container.className = 'password-strength-container strength-' + strength.level;
  const label = container.querySelector('.strength-label');
  if (label) label.textContent = strength.label;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
