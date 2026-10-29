/* GraphicoToolz — Floating WhatsApp button + tawk.to live chat.
   Both are admin-configurable via Admin → Banners & Promos → Support Widgets.
   Config comes from GET /api/settings/support-widgets. Loads on /app, /settings,
   /login, /signup (NOT the landing page). Safe no-op when nothing is configured.

   Layout: WhatsApp button is FIXED bottom-right, above the tawk.to bubble. Nothing
   moves or hides. The tawk panel uses a much higher z-index, so when it opens it
   simply renders ON TOP of the WhatsApp button; when it closes, WhatsApp is visible
   again in the same spot. */
(function () {
  if (window.__gtSupportWidgets) return;        // guard against double-load
  window.__gtSupportWidgets = true;

  function injectWhatsApp(number, message) {
    if (!number || document.getElementById('gt-wa-fab')) return;
    var href = 'https://wa.me/' + number + (message ? '?text=' + encodeURIComponent(message) : '');
    var a = document.createElement('a');
    a.id = 'gt-wa-fab';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'Chat on WhatsApp');
    a.innerHTML =
      '<svg viewBox="0 0 32 32" width="30" height="30" fill="#fff" aria-hidden="true">' +
      '<path d="M16.04 3C9.42 3 4.05 8.37 4.05 14.99c0 2.11.55 4.17 1.6 5.99L4 29l8.2-2.15a11.9 11.9 0 0 0 3.83.63h.01c6.62 0 11.99-5.37 11.99-11.99C28.03 8.37 22.66 3 16.04 3zm0 21.94h-.01c-1.18 0-2.34-.32-3.35-.92l-.24-.14-4.87 1.28 1.3-4.75-.16-.25a9.94 9.94 0 0 1-1.52-5.3c0-5.5 4.48-9.97 9.99-9.97 2.67 0 5.17 1.04 7.06 2.93a9.9 9.9 0 0 1 2.92 7.05c0 5.5-4.48 9.97-9.99 9.97zm5.48-7.47c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.68-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.63-.93-2.23-.24-.59-.49-.51-.68-.52l-.58-.01c-.2 0-.52.07-.8.37-.27.3-1.05 1.03-1.05 2.5 0 1.47 1.08 2.9 1.23 3.1.15.2 2.12 3.24 5.14 4.54.72.31 1.28.49 1.71.63.72.23 1.37.2 1.89.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.13-.27-.2-.57-.35z"/>' +
      '</svg>';
    document.body.appendChild(a);
  }

  function injectTawk(propertyId, widgetId) {
    if (!propertyId || !widgetId || window.Tawk_API) return;
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    var s1 = document.createElement('script');
    s1.async = true;
    s1.src = 'https://embed.tawk.to/' + propertyId + '/' + widgetId;
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    document.head.appendChild(s1);
  }

  function injectStyles() {
    if (document.getElementById('gt-support-css')) return;
    var css = document.createElement('style');
    css.id = 'gt-support-css';
    // z-index kept LOWER than tawk (tawk uses ~2,000,000,000) so the open chat panel
    // overlays the WhatsApp button instead of the button covering the panel.
    css.textContent =
      '#gt-wa-fab{position:fixed;right:22px;bottom:22px;z-index:99999;width:56px;height:56px;' +
      'border-radius:50%;background:#25d366;display:flex;align-items:center;justify-content:center;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.28);transition:transform .2s ease,box-shadow .18s ease;' +
      'animation:gt-wa-pop .4s ease both}' +
      '#gt-wa-fab:hover{transform:scale(1.08);box-shadow:0 10px 28px rgba(37,211,102,.5)}' +
      '#gt-wa-fab.gt-wa-above-chat{bottom:108px}' +
      '@keyframes gt-wa-pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}' +
      '@media (max-width:600px){#gt-wa-fab{width:50px;height:50px;right:16px;bottom:16px}' +
      '#gt-wa-fab.gt-wa-above-chat{bottom:96px}}';
    document.head.appendChild(css);
  }

  function init() {
    fetch('/api/settings/support-widgets')
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (!cfg) return;
        if (cfg.whatsapp_enabled && cfg.whatsapp_number) {
          injectStyles();
          injectWhatsApp(cfg.whatsapp_number, cfg.whatsapp_message);
          if (cfg.tawkto_enabled) {
            var fab = document.getElementById('gt-wa-fab');
            if (fab) fab.classList.add('gt-wa-above-chat');
          }
        }
        if (cfg.tawkto_enabled) {
          injectTawk(cfg.tawkto_property_id, cfg.tawkto_widget_id);
        }
      })
      .catch(function () { /* silent — support widgets are optional */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
