// ============ PAGE TRANSITIONS ============
// Fade-in on load is handled by CSS (page-enter animation in user.css / inline styles).
// This file handles fade-out before navigation.

function navigateTo(href) {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
    if (href && href.startsWith('#')) location.hash = href;
    return;
  }
  document.body.style.transition = 'opacity .15s ease-out';
  document.body.style.opacity    = '0';
  setTimeout(() => { window.location.href = href; }, 160);
}

// Intercept all internal <a> clicks
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.classList.contains('no-transition')) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
  if (href.startsWith('/') || href.startsWith(location.origin)) {
    e.preventDefault();
    navigateTo(href);
  }
});
