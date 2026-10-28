<<<<<<< HEAD
# CloudKitchen

CloudKitchen is a FIT2095 Full-Stack Development coursework project for managing kitchen recipes and inventory. This portfolio copy keeps the Angular + Express + MongoDB scope while adding a repeatable demo workflow and safer defaults.

## Features

- Angular frontend with registration, login, guarded dashboard, recipe CRUD and inventory CRUD.
- Express/Mongoose backend with PBKDF2 password hashing, sessions, validation and role checks.
- Local recipe-health analysis that works without paid AI services; OpenAI is optional.
- Demo seed data for a predictable portfolio walkthrough.

## Run locally

Prerequisites: Node.js 20+, npm and MongoDB.

```sh
cp .env.example .env
npm install
npm run seed:demo
npm test
npm start
```

In another terminal:

```sh
cd cloudkitchen-frontend
npm install
npm start
```

Open `http://localhost:4200`. Demo login is `demo@cloudkitchen.local` with the password in `DEMO_PASSWORD` (default `DemoPass!23`). Set `OPENAI_API_KEY` only if you are authorised to use it; the local fallback remains available without it.

## Architecture

`app.js` starts the Express API. Routes, Mongoose models and middleware are in `routes/`, `models/` and `middleware/`. The Angular application is in `cloudkitchen-frontend/`; `utils/healthAnalyzer.js` provides the offline analysis path.

## Verification

- `npm test`: passed.
- Backend JavaScript syntax checks: passed.
- `npx tsc -p cloudkitchen-frontend/tsconfig.app.json --noEmit`: passed.
- Angular production bundling: attempted, but the local esbuild process aborts with a goroutine deadlock (exit 134); no successful production bundle is claimed.
- MongoDB-backed workflows and browser verification require a local MongoDB service and remain to be run.

## Security and publication

The portfolio copy excludes `.env`, dependencies and generated output. Sessions use HTTP-only same-site cookies and secure cookies in production. The default in-memory session store is suitable only for local demos. Public registration cannot self-assign the `admin` role. Before deployment, use a persistent session store, add rate limiting and CSRF protection, and move authentication state away from `localStorage`.

The original assignment may include starter code, university-specific requirements, images and audio. Confirm publication and asset permissions before making this repository public. No licence is included because ownership has not been confirmed.

## Preparation changes

- Added `.env.example`, a correct root `.gitignore`, CI configuration and a focused local-analysis test.
- Added synthetic demo seeding, `/api/health`, request-size limits and JSON API errors.
- Protected inventory mutations and prevented public admin self-registration.
- Preserved the original project folder and Git history outside this cleaned copy.
=======
# cloudkitchen
>>>>>>> 6b8fe5654a75b542d204704eec7ef4135817607a
