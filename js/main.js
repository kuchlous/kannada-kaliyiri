// Entry point. Boots the app, and publishes the handler surface that the
// inline onclick/onkeydown attributes in index.html call.
//
// Modules do not share a global scope, so an attribute like onclick="goStep(1)"
// cannot see an imported binding — it is evaluated against `window`. Rather
// than rewrite every handler as an addEventListener, the functions the markup
// actually names are assigned to `window` in one explicit place. That list is
// the app's public surface: if a name is not here, no attribute may call it.

import { store, hydrateStore } from './store.js';
import { setState, setApiKey, loadState, setAfterSave } from './state.js';
import { showAuthGate } from './gates.js';
import { initApp, resetApp, warnNotHydrated } from './init.js';
import { toggleAuthMode, submitAuth, logout, saveApiKey } from './auth.js';
import { toggleAskPanel, submitAsk } from './ask.js';
import { attrJson } from './escape.js';
import { speak, toggleRec } from './audio.js';
import { goStep, updateStats } from './ui.js';
import { goToMainMenu, goToMenuFromRevision, switchTab } from './nav.js';
import {
  completeStep, repeatTodayLesson, loadNewDay, loadWithTheme,
} from './lesson.js';
import {
  openPractice, pickRole, startPrac, togglePR, okStep,
} from './practice.js';
import {
  setRevMode, startRevision, restartFlashcards, fcNext, fcPrev,
  flagHard, toggleFcRec, retrySameQuiz, quizNext, quizPrev, checkAnswer,
} from './revision.js';
import { openDetail, showWordsList, closeModal } from './archive.js';

Object.assign(window, {
  // auth + setup
  toggleAuthMode, submitAuth, logout, saveApiKey, resetApp,
  // navigation
  goToMainMenu, goToMenuFromRevision, goStep, switchTab, closeModal,
  // lesson
  completeStep, repeatTodayLesson, loadNewDay, loadWithTheme,
  // audio + recording
  speak, toggleRec, toggleFcRec, togglePR,
  // roleplay practice
  openPractice, pickRole, startPrac, okStep,
  // revision
  setRevMode, startRevision, restartFlashcards, fcNext, fcPrev,
  flagHard, retrySameQuiz, quizNext, quizPrev, checkAnswer,
  // archive
  openDetail, showWordsList,
  // used inside generated onclick attributes
  attrJson,
  // ask panel
  toggleAskPanel, submitAsk,
});

// state.js cannot import ui.js (ui.js imports state.js), so the header refresh
// that follows every save is wired up here instead.
setAfterSave(updateStats);

window.onload = async () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
  const meRes = await fetch('/api/me');
  if (!meRes.ok) { showAuthGate(); return; }
  if (!await hydrateStore()) warnNotHydrated();
  setApiKey(store.getItem('kk_apikey'));
  const reloaded = loadState();
  if (reloaded) setState(reloaded);
  initApp();
};
