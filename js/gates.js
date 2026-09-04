// The two full-screen overlays: sign-in, and the Anthropic API key prompt.
// Kept free of dependencies so both init.js and auth.js can use them without
// importing each other.

export function showApiGate() {
  document.getElementById('api-gate').style.display = 'flex';
  const input = document.getElementById('api-key-input');
  if (input) setTimeout(() => input.focus(), 50);
}

export function hideApiGate() {
  document.getElementById('api-gate').style.display = 'none';
}

export function showAuthGate() {
  document.getElementById('auth-gate').style.display = 'flex';
  setTimeout(() => document.getElementById('auth-email').focus(), 50);
}

export function hideAuthGate() {
  document.getElementById('auth-gate').style.display = 'none';
}
