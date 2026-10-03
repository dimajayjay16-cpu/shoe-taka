# Shoe-Taka — Frontend Only

This folder contains the React + Vite frontend. The separate Node.js/Express `backend/` folder has been removed.

**Important:** This version still uses Firebase for authentication, products, and orders. Firebase is a hosted backend service. This is therefore frontend-only with no separate Node.js server; it is not an offline-only/static mock version.

## Requirements
- Node.js (current LTS recommended)
- npm
- Access to the configured Firebase project for login, products, and orders

## Run locally
```bash
npm install
npm run dev
```

## Check production build
```bash
npm run build
```

## Firebase notes
- Ensure Email/Password and Google sign-in providers are enabled if you use them.
- Ensure Firestore exists and the project's security rules are deployed.
- The browser Firebase configuration is in `src/firebase.js`.
- Admin permissions depend on the Firestore user profile and security rules.

## No Node.js backend
No Express server is included in this package. The old `BackendProducts` sample that called `http://localhost:8080` has been removed. The `/products` route now opens the existing Store page.
