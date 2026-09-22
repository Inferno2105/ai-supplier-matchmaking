# Supplynk — AI-Powered Client–Supplier Matchmaking Platform

A web platform that connects clients with suitable suppliers using a genuine
AI/ML matching engine — semantic embeddings plus a weighted, explainable
scoring model, not keyword matching. Beyond automatic matching, either side
can also browse the full marketplace, express interest directly in a
specific counterpart independent of the scoring engine, and message the
other party once an interest is accepted.

Built for the Wisdom Group AI Intern evaluation.

## Contents

- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [AI matching approach](#ai-matching-approach)
- [UI](#ui)
- [Setup instructions](#setup-instructions)
- [Upgrading an existing database](#upgrading-an-existing-database)
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

Matching runs **automatically** on every new client or supplier submission,
and again on every edit — there is no manual "find matches" button. See
`Matchmaking_Platform_Reference.docx` (the project's full planning document)
for diagrams of the data model and the exact submission → matching →
notification sequence.

Company/supplier identity (`company_name` / `supplier_name`) lives on the
**User** account, not on individual listings — a user registers once with
their business name and every requirement/offering they submit displays it
denormalized from that one record. See
[Upgrading an existing database](#upgrading-an-existing-database) if you're
migrating data seeded before this change.

## Technology stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast to build forms + a data-dense dashboard |
| Icons | lucide-react | Consistent icon set across the sidebar, stat cards, and table actions |
| Backend | FastAPI (Python) | One language for CRUD and AI matching logic — no cross-service calls to a separate matching service |
| Database | MongoDB | Flexible schema, fits the evolving field set of client/supplier profiles |
| Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) | Local, free, no API cost or latency — genuine semantic AI without training a model from scratch |
| Auth | JWT (email + password, bcrypt-hashed) | Simple, stateless, easy to extend |
| Rate limiting | slowapi (in-memory, IP-keyed) | Basic abuse protection on login and interest creation without a separate infra dependency |
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

On every new submission (and every edit):

1. **Filter by fixed category** (hard filter — client and supplier categories
   must match exactly; categories are a fixed dropdown, not free text, so
   there's no label-mismatch ambiguity to resolve). Withdrawn listings
   (`is_active: false`) are excluded from this step entirely.
2. **Score every same-category, active pair** on five weighted sub-factors.
3. **Combine into one weighted total** (0–100).
4. **Store the full breakdown** (not just the total) so the dashboard can
   show *why* a match scored what it did. Editing a listing re-runs this
   step and overwrites the existing Match record for each pair (keyed on
   client_id + supplier_id) rather than creating a duplicate.
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

Navigation is a collapsible left sidebar, fixed to the viewport regardless
of how long the page content scrolls (the app shell uses a fixed-height,
`overflow-hidden` outer wrapper with `<main>` as the only scrolling
region — the sidebar and its logo/account block never move) — Dashboard,
Browse Marketplace, New Requirement/Offering, Past Interest, Chats, and
Settings, with the notification bell and account info pinned to the
bottom. The dashboard overview renders as individual stat cards (icon +
number, no fabricated trend charts — there's no time-series backend
endpoint behind these numbers, so no sparkline was added rather than
faking one), a "Your requirements/offerings" list with per-item
Edit/Withdraw actions (or a single Reactivate action once withdrawn), a
ranked-matches column, and a Recent Activity feed merging notifications,
interest updates, and new matches. The marketplace and Past Interest pages
are dense, sortable-by-eye tables with initial-avatar circles, colored icon
action buttons, and centered icon+message empty states, consistent across
both client and supplier roles. Clicking any counterpart's name — on a
match card, a marketplace row, or a Past Interest row — opens a right-side
detail slide-over with that client/supplier's full profile, including a
"Withdrawn" badge if that listing has since been withdrawn (closes on
Escape, backdrop click, or the close button). Past Interest has a chat
action on any `accepted` interest — "Start Chat" if no messages have been
exchanged yet, "Open Chat" once they have — opening a slide-over message
panel that polls for new messages every 12 seconds while open. Every
interest with at least one message also shows up on the dedicated **Chats**
page, so ongoing conversations don't get lost in the full interest history.

**Role-based accent color**: the logged-in user's role is now visually
obvious everywhere, not just inferable from "Your requirements/offerings"
— a client's UI accents in a sage/green pastel, a supplier's in a
peach/pink pastel, each a fixed 4-tier palette (darkest/mid/soft/lightest).
Applied to the sidebar's active nav item, the role badge next to the
account email (and on the Settings profile section), primary action
buttons (Submit requirement/offering, Express Interest, Save in Settings,
Send in chat, New requirement/offering), and a colored left-border accent
on the Dashboard's own-listing cards, Match cards, and Past Interest/Chats
rows. `ScoreBadge` (match quality) and `InterestStatusBadge` (interest
status) deliberately keep their own independent emerald/lime/amber/rose
coding, untouched by role.

The palette is wired in as CSS custom properties (`--role-darkest`,
`--role-mid`, etc.), scoped by a `data-role` attribute the app shell sets
once on its root element, rather than picked per-component in Tailwind
classes — so the actual color values live in exactly one place
(`frontend/src/roleTheme.js` + the `[data-role]` block in
`frontend/src/index.css`) and every component just references
`var(--role-button-bg)` and the like. Because these are pastel tiers, raw
`mid`-as-button-background (white text) was checked against WCAG contrast
math and rejected for both roles (1.8–2.1:1, unreadable) in favor of
`darkest`-as-button-background (3.8:1 client / 8.9:1 supplier) — and a
second, independent check for dark mode found supplier's `darkest`
(a plain gray) nearly invisible against the app's dark surfaces, so
dark-mode text/icon accents (not buttons, which are unaffected by page
background) swap to `mid` instead, with a low-opacity `color-mix()` tint
standing in for the light-mode `lightest` background so it doesn't wash
out on a dark sidebar. The full contrast numbers and reasoning are
documented in `roleTheme.js`.

Dark mode is available from Settings → Appearance (a toggle, not a
separate page), persisted to `localStorage` and applied before first paint
so there's no flash of the wrong theme on reload. Outside of the role
accent above, it reuses the same semantic colors (slate/emerald/amber/rose)
throughout, just with `dark:` variants — no separate dark palette.

Loosening `GET /clients/{id}` and `GET /suppliers/{id}` from owner-only to
any authenticated user (to support the detail slide-over) only removes an
inconsistency, since the marketplace endpoints already expose the same
fields to any authenticated user.

## Setup instructions

Verified end-to-end on Windows: full stack built and ran via Docker,
sample data seeded against a real MongoDB instance, and the app driven
through a real browser (login, dashboard, ranked matches, notifications)
for both a client and a supplier account — see
[Known limitations](#known-limitations--future-work) for anything not
covered.

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
fail to reach the daemon otherwise. A change to `backend/requirements.txt`
forces a slower rebuild of the pip-install layer on the next
`docker compose up --build`.

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

### Seeding sample data

With the backend running against a real MongoDB instance (or the Docker
containers already up — run it inside the backend container with `docker
exec <backend-container-name> python seed.py`):

```bash
cd backend
python seed.py
```

Creates 9 clients and 11 suppliers across 9 categories, each with a full
User profile (full name, phone number, and company/supplier name) —
including a strong match, a deliberately poor match (mismatched
price/location), a partial-stock match, a client with zero suppliers in
its category, and a supplier with zero clients in its category, so every
dashboard state is reachable for testing and review. Runs the matching
engine and prints the sample accounts' login credentials (all seeded
accounts use password `demo12345`). Safe to re-run — it clears only these
exact seeded accounts
first.

### Running backend tests

```bash
cd backend
python test_pipeline.py                  # matching engine logic, in-memory mock DB
python test_server_boot.py               # full HTTP API surface, in-memory mock DB
python test_interests_marketplace.py     # Interest rules + marketplace browsing, in-memory mock DB
python test_withdraw_edit.py             # withdraw/edit/reactivate + re-matching, in-memory mock DB
python test_activity_messaging.py        # activity feed + messaging + has_messages/has_chat, in-memory mock DB
python test_rate_limiting.py             # login/interest rate limits, in-memory mock DB
python test_settings_profile.py          # registration validation + Settings routes, in-memory mock DB
```

All use `mongomock-motor` so they run without a real MongoDB instance —
useful for quick verification, not a substitute for testing against real
Mongo before submission.

## Upgrading an existing database

If your MongoDB already has Client/Supplier documents seeded from before
`company_name`/`supplier_name` moved onto the User model, run the
one-off migration once, after upgrading the code and before using the app:

```bash
cd backend
python migrate_user_profile_fields.py
```

It copies each listing's `company_name`/`supplier_name` onto its owning
User document (only if that User doesn't already have one set), and is
safe to re-run. It does **not** run automatically on app startup, and it
does **not** backfill `full_name`/`phone_number` for pre-existing accounts
(there's no historical source for those) — affected accounts should fill
those in from Settings after upgrading. It also does not delete the
now-unused key from the listing documents themselves; that's harmless —
the Client/Supplier models no longer read it.

## API reference

Full interactive docs at `/docs` once the backend is running (FastAPI
auto-generates this from the route definitions). Summary:

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create a user (email, password, role, full_name, phone_number, and `company_name` for a client or `supplier_name` for a supplier — the field matching your role is required, the other is rejected if sent) |
| POST | `/auth/login` | Get a JWT (rate-limited: 10/minute per IP) |
| GET | `/auth/me` | Current user's full profile |
| GET | `/settings/profile` | Same as `/auth/me`, under the Settings namespace |
| PATCH | `/settings/profile` | Update full_name, phone_number, and company_name/supplier_name (whichever matches your role). Email and role are not editable here |
| PATCH | `/settings/password` | Change password — requires `current_password` to match, 401 otherwise |
| POST | `/clients` | Submit a requirement — auto-triggers matching |
| GET | `/clients/me` | Current client's own requirements |
| GET | `/clients/{id}` | One requirement (any authenticated user) |
| PATCH | `/clients/{id}` | Edit a requirement (owner only) — re-triggers matching; rejected with 400 if withdrawn |
| PATCH | `/clients/{id}/withdraw` | Owner only — hides it from marketplace/future matching; existing matches/interests untouched |
| PATCH | `/clients/{id}/reactivate` | Owner only — undoes a withdrawal; does not re-trigger matching |
| POST | `/suppliers` | Submit an offering — auto-triggers matching |
| GET | `/suppliers/me` | Current supplier's own offerings |
| GET | `/suppliers/{id}` | One offering (any authenticated user) |
| PATCH | `/suppliers/{id}` | Edit an offering (owner only) — mirrors `/clients/{id}` |
| PATCH | `/suppliers/{id}/withdraw` | Mirrors `/clients/{id}/withdraw` |
| PATCH | `/suppliers/{id}/reactivate` | Mirrors `/clients/{id}/reactivate` |
| GET | `/matches/client/{client_id}` | Ranked supplier matches, with score breakdown and counterpart withdrawn-status |
| GET | `/matches/supplier/{supplier_id}` | Ranked client matches, with score breakdown and counterpart withdrawn-status |
| GET | `/notifications/me` | Current user's notifications |
| PATCH | `/notifications/{id}/read` | Mark a notification read |
| GET | `/dashboard/overview` | Aggregate stats (totals, average score) |
| GET | `/categories` | Fixed category dropdown list |
| GET | `/locations` | State → city dropdown data |
| GET | `/marketplace/suppliers?category=&state=&search=` | Client-facing: every active supplier offering, not just same-category matches, with `already_interested` per item. `search` matches supplier name or product offered |
| GET | `/marketplace/clients?category=&state=&search=` | Supplier-facing mirror of the above, searching company name / product requirement |
| POST | `/interests` | Express interest in a specific client/supplier pair — does **not** touch the matching/embedding engine (rate-limited: 20/minute per IP) |
| GET | `/interests/me?has_chat=` | Current user's Interest records (both sides), newest first. Each includes `has_messages` (a batched existence check against the Message collection, not a stored field). Optional `has_chat=true/false` filters to interests with/without at least one message — powers the Chats page |
| PATCH | `/interests/{id}/accept` | Only the non-initiating side; `proposed` → `accepted` |
| PATCH | `/interests/{id}/decline` | Only the non-initiating side; `proposed` → `declined` |
| POST | `/interests/{id}/messages` | Send a text message — only the two parties, only once `accepted` |
| GET | `/interests/{id}/messages` | List messages for an interest, oldest first — same authorization as above |
| GET | `/activity/me` | Merged, newest-first feed (capped at 30) of the current user's notifications, interest status changes, and new matches |

No separate admin role — see [Known limitations](#known-limitations--future-work).

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
Editing or withdrawing the underlying listing never touches an existing
Interest record — only Match records get refreshed by an edit.

### Withdraw vs. delete

There is no delete endpoint for a listing — withdrawing (`is_active: false`)
is the only removal path. A withdrawn listing disappears from marketplace
browsing and is skipped by future matching runs, but any Match or Interest
record that already referenced it is left exactly as-is, just annotated
with `counterpart_is_active: false` so the other party can see it's no
longer live. Reactivating undoes the withdrawal but does **not** re-run
matching on its own — edit the listing (even with no field changes) to
refresh its match scores after reactivating.

## Project structure

```
matchmaking-platform/
├── backend/
│   ├── app/
│   │   ├── core/          # config, MongoDB connection, JWT/auth, shared rate limiter
│   │   ├── data/          # fixed categories, state/city lookup
│   │   ├── models/        # Pydantic schemas (User, Client, Supplier, Match, Notification,
│   │   │                  # Interest, Message, Marketplace)
│   │   ├── routes/        # FastAPI routers, one per resource (incl. interests, marketplace,
│   │   │                  # activity, messages, settings)
│   │   ├── services/      # embeddings, sub-scoring, matching orchestration, profiles
│   │   │                  # (resolves company_name/supplier_name from the owning User)
│   │   └── main.py        # app entrypoint, router wiring, CORS, rate-limit exception handler
│   ├── seed.py                          # sample data seeding script
│   ├── migrate_user_profile_fields.py   # one-off migration, see "Upgrading an existing database"
│   ├── test_pipeline.py                 # matching engine regression test
│   ├── test_server_boot.py              # full API surface regression test
│   ├── test_interests_marketplace.py    # Interest rules + marketplace browsing regression test
│   ├── test_withdraw_edit.py            # withdraw/edit/reactivate regression test
│   ├── test_activity_messaging.py       # activity feed + messaging regression test
│   ├── test_rate_limiting.py            # rate limit regression test
│   ├── test_settings_profile.py         # registration validation + Settings regression test
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/            # axios client + typed API calls
│   │   ├── components/     # Sidebar, StatCard, EmptyState, InitialAvatar, DetailSlideOver,
│   │   │                   # ScoreBadge, ScoreBreakdown, MatchCard, InterestStatusBadge,
│   │   │                   # WithdrawnBadge, ChatPanel, NotificationPanel, etc.
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # Login, Register, Dashboard, Settings, Client/Supplier forms
│   │   │                    # (create + edit), Marketplace (dense table), Past Interest
│   │   │                    # (dense table + chat), Chats (every interest with >=1 message)
│   │   ├── theme.js          # dark-mode read/apply helpers, used by Settings and index.html's
│   │   │                     # pre-paint script
│   │   ├── roleTheme.js       # client (sage) vs. supplier (peach) pastel palette + contrast
│   │   │                      # math — see the UI section above and index.css's [data-role] block
│   │   ├── utils/timeAgo.js  # relative-timestamp helper for the Recent Activity feed
│   │   └── App.jsx           # routing + fixed-height sidebar/main-content shell layout
│   │                         # (main is the ONLY scrolling region — see the UI section above)
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

## Known limitations / future work

- **No delete endpoint for listings**, by design — withdraw (soft-delete via
  `is_active`) is the only removal path, so existing Match/Interest history
  referencing a listing is never silently invalidated. See
  [Withdraw vs. delete](#withdraw-vs-delete).
- **No separate admin role.** Dashboards are role-scoped (each user sees only
  their own data) rather than adding a third role with no clear brief-backed
  use case. `GET /dashboard/overview` gives system-wide visibility without
  the engineering cost of a full admin system.
- **Notifications and messaging are in-app only, polling-based.** No SMTP
  email and no WebSocket/SSE push — the notification bell and chat panel
  both poll on a short interval instead. Simpler to run and deploy, at the
  cost of a few seconds of latency versus true real-time.
- **Chat is text-only.** No read receipts, typing indicators, attachments,
  or message editing/deletion — keeps the messaging surface focused on the
  core matchmaking conversation instead of building out a full chat product.
- **Rate limiting is in-memory and per-process**, not backed by Redis —
  fine for a single-instance deployment (including the Docker setup here),
  would need a shared store behind a load balancer.
- **Migrating full_name/phone_number for pre-existing accounts is manual.**
  The migration script backfills company/supplier name from old listings,
  but has no historical source for full_name/phone_number — those show as
  empty until the affected user fills them in from Settings.
- **Location matching uses a static ~30–40 city lookup**, not live
  geocoding — covers the major Indian business hubs this platform targets;
  broader coverage would need a proper geocoding API or a fuller dataset.
