// ============ HERO GREETING ============
// Depends on: helpers.js (currentUser, escapeHtml)
// Option C: time-of-day + day-of-week mix, random pool per slot.
// Call updateHeroGreeting() after auth state changes.

const _GREETINGS = {
  morning: [
    { text: "Rise & create",        emoji: "☀️" },
    { text: "New day, new tools",   emoji: "🚀" },
    { text: "Morning grind starts", emoji: "💪" },
    { text: "Make today count",     emoji: "⚡" },
    { text: "Early bird energy",    emoji: "🌅" },
  ],
  afternoon: [
    { text: "Keep building",        emoji: "🔥" },
    { text: "Midday grind",         emoji: "⚡" },
    { text: "Stay in the zone",     emoji: "🎯" },
    { text: "Halfway there",        emoji: "💡" },
    { text: "Locked in",            emoji: "🔒" },
  ],
  evening: [
    { text: "Evening session",      emoji: "🌆" },
    { text: "Golden hour creating", emoji: "✨" },
    { text: "Wind down & create",   emoji: "🎨" },
    { text: "End strong today",     emoji: "🏁" },
    { text: "One more thing",       emoji: "💫" },
  ],
  night: [
    { text: "Night owl mode",       emoji: "🦉" },
    { text: "Late night creating",  emoji: "🌙" },
    { text: "While the world sleeps", emoji: "🌃" },
    { text: "Midnight builder",     emoji: "⚙️" },
    { text: "Dark mode creator",    emoji: "🖤" },
  ],
};

const _DAY_OVERRIDES = {
  1: { text: "New week, let's go",     emoji: "💥" },  // Monday
  5: { text: "Friday energy, ship it", emoji: "🚀" },  // Friday
  6: { text: "Weekend creator mode",   emoji: "🎨" },  // Saturday
  0: { text: "Sunday hustle",          emoji: "😤" },  // Sunday
};

function _pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getGreeting() {
  const now  = new Date();
  const h    = now.getHours();
  const day  = now.getDay();

  // Day override wins ~40% of the time on special days so it doesn't get stale
  if (_DAY_OVERRIDES[day] && Math.random() < 0.4) {
    return _DAY_OVERRIDES[day];
  }

  if (h >= 5  && h < 12) return _pick(_GREETINGS.morning);
  if (h >= 12 && h < 17) return _pick(_GREETINGS.afternoon);
  if (h >= 17 && h < 21) return _pick(_GREETINGS.evening);
  return _pick(_GREETINGS.night);
}

function updateHeroGreeting() {
  const greetEl = document.getElementById('heroGreeting');
  const titleEl = document.querySelector('.hero-title');
  if (!greetEl || !titleEl) return;

  if (currentUser) {
    const { text, emoji } = getGreeting();
    const name = (currentUser.first_name || '').trim();
    greetEl.innerHTML =
      `${text}, <span class="greet-name">${escapeHtml(name)}</span> <span class="greet-emoji">${emoji}</span>`;
    greetEl.classList.remove('hidden');
    titleEl.classList.add('greet-hidden');
  } else {
    greetEl.classList.add('hidden');
    titleEl.classList.remove('greet-hidden');
  }
}
