# ಕನ್ನಡ ಕಲಿಯಿರಿ · Kannada Kaliyiri

A web app for learning Kannada through AI-generated daily lessons. Each lesson walks you through new vocabulary, example sentences, and an interactive role-play conversation, with a quiz to revise what you've learned.

## Features

- **Daily lessons** — new words with Kannada script, romanization, English meaning, and usage tips
- **Example sentences** — see each word used in context, with an English and Hindi breakdown
- **Role-play** — short conversational scenarios to practice, including a turn-by-turn practice mode
- **Pronunciation** — hear any word or sentence spoken, and record yourself to compare
- **Revision quizzes** — flashcards and multiple-choice quizzes over everything you've practiced
- **Archive** — browse past lessons, grouped by week
- **Accounts** — sign in with email and password; progress syncs across devices

## Architecture

No build step and no framework — the browser loads the source as written.

- `index.html` — markup only.
- `css/styles.css` — all styles.
- `js/` — ES modules, loaded via `<script type="module" src="/js/main.js">`. Roughly in dependency order:

  | Module | Responsibility |
  |---|---|
  | `escape.js` | The `html` tagged template that escapes every interpolation, plus `trusted`/`attrJson` for the deliberate exceptions. |
  | `store.js` | The server-backed key/value cache: hydrate, debounced push, flush on unload. |
  | `state.js` | The persisted state object and the history helpers derived from it. |
  | `gates.js` | The sign-in and API-key overlays. Dependency-free, so `init.js` and `auth.js` can both use it. |
  | `ui.js` | Focus mode, step indicator, toasts, stats. |
  | `nav.js` | Moving between the three panels. |
  | `audio.js` | TTS playback and microphone capture. |
  | `lesson.js` | Building and rendering a lesson — the three stages below. |
  | `practice.js`, `revision.js`, `archive.js`, `ask.js` | The four feature panels. |
  | `auth.js`, `init.js` | Sign-in flow and the first render after it. |
  | `main.js` | Entry point. Boots the app and publishes the handler surface. |

  Modules have no shared global scope, so an inline `onclick="goStep(1)"` cannot see an imported binding — it resolves against `window`. Rather than rewrite every handler, `main.js` assigns the functions the markup names to `window` in one explicit block. **That list is the app's public surface: if a name is not in it, no HTML attribute may call it.**

  `js/package.json` marks the directory as ES modules for Node, so the modules can be imported by tests as-is. Browsers ignore it.

- `api/` — Vercel serverless functions:
  - `api/auth/signup.js`, `login.js`, `logout.js` — email/password accounts. Passwords are hashed with bcrypt and stored in Vercel KV; the session is a JWT in an `HttpOnly` cookie.
  - `api/me.js` — returns the current session, or 401.
  - `api/state.js` — reads and writes your progress blob (`GET`/`PUT`), keyed by user id.
  - `api/translate.js` — authenticated proxy to the Google Cloud Translation API.
  - `api/tts.js` — authenticated proxy to Google Translate's Kannada text-to-speech.

A lesson is built in three stages:

1. **Claude** (`claude-sonnet-5`, called from the browser with your own key) picks the word and writes all the Kannada — the word, its transliteration, the example sentence and the role-play. It is not asked for any English.
2. **Google Translate** renders every piece of that Kannada into English, in one batched call through `/api/translate`. The English a learner sees is therefore a real translation of the Kannada, not a second thing the model produced alongside it.
3. **Claude** breaks the sentence down word by word, working from Google's translation, so the explanation always agrees with the English shown above it.

Stage 1 is streamed, so the word and sentence cards appear before the role-play finishes generating; the English fills in when stage 2 returns.

## Deploying

The app needs a Vercel project with KV storage — it will not run as a plain static file, because the frontend calls `/api/*` on startup.

1. Deploy the repo to Vercel and attach a KV store (this sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`).
2. Set `JWT_SECRET` to a long random string. Sessions are signed with it, so changing it later signs everyone out.
3. Set `GOOGLE_TRANSLATE_API_KEY` to a Google Cloud API key with the **Cloud Translation API** enabled. Unlike the Anthropic key, this one belongs to whoever runs the deployment and is billed to them — it stays server-side and is never sent to the browser.
4. Open the deployment, create an account, and paste your [Anthropic API key](https://console.anthropic.com/) when prompted.

Set all three variables for Production, Preview **and** Development, or local `vercel dev` will fail on whichever is missing.

## Privacy

Creating an account stores your email, a bcrypt hash of your password, and your lesson progress in Vercel KV.

Your Anthropic API key is stored server-side too, as part of your progress blob, so it is available on every device you sign in from. It is sent back to your browser after you sign in, and lesson requests go from your browser straight to `api.anthropic.com` — the key is never used to make requests from the server. There is no analytics.
