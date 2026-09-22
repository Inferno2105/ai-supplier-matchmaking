# AI-Powered Client–Supplier Matchmaking Platform

A web platform that connects clients with suitable suppliers using a genuine
AI/ML matching engine — semantic embeddings plus a weighted, explainable
scoring model, not keyword matching. Beyond automatic matching, either side
can also browse the full marketplace and express interest directly in a
specific counterpart, independent of the scoring engine.

Built for the Wisdom Group AI Intern evaluation.

## Contents

- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [AI matching approach](#ai-matching-approach)
- [UI](#ui)
- [Setup instructions](#setup-instructions)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Known limitations / future work](#known-limitations--future-work)

## Architecture

```
React frontend  --REST + JWT-->  FastAPI backend
                                       |
                    +------------------+------------------+
                    |                  |                  |
                 MongoDB        Matching engine     Notifications
                                (embeddings +         (in-app)
                                 scoring)
                                       |
                              sentence-transformers
                              (local embedding model)
```

The frontend talks to the backend over REST with JWT auth. The backend
fans out to MongoDB for storage, the matching engine for scoring, and the
notification service. The matching engine calls a local sentence-transformers
model for semantic similarity, reads/writes match records in MongoDB, and
triggers notifications once a match clears the score threshold.

Matching runs **automatically** on every new client or supplier submission —
there is no manual "find matches" button. See `Matchmaking_Platform_Reference.docx`
(the project's full planning document) for diagrams of the data model and
the exact submission → matching → notification sequence.

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast to build forms + a data-dense dashboard |
| Icons | lucide-react | Consistent icon set across the sidebar, stat cards, and table actions |
| Backend | FastAPI (Python) | One language for CRUD and AI matching logic — no cross-service calls to a separate matching service |
| Database | MongoDB | Flexible schema, fits the evolving field set of client/supplier profiles |
| Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) | Local, free, no API cost or latency — genuine semantic AI without training a model from scratch |
| Auth | JWT (email + password, bcrypt-hashed) | Simple, stateless, easy to extend |
| Containerization | Docker + docker-compose | One-command setup for any evaluator, no local Python/Node/Mongo install needed |

OpenAI/Claude-style LLM API calls were deliberately **not** used for the
matching engine — local embeddings are simpler, free, avoid API
cost/latency, and are equally legitimate as "AI/ML" for this evaluation.

## AI matching approach

### Why embeddings, not keyword matching

Each client requirement (`product_requirement + category + notes`) and each
supplier offering (`product_offered + category + notes`) is embedded using
`sentence-transformers` (`all-MiniLM-L6-v2`). Cosine similarity between the
two embeddings gives a genuine **semantic** match score — this is what makes
the system AI/ML-based rather than simple string/keyword matching. Two
listings that describe the same product with entirely different wording
("steel pipes" vs. "industrial piping") still score highly.

### Pipeline

On every new submission:

1. **Filter by fixed category** (hard filter — client and supplier categories
   must match exactly; categories are a fixed dropdown, not free text, so
   there's no label-mismatch ambiguity to resolve).
2. **Score every same-category pair** on five weighted sub-factors.
3. **Combine into one weighted total** (0–100).
4. **Store the full breakdown** (not just the total) so the dashboard can
   show *why* a match scored what it did.
5. **Notify both sides** if the score clears the threshold (default 60%).

### Scoring weights

| Factor | Weight | How it's computed |
|---|---|---|
| Semantic similarity | 35% | Cosine similarity between client and supplier text embeddings |
| Price fit | 25% | Overlap between client budget range and supplier price range |
| Location | 20% | 3-tier: same city = 100, same state = 60, different state = 20 |
| Delivery timeline | 12% | Client days-needed vs. supplier days-capable |
| Quantity fit | 8% | Soft ratio `min(supplier_qty / client_qty, 1.0)` — never a hard exclusion |

Weights reflect the priority order semantic → price → location → timeline →
quantity, and are configurable via environment variables (see
`backend/app/core/config.py`) — tune them once real scores are visible on
real data.

Quantity is **soft-scored**, not a hard filter: a supplier with only partial
stock still appears as a match (ranked lower, with a "Partial stock" badge)
rather than being excluded outright, which mirrors real procurement where
partial fulfillment or negotiation is common.

### Score display

Every match shows a 0–100 total score with a label (Excellent 80+, Good
60–79, Fair 40–59, Poor <40, color-coded), plus an expandable "Why this
match?" breakdown showing all five sub-scores as progress bars. This keeps
the matching engine explainable rather than a black box.

## UI

Navigation is a collapsible left sidebar (icon-only when collapsed, with
hover tooltips), not a top navbar — Dashboard, Browse Marketplace, New
Requirement/Offering, and Past Interest, with the notification bell and
account info pinned to the bottom. The dashboard overview renders as
individual stat cards (icon + number, no fabricated trend charts — there's
no time-series backend endpoint behind these numbers, so no sparkline was
added rather than faking one). The marketplace and Past Interest pages are
dense, sortable-by-eye tables with initial-avatar circles, colored icon
action buttons, and centered icon+message empty states, consistent across
both client and supplier roles.

## Setup instructions

Verified end-to-end on Windows: full stack built and ran via Docker, demo
data seeded against a real MongoDB instance, and the app driven through a
real browser (login, dashboard, ranked matches, notifications) for both a
client and a supplier account — see [Known limitations](#known-limitations--future-work)
for anything not covered.

### Option A — Docker (recommended, one command)

```bash
docker compose up --build
```

(`docker-compose` with a hyphen also works on older Docker installs.)

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- MongoDB: localhost:27017 (persisted in a named volume)

First backend build downloads the embedding model (~90 MB) inside the
container on first run — subsequent runs use the cached layer. If Docker
Desktop isn't already running, start it first — `docker compose up` will
fail to reach the daemon otherwise.

### Option B — Manual setup

**Backend:**

Use **Python 3.10–3.12**. This project's pinned `numpy`/`sentence-transformers`
versions don't have prebuilt wheels for Python 3.13+ yet, so `pip install`
will try to compile from source and fail without a C compiler. If `python
--version` on your machine reports 3.13 or newer, install 3.12 alongside it
(e.g. via [python.org](https://www.python.org/downloads/) or `py -0p` on
Windows to list installed versions) and point the venv at that instead.

```bash
cd backend
python -m venv venv             # use a 3.10-3.12 interpreter, see note above
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit JWT_SECRET at minimum
# Requires a running MongoDB instance — either local, Docker, or a free Atlas cluster.
# Update MONGO_URI in .env if not running on localhost:27017.
uvicorn app.main:app --reload --port 8000
```

First run downloads the `all-MiniLM-L6-v2` embedding model automatically
(requires internet access once; cached locally afterwards).

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173. The Vite dev server proxies `/api/*` to
`http://localhost:8000` — see `frontend/vite.config.js`.

### Seeding demo data

With the backend running against a real MongoDB instance (or the Docker
containers already up — run it inside the backend container with `docker
exec <backend-container-name> python seed.py`):

```bash
cd backend
python seed.py
```

Creates 9 clients and 11 suppliers across 9 categories — including a
strong match, a deliberately poor match (mismatched price/location), a
partial-stock match, a client with zero suppliers in its category, and a
supplier with zero clients in its category, so every dashboard state is
reachable in the demo. Runs the matching engine and prints demo login
credentials (all seeded accounts use password `demo12345`). Safe to re-run —
it clears only these exact seeded accounts first.

### Running backend tests

```bash
cd backend
python test_pipeline.py                  # matching engine logic, in-memory mock DB
python test_server_boot.py               # full HTTP API surface, in-memory mock DB
python test_interests_marketplace.py     # Interest rules + marketplace browsing, in-memory mock DB
```

Both use `mongomock-motor` so they run without a real MongoDB instance —
useful for quick verification, not a substitute for testing against real
Mongo before submission.

## API reference

Full interactive docs at `/docs` once the backend is running (FastAPI
auto-generates this from the route definitions). Summary:

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create a user (client or supplier) |
| POST | `/auth/login` | Get a JWT |
| GET | `/auth/me` | Current user info |
| POST | `/clients` | Submit a requirement — auto-triggers matching |
| GET | `/clients/me` | Current client's own requirements |
| GET | `/clients/{id}` | One requirement |
| POST | `/suppliers` | Submit an offering — auto-triggers matching |
| GET | `/suppliers/me` | Current supplier's own offerings |
| GET | `/suppliers/{id}` | One offering |
| GET | `/matches/client/{client_id}` | Ranked supplier matches, with score breakdown |
| GET | `/matches/supplier/{supplier_id}` | Ranked client matches, with score breakdown |
| GET | `/notifications/me` | Current user's notifications |
| PATCH | `/notifications/{id}/read` | Mark a notification read |
| GET | `/dashboard/overview` | Aggregate stats (totals, average score) |
| GET | `/categories` | Fixed category dropdown list |
| GET | `/locations` | State → city dropdown data |
| GET | `/marketplace/suppliers?category=&state=&search=` | Client-facing: every supplier offering, not just same-category matches, with `already_interested` per item. `search` is a case-insensitive substring match on supplier name or product offered |
| GET | `/marketplace/clients?category=&state=&search=` | Supplier-facing mirror of the above, searching company name / product requirement |
| POST | `/interests` | Express interest in a specific client/supplier pair — does **not** touch the matching/embedding engine |
| GET | `/interests/me` | Current user's Interest records (both sides), newest first |
| PATCH | `/interests/{id}/accept` | Only the non-initiating side; `proposed` → `accepted` |
| PATCH | `/interests/{id}/decline` | Only the non-initiating side; `proposed` → `declined` |

No edit/update endpoints and no separate admin role — see
[Known limitations](#known-limitations--future-work).

### Interest vs. Match

`Interest` is a separate concept from `Match` and deliberately decoupled
from the scoring engine: expressing interest is a plain record write, never
a trigger for re-embedding or re-scoring. A `Match` between the same
client/supplier pair may or may not exist — the frontend looks it up
independently and shows the score as context, but `POST /interests` neither
requires nor creates one. Only `proposed → accepted / declined` exists;
there's no "completed" status, since this platform tracks matchmaking
interest, not deal fulfillment (payment, shipping, delivery). A declined
Interest blocks only the side that was declined from re-proposing to the
same counterpart — the side that declined is free to initiate a fresh one.

## Project structure

```
matchmaking-platform/
├── backend/
│   ├── app/
│   │   ├── core/          # config, MongoDB connection, JWT/auth
│   │   ├── data/          # fixed categories, state/city lookup
│   │   ├── models/        # Pydantic schemas (User, Client, Supplier, Match, Notification, Interest, Marketplace)
│   │   ├── routes/        # FastAPI routers, one per resource (incl. interests, marketplace)
│   │   ├── services/      # embeddings, sub-scoring, matching orchestration
│   │   └── main.py        # app entrypoint, router wiring, CORS
│   ├── seed.py                        # demo data seeding script
│   ├── test_pipeline.py               # matching engine regression test
│   ├── test_server_boot.py            # full API surface regression test
│   ├── test_interests_marketplace.py  # Interest rules + marketplace browsing regression test
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/            # axios client + typed API calls
│   │   ├── components/     # Sidebar, StatCard, EmptyState, InitialAvatar, ScoreBadge,
│   │   │                   # ScoreBreakdown, MatchCard, InterestStatusBadge, NotificationPanel, etc.
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # Login, Register, Dashboard, Client/Supplier forms,
│   │   │                    # Marketplace (dense table), Past Interest (dense table)
│   │   └── App.jsx          # routing + sidebar/main-content shell layout
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

## Known limitations / future work

Documented deliberately, not oversights — see the full reasoning in the
project's planning document (`Matchmaking_Platform_Reference.docx`, sections
7.4–7.6):

- **No edit endpoints.** Clients/suppliers can't edit a submission after
  posting. An edit should logically re-trigger matching, which opens real
  edge cases (stale match records, stale notifications) not required by the
  brief. A production version would re-trigger matching on edit and handle
  match invalidation explicitly.
- **No separate admin role.** Dashboards are role-scoped (each user sees only
  their own data) rather than adding a third role with no clear brief-backed
  use case. `GET /dashboard/overview` gives system-wide visibility without
  the engineering cost of a full admin system.
- **Notifications are in-app only.** No SMTP email or WebSocket push, to
  avoid setup overhead and deliverability flakiness. Both are natural
  next steps.
- **JWT auth is intentionally simple.** No refresh tokens, rate limiting, or
  HTTPS-only cookie storage yet — flagged as the first hardening pass for a
  production deployment.
- **Location matching uses a static ~30–40 city lookup**, not live
  geocoding — sufficient for a demo, would need a proper geocoding API or a
  fuller dataset for production coverage.
