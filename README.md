# ಕನ್ನಡ ಕಲಿಯಿರಿ · Kannada Kaliyiri

A single-file web app for learning Kannada through AI-generated daily lessons. Each lesson walks you through new vocabulary, example sentences, and an interactive role-play conversation, with a quiz to revise what you've learned.

## Features

- **Daily lessons** — new words with Kannada script, romanization, English meaning, and usage tips
- **Example sentences** — see each word used in context
- **Role-play** — short conversational scenarios to practice
- **Revision quizzes** — test yourself on words you've practiced
- **Archive** — browse past lessons
- Progress and your API key are saved locally in the browser (`localStorage`)

## Getting started

1. Open `index.html` in any modern browser — no build step or server required.
2. On first launch, paste your [Anthropic API key](https://console.anthropic.com/) into the setup screen. It is stored only in your browser's `localStorage` and sent directly to the Anthropic API.
3. Start your first lesson.

## How it works

The app calls the Anthropic Claude API (`claude-sonnet-4-6`) directly from the browser to generate lesson content. Because it's a static HTML file, you can also host it on any static host such as GitHub Pages.

## Privacy

Your API key never leaves your device except in requests to `api.anthropic.com`. There is no backend and no analytics.
