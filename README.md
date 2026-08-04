# 🚀 Airflow 3.2 Executive Dashboard & AI ChatOps Assistant

Lightweight, high-performance executive observability dashboard for Apache Airflow 3.2 built with **React**, **Tailwind CSS**, **Python FastAPI** (15-second caching proxy backend), and **Google Gemini LLM** AI Error Diagnosis.

---

## 🌟 Key Features

### 1. 🪵🪄 Automated AI Error & Log Diagnosis (Google Gemini LLM)
- **JSON Log Stream Analyzer**: Unpacks Airflow 3 JSON log objects and extracts exact PostgreSQL & Python exceptions (`UndefinedColumn: column "hotelid"...`).
- **One-Click Diagnostic Modal**: Click **"Diagnose 🪄"** on failed DAG rows to view human-readable explanations, severity badges (`CRITICAL`, `HIGH`, `MEDIUM`), and step-by-step remediation steps.

### 2. 💬⚡ Natural Language Task Control ("ChatOps") (`Ctrl + K`)
- **Interactive AI Command Palette**: Press **`Ctrl + K`** anywhere to run natural language directives:
  - *"Show failed DAGs"* ➔ Filters dashboard table to FAILED status.
  - *"Trigger first_dag"* ➔ Opens trigger modal for target DAG.
  - *"Stop Second_Dag"* ➔ Cancels active execution run.
  - *"Diagnose first_dag"* ➔ Opens AI error analysis modal.
  - *"Find jsonplaceholder"* ➔ Searches DAG table instantly.

### 3. 📊 Executive Metrics & Auto-Refresh Caching Proxy
- **15-Second Cache Middleware (`/api/dashboard-summary`)**: Prevents API spamming or webserver crashes on Airflow instances during high-frequency polling.
- **Tab Visibility Awareness**: Polling automatically pauses when browser tab is hidden (`document.hidden`) and re-syncs on active focus.
- **Dynamic Trigger / Stop DAG Button**: Renders **Stop DAG** when running/queued, and **Trigger DAG** when idle.
- **Clickable Date Sorting & 1-Click Excel Export**: Sort DAGs by Last Run Date (ascending/descending) and export filtered table data directly to CSV.

---

## 🏗️ Architecture Overview

```
[ Frontend: React + Tailwind CSS ] 
        │
        │ HTTP GET /api/dashboard-summary (15s Auto-Refresh + Tab Aware)
        ▼
[ Backend Proxy: FastAPI ] ◄──► [ In-Memory Cache (15s TTL + asyncio.Lock) ]
        │                                 │
        │ (Batch Queries)                 │ (Log Stream Analysis)
        ▼                                 ▼
[ Apache Airflow 3.2 REST API ]    [ AI Engine: Google Gemini LLM ]
```

---

## 📁 Repository Structure

```
airflow-dashboard/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py           # Settings & Gemini API key config
│   │   ├── schemas.py          # Pydantic request/response models
│   │   ├── cache.py            # 15s TTL In-memory thread-safe cache
│   │   ├── ai_service.py       # Google Gemini LLM & precision log parser
│   │   ├── airflow_client.py   # Async HTTP client with batch calls & mock fallback
│   │   └── main.py             # FastAPI app endpoints & CORS middleware
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx             # Header, 15s timer countdown & ChatOps button
│   │   │   ├── KpiCards.jsx           # Summary metrics KPI card filters
│   │   │   ├── MetricsCharts.jsx      # State distribution donut & AI Insights
│   │   │   ├── DagFilters.jsx         # Search, status dropdown & Excel export
│   │   │   ├── DagTable.jsx           # Interactive table with AI Diagnose buttons
│   │   │   ├── TriggerModal.jsx       # Trigger DAG with conf/logical_date
│   │   │   ├── AiDiagnosisModal.jsx   # AI Error Analysis modal
│   │   │   ├── ChatOpsBar.jsx         # AI Command Palette (Ctrl+K)
│   │   │   └── ToastNotification.jsx  # Floating feedback toast
│   │   ├── hooks/
│   │   │   ├── useDashboardData.js    # 15s polling & Auto-refresh pause toggle
│   │   │   └── useTheme.js            # Dark/Light mode manager
│   │   ├── utils/
│   │   │   ├── formatters.js          # Relative time & status badge styles
│   │   │   └── exporter.js            # Excel CSV export utility
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── docker-compose.yaml
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup (FastAPI Proxy + AI Engine)

```bash
cd backend

# Create & activate Python virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Start FastAPI Proxy Server
uvicorn app.main:app --reload --port 8000
```
Backend will run at: `http://127.0.0.1:8000` (Swagger API Docs at `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start Vite Development Server
npm run dev
```
Frontend will run at: `http://localhost:5173`.

---

## 🔒 Environment Variables (`backend/.env`)

```env
AIRFLOW_BASE_URL=http://localhost:8080/api/v2
AIRFLOW_USER=airflow
AIRFLOW_PASSWORD=airflow
CACHE_TTL_SECONDS=15
USE_MOCK_FALLBACK=True
AIRFLOW_VERIFY_SSL=False

# Optional: Google Gemini LLM API Key for AI Diagnosis
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
