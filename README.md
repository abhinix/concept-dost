**Concept-Dost**

Concept-Dost is a lightweight learning assistant web app that generates short teaching "cards" and simplified explanations using Google Gemini (Generative AI) and stores usage/guest tracking in Firebase Firestore. The repository serves a static frontend from the `public/` folder and exposes JSON APIs from `index.js` for generation and simplification.

**Quick Summary**
- **What:** AI tutor that produces teaching cards and simpler explanations.
- **Tech stack:** Node.js (Express), Google Generative AI (`@google/generative-ai`), Firebase Admin (Firestore), plain HTML/CSS/JS frontend in `public/`.
- **Status:** Project ready to run (requires API keys and Firebase credentials in `.env` & `firebase-config.js`).

**Requirements**
- Node.js 18+ and npm
- A Google Gemini API key with Generative Language API enabled
- A Firebase project with a service account (Firestore access)

**Environment / Secrets**
Create a `.env` file in the project root (a sample is already present). Required variables:

- `PORT` (optional, default 3000)
- `GEMINI_API_KEY` — your Google Generative Language / Gemini API key
- `FIREBASE_PROJECT_ID` — from Firebase console
- `FIREBASE_CLIENT_EMAIL` — service account client email
- `FIREBASE_PRIVATE_KEY` — service account private key (wrap in double quotes in `.env` and keep literal newlines as `\\n` — `firebaseConfig.js` will convert them to real newlines)

Example `.env` values (do NOT commit this file):

```env
PORT=3000
GEMINI_API_KEY=YOUR_GEMINI_KEY
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL="firebase-admin-sdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Frontend Configuration**
Since this prototype connects frontend directly to Firestore for zero-latency performance, you must also configure the client-side keys.

1.  Navigate to **Firebase Console** > **Project Settings** > **General** > **Your Apps** (Web).
2.  Copy the `firebaseConfig` object.
3.  Open the file `public/firebase-config.js` in your code editor.
4.  Fill in the blank fields with your specific project details (keep the variable name `firebaseConfig` exactly as is):

```javascript
// public/firebase-config.js

// Paste the code from your firebase project settings > General > Web app.
const firebaseConfig = {
    apiKey: "AIzaSy... (Your API Key)",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789...",
    appId: "1:123456789..."
};
```
**Install & Run**

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
node index.js
```

The server serves the frontend from the `public/` folder and will be available at `http://127.0.0.1:3000` (or your configured `PORT`).

**APIs**
- `POST /api/generate` — Generate teaching cards for a `topic`.
  - Request body (JSON): `topic`, `language`, `style`, `persona`, `detailLevel`, `cardLimit`, `userId` (optional).
  - Behavior: If `userId` is not provided the server enforces a guest limit (10 requests per IP) tracked in Firestore `guest_tracking` collection.

- `POST /api/simplify` — Simplify a given card explanation.
  - Request body (JSON): `title`, `content`, `topic`, `style`, `language`, `detailLevel`.

- `GET /api/guest-status` — Returns usage for the calling IP: `used`, `remaining`, `isLimitExceeded`.

Notes about API behavior:
- The server uses `@google/generative-ai` via `GoogleGenerativeAI` in `index.js`. The code currently references `gemini-3-flash-preview` as the model — verify availability for your API key.
- Responses are expected as strict JSON from the model; `index.js` strips triple-backticks if present and attempts to `JSON.parse` the returned text.

**Firebase / Guest Tracking**
- The app uses Firebase Admin (see `firebaseConfig.js`) to initialize with credentials from `.env`.
- Guest usage is stored in Firestore under collection `guest_tracking` where each document id is the client IP and contains `{ count, lastActive }`.

**Project Structure (important files)**
- `index.js` — main Express server, API endpoints, Gemini and guest logic.
- `firebaseConfig.js` — initializes Firebase Admin using `.env` values and exports `db` and `auth`.
- `.env` — environment variables and secrets (do not commit).
- `public/` — frontend static assets and pages (served by Express).
  - `public/index.html`, `public/script.js`, `public/style.css`, etc.

**Dependencies**
- See `package.json` — main dependencies: `@google/generative-ai`, `express`, `firebase-admin`, `dotenv`, `cors`, `request-ip`.

**Testing & Debugging Tips**
- If you get Firebase errors, confirm the `FIREBASE_PRIVATE_KEY` in `.env` contains the `\\n` sequences and is enclosed in double quotes — `firebaseConfig.js` will replace `\\n` with real newlines.
- For development logs, monitor the Node console where `index.js` prints errors and server start message.

**Security & Production Notes**
- Never commit `.env` or service account keys to source control. Use secret managers for production deployments.
- The guest tracking implementation uses IP-based limits. For reliable rate-limiting or abuse protection in production, integrate with a proper auth system or gateway.

**License & Credits**
- This project is open-source and available under the **[MIT License](LICENSE)**.
- Credits: Built with Node.js, Google Generative AI, Firebase, and plain web technologies.
