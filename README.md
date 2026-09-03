# EduPredict AI — Student Performance Prediction System

> **"Turn Student Data into Academic Insights with Machine Learning"**

**EduPredict AI** is a full-stack, production-grade Machine Learning web application designed to predict expected student performance and identify at-risk students before final examinations.

---

## 📌 Project Architecture

```
                                  ┌───────────────────────────┐
                                  │   EduPredict AI Web UI    │
                                  │  (HTML5, CSS3, ES6, SVG)  │
                                  └─────────────┬─────────────┘
                                                │ REST API (JSON / Bearer Token)
                                                ▼
                                  ┌───────────────────────────┐
                                  │    Flask Backend (WSGI)   │
                                  │       (backend/app.py)    │
                                  └──────┬─────────────┬──────┘
                                         │             │
                    ┌────────────────────▼──┐   ┌──────▼────────────────────┐
                    │  SQLite Database      │   │  Scikit-Learn ML Pipeline │
                    │  (backend/edupredict.db)│ │  (student_performance_   │
                    │  • Users (PBKDF2)     │   │   model.joblib)           │
                    │  • Sessions           │   │  • Ridge Regression       │
                    │  • Predictions        │   │  • R² = 0.988, RMSE = 1.84│
                    └───────────────────────┘   └───────────────────────────┘
```

---

## 🚀 Key Features

1. **Persistent Authentication & Security**:
   - SQLite persistent database (`backend/edupredict.db`) stores user accounts and active sessions.
   - Passwords securely hashed with **Werkzeug PBKDF2:SHA256**.
   - Cross-browser session authorization via Bearer tokens.
   - Dedicated **Reset Password** page (`reset-password.html`).
   - Guest **Demo Login** mode for quick evaluation without creating an account.

2. **Scikit-Learn ML Pipeline ($R^2 \approx 0.988$)**:
   - Real-time inference using trained Ridge Regression pipeline (`backend/student_performance_model.joblib`).
   - Evaluates all **19 student academic and lifestyle features**:
     - *Hours Studied, Attendance, Parental Involvement, Access to Resources, Extracurriculars, Sleep Hours, Previous Scores, Motivation, Internet Access, Tutoring Sessions, Family Income, Teacher Quality, School Type, Peer Influence, Physical Activity, Learning Disabilities, Parental Education, Distance from Home, Gender.*
   - Categorizes students into proactive support tiers: *High Distinction, Good Standing, Average, At-Risk, Critical Support*.

3. **Academic Analytics Dashboard**:
   - Total predictions, latest predicted score, average score, and performance tier distribution.
   - Interactive **Chart.js** score trajectory line charts and performance doughnut charts.
   - Zero-state screen for new users (*"No predictions yet"*).

4. **Prediction History & Multi-User Isolation**:
   - Live search by student name or class.
   - Category filtering (*Distinction, Average, At-Risk, etc.*) and newest-first sorting.
   - Strict `user_id` database isolation ensuring data privacy between users.
   - Single-click deletion with confirmation dialog.

5. **User Profile & Settings**:
   - Accessible by clicking the user badge (`PA`) in the sidebar.
   - View and update registered name, email, institution, and change account passwords.

6. **Form Presets & Reset Controls**:
   - One-click presets: *High Achiever*, *Average Student*, *At-Risk Student*.
   - **"Clear All / Set to Zero"** button to immediately reset all fields to 0.

7. **Database Inspector Tool**:
   - Run `python backend/view_database.py` in the terminal to inspect all stored users, sessions, and predictions in clean ASCII tables.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Custom Design System, Light/Dark theme), Vanilla JavaScript (ES6+), Chart.js, Font Awesome |
| **Backend** | Python 3.10+, Flask, Flask-CORS, Gunicorn WSGI |
| **Machine Learning** | Scikit-learn (Ridge Regression Pipeline), Pandas, NumPy, Joblib |
| **Database** | SQLite3 with PBKDF2:SHA256 Cryptographic Hashing |
| **Deployment** | Render, Railway, Docker, PythonAnywhere |

---

## 💻 How to Run Locally

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Flask Backend Server
```bash
python backend/app.py
```
*Server starts on `http://127.0.0.1:5000`.*

### 3. Open the Application
Open your browser and navigate to:
```
http://localhost:5000/login.html
```
*(Or if running a separate frontend server on port 3000: `http://localhost:3000/login.html`)*

---

## 🧪 Automated Test Suite

Run the automated test suite covering ML inference, authentication, history isolation, and password reset:
```bash
python backend/test_ml.py
```
```text
Ran 28 tests in 3.072s
OK (All 28 tests passed)
```

---

## 🌐 Production Deployment

Refer to [`DEPLOYMENT.md`](DEPLOYMENT.md) for full deployment instructions on:
- **Render.com** (1-Click automated deployment from GitHub)
- **Railway.app**
- **Docker Compose**
- **PythonAnywhere**
