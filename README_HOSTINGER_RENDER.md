# 🚀 Hostinger (Frontend) + Render.com (Backend API) Deployment Guide

This project is fully configured for deployment on Hostinger (Frontend) and Render (Backend API).

---

## 1. Backend API Deployment (Render.com)

1. Push your codebase to GitHub.
2. Go to [Render.com Dashboard](https://dashboard.render.com/) ➔ **New Web Service**.
3. Select your repository.
4. Settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. Click **Create Web Service**.
6. Copy your live backend URL (e.g. `https://auracare-api.onrender.com`).

---

## 2. Frontend Configuration (`static/js/config.js`)

Edit `static/js/config.js` and set your Render URL:

```javascript
const CONFIG = {
  API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '' 
    : 'https://auracare-api.onrender.com' // <-- Your Render URL
};
```

---

## 3. Frontend Deployment (Hostinger hPanel)

1. Log in to Hostinger hPanel ➔ **File Manager** ➔ `public_html/`.
2. Upload all files from the `static/` directory (`index.html`, `css/`, `js/`, `logo.jpg`).
3. Ensure `index.html` is located directly inside `public_html/index.html`.

Done! Your frontend on Hostinger will automatically connect to your Render Backend API! 🎉
