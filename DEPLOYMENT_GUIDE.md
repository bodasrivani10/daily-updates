# 🚀 VELO: Step-by-Step GitHub & Cloud Deployment Guide
**Repository:** `https://github.com/pendeladakshayani-hub/daily-updates.git`

This guide explains:
1. How to **push your code to GitHub** in 1 command.
2. How to deploy the **Backend on Render with persistent database storage** (so user data, projects, and summaries are NEVER lost when the app restarts).
3. How to deploy the **Frontend on Vercel**.

---

## 📌 STEP 1: Push Your Code to GitHub

GitHub requires your authentication (Personal Access Token).

### Quick 2-Minute Token Creation (If you don't have one):
1. In GitHub, click your profile icon (top right) ➔ **Settings**.
2. Scroll to the bottom of the left sidebar ➔ **Developer settings**.
3. Click **Personal access tokens** ➔ **Tokens (classic)** ➔ **Generate new token (classic)**.
4. Give it a note (e.g. `velo-push`), check the **`repo`** checkbox (Full control of private repositories).
5. Click **Generate token** and copy the `ghp_...` token.

### Push Command:
Open your Command Prompt or terminal in this folder and run:
```powershell
python push_to_github.py https://github.com/pendeladakshayani-hub/daily-updates.git <YOUR_GITHUB_TOKEN>
```
*Example:*
```powershell
python push_to_github.py https://github.com/pendeladakshayani-hub/daily-updates.git ghp_xxxxxxxxxxxxxxxxxxxx
```
Your code is now live on GitHub!

---

## 📌 STEP 2: Deploy Backend with SQLite Database on Render

The backend is configured to use **SQLite** (`dailysignal.db`). No extra database setup is required.

### A. Create the Free PostgreSQL Database (Takes 1 min)
1. Go to **[Render.com](https://render.com/)** and log in with GitHub.
2. Click **New +** ➔ **PostgreSQL**.
3. Name it: `velo-db`.
4. Region: Choose the region nearest to you (e.g., *Singapore* or *Oregon*).
5. Plan: **Free**.
6. Click **Create Database**.
7. Once created, find the field **Internal Database URL** (or **External Database URL**) and click **Copy**.
   *(It looks like: `postgresql://velo_db_user:...@dpg-...-a.render.com/velo_db`)*

### B. Deploy the Backend Web Service
1. On Render dashboard, click **New +** ➔ **Web Service**.
2. Connect your repository: `pendeladakshayani-hub/daily-updates`.
3. Set the following options:
   - **Name**: `velo-api`
   - **Language**: `Python 3`
   - **Branch**: `main`
   - **Root Directory**: *(leave empty)*
   - **Build Command**: 
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: **Free**
4. Scroll down to **Environment Variables** ➔ click **Add Environment Variable**:
   - **Key**: `DATABASE_URL`
   - **Value**: *(Paste the PostgreSQL URL you copied in Step A)*
5. Click **Create Web Service**.

🎉 **Your Backend is live!** Render will give you an API URL:
> Example: `https://velo-api-xxxx.onrender.com`
*(All registered users, tasks, summaries, and updates will be permanently preserved in PostgreSQL!)*

---

## 📌 STEP 3: Deploy Frontend to Vercel (Free)

1. Go to **[Vercel.com](https://vercel.com/)** and log in with GitHub.
2. Click **Add New...** ➔ **Project**.
3. Import `daily-updates`.
4. Configure Project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and choose **`frontend`**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://velo-api-xxxx.onrender.com/api` *(Your Render backend URL followed by `/api`)*
6. Click **Deploy**.

🚀 In ~1 minute, your website is online with your custom VELO branding, full employee and manager dashboards, and persistent storage!
