# NEXUS — AI Workforce Decision Engine

Production-grade AI workforce allocation system with LightGBM prediction, OR-Tools CP-SAT optimization, and structured explainability.

## Architecture

```
React Frontend (Vite + TypeScript + Tailwind)
    ↓ HTTP
FastAPI Backend (Python)
    ↓ ORM
PostgreSQL Database
    ↓
Feature Engineering Pipeline
    ↓
LightGBM Prediction (SLA success probability)
    ↓
OR-Tools CP-SAT (Global allocation optimizer)
    ↓
Structured Explanations (reason codes + human-readable)
    ↓
Frontend Dashboard (real-time impact visualization)
```

**Core Principle:**
- **LightGBM PREDICTS** employee-task outcome suitability
- **OR-Tools DECIDES** the final global allocation under constraints
- **NEXUS DYNAMICALLY ADAPTS** when workforce conditions change
- **The explanation layer EXPLAINS** why each assignment was selected

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, Recharts, Lucide React |
| Backend | Python 3.14, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | PostgreSQL 16 |
| ML | LightGBM 4.7 (binary classification) |
| Optimization | Google OR-Tools CP-SAT solver |
| Containerization | Docker Compose |

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Python 3.14+
- Node.js 18+

### 1. Start PostgreSQL
```bash
docker-compose up -d db
```

### 2. Start Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.ml.train ./models/lightgbm_model.pkl
python run.py
```

### 3. Start Frontend
```bash
npm install
npm run dev
```

### 4. Open Dashboard
Open http://localhost:5173 → Click "Enter live control center"

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/employees` | All employees with skills |
| `GET` | `/api/tasks` | All tasks with assignments |
| `GET` | `/api/dashboard` | Aggregated stats |
| `GET` | `/api/events` | Activity feed |
| `GET` | `/api/model/metrics` | ML model metrics |
| `GET` | `/api/optimization/history` | Past optimization runs |
| `POST` | `/api/events/employee-unavailable` | Trigger reallocation |
| `POST` | `/api/events/new-task` | Create critical task |
| `POST` | `/api/reset` | Reset to seed state |

## ML Model

**Target:** Predict probability of SLA success for any employee-task pair.

**Features (8):**
| Feature | Description | Importance |
|---|---|---|
| skill_match | % of required skills matched | Highest |
| workload_at_assignment | Employee workload (0-1) | High |
| employee_sla_success | Historical SLA success rate | Medium |
| task_type_encoded | Task type (label encoded) | Medium |
| sla_hours | SLA deadline in hours | Medium |
| estimated_effort | Estimated effort in hours | Low |
| location_match | Same location (0/1) | Low |
| complexity_encoded | Task complexity (0/1/2) | Low |

**Retrain:** `python -m app.ml.train ./models/lightgbm_model.pkl`

## Optimization

**Decision variable:** x[e,t] = 1 if employee e assigned to task t

**Hard constraints:**
- Employee must be available
- Employee must have required skills
- Employee cannot exceed 3 concurrent tasks
- Each task assigned to exactly 1 employee

**Soft objectives (weighted):**
| Objective | Weight |
|---|---|
| ML prediction score | 30% |
| Skill match | 20% |
| Task urgency | 15% |
| Workload balance | 10% |
| SLA risk | 10% |
| Location match | 5% |
| Historical performance | 5% |
| Reassignment penalty | 5% |

## Demo Sequence

1. Dashboard loads with 10 engineers and 20 tasks from PostgreSQL
2. Click **"Simulate Event"** → **"Engineer Unavailable"** → Pick a busy engineer
3. Watch: DETECT → OPTIMIZE → COMPLETE with real backend results
4. See **Impact Analysis**: SLA risk, utilization, overload before/after
5. See **Explanations**: Why this engineer was selected (ML score, skill match, reason codes)
6. Click **"+ New Critical Task"** → Backend creates task, LightGBM predicts, OR-Tools allocates
7. Click **"Reset Simulation"** → Database restored to seed state

## Running Tests

### Backend (55 tests)
```bash
cd backend
. .venv/bin/activate
python -m pytest tests/ -v
```

### Frontend
```bash
npx tsc -b          # TypeScript
npm run lint        # Linting
npm run build       # Production build
```

## Project Structure

```
nexus-frontend-prototype/
├── docker-compose.yml              # PostgreSQL container
├── index.html
├── package.json
├── vite.config.ts                  # /api proxy to localhost:8000
├── src/
│   ├── App.tsx                     # Root component + state management
│   ├── types.ts                    # TypeScript interfaces
│   ├── engine.ts                   # Baseline heuristic engine (preserved)
│   ├── mockData.ts                 # Fallback mock data
│   ├── ui.ts                       # UI helpers
│   ├── services/api.ts             # Typed API service layer
│   └── components/                 # 12 UI components
│       ├── Landing.tsx
│       ├── Header.tsx
│       ├── StatsBar.tsx
│       ├── HeroActions.tsx
│       ├── TaskTable.tsx
│       ├── ChartsRow.tsx
│       ├── DecisionPanel.tsx
│       ├── ActivityFeed.tsx
│       ├── SimulateModal.tsx
│       ├── ReallocationOverlay.tsx
│       ├── EmployeeDrawer.tsx
│       └── TaskDrawer.tsx
├── backend/
│   ├── run.py                      # Entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env                        # DATABASE_URL, MODEL_PATH
│   ├── app/
│   │   ├── main.py                 # FastAPI app + lifespan
│   │   ├── config.py               # Settings from env vars
│   │   ├── database.py             # SQLAlchemy engine + session
│   │   ├── models/models.py        # 10 ORM models
│   │   ├── schemas/api.py          # Pydantic response schemas
│   │   ├── routes/employees.py     # All API endpoints
│   │   ├── services/engine.py      # Event processing + optimization
│   │   ├── optimization/solver.py  # OR-Tools CP-SAT solver
│   │   ├── ml/
│   │   │   ├── features.py         # Feature engineering
│   │   │   ├── train.py            # LightGBM training
│   │   │   └── predict.py          # Inference + fallback
│   │   ├── explanation/explainer.py # Structured explanations
│   │   └── db/seed.py              # Database seeding
│   ├── tests/                      # 55 tests
│   │   ├── test_engine.py          # Seed + utility tests
│   │   ├── test_models.py          # ORM model tests
│   │   ├── test_routes.py          # API endpoint tests
│   │   ├── test_ml.py              # ML inference tests
│   │   ├── test_optimization.py    # OR-Tools solver tests
│   │   └── test_explanation.py     # Explainability tests
│   └── models/
│       └── lightgbm_model.pkl      # Trained model artifact
```

## Database Schema

10 tables: employees, skills, employee_skills, tasks, task_required_skills, historical_assignments, allocations, events, optimization_runs, (indexes)

## Environment Variables

```bash
DATABASE_URL=postgresql+psycopg://nexus:nexus_dev@localhost:5432/nexus
MODEL_PATH=./models/lightgbm_model.pkl
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:5173
```
