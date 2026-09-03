/**
 * ==========================================================================
 * EDUPREDICT AI — DASHBOARD & PREDICTION HISTORY CONTROLLER
 * Real SQLite Database Integration, Chart.js Analytics & History Management
 * ==========================================================================
 */

let performanceChartInstance = null;
let trendChartInstance = null;
let cachedPredictions = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth guard for protected pages
  if (window.AuthService) {
    const isAuth = await AuthService.requireAuth();
    if (!isAuth) return;
  }

  // Topbar and sidebar user name sync
  syncTopbarUserData();

  // Initialize Dashboard Analytics if on dashboard.html
  const dashboardView = document.getElementById('dashboardView');
  if (dashboardView) {
    await initDashboard();
  }

  // Initialize History Table if on history.html
  const historyView = document.getElementById('historyView');
  if (historyView) {
    await initHistoryPage();
  }

  // Initialize Profile Settings if on profile.html
  const profileView = document.getElementById('profileView');
  if (profileView) {
    initProfilePage();
  }

  // Bind all logout links
  document.querySelectorAll('.logout-trigger-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.AuthService) {
        AuthService.logoutUser();
      }
    });
  });
});

/**
 * Synchronize User Info in Sidebar & Topbar
 */
function syncTopbarUserData() {
  const user = (window.AuthService && AuthService.getCurrentUser()) || (window.App && App.getUser()) || {};
  const isDemo = Boolean(user && user.isDemo);

  document.querySelectorAll('.user-display-name').forEach(el => {
    el.textContent = user.name || 'Demo Student';
  });
  document.querySelectorAll('.user-display-role').forEach(el => {
    el.textContent = user.role || 'Student';
  });
  document.querySelectorAll('.user-display-email').forEach(el => {
    el.textContent = user.email || 'demo@edupredict.local';
  });

  // Initials
  const initials = (user.name || 'Demo Student')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  document.querySelectorAll('.user-avatar').forEach(el => {
    el.textContent = initials;
  });

  // Welcome Greeting in Dashboard Header
  const welcomeNameEl = document.getElementById('dashboardWelcomeName');
  if (welcomeNameEl) {
    welcomeNameEl.textContent = user.name || 'Demo Student';
  }

  // Demo Mode Badge
  const demoBadgeEl = document.getElementById('demoModeBadge');
  if (demoBadgeEl) {
    demoBadgeEl.style.display = isDemo ? 'inline-flex' : 'none';
    if (isDemo) {
      demoBadgeEl.innerHTML = `<i class="fa-solid fa-flask"></i> DEMO MODE`;
    }
  }
}

/**
 * Helper: Fetch user's predictions from Backend API or local storage fallback
 */
async function fetchUserPredictions() {
  const user = (window.AuthService && AuthService.getCurrentUser()) || {};

  // If in local demo mode
  if (user.isDemo) {
    try {
      const local = JSON.parse(localStorage.getItem('edupredict_predictions')) || [];
      return { predictions: local, stats: computeLocalStats(local) };
    } catch (e) {
      return { predictions: [], stats: computeLocalStats([]) };
    }
  }

  // Fetch from Flask SQLite backend
  if (window.ApiService) {
    try {
      const res = await ApiService.getPredictions();
      if (res && res.status === 'success' && Array.isArray(res.predictions)) {
        cachedPredictions = res.predictions;
        // Keep in sync with local cache for offline inspection
        localStorage.setItem('edupredict_predictions', JSON.stringify(res.predictions));
        return {
          predictions: res.predictions,
          stats: res.stats || computeLocalStats(res.predictions)
        };
      }
    } catch (err) {
      console.warn('Backend history fetch error, reading local cache:', err.message);
    }
  }

  // Local storage fallback
  try {
    const fallback = JSON.parse(localStorage.getItem('edupredict_predictions')) || [];
    return { predictions: fallback, stats: computeLocalStats(fallback) };
  } catch (e) {
    return { predictions: [], stats: computeLocalStats([]) };
  }
}

function computeLocalStats(list) {
  const total = list.length;
  if (total === 0) {
    return {
      total_predictions: 0,
      average_score: 0.0,
      highest_score: 0.0,
      latest_score: 0.0,
      latest_performance: 'N/A',
      category_counts: { Excellent: 0, Good: 0, Average: 0, 'Needs Improvement': 0 }
    };
  }

  const scores = list.map(p => parseFloat(p.predictedScore || p.exam_score || 0));
  const avg = Math.round((scores.reduce((a, b) => a + b, 0) / total) * 100) / 100;
  const high = Math.round(Math.max(...scores) * 100) / 100;
  const latest = scores[0];
  const latestPerf = list[0].category || list[0].performance || 'Good';

  const counts = { Excellent: 0, Good: 0, Average: 0, 'Needs Improvement': 0 };
  list.forEach(p => {
    const cat = p.category || p.performance || 'Average';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return {
    total_predictions: total,
    average_score: avg,
    highest_score: high,
    latest_score: latest,
    latest_performance: latestPerf,
    category_counts: counts
  };
}

/**
 * ==========================================================================
 * MAIN DASHBOARD CONTROLLER (dashboard.html)
 * ==========================================================================
 */
async function initDashboard() {
  const { predictions, stats } = await fetchUserPredictions();

  updateDashboardMetrics(stats, predictions);
  renderDashboardCharts(predictions);
  renderRecentPredictionsTable(predictions.slice(0, 6));
}

function updateDashboardMetrics(stats, predictions) {
  const totalEl = document.getElementById('metricTotalPredictions');
  const avgEl = document.getElementById('metricAvgScore');
  const latestEl = document.getElementById('metricExcellent'); // reused as Latest Score card
  const categoryEl = document.getElementById('metricAttention'); // reused as Performance Tier card

  if (predictions.length === 0) {
    if (totalEl) totalEl.textContent = '0';
    if (avgEl) avgEl.textContent = 'N/A';
    if (latestEl) latestEl.textContent = 'N/A';
    if (categoryEl) categoryEl.textContent = 'No Data';
    return;
  }

  if (totalEl) totalEl.textContent = stats.total_predictions;
  if (avgEl) avgEl.textContent = stats.average_score.toFixed(2) + '%';
  if (latestEl) latestEl.textContent = (stats.latest_score ? stats.latest_score.toFixed(2) + '%' : 'N/A');
  if (categoryEl) categoryEl.textContent = stats.latest_performance || 'N/A';
}

function renderDashboardCharts(predictions) {
  if (typeof Chart === 'undefined') return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // 1. Performance Tier Distribution (Doughnut)
  const distCanvas = document.getElementById('performanceDistChart');
  if (distCanvas) {
    if (performanceChartInstance) performanceChartInstance.destroy();

    if (predictions.length === 0) {
      // Empty distribution
      performanceChartInstance = new Chart(distCanvas, {
        type: 'doughnut',
        data: {
          labels: ['No Data Yet'],
          datasets: [{
            data: [1],
            backgroundColor: [isDark ? '#334155' : '#e2e8f0'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    } else {
      const counts = {
        Excellent: predictions.filter(p => (p.category || p.performance) === 'Excellent').length,
        Good: predictions.filter(p => (p.category || p.performance) === 'Good').length,
        Average: predictions.filter(p => (p.category || p.performance) === 'Average').length,
        'Needs Improvement': predictions.filter(p => (p.category || p.performance) === 'Needs Improvement').length
      };

      performanceChartInstance = new Chart(distCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Excellent (90%+)', 'Good (75-89%)', 'Average (60-74%)', 'Needs Support (<60%)'],
          datasets: [{
            data: [counts.Excellent, counts.Good, counts.Average, counts['Needs Improvement']],
            backgroundColor: ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
            borderWidth: 2,
            borderColor: isDark ? '#111827' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, padding: 14, font: { family: 'Inter', size: 11 } }
            }
          },
          cutout: '68%'
        }
      });
    }
  }

  // 2. Score over Time Trend Chart (Line)
  const trendCanvas = document.getElementById('attendanceCorrelationChart');
  if (trendCanvas) {
    if (trendChartInstance) trendChartInstance.destroy();

    if (predictions.length === 0) {
      trendChartInstance = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: ['No Predictions Yet'],
          datasets: [{
            data: [0],
            borderColor: isDark ? '#334155' : '#cbd5e1'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, max: 100, grid: { color: gridColor }, ticks: { color: textColor } },
            x: { grid: { color: gridColor }, ticks: { color: textColor } }
          }
        }
      });
    } else {
      // Sort oldest to newest for chronological timeline
      const chronological = [...predictions].reverse();
      const labels = chronological.map((p, idx) => {
        const d = p.date || (p.created_at ? p.created_at.slice(0, 10) : `Pred #${idx + 1}`);
        return d;
      });
      const dataPoints = chronological.map(p => parseFloat(p.predictedScore || p.exam_score || 0));

      trendChartInstance = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Predicted Exam Score (%)',
            data: dataPoints,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#ffffff',
            pointHoverRadius: 6,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Score: ${ctx.parsed.y.toFixed(2)}%`
              }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
            },
            y: {
              min: 0,
              max: 100,
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                stepSize: 20,
                font: { family: 'Inter', size: 11 },
                callback: v => v + '%'
              }
            }
          }
        }
      });
    }
  }
}

function renderRecentPredictionsTable(list) {
  const tbody = document.getElementById('recentPredictionsTableBody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem 1rem;">
          <div style="color: var(--text-muted); margin-bottom: 1rem; font-size: 2.5rem;">
            <i class="fa-solid fa-chart-simple"></i>
          </div>
          <h4 style="margin-bottom: 0.35rem; font-weight: 600;">No predictions yet</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
            You haven't run any student performance predictions yet.
          </p>
          <a href="predict.html" class="btn btn-primary btn-sm">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Make Your First Prediction
          </a>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((p, idx) => {
    const sName = p.student_name || p.studentName || 'Student';
    const sClass = p.grade_class || p.gradeClass || 'General';
    const score = parseFloat(p.predictedScore || p.exam_score || 0).toFixed(2);
    const category = p.category || p.performance || 'Average';
    const att = p.attendance || (p.input_features?.Attendance) || '—';
    const study = p.studyTime || (p.input_features?.Hours_Studied) || '—';
    const prev = p.previousScore || (p.input_features?.Previous_Scores) || '—';
    const predId = p.id || `pred-${idx}`;

    const initials = sName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return `
      <tr>
        <td>
          <div class="student-cell">
            <div class="student-avatar-sm">${initials}</div>
            <div>
              <div class="student-name-text">${sName}</div>
              <div class="student-class-text">${sClass}</div>
            </div>
          </div>
        </td>
        <td>${att}${typeof att === 'number' ? '%' : ''}</td>
        <td>${study}${typeof study === 'number' ? ' hrs/wk' : ''}</td>
        <td>${prev}${typeof prev === 'number' ? '%' : ''}</td>
        <td>${App.getCategoryBadge(category)}</td>
        <td>
          <strong>${score}%</strong>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <a href="result.html?id=${predId}" class="btn btn-secondary btn-sm" title="View Details">
              <i class="fa-solid fa-eye"></i> View
            </a>
            <button class="btn btn-ghost btn-sm delete-prediction-btn" data-id="${predId}" title="Delete Record" style="color: var(--danger);">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  bindDeleteButtons(tbody, async () => {
    await initDashboard();
  });
}

/**
 * ==========================================================================
 * PREDICTION HISTORY CONTROLLER (history.html)
 * ==========================================================================
 */
async function initHistoryPage() {
  const { predictions } = await fetchUserPredictions();
  let currentList = [...predictions];

  const searchInput = document.getElementById('historySearchInput');
  const categoryFilter = document.getElementById('historyCategoryFilter');
  const sortFilter = document.getElementById('historySortFilter');
  const clearBtn = document.getElementById('clearHistoryBtn');

  function render() {
    let filtered = [...currentList];

    // 1. Search Query
    if (searchInput && searchInput.value.trim()) {
      const q = searchInput.value.trim().toLowerCase();
      filtered = filtered.filter(p => {
        const name = (p.student_name || p.studentName || '').toLowerCase();
        const cls = (p.grade_class || p.gradeClass || '').toLowerCase();
        return name.includes(q) || cls.includes(q);
      });
    }

    // 2. Category Filter
    if (categoryFilter && categoryFilter.value !== 'all') {
      filtered = filtered.filter(p => (p.category || p.performance) === categoryFilter.value);
    }

    // 3. Sort Filter
    if (sortFilter) {
      switch (sortFilter.value) {
        case 'date-desc':
          // Already newest first
          break;
        case 'date-asc':
          filtered.reverse();
          break;
        case 'score-desc':
          filtered.sort((a, b) => parseFloat(b.predictedScore || b.exam_score || 0) - parseFloat(a.predictedScore || a.exam_score || 0));
          break;
        case 'score-asc':
          filtered.sort((a, b) => parseFloat(a.predictedScore || a.exam_score || 0) - parseFloat(b.predictedScore || b.exam_score || 0));
          break;
        case 'name-asc':
          filtered.sort((a, b) => (a.student_name || a.studentName || '').localeCompare(b.student_name || b.studentName || ''));
          break;
      }
    }

    renderHistoryTable(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', render);
  if (categoryFilter) categoryFilter.addEventListener('change', render);
  if (sortFilter) sortFilter.addEventListener('change', render);

  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (currentList.length === 0) {
        App.showToast('History is already empty.', 'info');
        return;
      }
      if (confirm('Are you sure you want to delete all predictions in your history?')) {
        // Delete each item
        for (const p of currentList) {
          if (p.id && typeof p.id === 'number' && window.ApiService) {
            try { await ApiService.deletePrediction(p.id); } catch (e) {}
          }
        }
        localStorage.removeItem('edupredict_predictions');
        localStorage.removeItem('edupredict_active_result');
        currentList = [];
        render();
        App.showToast('All prediction records cleared.', 'info');
      }
    });
  }

  render();
}

function renderHistoryTable(list) {
  const tbody = document.getElementById('historyTableBody');
  const countEl = document.getElementById('historyRecordsCount');
  const tableWrapper = document.getElementById('historyTableWrapper');
  if (!tbody) return;

  if (countEl) {
    countEl.textContent = `Showing ${list.length} student prediction${list.length === 1 ? '' : 's'}`;
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 4rem 1.5rem;">
          <div style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;">
            <i class="fa-solid fa-folder-open"></i>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">No predictions found</h3>
          <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 450px; margin: 0 auto 1.5rem auto;">
            No student predictions match your search or filters. Make a new prediction to populate your history.
          </p>
          <a href="predict.html" class="btn btn-primary">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Make Your First Prediction
          </a>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((p, idx) => {
    const sName = p.student_name || p.studentName || 'Student';
    const sClass = p.grade_class || p.gradeClass || 'General Course';
    const score = parseFloat(p.predictedScore || p.exam_score || 0).toFixed(2);
    const category = p.category || p.performance || 'Average';
    const att = p.attendance || (p.input_features?.Attendance) || '—';
    const study = p.studyTime || (p.input_features?.Hours_Studied) || '—';
    const prev = p.previousScore || (p.input_features?.Previous_Scores) || '—';
    const dateStr = p.date || (p.created_at ? p.created_at.slice(0, 16).replace('T', ' ') : 'Recent');
    const predId = p.id || `pred-${idx}`;

    const initials = sName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return `
      <tr>
        <td>
          <div class="student-cell">
            <div class="student-avatar-sm">${initials}</div>
            <div>
              <div class="student-name-text">${sName}</div>
              <div class="student-class-text">${sClass}</div>
            </div>
          </div>
        </td>
        <td>${att}${typeof att === 'number' ? '%' : ''}</td>
        <td>${study}${typeof study === 'number' ? ' hrs/wk' : ''}</td>
        <td>${prev}${typeof prev === 'number' ? '%' : ''}</td>
        <td>${App.getCategoryBadge(category)}</td>
        <td>
          <strong style="font-size: 1rem;">${score}%</strong>
        </td>
        <td style="color: var(--text-muted); font-size: 0.85rem;">${dateStr}</td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <a href="result.html?id=${predId}" class="btn btn-secondary btn-sm" title="View Details">
              <i class="fa-solid fa-eye"></i> View Details
            </a>
            <button class="btn btn-ghost btn-sm delete-prediction-btn" data-id="${predId}" title="Delete Prediction" style="color: var(--danger);">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  bindDeleteButtons(tbody, async () => {
    await initHistoryPage();
  });
}

function bindDeleteButtons(container, onDeletedCallback) {
  container.querySelectorAll('.delete-prediction-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this prediction?')) {
        // If numeric ID, call backend DELETE /api/predictions/:id
        const numId = parseInt(id, 10);
        if (!isNaN(numId) && window.ApiService) {
          try {
            await ApiService.deletePrediction(numId);
          } catch (err) {
            console.warn('Backend delete failed:', err.message);
          }
        }

        // Clean local cache
        try {
          let list = JSON.parse(localStorage.getItem('edupredict_predictions')) || [];
          list = list.filter(p => String(p.id) !== String(id));
          localStorage.setItem('edupredict_predictions', JSON.stringify(list));
        } catch (e) {}

        App.showToast('Prediction deleted successfully.', 'info');
        if (onDeletedCallback) onDeletedCallback();
      }
    });
  });
}

/**
 * ==========================================================================
 * PROFILE & SETTINGS PAGE (profile.html)
 * ==========================================================================
 */
async function initProfilePage() {
  const profileForm = document.getElementById('profileForm');
  let user = (window.AuthService && AuthService.getCurrentUser()) || (window.App && App.getUser()) || {};

  // Fetch latest user details from server
  if (window.AuthService) {
    try {
      const authRes = await AuthService.checkAuth();
      if (authRes && authRes.user) {
        user = authRes.user;
      }
    } catch (e) {}
  }

  if (document.getElementById('profileName')) document.getElementById('profileName').value = user.name || '';
  if (document.getElementById('profileEmail')) document.getElementById('profileEmail').value = user.email || '';
  if (document.getElementById('profileRole')) document.getElementById('profileRole').value = user.role || 'Student';
  if (document.getElementById('profileInstitution')) document.getElementById('profileInstitution').value = user.institution || 'Department of Computer Science & Engineering';

  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const updatedUser = {
        ...user,
        name: document.getElementById('profileName').value.trim(),
        email: document.getElementById('profileEmail').value.trim(),
        role: document.getElementById('profileRole').value.trim(),
        institution: document.getElementById('profileInstitution').value.trim()
      };
      localStorage.setItem('edupredict_user', JSON.stringify(updatedUser));
      syncTopbarUserData();
      App.showToast('Profile information updated successfully!', 'success', 'Profile Saved');
    });
  }

  // Security password change form
  const secPasswordForm = document.getElementById('securityPasswordForm');
  if (secPasswordForm) {
    secPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPwd = document.getElementById('profileNewPassword')?.value;
      const confirmPwd = document.getElementById('profileConfirmPassword')?.value;
      const email = user.email || document.getElementById('profileEmail')?.value;

      if (!newPwd || newPwd.length < 6) {
        App.showToast('New password must be at least 6 characters long.', 'danger', 'Invalid Password');
        return;
      }
      if (newPwd !== confirmPwd) {
        App.showToast('Passwords do not match. Please re-enter.', 'danger', 'Password Mismatch');
        return;
      }

      if (window.AuthService) {
        try {
          const res = await AuthService.resetPassword(email, newPwd);
          App.showToast(res.message || 'Password updated successfully!', 'success', 'Security Updated');
          secPasswordForm.reset();
        } catch (err) {
          App.showToast(err.message || 'Failed to update password.', 'danger', 'Error');
        }
      }
    });
  }
}
