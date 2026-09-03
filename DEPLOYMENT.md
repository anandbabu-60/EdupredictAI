# 🌐 EduPredict AI — Production Deployment Guide

This guide provides step-by-step instructions to deploy **EduPredict AI** online for free using popular cloud hosting platforms.

---

## 🏆 Recommended: Deploy on Render.com (100% Free & Easiest)

Render gives you free hosting for Python web apps with automatic HTTPS and continuous deployment from GitHub.

### Step 1: Push Code to GitHub
1. Open terminal in the project directory:
   ```bash
   git init
   git add .
   git commit -m "Deploy EduPredict AI"
   ```
2. Create a new repository on [GitHub.com](https://github.com/new) (e.g. `edupredict-ai`).
3. Push your repository:
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/edupredict-ai.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in with GitHub.
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your **`edupredict-ai`** GitHub repository.
4. Fill in the settings:
   - **Name**: `edupredict-ai` (or any custom name)
   - **Region**: Oregon (US West) or Frankfurt (EU)
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --chdir backend app:app --workers 2 --threads 4 --timeout 120`
   - **Instance Type**: **Free**
5. Click **Deploy Web Service**.

🎉 Once the build completes (approx 2 minutes), your application will be live at:
`https://edupredict-ai.onrender.com`

---

## 🚂 Option 2: Deploy on Railway.app

1. Go to [railway.app](https://railway.app/) and sign in with GitHub.
2. Click **+ New Project** $\rightarrow$ **Deploy from GitHub repo**.
3. Select your `edupredict-ai` repository.
4. Railway will automatically detect Python, install `requirements.txt`, and use the `Procfile`.
5. Under **Settings** $\rightarrow$ **Networking**, click **Generate Domain**.
6. Your app is live with SSL!

---

## 🐳 Option 3: Deploy with Docker (AWS / DigitalOcean / VPS)

If you have your own Linux VM, VPS, or cloud server:

1. Clone or copy the project files to your server.
2. Build and run using Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. The app will be running on port `5000`:
   `http://<YOUR_SERVER_IP>:5000`

---

## 🐍 Option 4: Deploy on PythonAnywhere

1. Sign up for a free account at [pythonanywhere.com](https://www.pythonanywhere.com/).
2. Open a **Bash Console** and clone your repo:
   ```bash
   git clone https://github.com/<YOUR_USERNAME>/edupredict-ai.git
   cd edupredict-ai
   pip install --user -r requirements.txt
   ```
3. Go to the **Web** tab:
   - Click **Add a new web app** $\rightarrow$ choose **Manual configuration** $\rightarrow$ **Python 3.10/3.11**.
   - In the **WSGI configuration file**, point to `backend/app.py`:
     ```python
     import sys
     path = '/home/<YOUR_USERNAME>/edupredict-ai'
     if path not in sys.path:
         sys.path.append(path)
     from backend.app import app as application
     ```
   - Reload the web app.

---

## 🛠️ Production Architecture Highlights

- **Unified Single-Port Delivery**: Flask production server serves both the ML REST API (`/api/...`) and the frontend UI (`/`, `/login.html`, `/dashboard.html`, etc.) on the same domain.
- **Smart Protocol Adaptation**: Frontend automatically uses HTTPS relative endpoints (`/api`) when deployed in the cloud, preventing CORS mismatches or mixed-content blocking.
- **Persistent Data**: SQLite database (`backend/edupredict.db`) stores student predictions and user accounts with PBKDF2 password security.
