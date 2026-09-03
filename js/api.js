/**
 * ==========================================================================
 * EDUPREDICT AI — API SERVICE LAYER
 * Centralized REST API Client with Credentialed Sessions & Token Auth
 * ==========================================================================
 */

const ApiService = (function() {
  // Smart Centralized API Base URL
  const isLocalSeparatePort = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')) && (window.location.port && window.location.port !== '5000');
  const defaultBaseUrl = isLocalSeparatePort
    ? `http://${window.location.hostname}:5000/api`
    : `${window.location.origin}/api`;

  const CONFIG = {
    BASE_URL: (window.EDUPREDICT_CONFIG && window.EDUPREDICT_CONFIG.API_URL) || defaultBaseUrl,
    FALLBACK_URL: '/api',
    TIMEOUT_MS: 15000
  };

  let backendAvailable = null;

  /**
   * Helper to perform HTTP Fetch with credentials, tokens, and timeout
   */
  async function request(endpoint, options = {}) {
    let url = `${CONFIG.BASE_URL}${endpoint}`;
    const token = localStorage.getItem('edupredict_token') || sessionStorage.getItem('edupredict_token');

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };

    const fetchOptions = {
      ...options,
      headers,
      credentials: 'include' // Sends session cookies across origins
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
    fetchOptions.signal = controller.signal;

    try {
      let response;
      try {
        response = await fetch(url, fetchOptions);
      } catch (fetchErr) {
        // Try fallback URL if primary host failed
        if (CONFIG.BASE_URL !== CONFIG.FALLBACK_URL) {
          url = `${CONFIG.FALLBACK_URL}${endpoint}`;
          response = await fetch(url, fetchOptions);
        } else {
          throw fetchErr;
        }
      }

      clearTimeout(timeoutId);

      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        data = { message: `Server returned HTTP ${response.status}` };
      }

      if (!response.ok) {
        const errorMsg = data.message || `API Error (${response.status}): ${response.statusText}`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Server request timed out. Please verify that the Flask backend is running on port 5000.');
      }
      if (error.message && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to server. Please verify the Flask backend is running on port 5000.');
      }
      throw error;
    }
  }

  return {
    /**
     * Check if Flask Backend is reachable
     */
    async checkBackendHealth() {
      try {
        const res = await request('/health', { method: 'GET' });
        backendAvailable = Boolean(res && (res.status === 'ok' || res.status === 'healthy' || res.model_loaded));
        return {
          online: backendAvailable,
          algorithm: res.algorithm || 'LinearRegression / Ridge',
          model_loaded: res.model_loaded,
          database: res.database || 'connected'
        };
      } catch (err) {
        backendAvailable = false;
        return {
          online: false,
          error: err.message
        };
      }
    },

    /**
     * Status accessor
     */
    isBackendOnline: () => backendAvailable === true,

    /**
     * Authenticate user with Email and Password against SQLite Database
     * @param {Object} credentials - { email, password }
     */
    async login(credentials) {
      return await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    },

    /**
     * Register a new user into the SQLite Database
     * @param {Object} userData - { name, email, password }
     */
    async register(userData) {
      return await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    },

    /**
     * Validate active session / token on backend (Auto-login check)
     */
    async getMe() {
      try {
        return await request('/auth/me', { method: 'GET' });
      } catch (err) {
        return { status: 'error', authenticated: false, user: null };
      }
    },

    /**
     * Reset password for an existing account
     * @param {Object} resetData - { email, new_password }
     */
    async resetPassword(resetData) {
      return await request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: resetData.email,
          new_password: resetData.newPassword || resetData.new_password
        })
      });
    },

    /**
     * Logout and destroy session on server
     */
    async logout() {
      try {
        return await request('/auth/logout', { method: 'POST' });
      } catch (err) {
        return { status: 'success' };
      }
    },

    /**
     * Fetch Model Metadata, R2, RMSE, and Feature Importances
     */
    async getModelInfo() {
      try {
        return await request('/model/info', { method: 'GET' });
      } catch (err) {
        console.warn('Backend model info unavailable:', err.message);
        return null;
      }
    },

    /**
     * Fetch Multi-Algorithm Benchmarks
     */
    async getModelBenchmarks() {
      try {
        return await request('/model/benchmark', { method: 'GET' });
      } catch (err) {
        return null;
      }
    },

    /**
     * Send student academic features to the Machine Learning Prediction model
     */
    async predictPerformance(studentFeatures) {
      try {
        const response = await request('/predict', {
          method: 'POST',
          body: JSON.stringify(studentFeatures)
        });
        if (response && response.status === 'success') {
          return response.prediction;
        }
        return null;
      } catch (err) {
        console.warn('Flask prediction endpoint error, falling back to client ML engine:', err.message);
        return null;
      }
    },

    /**
     * Send batch students to prediction model
     */
    async predictBatch(studentsArray) {
      return await request('/predict/batch', {
        method: 'POST',
        body: JSON.stringify({ students: studentsArray })
      });
    },

    /**
     * Fetch user's prediction history from SQLite Database
     */
    async getPredictions() {
      return await request('/predictions', { method: 'GET' });
    },

    /**
     * Fetch single prediction details
     */
    async getPredictionById(id) {
      return await request(`/predictions/${id}`, { method: 'GET' });
    },

    /**
     * Save prediction explicitly to user's database history
     */
    async savePrediction(record) {
      return await request('/predictions', {
        method: 'POST',
        body: JSON.stringify(record)
      });
    },

    /**
     * Delete prediction record from user's database history
     */
    async deletePrediction(id) {
      return await request(`/predictions/${id}`, { method: 'DELETE' });
    }
  };
})();

// Export globally for browser usage
window.ApiService = ApiService;
