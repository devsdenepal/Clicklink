# Clicklink

Clicklink is a full-stack ClickUp + GitHub collaboration dashboard. It connects a ClickUp workspace to GitHub, letting teams manage tasks, mirror GitHub issues into ClickUp subtasks, track GitHub statistics per repo, and keep an activity log — all from a single React interface backed by a Node.js/Express API.

## Features

- **ClickUp OAuth login** — sign in with your ClickUp account (state-validated, JWT-signed session).
- **GitHub API integration** — browse repos, sync issues into ClickUp as subtasks, and view stats.
- **Task management** — create/edit ClickUp tasks and subtasks, view task timelines.
- **Team membership enforcement** — restrict workspace actions to members of the team.
- **Analytics** — repo commit charts, contributors list, stats cards, and a waterfall timeline.
- **Activity log** — records task and sync actions per user.

## Tech Stack

| Layer     | Tech                                                        |
| --------- | ----------------------------------------------------------- |
| Frontend  | React 19, Vite, React Router, Framer Motion, Recharts, Bootstrap, Socket.IO |
| Backend   | Node.js, Express, JWT, Mongoose (MongoDB), Redis (optional) |
| APIs      | ClickUp API v2, GitHub REST API                             |

## Repository Layout

```
Clicklink
├── backend/     # Express API (auth, tasks, members, github, activity)
│   └── .env.example
├── frontend/    # React SPA (Vite)
│   └── README.md
└── setup-*.ps1  # Helper scripts (Redis setup, dev startup)
```

## Getting Started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in your values (see below)
npm run dev            # starts on http://localhost:5000
```

#### Required environment variables

| Variable                | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `CLICKUP_CLIENT_ID`     | ClickUp OAuth app client ID                    |
| `CLICKUP_CLIENT_SECRET` | ClickUp OAuth app client secret                |
| `REDIRECT_URI`          | e.g. `http://localhost:5000/auth/callback`     |
| `FRONTEND_URL`          | e.g. `http://localhost:5173`                   |
| `JWT_SECRET`            | Secret used to sign session JWTs               |
| `CLICKUP_LIST_ID`       | Default ClickUp list ID                        |
| `GITHUB_TOKEN`          | GitHub personal access token                   |
| `MONGO_URI`             | MongoDB connection string (optional at runtime)|
| `PORT`                  | Backend port (default 5000)                    |

See `backend/.env.example` for the full list.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # starts on http://localhost:5173
```

Point the frontend at the backend by setting `VITE_BACKEND_URL` (defaults to `http://localhost:5000`):

```bash
# optional, when backend is hosted elsewhere
echo "VITE_BACKEND_URL=https://your-backend.example.com" > .env
```

### 3. Open

Visit `http://localhost:5173`, click **Login with ClickUp**, authorize, and you'll land on the dashboard.

## Running Scripts

- `start-dev.ps1` — boots backend + frontend for local development (Windows/PowerShell).
- `setup-redis.ps1` / `setup-portable-redis.ps1` — optional local Redis setup for session store.

## Deploying

This project ships with Vercel configs for both halves:

- `backend/vercel.json` — API as a Vercel serverless/lambda build.
- `frontend/vercel.json` — static SPA hosting.

Set the environment variables above in your Vercel project settings and build both directories.

## Security

- OAuth state is validated before token exchange (disable only with `ALLOW_OAUTH_FALLBACK=true` for development).
- JWTs expire after 7 days; GitHub-only and ClickUp-only tokens are handled distinctly.
- Do not commit real `.env` files; keep tokens server-side only.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

**Contributions welcome!**