/**
 * ==========================================================================
 * EDUPREDICT AI — GLOBAL APPLICATION UTILITIES
 * Core UI Controllers, Theme System, Notifications & Mock Data Seeds
 * ==========================================================================
 */

const App = (function() {
  // Initial seed data representing realistic student predictions
  const DEFAULT_PREDICTIONS = [
    {
      id: 'pred-1001',
      studentName: 'Aarav Sharma',
      age: 20,
      gender: 'Male',
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
      date: '2026-08-28',
      insights: [
        'High attendance (94%) contributes strongly to conceptual retention.',
        'Consistent assignment performance indicates diligent coursework completion.',
        'High study hours correlate with upper-quartile exam performance.'
      ],
      recommendations: [
        'Maintain current study schedule and consider participating in competitive hackathons.',
        'Explore peer-tutoring opportunities to reinforce core algorithms.'
      ]
    },
    {
      id: 'pred-1002',
      studentName: 'Riya Patel',
      age: 19,
      gender: 'Female',
      gradeClass: 'B.Tech CSE - 4th Sem',
      studyTime: 12,
      attendance: 82,
      previousScore: 74,
      assignmentScore: 78,
      internalScore: 76,
      extracurricular: 'No',
      internetAccess: 'Yes',
      parentSupport: 'Medium',
      predictedScore: 77,
      category: 'Good',
      confidence: 88,
      date: '2026-08-29',
      insights: [
        'Stable continuous evaluation scores demonstrate steady progress.',
        'Attendance is healthy above the 75% institutional threshold.',
        'Moderate study time could be optimized with spaced repetition techniques.'
      ],
      recommendations: [
        'Increase weekly revision time by 2-3 hours prior to mid-term assessments.',
        'Participate in group study sessions for difficult problem-solving topics.'
      ]
    },
    {
      id: 'pred-1003',
      studentName: 'Karan Verma',
      age: 21,
      gender: 'Male',
      gradeClass: 'B.Tech CSE - 8th Sem',
      studyTime: 7,
      attendance: 62,
      previousScore: 54,
      assignmentScore: 58,
      internalScore: 52,
      extracurricular: 'No',
      internetAccess: 'Yes',
      parentSupport: 'Low',
      predictedScore: 55,
      category: 'Needs Improvement',
      confidence: 86,
      date: '2026-08-30',
      insights: [
        'Attendance at 62% is below the mandatory 75% threshold, risking eligibility.',
        'Sub-60% internal assessment marks indicate learning gaps in core syllabus.',
        'Low weekly study hours directly impact exam readiness.'
      ],
      recommendations: [
        'Schedule an immediate academic advising session with course faculty.',
        'Commit to attending all remaining theory classes and submitting remedial assignments.',
        'Set up a daily 2-hour focused revision routine.'
      ]
    },
    {
      id: 'pred-1004',
      studentName: 'Sneha Kulkarni',
      age: 20,
      gender: 'Female',
      gradeClass: 'B.Tech CSE - 6th Sem',
      studyTime: 10,
      attendance: 76,
      previousScore: 65,
      assignmentScore: 70,
      internalScore: 68,
      extracurricular: 'Yes',
      internetAccess: 'Yes',
      parentSupport: 'Medium',
      predictedScore: 68,
      category: 'Average',
      confidence: 85,
      date: '2026-08-31',
      insights: [
        'Performance is consistent across exams and continuous assignments.',
        'Attendance meets minimal required criteria with slight variance.'
      ],
      recommendations: [
        'Identify target subjects with lower marks and allocate dedicated review blocks.',
        'Practice previous semester question papers under timed conditions.'
      ]
    },
    {
      id: 'pred-1005',
      studentName: 'Devansh Roy',
      age: 19,
      gender: 'Male',
      gradeClass: 'B.Tech CSE - 4th Sem',
      studyTime: 16,
      attendance: 90,
      previousScore: 82,
      assignmentScore: 86,
      internalScore: 88,
      extracurricular: 'Yes',
      internetAccess: 'Yes',
      parentSupport: 'High',
      predictedScore: 85,
      category: 'Excellent',
      confidence: 91,
      date: '2026-09-01',
      insights: [
        'Strong internal scores (88%) reflect active class engagement and comprehension.',
        'High attendance and disciplined study time form a robust academic foundation.'
      ],
      recommendations: [
        'Continue consistent study routine.',
        'Engage in advanced research projects or open-source contributions.'
      ]
    }
  ];

  /**
   * Initialize LocalStorage Seed Data if not present
   */
  function initStorage() {
    if (!localStorage.getItem('edupredict_predictions')) {
      localStorage.setItem('edupredict_predictions', JSON.stringify(DEFAULT_PREDICTIONS));
    }
  }

  /**
   * Theme Management: Light & Dark Mode
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('edupredict_theme') || 'light';
    applyTheme(savedTheme);

    // Bind theme toggles across pages
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(nextTheme);
        localStorage.setItem('edupredict_theme', nextTheme);
        App.showToast(`Switched to ${nextTheme} theme`, 'info');
      });
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icons = document.querySelectorAll('.theme-toggle-btn i');
    icons.forEach(icon => {
      if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
      } else {
        icon.className = 'fa-solid fa-moon';
      }
    });
  }

  /**
   * Mobile Navigation & Sidebar Drawers
   */
  function initNavigation() {
    // Public landing mobile menu toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileBtn && navLinks) {
      mobileBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileBtn.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-bars');
          icon.classList.toggle('fa-xmark');
        }
      });
    }

    // Dashboard sidebar mobile toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle-btn');
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });

      // Close when clicking outside on mobile
      document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
          if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('active');
          }
        }
      });
    }
  }

  /**
   * Toast Notification Controller
   */
  function showToast(message, type = 'info', title = '') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-info';
    let defaultTitle = 'Information';
    if (type === 'success') { iconClass = 'fa-circle-check'; defaultTitle = 'Success'; }
    if (type === 'warning') { iconClass = 'fa-triangle-exclamation'; defaultTitle = 'Warning'; }
    if (type === 'danger') { iconClass = 'fa-circle-exclamation'; defaultTitle = 'Error'; }

    toast.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title || defaultTitle}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close notification"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 250);
    });

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 4000);
  }

  /**
   * Simple Modal Helpers
   */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  /**
   * Helper: Category Badge Styler
   */
  function getCategoryBadge(category) {
    switch (category) {
      case 'Excellent':
        return '<span class="badge badge-excellent"><i class="fa-solid fa-star"></i> Excellent</span>';
      case 'Good':
        return '<span class="badge badge-good"><i class="fa-solid fa-thumbs-up"></i> Good</span>';
      case 'Average':
        return '<span class="badge badge-average"><i class="fa-solid fa-minus"></i> Average</span>';
      case 'Needs Improvement':
      default:
        return '<span class="badge badge-danger"><i class="fa-solid fa-triangle-exclamation"></i> Needs Attention</span>';
    }
  }

  /**
   * Helper: Get stored predictions
   */
  function getPredictions() {
    initStorage();
    try {
      return JSON.parse(localStorage.getItem('edupredict_predictions')) || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Helper: Save predictions
   */
  function savePredictions(list) {
    localStorage.setItem('edupredict_predictions', JSON.stringify(list));
  }

  /**
   * Get Active User Profile
   */
  function getUser() {
    if (window.AuthService && AuthService.getCurrentUser()) {
      return AuthService.getCurrentUser();
    }
    try {
      const stored = localStorage.getItem('edupredict_user') || sessionStorage.getItem('edupredict_user');
      return stored ? JSON.parse(stored) : { name: 'Demo Student', email: 'demo@edupredict.local', role: 'Student', isDemo: true };
    } catch (e) {
      return { name: 'Demo Student', email: 'demo@edupredict.local', role: 'Student', isDemo: true };
    }
  }

  // Self initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initStorage();
    initTheme();
    initNavigation();
  });

  return {
    showToast,
    openModal,
    closeModal,
    getCategoryBadge,
    getPredictions,
    savePredictions,
    getUser,
    applyTheme
  };
})();

window.App = App;
