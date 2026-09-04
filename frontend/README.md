# Clicklink Frontend

Clicklink SPA built with **React 19 + Vite**.

## Features

- ClickUp OAuth login flow with token handling
- Dashboard, Tasks, Task Detail, Profile, Settings, Activity pages
- GitHub Stats view: commit charts, contributors, repo tabs
- Animated transitions (Framer Motion), styled with Bootstrap

## Development

```bash
npm install
npm run dev            # http://localhost:5173
```

## Configuration

The API base URL is read from `VITE_BACKEND_URL` (defaults to `http://localhost:5000`):

```bash
echo "VITE_BACKEND_URL=http://localhost:5000" > .env      # local
echo "VITE_BACKEND_URL=https://your-api.example.com" > .env # deployed
```

## Scripts

| Script       | Purpose                    |
| ------------ | -------------------------- |
| `npm run dev`    | Start Vite dev server  |
| `npm run build`  | Production build       |
| `npm run preview`| Preview the build      |
| `npm run lint`   | ESLint checks          |

## Deploy

`vercel.json` is preconfigured for static SPA hosting. Build output is `dist/`.