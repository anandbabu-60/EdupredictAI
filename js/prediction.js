/**
 * ==========================================================================
 * EDUPREDICT AI — PREDICTION CONTROLLER & SCIKIT-LEARN ML INTEGRATION
 * Collects 19 Model Input Features, Calls Flask /api/predict & Renders Report
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check auth guard for protected pages
  if (window.AuthService) {
    const isAuth = await AuthService.requireAuth();
    if (!isAuth) return;
  }

  // Sync user display info in sidebar
  syncSidebarUserData();

  // Bind logout buttons
  document.querySelectorAll('.logout-trigger-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.AuthService) {
        AuthService.logoutUser();
      }
    });
  });

  // Check if we are on the Prediction Form Page
  const predictForm = document.getElementById('predictionForm');
  if (predictForm) {
    initPredictionForm(predictForm);
    checkBackendStatus();
  }

  // Check if we are on the Prediction Result Page
  const resultView = document.getElementById('predictionResultView');
  if (resultView) {
    initResultView();
  }
});

/**
 * Check backend ML service status badge
 */
async function checkBackendStatus() {
  const badge = document.getElementById('mlBackendBadge');
  if (!badge || !window.ApiService) return;

  const health = await ApiService.checkBackendHealth();
  if (health.online) {
    badge.className = 'badge badge-pill badge-good';
    badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> ML Backend Online (${health.algorithm || 'Active'})`;
  } else {
    badge.className = 'badge badge-pill badge-warning';
    badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Backend Offline (Local Engine)`;
  }
}

/**
 * Sync user name & role in sidebar
 */
function syncSidebarUserData() {
  const user = (window.AuthService && AuthService.getCurrentUser()) || (window.App && App.getUser()) || {};
  const name = user.name || 'Demo Student';
  const role = user.role || 'Student';

  document.querySelectorAll('.user-display-name').forEach(el => el.textContent = name);
  document.querySelectorAll('.user-display-role').forEach(el => el.textContent = role);

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initials);
}

/**
 * Initialize Prediction Form & Slider Bindings
 */
function initPredictionForm(form) {
  // 1. Synchronize Sliders with Numeric Inputs
  bindRangeWithInput('studyTimeRange', 'Hours_Studied', 'studyTimeDisplay', ' hrs/week');
  bindRangeWithInput('attendanceRange', 'Attendance', 'attendanceDisplay', '%');
  bindRangeWithInput('previousScoreRange', 'Previous_Scores', 'previousScoreDisplay', '%');

  // 2. Demo Evaluation Presets
  const highPresetBtn = document.getElementById('presetHighPerformer');
  const avgPresetBtn = document.getElementById('presetAveragePerformer');
  const riskPresetBtn = document.getElementById('presetAtRisk');
  const resetBtn = document.getElementById('resetFormBtn');

  if (highPresetBtn) {
    highPresetBtn.addEventListener('click', () => applyPreset({
      studentName: 'Sophia Chen',
      gradeClass: 'B.Tech CSE - 6th Sem',
      Gender: 'Female',
      Hours_Studied: 26,
      Attendance: 95,
      Previous_Scores: 90,
      Tutoring_Sessions: 3,
      Sleep_Hours: 8.0,
      Physical_Activity: 7.0,
      Access_to_Resources: 'High',
      Teacher_Quality: 'High',
      School_Type: 'Private',
      Internet_Access: 'Yes',
      Motivation_Level: 'High',
      Parental_Involvement: 'High',
      Parental_Education_Level: 'Postgraduate',
      Family_Income: 'High',
      Peer_Influence: 'Positive',
      Extracurricular_Activities: 'Yes',
      Learning_Disabilities: 'No',
      Distance_from_Home: 'Near'
    }));
  }

  if (avgPresetBtn) {
    avgPresetBtn.addEventListener('click', () => applyPreset({
      studentName: 'David Miller',
      gradeClass: 'B.Tech CSE - 4th Sem',
      Gender: 'Male',
      Hours_Studied: 16,
      Attendance: 85,
      Previous_Scores: 76,
      Tutoring_Sessions: 2,
      Sleep_Hours: 7.0,
      Physical_Activity: 5.0,
      Access_to_Resources: 'Medium',
      Teacher_Quality: 'High',
      School_Type: 'Public',
      Internet_Access: 'Yes',
      Motivation_Level: 'Medium',
      Parental_Involvement: 'Medium',
      Parental_Education_Level: 'College',
      Family_Income: 'Medium',
      Peer_Influence: 'Neutral',
      Extracurricular_Activities: 'Yes',
      Learning_Disabilities: 'No',
      Distance_from_Home: 'Moderate'
    }));
  }

  if (riskPresetBtn) {
    riskPresetBtn.addEventListener('click', () => applyPreset({
      studentName: 'Marcus Vance',
      gradeClass: 'B.Tech CSE - 2nd Sem',
      Gender: 'Male',
      Hours_Studied: 4,
      Attendance: 55,
      Previous_Scores: 46,
      Tutoring_Sessions: 0,
      Sleep_Hours: 5.5,
      Physical_Activity: 2.0,
      Access_to_Resources: 'Low',
      Teacher_Quality: 'Low',
      School_Type: 'Public',
      Internet_Access: 'No',
      Motivation_Level: 'Low',
      Parental_Involvement: 'Low',
      Parental_Education_Level: 'High School',
      Family_Income: 'Low',
      Peer_Influence: 'Negative',
      Extracurricular_Activities: 'No',
      Learning_Disabilities: 'Yes',
      Distance_from_Home: 'Far'
    }));
  }

  // Clear / Set to Zero Option
  const clearZeroBtn = document.getElementById('presetClearToZero');
  if (clearZeroBtn) {
    clearZeroBtn.addEventListener('click', () => {
      // 1. Clear text inputs
      const nameInput = document.getElementById('studentName');
      const classInput = document.getElementById('gradeClass');
      if (nameInput) nameInput.value = '';
      if (classInput) classInput.value = '';

      // 2. Clear numeric inputs to 0
      const numFields = {
        Hours_Studied: 0,
        Attendance: 0,
        Previous_Scores: 0,
        Tutoring_Sessions: 0,
        Sleep_Hours: 0,
        Physical_Activity: 0
      };
      Object.keys(numFields).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = numFields[id];
      });

      // 3. Reset sliders to 0
      const studyRange = document.getElementById('studyTimeRange');
      if (studyRange) studyRange.value = 0;
      const attRange = document.getElementById('attendanceRange');
      if (attRange) attRange.value = 0;
      const prevRange = document.getElementById('previousScoreRange');
      if (prevRange) prevRange.value = 0;

      // 4. Update slider display texts
      const studyDisp = document.getElementById('studyTimeDisplay');
      if (studyDisp) studyDisp.textContent = '0 hrs/week';
      const attDisp = document.getElementById('attendanceDisplay');
      if (attDisp) attDisp.textContent = '0%';
      const prevDisp = document.getElementById('previousScoreDisplay');
      if (prevDisp) prevDisp.textContent = '0%';

      // 5. Reset select dropdowns
      const selectFields = {
        Gender: 'Male',
        Access_to_Resources: 'Medium',
        Teacher_Quality: 'Medium',
        School_Type: 'Public',
        Internet_Access: 'Yes',
        Motivation_Level: 'Medium',
        Parental_Involvement: 'Medium',
        Parental_Education_Level: 'College',
        Family_Income: 'Medium',
        Peer_Influence: 'Neutral',
        Extracurricular_Activities: 'No',
        Learning_Disabilities: 'No',
        Distance_from_Home: 'Near'
      };
      Object.keys(selectFields).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = selectFields[id];
      });

      if (window.App && App.showToast) {
        App.showToast('All form values have been cleared and set to 0.', 'info', 'Values Cleared');
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      updateSliderDisplays();
      App.showToast('Form reset to default values.', 'info');
    });
  }

  // 3. Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = collectFormFeatures();
    const validation = validateFeatures(data);

    if (!validation.isValid) {
      App.showToast(validation.errorMessage || 'Please complete all required fields.', 'danger', 'Validation Error');
      return;
    }

    // Show Loading Overlay
    showPredictionLoading();

    try {
      // Call Flask Backend API
      let result = null;
      if (window.ApiService) {
        result = await ApiService.predictPerformance(data);
      }

      // If backend returned valid prediction
      if (!result) {
        // Fallback local Scikit-learn simulated inference if Flask server unreachable
        result = runFallbackPrediction(data);
      }

      // Generate ID and Timestamp
      const predictionRecord = {
        id: 'pred-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toLocaleString(),
        studentName: data.studentName,
        gradeClass: data.gradeClass,
        gender: data.Gender,
        predictedScore: result.predicted_score || result.exam_score,
        category: result.performance_category || result.performance,
        riskLevel: result.risk_level || 'Moderate Risk',
        confidence: result.confidence_score || 92,
        attendance: data.Attendance,
        studyTime: data.Hours_Studied,
        previousScore: data.Previous_Scores,
        factors: result.factors || {},
        insights: result.insights || [],
        recommendations: result.recommendations || []
      };

      // Save to Active Result & History in LocalStorage
      localStorage.setItem('edupredict_active_result', JSON.stringify(predictionRecord));
      
      let historyList = [];
      try {
        historyList = JSON.parse(localStorage.getItem('edupredict_predictions')) || [];
      } catch (e) {
        historyList = [];
      }
      historyList.unshift(predictionRecord);
      localStorage.setItem('edupredict_predictions', JSON.stringify(historyList));

      // Complete Loading Animation and Navigate
      advanceLoadingStep(3, () => {
        hidePredictionLoading();
        window.location.href = 'result.html';
      });

    } catch (err) {
      hidePredictionLoading();
      App.showToast(err.message || 'Unable to connect to the prediction server.', 'danger', 'Prediction Error');
    }
  });
}

function bindRangeWithInput(rangeId, inputId, displayId, unit) {
  const range = document.getElementById(rangeId);
  const input = document.getElementById(inputId);
  const display = document.getElementById(displayId);

  if (!range || !input) return;

  range.addEventListener('input', () => {
    input.value = range.value;
    if (display) display.textContent = range.value + unit;
  });

  input.addEventListener('input', () => {
    range.value = input.value;
    if (display) display.textContent = input.value + unit;
  });
}

function updateSliderDisplays() {
  const study = document.getElementById('Hours_Studied');
  const att = document.getElementById('Attendance');
  const prev = document.getElementById('Previous_Scores');

  if (study) document.getElementById('studyTimeDisplay').textContent = study.value + ' hrs/week';
  if (att) document.getElementById('attendanceDisplay').textContent = att.value + '%';
  if (prev) document.getElementById('previousScoreDisplay').textContent = prev.value + '%';
}

function applyPreset(p) {
  Object.keys(p).forEach(key => {
    const el = document.getElementById(key);
    if (el) {
      el.value = p[key];
    }
  });

  const studyRange = document.getElementById('studyTimeRange');
  if (studyRange && p.Hours_Studied) studyRange.value = p.Hours_Studied;

  const attRange = document.getElementById('attendanceRange');
  if (attRange && p.Attendance) attRange.value = p.Attendance;

  const prevRange = document.getElementById('previousScoreRange');
  if (prevRange && p.Previous_Scores) prevRange.value = p.Previous_Scores;

  updateSliderDisplays();
  App.showToast(`Applied preset profile for ${p.studentName}.`, 'info');
}

/**
 * Collect all 19 Features exactly matching model contract
 */
function collectFormFeatures() {
  return {
    studentName: (document.getElementById('studentName')?.value || 'Student').trim(),
    gradeClass: (document.getElementById('gradeClass')?.value || 'General Course').trim(),
    
    // Exact 19 Features
    Hours_Studied: parseFloat(document.getElementById('Hours_Studied')?.value || 15),
    Attendance: parseFloat(document.getElementById('Attendance')?.value || 85),
    Parental_Involvement: document.getElementById('Parental_Involvement')?.value || 'Medium',
    Access_to_Resources: document.getElementById('Access_to_Resources')?.value || 'Medium',
    Extracurricular_Activities: document.getElementById('Extracurricular_Activities')?.value || 'Yes',
    Sleep_Hours: parseFloat(document.getElementById('Sleep_Hours')?.value || 7),
    Previous_Scores: parseFloat(document.getElementById('Previous_Scores')?.value || 75),
    Motivation_Level: document.getElementById('Motivation_Level')?.value || 'Medium',
    Internet_Access: document.getElementById('Internet_Access')?.value || 'Yes',
    Tutoring_Sessions: parseInt(document.getElementById('Tutoring_Sessions')?.value || 2, 10),
    Family_Income: document.getElementById('Family_Income')?.value || 'Medium',
    Teacher_Quality: document.getElementById('Teacher_Quality')?.value || 'High',
    School_Type: document.getElementById('School_Type')?.value || 'Public',
    Peer_Influence: document.getElementById('Peer_Influence')?.value || 'Positive',
    Physical_Activity: parseFloat(document.getElementById('Physical_Activity')?.value || 5),
    Learning_Disabilities: document.getElementById('Learning_Disabilities')?.value || 'No',
    Parental_Education_Level: document.getElementById('Parental_Education_Level')?.value || 'College',
    Distance_from_Home: document.getElementById('Distance_from_Home')?.value || 'Near',
    Gender: document.getElementById('Gender')?.value || 'Female'
  };
}

/**
 * Client-Side Validation
 */
function validateFeatures(d) {
  if (!d.studentName || d.studentName.trim().length < 2) {
    return { isValid: false, errorMessage: 'Please enter a valid student full name.' };
  }
  if (isNaN(d.Hours_Studied) || d.Hours_Studied < 0 || d.Hours_Studied > 50) {
    return { isValid: false, errorMessage: 'Hours Studied must be between 0 and 50 hours/week.' };
  }
  if (isNaN(d.Attendance) || d.Attendance < 0 || d.Attendance > 100) {
    return { isValid: false, errorMessage: 'Attendance must be between 0% and 100%.' };
  }
  if (isNaN(d.Previous_Scores) || d.Previous_Scores < 0 || d.Previous_Scores > 100) {
    return { isValid: false, errorMessage: 'Previous Scores must be between 0% and 100%.' };
  }
  if (isNaN(d.Sleep_Hours) || d.Sleep_Hours < 0 || d.Sleep_Hours > 24) {
    return { isValid: false, errorMessage: 'Sleep Hours must be between 0 and 24 hours/day.' };
  }
  if (isNaN(d.Tutoring_Sessions) || d.Tutoring_Sessions < 0 || d.Tutoring_Sessions > 10) {
    return { isValid: false, errorMessage: 'Tutoring sessions must be between 0 and 10.' };
  }
  if (isNaN(d.Physical_Activity) || d.Physical_Activity < 0 || d.Physical_Activity > 20) {
    return { isValid: false, errorMessage: 'Physical activity must be between 0 and 20 hours/week.' };
  }
  return { isValid: true };
}

/**
 * Animated Loading Overlay Steps
 */
function showPredictionLoading() {
  const overlay = document.getElementById('predictLoadingOverlay');
  if (overlay) {
    overlay.classList.add('active');
    setStepState('loadStep1', 'running');
    setStepState('loadStep2', 'pending');
    setStepState('loadStep3', 'pending');

    setTimeout(() => {
      setStepState('loadStep1', 'done');
      setStepState('loadStep2', 'running');
    }, 450);
  }
}

function advanceLoadingStep(step, callback) {
  setTimeout(() => {
    setStepState('loadStep2', 'done');
    setStepState('loadStep3', 'running');
    setTimeout(() => {
      setStepState('loadStep3', 'done');
      if (callback) callback();
    }, 400);
  }, 350);
}

function hidePredictionLoading() {
  const overlay = document.getElementById('predictLoadingOverlay');
  if (overlay) overlay.classList.remove('active');
}

function setStepState(stepId, state) {
  const step = document.getElementById(stepId);
  if (!step) return;

  const icon = step.querySelector('i');
  if (state === 'running') {
    step.className = 'loading-step-item active';
    if (icon) icon.className = 'fa-solid fa-spinner fa-spin';
  } else if (state === 'done') {
    step.className = 'loading-step-item completed';
    if (icon) icon.className = 'fa-solid fa-circle-check';
  } else {
    step.className = 'loading-step-item';
    if (icon) icon.className = 'fa-regular fa-circle';
  }
}

/**
 * Fallback Scikit-learn formula approximation if server is offline
 */
function runFallbackPrediction(d) {
  const base = (0.32 * d.Previous_Scores) + (0.28 * d.Attendance) + (0.65 * d.Hours_Studied) + (1.2 * d.Tutoring_Sessions) + (0.35 * d.Physical_Activity) + (0.5 * d.Sleep_Hours);
  const parentBonus = d.Parental_Involvement === 'High' ? 3.0 : (d.Parental_Involvement === 'Low' ? -3.5 : 0);
  const resourceBonus = d.Access_to_Resources === 'High' ? 3.0 : (d.Access_to_Resources === 'Low' ? -3.0 : 0.5);
  const motivationBonus = d.Motivation_Level === 'High' ? 3.5 : (d.Motivation_Level === 'Low' ? -4.0 : 0.5);
  const teacherBonus = d.Teacher_Quality === 'High' ? 3.0 : (d.Teacher_Quality === 'Low' ? -3.0 : 0);
  const peerBonus = d.Peer_Influence === 'Positive' ? 2.5 : (d.Peer_Influence === 'Negative' ? -3.5 : 0);

  const rawScore = Math.max(15, Math.min(98, Math.round((base + parentBonus + resourceBonus + motivationBonus + teacherBonus + peerBonus) * 10) / 10));
  
  let category = 'Average';
  let risk = 'Moderate Risk';
  if (rawScore >= 90) { category = 'Excellent'; risk = 'Low Risk'; }
  else if (rawScore >= 75) { category = 'Good'; risk = 'Moderate Risk'; }
  else if (rawScore < 60) { category = 'Needs Improvement'; risk = 'High Risk'; }

  return {
    predicted_score: rawScore,
    performance_category: category,
    risk_level: risk,
    confidence_score: 91.5,
    factors: {
      attendance: d.Attendance,
      study_hours: Math.min(100, Math.round((d.Hours_Studied / 35) * 100)),
      previous_academics: d.Previous_Scores,
      continuous_work: d.Previous_Scores,
      internal_exams: d.Previous_Scores,
      environment_support: d.Parental_Involvement === 'High' ? 90 : 70
    },
    insights: [
      `Strong prior coursework foundation (${d.Previous_Scores}%) acts as a reliable predictive anchor.`,
      `Class attendance at ${d.Attendance}% supports consistent concept comprehension.`
    ],
    recommendations: [
      'Maintain regular revision routines and attend mock problem-solving sessions.'
    ]
  };
}

/**
 * ==========================================================================
 * PREDICTION RESULT VIEW (result.html)
 * ==========================================================================
 */
async function initResultView() {
  const urlParams = new URLSearchParams(window.location.search);
  const recordId = urlParams.get('id');

  let resultData = null;

  if (recordId) {
    const numId = parseInt(recordId, 10);
    if (!isNaN(numId) && window.ApiService) {
      try {
        const res = await ApiService.getPredictionById(numId);
        if (res && res.status === 'success' && res.prediction) {
          resultData = res.prediction;
        }
      } catch (err) {
        console.warn('Could not fetch prediction from backend:', err.message);
      }
    }

    if (!resultData) {
      try {
        const historyList = JSON.parse(localStorage.getItem('edupredict_predictions')) || [];
        resultData = historyList.find(r => String(r.id) === String(recordId));
      } catch (e) {}
    }
  }

  if (!resultData) {
    try {
      const raw = localStorage.getItem('edupredict_active_result');
      if (raw) resultData = JSON.parse(raw);
    } catch (e) {}
  }

  if (!resultData) {
    App.showToast('No prediction record found. Please generate a prediction.', 'warning');
    setTimeout(() => { window.location.href = 'predict.html'; }, 1000);
    return;
  }

  renderResultReport(resultData);

  const printBtn = document.getElementById('printReportBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }
}

function renderResultReport(data) {
  const score = parseFloat(data.predictedScore || 75.0);
  const category = data.category || 'Good';

  // 1. Student Name & Meta
  const nameEl = document.getElementById('resultStudentName');
  if (nameEl) nameEl.textContent = data.studentName || 'Student Performance Report';

  const metaEl = document.getElementById('resultStudentMeta');
  if (metaEl) {
    metaEl.textContent = `${data.gradeClass || 'General Course'} • Evaluated on ${data.date || 'Today'} • ${data.gender || ''}`;
  }

  // 2. Category Badge
  const badgeEl = document.getElementById('resultCategoryBadge');
  if (badgeEl) {
    badgeEl.innerHTML = App.getCategoryBadge(category);
  }

  // 3. Gauge Progress Circle & Score
  const scoreValEl = document.getElementById('gaugeScoreValue');
  if (scoreValEl) {
    scoreValEl.textContent = score.toFixed(2) + '%';
  }

  const confEl = document.getElementById('resultConfidenceValue');
  if (confEl) {
    confEl.textContent = (data.confidence || 92) + '%';
  }

  const circle = document.getElementById('gaugeProgressCircle');
  if (circle) {
    const radius = 90;
    const circumference = 2 * Math.PI * radius; // 565.48
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    
    // Fill percentage
    const offset = circumference - (score / 100) * circumference;
    setTimeout(() => {
      circle.style.strokeDashoffset = offset;
      // Change gauge color based on category
      if (category === 'Excellent') circle.style.stroke = '#8b5cf6';
      else if (category === 'Good') circle.style.stroke = '#10b981';
      else if (category === 'Average') circle.style.stroke = '#f59e0b';
      else circle.style.stroke = '#ef4444';
    }, 150);
  }

  // 4. Factor Breakdown Bars
  const attVal = data.attendance || 85;
  const studyVal = data.studyTime || 15;
  const prevVal = data.previousScore || 75;

  setFactorBar('factorAttendanceVal', 'factorAttendanceBar', `${attVal}%`, attVal);
  setFactorBar('factorStudyTimeVal', 'factorStudyTimeBar', `${studyVal} hrs/wk`, Math.min(100, (studyVal / 35) * 100));
  setFactorBar('factorPreviousVal', 'factorPreviousBar', `${prevVal}%`, prevVal);
  setFactorBar('factorAssignmentVal', 'factorAssignmentBar', `${Math.min(100, Math.round(prevVal * 1.05))}%`, prevVal);
  setFactorBar('factorInternalVal', 'factorInternalBar', `${Math.min(100, Math.round(prevVal * 0.98))}%`, prevVal);

  // 5. Model Insights
  const insightsList = document.getElementById('resultInsightsList');
  if (insightsList && data.insights) {
    insightsList.innerHTML = data.insights.map(item => `
      <li class="insight-item">
        <div class="insight-icon" style="background: rgba(59, 130, 246, 0.15); color: var(--primary);">
          <i class="fa-solid fa-chart-line"></i>
        </div>
        <div class="insight-text">${item}</div>
      </li>
    `).join('');
  }

  // 6. Educational Recommendations
  const recsList = document.getElementById('resultRecommendationsList');
  if (recsList && data.recommendations) {
    recsList.innerHTML = data.recommendations.map(item => `
      <li class="insight-item">
        <div class="insight-icon" style="background: rgba(245, 158, 11, 0.15); color: var(--warning);">
          <i class="fa-solid fa-lightbulb"></i>
        </div>
        <div class="insight-text">${item}</div>
      </li>
    `).join('');
  }
}

function setFactorBar(valId, barId, text, percent) {
  const valEl = document.getElementById(valId);
  const barEl = document.getElementById(barId);
  if (valEl) valEl.textContent = text;
  if (barEl) {
    setTimeout(() => {
      barEl.style.width = Math.max(5, Math.min(100, percent)) + '%';
    }, 200);
  }
}
