# GyaanMitra Frontend

## Overview

Vite + React 19 study companion app with:

- Authentication (login/signup w/avatar upload)
- Dashboard with charts/stats
- Features: Chatbot, Planner, Flashcards, Quiz, Notes, Timer, Analytics, Music, Profile/Settings
- Theme system (5 themes)
- Toast notifications
- Responsive layout w/sidebar/header

## Tech Stack

- React 19, React Router 7
- Vite 7, Bootstrap 5, Chart.js
- Axios API, react-hot-toast
- Context: Auth, Theme
- Multer backend avatar uploads

## Structure

```
frontend/src/
├── App.jsx (Router wrapper)
├── routes/index.jsx (All Routes)
├── components/ (Layout, Sidebar, Header, etc.)
├── pages/ (DashboardPage, LoginPage, etc.)
├── context/ (AuthContext, ThemeContext)
├── services/api.js
└── assets/
```

## Setup

```bash
cd frontend
npm install
npm run dev
```

## Routes (routes/index.jsx)

- /login, /signup (public)
- /dashboard, /chatbot, /planner, /flashcards, /quiz, /notes, /timer, /analytics, /music, /profile, /settings (Layout protected)

Backend: http://localhost:5000/api

## Features Implemented

- Avatar upload on signup/profile
- Success toasts on auth, redirect dashboard
- Dynamic user data in sidebar/profile
- Fixed route consistency (/dashboard)
- Theme CSS vars

Ready to run!
