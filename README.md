# HRMS Lite

A lightweight Human Resource Management System for managing employee records and daily attendance.

---

## Live Links

- **Live Application URL**: `https://hrms-lite-smoky.vercel.app`
- **Backend API URL**: `https://hrms-lite-ze17.onrender.com`
- **GitHub Repository**: `https://github.com/abhishekprajapat08/hrms-lite`

---

## Features

- **Employee Management**: Add, view, and delete employees (Employee ID, Full Name, Email, Department)
- **Attendance Management**: Mark attendance (Date, Present/Absent) and view records per employee
- **Dashboard**: Summary counts and present days per employee
- **Filter attendance** by employee and date range
- Clean UI with loading, empty, and error states

## Tech Stack

| Layer    | Technology        |
|----------|-------------------|
| Frontend | React 18, Vite    |
| Backend  | FastAPI (Python)  |
| Database | SQLite (SQLAlchemy) |

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+

## Run Locally

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API will be at **http://localhost:8000**. Docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be at **http://localhost:5173**. It proxies `/api` to the backend when using default `VITE_API_URL`.

### 3. Connect to a different backend

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Then run `npm run dev` again. For production, set `VITE_API_URL` to your deployed API URL before building.

## Project Structure

```
ytt/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── requirements.txt
│   └── app/
│       ├── database.py   # SQLite + Session
│       ├── models.py     # Employee, Attendance
│       ├── schemas.py    # Pydantic models
│       ├── crud.py       # DB operations
│       └── routes/
│           ├── employees.py
│           └── attendance.py
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js        # API client
│       ├── components/
│       └── pages/
└── README.md
```

## API Overview

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /employees                  | List employees           |
| POST   | /employees                  | Create employee          |
| GET    | /employees/{id}             | Get employee             |
| DELETE | /employees/{id}             | Delete employee          |
| GET    | /attendance                  | List attendance (optional filters) |
| GET    | /attendance/employee/{id}   | Attendance by employee   |
| POST   | /attendance                 | Mark attendance          |

## Validation & Errors

- **Required fields** enforced for employee and attendance
- **Email** validated (format)
- **Duplicate Employee ID** returns 409
- Invalid requests return appropriate HTTP status codes and error messages

## How to Deploy (Step by Step)

Push your code to GitHub first, then deploy **Backend → Frontend**.

---

### Step 1: Push code to GitHub

```bash
# In project folder (ytt)
git init
git add .
git commit -m "HRMS Lite - initial commit"
# Create a new repo on GitHub (github.com → New repository), then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name.

---

### Step 2: Deploy Backend (Render)

1. Go to [render.com](https://render.com) and sign up / log in.
2. **New → Web Service**.
3. Connect your GitHub account and select this repository.
4. Settings:
   - **Name:** `hrms-lite-api` (or any name)
   - **Region:** Choose nearest
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**. Wait for the first deploy to finish.
6. Copy your backend URL, e.g. `https://hrms-lite-api.onrender.com` (no trailing slash).  
   You will use this in the frontend.

**Note:** On Render’s free tier, the app may sleep after some idle time. SQLite is used by default; data can reset after restarts. For permanent data, you can add a PostgreSQL database on Render and set `DATABASE_URL` later.

---

### Step 3: Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign up / log in (GitHub is easiest).
2. **Add New → Project**.
3. Import the same GitHub repository.
4. Settings:
   - **Root Directory:** `frontend` (click Edit, set to `frontend`)
   - **Framework Preset:** Vite
   - **Environment Variable:**  
     Name: `VITE_API_URL`  
     Value: `https://hrms-lite-api.onrender.com` (your actual backend URL from Step 2, no trailing slash)
5. Click **Deploy**. Wait for the build to finish.
6. Copy your frontend URL, e.g. `https://your-project.vercel.app`.

---

### Quick reference

| Step | Where | Root Directory | Important |
|------|--------|-----------------|-----------|
| Backend | Render | `backend` | Start: `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Frontend | Vercel | `frontend` | Env: `VITE_API_URL` = backend URL |

If the frontend shows errors, check that `VITE_API_URL` is set correctly on Vercel and redeploy.

## Assumptions / Limitations

- Single admin user; no authentication.
- Leave, payroll, and advanced HR features are out of scope.
- SQLite is used by default; for production at scale, use PostgreSQL and set `DATABASE_URL`.

