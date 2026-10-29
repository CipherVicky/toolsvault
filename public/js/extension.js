// Extension page — loaded once when user navigates to #page-extension
let _extLoaded = false;
let _extCanvasRAF = null;

async function extLoadPage() {
  if (_extLoaded) return;
  _extLoaded = true;
  extInitCanvas();
  try {
    const data = await api('/api/settings/extension');
    const url     = data.extension_download_url || '';
    const version = data.extension_version      || 'v1.0';
    const badge = document.getElementById('extVersionBadge');
    if (badge) badge.textContent = version;
    // Versioned filename so each build downloads as graphicotoolz-extension-vX.Y.Z.zip
    const vTag = String(version).replace(/[^a-zA-Z0-9._-]/g, '');
    const fname = 'graphicotoolz-extension' + (vTag ? '-' + vTag : '') + '.zip';
    ['extDownloadBtn', 'extDownloadBtn2'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn && url) {
        btn.removeAttribute('onclick');
        // Build a UNIQUE cache-busted URL on every click so the browser never reuses a cached zip
        btn.addEventListener('click', function (ev) {
          ev.preventDefault();
          const fresh = url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + vTag + '&t=' + Date.now();
          const a = document.createElement('a');
          a.href = fresh;
          a.download = fname;
          document.body.appendChild(a);
          a.click();
          a.remove();
        });
        btn.style.cursor = 'pointer';
      }
    });
  } catch (_) {}
}

function extDownload(e) {
  e.preventDefault();
  toast('Extension download URL not configured yet. Contact admin.', 'info');
}

function extToggleStep(el) {
  el.classList.toggle('open');
}

function extToggleFaq(el) {
  el.classList.toggle('open');
}

// ── Canvas particle network animation ──
function extInitCanvas() {
  const canvas = document.getElementById('extHeroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const PARTICLE_COUNT = 48;
  const CONNECT_DIST   = 110;
  const SPEED          = 0.32;

  let W, H, particles = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function makeParticle() {
    return {
      x:  rand(0, W),
      y:  rand(0, H),
      vx: rand(-SPEED, SPEED),
      vy: rand(-SPEED, SPEED),
      r:  rand(1.2, 2.4),
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Update positions
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > W) { p.x = W; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > H) { p.y = H; p.vy *= -1; }
    }

    // Theme-aware colors
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const dotColor  = isLight ? 'rgba(109,40,217,0.45)'  : 'rgba(167,139,250,0.55)';
    const lineRGB   = isLight ? '109,40,217'              : '167,139,250';
    const lineAlpha = isLight ? 0.18                      : 0.28;

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * lineAlpha;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${lineRGB},${alpha})`;
          ctx.lineWidth = 1;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw dots
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }

    _extCanvasRAF = requestAnimationFrame(draw);
  }

  init();
  draw();

  // Resize when hero resizes (e.g. window resize)
  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(canvas.parentElement);
}
