# 🚀 VELO: Complete GitHub & Cloud Deployment Guide

This guide walks you through **pushing VELO to GitHub** and deploying both your **Backend (FastAPI)** and **Frontend (Vite/React)** live on the web for free.

---

## 📌 Part 1: Push Project to GitHub

Your project is already initialized with Git and committed with all files, configuration, and your custom **VELO** branding.

### Step 1: Create a New GitHub Repository
1. Log in to [GitHub](https://github.com/).
2. In the top-right corner, click **`+`** ➔ **New repository**.
3. Name your repository (e.g., `velo-workspace`).
4. Set visibility to **Public** or **Private**.
5. **Do NOT** check "Add a README file" or ".gitignore" (we already created them).
6. Click **Create repository**.
7. Copy your repository HTTPS URL (e.g., `https://github.com/<your-username>/velo-workspace.git`).

### Step 2: Push Your Code
You can push directly using the built-in helper script in your workspace:
```powershell
python push_to_github.py https://github.com/<your-username>/<repo-name>.git <your_github_personal_access_token>
```
*(Or if you install Git for Windows, simply run `git remote add origin <url>` and `git push -u origin main`).*

---

## 📌 Part 2: Deploy Backend to Render (Free)

The backend runs FastAPI with SQLite. We deploy it first so we have the live API URL for the frontend.

1. Go to [Render.com](https://render.com/) and sign up / log in with your GitHub account.
2. On your dashboard, click **New +** ➔ **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub repo `velo-workspace`.
4. Fill in the following settings:
   - **Name**: `velo-api`
   - **Region**: Closest to you (e.g., *Singapore* or *Oregon*)
   - **Language / Runtime**: `Python 3`
   - **Branch**: `main`
   - **Root Directory**: *(leave blank or set to `.`)*
   - **Build Command**: 
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: **Free**
5. Click **Create Web Service**.
6. Render will install dependencies and start your backend. Once deployed, Render will provide your public URL:
   > Example: `https://velo-api-xxxx.onrender.com`
7. Test it by opening `https://velo-api-xxxx.onrender.com/docs` to see the interactive Swagger API documentation.

---

## 📌 Part 3: Deploy Frontend to Vercel (Free)

1. Go to [Vercel.com](https://vercel.com/) and log in with your GitHub account.
2. Click **Add New...** ➔ **Project**.
3. Import your `velo-workspace` repository.
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`frontend`**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://velo-api-xxxx.onrender.com/api` *(replace with your Render URL from Part 2)*
6. Click **Deploy**.
7. In ~60 seconds, your site is live! You will receive a URL like:
   > `https://velo-workspace.vercel.app`

---

## 🎯 Verification Checklist

- [x] **Branding**: Displays the custom VELO logo.
- [x] **Registration**: `+ Register Your Details` adds new members instantly.
- [x] **Manager Dashboard**: Search bar active, review summaries, mark task complete.
- [x] **Employee Dashboard**: Direct summary input without file uploads + channel selector.
- [x] **Cloud-ready**: `vercel.json` SPA routing configured & root `Procfile` ready.
