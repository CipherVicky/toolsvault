/* ============================================================
   GraphicoToolz — Weather Vibes Engine
   Ambient atmospheric overlays that blend with day & night mode.
   Modes: off / rain / snow / sakura / aurora / summer / stars
   ============================================================ */
(function(){
  'use strict';

  const STORAGE_KEY = 'gt_weather_v1';
  /* Three modes, not six. Snow, sakura, summer and stars each pulled the page
     toward a different palette, so turning one on fought the interface instead
     of dressing it. These three are all built from the same violet/cyan the
     aurora ground already uses, so weather now reads as MORE of the theme
     rather than a costume over it. Drift is new; the retired draw functions are
     left in place, unreferenced, so any of them can be brought back by adding
     one string here. */
  const MODES = ['off', 'aurora', 'drift', 'rain'];

  // ---------- state ----------
  // Default is now 'off': the ambient wash in user.css (.gt-amb) supplies the
  // atmosphere at a fraction of the cost, and two ambient layers would fight —
  // the weather CSS hides .gt-amb whenever a mode is active. Weather is kept as
  // an opt-in rather than removed; anyone who has already chosen a mode still
  // gets it, because load() restores their saved choice and never overrides it.
  let state = {
    mode: 'off',
    intensity: 0.7,   // 0..1
    audio: false,
    volume: 0.4
  };
  let canvas, ctx, dpr = 1, w = 0, h = 0;
  let rafId = null;
  let particles = [];
  let extras = [];           // shooting stars / aurora bands / fog / leaves etc.
  let _screenDrops = [];     // static water droplets on the screen (rain mode)
  let audioEl = null;
  let lastT = 0;
  let running = false;
  let resizeRAF = null;

  // ---------- helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';

  function load(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch(e){}
  }
  function save(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){}
  }

  // ---------- canvas setup ----------
  function setupCanvas(){
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'gtWeatherCanvas';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: '2',         // above bg wash, below sidebar(z:100)/topbar(z:100)/dropdowns(z:1000)
      opacity: '0',
      transition: 'opacity .6s ease'
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d', { alpha: true });
    sizeCanvas();
    window.addEventListener('resize', onResize, { passive: true });
  }
  function sizeCanvas(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = (w * dpr) | 0;
    canvas.height = (h * dpr) | 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function onResize(){
    if (resizeRAF) cancelAnimationFrame(resizeRAF);
    resizeRAF = requestAnimationFrame(() => {
      sizeCanvas();
      // rebuild static elements (stars) for new dims
      if (state.mode === 'stars' || state.mode === 'aurora') seedParticles();
    });
  }

  // ---------- background VIDEO layer (real CC0 footage per mode) ----------
  // Pexels CDN — free, CC0 license, high-quality loops (autoplay+muted+loop)
  // Posters (still images) shown while video loads — Unsplash CDN
  // Rain uses LOCAL AI-generated cinematic image (no video — particles do the motion).
  // Other modes still use Pexels video CDN.
  /* Canvas only. The retired modes streamed 1080p loops from Pexels and stills
     from Unsplash — a photograph of somewhere else behind a product UI, and
     megabytes on every mode switch. The three that remain are drawn, so they
     cost one canvas and nothing over the network. */
  const BG_VIDEOS  = { aurora:'', drift:'', rain:'' };
  const BG_POSTERS = { aurora:'', drift:'', rain:'' };
  function setBgImage(){
    let wrap = document.getElementById('gtWeatherBg');
    if (!wrap){
      wrap = document.createElement('div');
      wrap.id = 'gtWeatherBg';
      wrap.setAttribute('aria-hidden', 'true');
      // Poster div + video tag stacked inside
      wrap.innerHTML = `
        <div class="gt-bg-poster"></div>
        <video class="gt-bg-video" autoplay muted loop playsinline preload="auto"></video>
      `;
      document.body.appendChild(wrap);
    }
    const videoUrl = BG_VIDEOS[state.mode];
    const posterUrl = BG_POSTERS[state.mode];
    const poster = wrap.querySelector('.gt-bg-poster');
    const video  = wrap.querySelector('.gt-bg-video');
    if (posterUrl){
      poster.style.backgroundImage = `url("${posterUrl}")`;
      // Image-only mode (no video) — particles + lightning do the motion
      if (!videoUrl){
        video.removeAttribute('src');
        video.load();
        delete video.dataset.src;
        wrap.className = 'gt-weather-bg gt-w-' + state.mode + ' active image-only';
      } else {
        // Has video — only set src if changed (avoid restarting on intensity change)
        if (video.dataset.src !== videoUrl){
          video.dataset.src = videoUrl;
          video.src = videoUrl;
          const p = video.play();
          if (p && p.catch) p.catch(()=>{ /* autoplay blocked — poster stays */ });
        }
        wrap.className = 'gt-weather-bg gt-w-' + state.mode + ' active';
      }
    } else {
      wrap.className = 'gt-weather-bg';
      poster.style.backgroundImage = '';
      video.removeAttribute('src');
      video.load();
      delete video.dataset.src;
    }
  }
  // ---------- backdrop layer (atmosphere wash) ----------
  function setBackdrop(){
    let el = document.getElementById('gtWeatherBackdrop');
    if (!el){
      el = document.createElement('div');
      el.id = 'gtWeatherBackdrop';
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    el.className = 'gt-weather-backdrop gt-w-' + state.mode;
    el.style.setProperty('--gt-w-i', state.intensity.toFixed(2));
    // Toggle body class so UI adopts ambient styling when weather is on
    if (state.mode === 'off'){
      document.body.classList.remove('gt-weather-on');
      document.body.classList.remove('gt-night-mode');
      // Remove all gt-w-* classes
      document.body.className = document.body.className.replace(/\bgt-w-\w+\b/g, '').trim();
    } else {
      document.body.classList.add('gt-weather-on');
      // Only genuine night scenes (stars + aurora) force dark UI.
      // Rain doesn't need it — the gradient fade handles it.
      const isNight = state.mode === 'stars' || state.mode === 'aurora';
      document.body.classList.toggle('gt-night-mode', isNight);
      // Add gt-w-{mode} class for per-mode card shadow tints
      document.body.className = document.body.className.replace(/\bgt-w-\w+\b/g, '').trim();
      document.body.classList.add('gt-w-' + state.mode);
    }
  }
  function clearBackdrop(){
    const el = document.getElementById('gtWeatherBackdrop');
    if (el) el.className = 'gt-weather-backdrop';
    const bg = document.getElementById('gtWeatherBg');
    if (bg){ bg.className = 'gt-weather-bg'; bg.style.backgroundImage = ''; }
    document.body.classList.remove('gt-weather-on');
    document.body.classList.remove('gt-night-mode');
  }

  // ---------- frost/window glass overlay (rain mode) ----------
  function setGlass(){
    let g = document.getElementById('gtWeatherGlass');
    if (state.mode !== 'rain' && state.mode !== 'snow'){
      if (g) g.remove();
      return;
    }
    if (!g){
      g = document.createElement('div');
      g.id = 'gtWeatherGlass';
      g.setAttribute('aria-hidden', 'true');
      document.body.appendChild(g);
    }
    g.className = 'gt-weather-glass gt-g-' + state.mode;
  }

  // ============================================================
  // PARTICLE SEEDS — one factory per mode
  // ============================================================
  function seedParticles(){
    particles = [];
    extras = [];
    _screenDrops = [];
    const I = state.intensity;
    if (state.mode === 'rain'){
      const n = (350 + 500 * I) | 0;
      for (let i = 0; i < n; i++) particles.push(makeRain());
      // Add fog/mist drift patches for atmosphere
      for (let i = 0; i < 18; i++) extras.push(makeFog());
      // Add wind-blown leaves drifting across the foreground
      const leafCount = (10 + 16 * I) | 0;
      for (let i = 0; i < leafCount; i++) extras.push(makeLeaf());
      // Add static water droplets on the camera/window (foreground)
      const dropCount = (35 + 50 * I) | 0;
      for (let i = 0; i < dropCount; i++) _screenDrops.push(makeScreenDrop());
    } else if (state.mode === 'snow'){
      const n = (140 + 220 * I) | 0;
      for (let i = 0; i < n; i++) particles.push(makeSnow());
    } else if (state.mode === 'sakura'){
      const n = (60 + 100 * I) | 0;
      for (let i = 0; i < n; i++) particles.push(makeSakura());
    } else if (state.mode === 'aurora'){
      const n = (50 + 60 * I) | 0;
      for (let i = 0; i < n; i++) particles.push(makeStarDot(0.6));
      // aurora bands handled in render
    } else if (state.mode === 'drift' || state.mode === 'summer'){
      const n = (60 + 80 * I) | 0;
      for (let i = 0; i < n; i++) particles.push(makeDust());
    } else if (state.mode === 'stars'){
      const n = (140 + 160 * I) | 0;
      for (let i = 0; i < n; i++) particles.push(makeStarDot(1));
    }
  }

  // ---- rain droplet (streak) ----
  function makeRain(){
    return {
      x: rand(-30, w + 30),
      y: rand(-h, 0),
      len: rand(18, 38),
      sp: rand(950, 1500),   // px/sec — faster, heavier rain
      th: rand(1.0, 2.2),
      a: rand(0.55, 1),
      drift: rand(-55, -22)  // wind X
    };
  }
  function makeFog(){
    return {
      x: rand(-200, w + 200),
      y: rand(h * 0.25, h * 0.85),
      r: rand(80, 240),
      sp: rand(8, 22),
      a: rand(0.04, 0.10),
      ph: rand(0, Math.PI * 2),
      phSp: rand(0.1, 0.3)
    };
  }
  // Wind-blown leaf — drifts diagonally with tumbling rotation
  function makeLeaf(){
    const palette = ['#5b8f3a', '#7ba84a', '#a8c264', '#c79a3a', '#a86a2b', '#8f4422'];
    return {
      x: rand(-60, w),
      y: rand(-40, h + 40),
      r: rand(8, 18),
      vx: rand(120, 260),        // horizontal speed (wind)
      vy: rand(35, 90),          // falling speed
      rot: rand(0, Math.PI * 2),
      rotSp: rand(-3.5, 3.5),    // tumbling
      sway: rand(0, Math.PI * 2),
      swaySp: rand(1.2, 2.5),
      a: rand(0.65, 0.95),
      color: pick(palette)
    };
  }
  // Static water droplet ON the screen — like camera lens / window glass
  function makeScreenDrop(){
    return {
      x: rand(0, w),
      y: rand(0, h),
      r: rand(2, 7),
      a: rand(0.35, 0.75),
      // Some drops slide down occasionally
      slideTimer: rand(8, 30),
      sliding: false,
      slideY: 0,
      slideVy: 0,
      // Drop life cycle
      life: rand(0, 30),
      maxLife: rand(20, 60)
    };
  }
  // ---- snowflake ----
  function makeSnow(){
    const r = rand(1.2, 3.6);
    return {
      x: rand(0, w),
      y: rand(-h, h),
      r: r,
      sp: rand(20, 70) * (r / 2),
      sway: rand(0, Math.PI * 2),
      swaySp: rand(0.4, 1.2),
      a: rand(0.55, 0.95)
    };
  }
  // ---- sakura petal ----
  function makeSakura(){
    return {
      x: rand(0, w),
      y: rand(-h, 0),
      r: rand(5, 11),
      sp: rand(35, 80),
      rot: rand(0, Math.PI * 2),
      rotSp: rand(-1.2, 1.2),
      sway: rand(0, Math.PI * 2),
      swaySp: rand(0.5, 1.4),
      a: rand(0.7, 1),
      hue: rand(335, 355)     // pink range
    };
  }
  // ---- dust mote (summer) ----
  function makeDust(){
    return {
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.8, 2.4),
      sp: rand(-12, 12),
      vy: rand(-8, 8),
      a: rand(0.25, 0.6),
      tw: rand(0, Math.PI * 2),
      twSp: rand(0.6, 1.8)
    };
  }
  // ---- star dot (stars + aurora overlay) ----
  function makeStarDot(scale){
    return {
      x: rand(0, w),
      y: rand(0, h * 0.85),
      r: rand(0.4, 1.6) * scale,
      a: rand(0.3, 1),
      twSp: rand(0.5, 2.2),
      twPh: rand(0, Math.PI * 2)
    };
  }
  // ---- shooting star ----
  function makeShootingStar(){
    const startX = rand(0, w * 0.6);
    return {
      x: startX,
      y: rand(0, h * 0.4),
      vx: rand(420, 720),
      vy: rand(140, 260),
      life: 0,
      max: rand(0.6, 1.0),
      len: rand(80, 160)
    };
  }

  // ============================================================
  // RENDER LOOP
  // ============================================================
  function loop(t){
    if (!running) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    ctx.clearRect(0, 0, w, h);

    switch (state.mode){
      case 'rain':    drawRain(dt); break;
      case 'snow':    drawSnow(dt); break;
      case 'sakura':  drawSakura(dt); break;
      case 'aurora':  drawAurora(dt); break;
      case 'drift':   drawDrift(dt); break;
      case 'summer':  drawSummer(dt); break;
      case 'stars':   drawStars(dt); break;
    }
    rafId = requestAnimationFrame(loop);
  }

  // -------- RAIN — full thunderstorm with forked lightning bolts --------
  let _lightTimer = 1;          // first strike very soon after start
  let _lightStrikes = [];       // queue of upcoming flash pulses (multi-strike)
  let _lightFlash = 0;          // current screen-flash brightness 0..1
  let _bolt = null;             // current bolt to draw { segments[], life, max, branches }
  let _windPh = 0;              // wind gust phase
  let _newDropTimer = 0;        // spawn new screen drops periodically
  function generateBolt(){
    // Build a jagged polyline from top of screen down to ground/horizon
    const startX = rand(w * 0.15, w * 0.85);
    const segments = [{ x: startX, y: -5 }];
    let x = startX, y = 0;
    const targetY = h * rand(0.55, 0.78);
    while (y < targetY){
      const stepY = rand(18, 38);
      const jitter = rand(-32, 32);
      x += jitter;
      y += stepY;
      segments.push({ x, y });
    }
    // Add 1-3 forked branches
    const branches = [];
    const nB = (rand(1, 3.5)) | 0;
    for (let b = 0; b < nB; b++){
      const i0 = ((segments.length - 3) * Math.random()) | 0 + 1;
      const start = segments[i0];
      const branch = [{ x: start.x, y: start.y }];
      let bx = start.x, by = start.y;
      const bLen = (rand(3, 6)) | 0;
      const dir = Math.random() < 0.5 ? -1 : 1;
      for (let s = 0; s < bLen; s++){
        bx += rand(8, 28) * dir + rand(-8, 8);
        by += rand(12, 26);
        branch.push({ x: bx, y: by });
      }
      branches.push(branch);
    }
    return { segments, branches, life: 0, max: rand(0.25, 0.45) };
  }
  function drawRain(dt){
    const light = isLight();
    _windPh += dt;
    const windGust = 1 + Math.sin(_windPh * 0.7) * 0.25;  // wind varies over time

    // ----- Lightning strike scheduling -----
    _lightTimer -= dt;
    if (_lightTimer <= 0){
      // Schedule a multi-strike (real lightning often has 2-3 quick flashes)
      const strikes = 1 + ((Math.random() * 3) | 0);
      let tOffset = 0;
      for (let i = 0; i < strikes; i++){
        _lightStrikes.push({ at: tOffset, intensity: i === 0 ? 1 : rand(0.4, 0.85), bolt: i === 0 });
        tOffset += rand(0.06, 0.22);
      }
      _lightTimer = rand(2, 6);  // next storm in 2-6s (was 5-14) — frequent thunderstorm
    }
    // Fire any due strikes
    for (let i = _lightStrikes.length - 1; i >= 0; i--){
      _lightStrikes[i].at -= dt;
      if (_lightStrikes[i].at <= 0){
        const s = _lightStrikes[i];
        _lightFlash = Math.max(_lightFlash, s.intensity);
        if (s.bolt) _bolt = generateBolt();
        _lightStrikes.splice(i, 1);
      }
    }
    // Decay flash
    if (_lightFlash > 0){
      _lightFlash = Math.max(0, _lightFlash - dt * 4.2);
    }

    // ----- Fog/mist drift (subtle atmospheric depth) -----
    for (const f of extras){
      if (f.color) continue;  // leaves are also in extras — handled below
      f.ph += f.phSp * dt;
      f.x += f.sp * dt * windGust;
      if (f.x > w + 250) f.x = -250;
      const a = f.a * (0.7 + 0.3 * Math.sin(f.ph));
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      grad.addColorStop(0, `rgba(180,195,225,${a})`);
      grad.addColorStop(1, 'rgba(180,195,225,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }

    // ----- Lightning bolt draw (before rain so rain falls in front) -----
    if (_bolt){
      _bolt.life += dt;
      const k = 1 - (_bolt.life / _bolt.max);
      if (k <= 0){
        _bolt = null;
      } else {
        const a = Math.sin(Math.PI * (_bolt.life / _bolt.max)) * 0.95;
        // outer glow
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(180,210,255,1)';
        ctx.shadowBlur = 28;
        ctx.strokeStyle = `rgba(220,235,255,${a * 0.55})`;
        ctx.lineWidth = 8;
        const drawPath = (pts) => {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        };
        drawPath(_bolt.segments);
        for (const br of _bolt.branches) drawPath(br);
        // core bright line
        ctx.shadowBlur = 14;
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = 2.4;
        drawPath(_bolt.segments);
        for (const br of _bolt.branches) drawPath(br);
        ctx.shadowBlur = 0;
      }
    }

    // ----- Screen flash (after bolt, illuminates whole scene) -----
    if (_lightFlash > 0){
      ctx.fillStyle = light
        ? `rgba(230,240,255,${0.32 * _lightFlash})`
        : `rgba(210,225,255,${0.45 * _lightFlash})`;
      ctx.fillRect(0, 0, w, h);
    }

    // ----- Wind-blown leaves (foreground motion) -----
    for (const lf of extras){
      if (!lf.color) continue;  // skip fog patches
      lf.sway += lf.swaySp * dt;
      lf.rot += lf.rotSp * dt;
      lf.x += lf.vx * dt * windGust;
      lf.y += lf.vy * dt + Math.sin(lf.sway) * 30 * dt;
      if (lf.x > w + 60){
        lf.x = -60;
        lf.y = rand(-40, h * 0.8);
      }
      if (lf.y > h + 40){
        lf.y = -40;
        lf.x = rand(-60, w * 0.4);
      }
      ctx.save();
      ctx.translate(lf.x, lf.y);
      ctx.rotate(lf.rot);
      ctx.globalAlpha = lf.a * (_lightFlash > 0.3 ? 1.2 : 1);
      // Leaf shape — pointed oval with stem hint
      ctx.fillStyle = lf.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, lf.r, lf.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Center vein
      ctx.strokeStyle = `rgba(0,0,0,0.20)`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-lf.r, 0);
      ctx.lineTo(lf.r, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // ----- Rain streaks (with wind gust applied) -----
    ctx.lineCap = 'round';
    const baseAlpha = _lightFlash > 0.3 ? 1 : 0.85;
    ctx.strokeStyle = light
      ? `rgba(70,85,120,${baseAlpha})`
      : `rgba(205,220,250,${baseAlpha})`;
    for (const p of particles){
      const driftNow = p.drift * windGust;
      p.y += p.sp * dt;
      p.x += driftNow * dt;
      if (p.y > h + 40 || p.x < -60){
        p.x = rand(0, w + 60);
        p.y = rand(-80, -10);
      }
      ctx.globalAlpha = p.a;
      ctx.lineWidth = p.th;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + driftNow * 0.025, p.y + p.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ----- Screen droplets (foreground — on the camera/window) -----
    // Spawn new drop occasionally
    _newDropTimer -= dt;
    if (_newDropTimer <= 0){
      if (_screenDrops.length < 120) _screenDrops.push(makeScreenDrop());
      _newDropTimer = rand(0.4, 1.5);
    }
    for (let i = _screenDrops.length - 1; i >= 0; i--){
      const d = _screenDrops[i];
      d.life += dt;
      // Trigger slide for some drops randomly
      d.slideTimer -= dt;
      if (!d.sliding && d.slideTimer <= 0 && Math.random() < 0.02){
        d.sliding = true;
        d.slideVy = rand(60, 140);
      }
      if (d.sliding){
        d.slideY += d.slideVy * dt;
        d.slideVy += 80 * dt;  // accelerate (gravity)
      }
      const dy = d.y + d.slideY;
      if (dy > h + 20 || d.life > d.maxLife){
        _screenDrops.splice(i, 1);
        continue;
      }
      // Fade in then steady, fade out near death
      const fadeIn  = Math.min(1, d.life * 1.5);
      const fadeOut = Math.min(1, (d.maxLife - d.life) * 0.5);
      const alpha = d.a * Math.min(fadeIn, fadeOut) * (_lightFlash > 0.3 ? 1.4 : 1);

      // Slide trail (if sliding)
      if (d.sliding && d.slideY > 4){
        const trailGrad = ctx.createLinearGradient(d.x, d.y, d.x, dy);
        trailGrad.addColorStop(0, `rgba(170,200,230,0)`);
        trailGrad.addColorStop(1, `rgba(170,200,230,${alpha * 0.35})`);
        ctx.strokeStyle = trailGrad;
        ctx.lineCap = 'round';
        ctx.lineWidth = d.r * 0.8;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x, dy);
        ctx.stroke();
      }
      // Droplet body — gradient sphere
      const grad = ctx.createRadialGradient(d.x - d.r * 0.3, dy - d.r * 0.4, 0, d.x, dy, d.r);
      grad.addColorStop(0, `rgba(230,240,255,${alpha * 0.9})`);
      grad.addColorStop(0.5, `rgba(160,185,220,${alpha * 0.7})`);
      grad.addColorStop(1, `rgba(80,100,140,${alpha * 0.5})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(d.x, dy, d.r, 0, Math.PI * 2);
      ctx.fill();
      // Tiny specular highlight
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(d.x - d.r * 0.35, dy - d.r * 0.4, d.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // -------- SNOW --------
  function drawSnow(dt){
    const light = isLight();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = light ? 'rgba(150,180,220,0.55)' : 'rgba(220,235,255,0.85)';
    ctx.shadowBlur = 8;
    for (const p of particles){
      p.sway += p.swaySp * dt;
      p.x += Math.sin(p.sway) * 18 * dt;
      p.y += p.sp * dt;
      if (p.y > h + 10){ p.y = -10; p.x = rand(0, w); }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      ctx.globalAlpha = p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // -------- SAKURA --------
  function drawSakura(dt){
    for (const p of particles){
      p.sway += p.swaySp * dt;
      p.x += Math.sin(p.sway) * 35 * dt + 12 * dt;
      p.y += p.sp * dt;
      p.rot += p.rotSp * dt;
      if (p.y > h + 20){ p.y = -20; p.x = rand(-20, w); }
      if (p.x > w + 30) p.x = -30;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.a;
      // petal — 4 lobes shaped like cherry blossom
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r);
      grad.addColorStop(0, `hsla(${p.hue},90%,88%,1)`);
      grad.addColorStop(0.6, `hsla(${p.hue},80%,75%,0.85)`);
      grad.addColorStop(1, `hsla(${p.hue},70%,60%,0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      for (let i = 0; i < 5; i++){
        const a = (i / 5) * Math.PI * 2;
        ctx.ellipse(Math.cos(a) * p.r * 0.45, Math.sin(a) * p.r * 0.45, p.r * 0.6, p.r * 0.35, a, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // -------- AURORA --------
  let auroraT = 0;
  function drawAurora(dt){
    auroraT += dt;
    const light = isLight();
    // background bands (additive light ribbons)
    const bands = [
      { hue1: 160, hue2: 200, y: h * 0.28, amp: 80, sp: 0.18, alpha: 0.30 },
      { hue1: 280, hue2: 320, y: h * 0.42, amp: 100, sp: 0.13, alpha: 0.22 },
      { hue1: 180, hue2: 260, y: h * 0.55, amp: 60, sp: 0.22, alpha: 0.18 }
    ];
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
    for (const b of bands){
      const grad = ctx.createLinearGradient(0, b.y - b.amp, 0, b.y + b.amp + 60);
      grad.addColorStop(0,   `hsla(${b.hue1}, 90%, 60%, 0)`);
      grad.addColorStop(0.5, `hsla(${(b.hue1 + b.hue2)/2}, 90%, 65%, ${b.alpha * (light ? 0.6 : 1)})`);
      grad.addColorStop(1,   `hsla(${b.hue2}, 90%, 55%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, b.y);
      const step = 30;
      for (let x = 0; x <= w + step; x += step){
        const y = b.y + Math.sin((x * 0.006) + auroraT * b.sp) * b.amp
                      + Math.sin((x * 0.013) + auroraT * b.sp * 1.7) * (b.amp * 0.35);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, b.y + b.amp + 80);
      ctx.lineTo(0, b.y + b.amp + 80);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // sparse stars on top
    for (const p of particles){
      p.twPh += p.twSp * dt;
      const tw = 0.5 + 0.5 * Math.sin(p.twPh);
      ctx.globalAlpha = p.a * tw * (light ? 0.4 : 0.8);
      ctx.fillStyle = light ? 'rgba(60,40,120,1)' : 'rgba(255,255,255,1)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // -------- SUMMER (golden dust + light leaks) --------
  /* DRIFT — slow motes in the theme's own violet/cyan. Deliberately has no
     light leak: summer's warm gradient was what made it read as a season
     rather than as atmosphere. Hue is nudged by x so the field is not one flat
     colour, which is what separates this from generic floating dots. */
  function drawDrift(dt){
    for (const p of particles){
      p.tw += p.twSp * dt;
      p.x  += p.sp * dt * 0.55;
      p.y  += p.vy * dt * 0.55 + Math.sin(p.tw) * 5 * dt;
      if (p.x > w + 6) p.x = -6;
      if (p.x < -6)    p.x = w + 6;
      if (p.y > h + 6) p.y = -6;
      if (p.y < -6)    p.y = h + 6;
      const tw  = 0.35 + 0.65 * Math.abs(Math.sin(p.tw));
      const hue = 258 + (p.x / w) * 44;          /* violet through to cyan */
      ctx.globalAlpha = p.a * tw * 0.85;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.5);
      g.addColorStop(0, 'hsla(' + hue + ',85%,80%,1)');
      g.addColorStop(1, 'hsla(' + hue + ',85%,70%,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSummer(dt){
    const light = isLight();
    // soft light leak — radial in top-right
    ctx.globalCompositeOperation = light ? 'multiply' : 'screen';
    const lg = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, Math.max(w, h) * 0.65);
    lg.addColorStop(0,   light ? 'hsla(38,90%,70%,0.18)' : 'hsla(40,95%,65%,0.22)');
    lg.addColorStop(0.5, light ? 'hsla(28,90%,65%,0.08)' : 'hsla(30,90%,60%,0.10)');
    lg.addColorStop(1,   'hsla(20,90%,50%,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    // floating dust motes
    for (const p of particles){
      p.tw += p.twSp * dt;
      p.x += p.sp * dt;
      p.y += p.vy * dt + Math.sin(p.tw) * 6 * dt;
      if (p.x > w + 5) p.x = -5;
      if (p.x < -5) p.x = w + 5;
      if (p.y > h + 5) p.y = -5;
      if (p.y < -5) p.y = h + 5;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(p.tw));
      ctx.globalAlpha = p.a * tw;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      grad.addColorStop(0, light ? 'hsla(40,95%,55%,1)' : 'hsla(45,95%,75%,1)');
      grad.addColorStop(1, 'hsla(40,90%,60%,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // -------- STARS / GALAXY --------
  let shootCooldown = 0;
  function drawStars(dt){
    const light = isLight();
    // twinkling dots
    for (const p of particles){
      p.twPh += p.twSp * dt;
      const tw = 0.5 + 0.5 * Math.sin(p.twPh);
      ctx.globalAlpha = p.a * tw * (light ? 0.45 : 1);
      const c = light ? 'rgba(70,50,150,1)' : 'rgba(220,230,255,1)';
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      // cross flare on bigger stars
      if (p.r > 1.2 && tw > 0.85){
        ctx.globalAlpha = (tw - 0.85) * 4 * (light ? 0.4 : 0.9);
        ctx.strokeStyle = c;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(p.x - p.r * 3, p.y); ctx.lineTo(p.x + p.r * 3, p.y);
        ctx.moveTo(p.x, p.y - p.r * 3); ctx.lineTo(p.x, p.y + p.r * 3);
        ctx.stroke();
      }
    }
    // shooting stars
    shootCooldown -= dt;
    if (shootCooldown <= 0 && extras.length < 2){
      extras.push(makeShootingStar());
      shootCooldown = rand(3, 8);
    }
    for (let i = extras.length - 1; i >= 0; i--){
      const s = extras[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const k = 1 - (s.life / s.max);
      if (k <= 0 || s.x > w + 200){ extras.splice(i, 1); continue; }
      const a = Math.sin(Math.PI * (s.life / s.max));
      const gx = s.x - s.vx * 0.18;
      const gy = s.y - s.vy * 0.18;
      const grad = ctx.createLinearGradient(gx, gy, s.x, s.y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, light ? `rgba(120,90,220,${a * 0.9})` : `rgba(255,255,255,${a})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ============================================================
  // AUDIO — GFXToolz pattern: start muted → play() → fade in
  // ============================================================
  const AUDIO_SRC = {
    rain:   '/app/audio/rain-thunder.mp3',
    snow:   'https://cdn.pixabay.com/audio/2022/10/30/audio_0b22f24a05.mp3',
    aurora: 'https://cdn.pixabay.com/audio/2022/10/30/audio_0b22f24a05.mp3',
    sakura: '',
    summer: '',
    stars:  ''
  };
  let _fadeIv = null;
  function _fadeVolume(target, cb){
    if (_fadeIv){ clearInterval(_fadeIv); _fadeIv = null; }
    if (!audioEl) return;
    const DURATION = 1200, TICK = 30;
    const start = audioEl.volume, diff = target - start;
    if (Math.abs(diff) < 0.001){ audioEl.volume = target; cb && cb(); return; }
    const t0 = performance.now();
    _fadeIv = setInterval(()=>{
      if (!audioEl){ clearInterval(_fadeIv); _fadeIv = null; return; }
      const prog = Math.min(1, (performance.now() - t0) / DURATION);
      const eased = 1 - (1 - prog) * (1 - prog); // quadratic ease-out, same as GFXToolz
      audioEl.volume = Math.max(0, Math.min(1, start + diff * eased));
      if (prog >= 1){ clearInterval(_fadeIv); _fadeIv = null; cb && cb(); }
    }, TICK);
  }
  function syncAudio(){
    const src = AUDIO_SRC[state.mode] || '';
    if (!state.audio || !src){
      if (audioEl && !audioEl.paused){
        _fadeVolume(0, ()=>{ if(audioEl){ audioEl.pause(); audioEl.volume = 0; } });
      }
      return;
    }
    if (!audioEl){
      audioEl = document.createElement('audio');
      audioEl.loop = true;
      audioEl.preload = 'none';
      audioEl.style.display = 'none';
      document.body.appendChild(audioEl);
    }
    if (audioEl.dataset.src !== src){
      audioEl.dataset.src = src;
      audioEl.src = src;
    }
    if (audioEl.paused){
      audioEl.volume = 0; // start silent — Chrome always allows muted autoplay
      const p = audioEl.play();
      const fadeIn = ()=> _fadeVolume(Math.max(0, Math.min(1, state.volume)));
      if (p && p.then) p.then(fadeIn).catch(e=> console.warn('[GT Weather]', e.message));
      else fadeIn();
    } else {
      _fadeVolume(Math.max(0, Math.min(1, state.volume)));
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function start(){
    if (running) return;
    setupCanvas();
    setBgImage();
    setBackdrop();
    setGlass();
    seedParticles();
    canvas.style.opacity = '1';
    running = true;
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
    syncAudio();
  }
  function stop(){
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (canvas){
      canvas.style.opacity = '0';
      ctx && ctx.clearRect(0, 0, w, h);
    }
    clearBackdrop();
    setGlass();
    if (audioEl){ audioEl.pause(); }
  }
  function setMode(m){
    if (!MODES.includes(m)) m = 'off';
    state.mode = m;
    save();
    if (m === 'off'){ stop(); return; }
    setupCanvas();
    setBgImage();
    setBackdrop();
    setGlass();
    seedParticles();
    if (!running){ start(); } else { syncAudio(); }
    document.documentElement.setAttribute('data-weather', m);
  }
  function setIntensity(v){
    state.intensity = Math.max(0, Math.min(1, +v || 0));
    save();
    if (state.mode !== 'off'){
      setBackdrop();
      seedParticles();
    }
  }
  function setAudio(on){
    state.audio = !!on;
    save();
    syncAudio();
  }
  function setVolume(v){
    state.volume = Math.max(0, Math.min(1, +v || 0));
    save();
    if (audioEl && !audioEl.paused) _fadeVolume(state.volume);
  }
  function getState(){ return Object.assign({}, state); }

  // Pause when tab hidden (save battery + bandwidth)
  document.addEventListener('visibilitychange', () => {
    const bgVid = document.querySelector('#gtWeatherBg .gt-bg-video');
    if (document.visibilityState === 'hidden'){
      if (running && rafId){ cancelAnimationFrame(rafId); rafId = null; }
      if (audioEl && !audioEl.paused) audioEl.pause();
      if (bgVid && !bgVid.paused) bgVid.pause();
    } else if (state.mode !== 'off'){
      if (running && !rafId){ lastT = performance.now(); rafId = requestAnimationFrame(loop); }
      if (state.audio) syncAudio();
      if (bgVid && bgVid.paused){ const p = bgVid.play(); if (p && p.catch) p.catch(()=>{}); }
    }
  });

  // ---------- init on DOM ready ----------
  function init(){
    load();
    if (state.mode && state.mode !== 'off'){
      // Defer to avoid blocking initial paint
      setTimeout(() => setMode(state.mode), 250);
    } else {
      document.documentElement.setAttribute('data-weather', 'off');
    }
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // PANEL UI
  // ============================================================
  function buildPanel(){
    let panel = document.getElementById('weatherDropdown');
    if (!panel) return;
    if (panel.dataset.built === '1') return;
    panel.dataset.built = '1';
    panel.innerHTML = `
      <div class="weather-header">
        <div class="weather-title"><i class="fas fa-cloud-sun"></i> Weather Vibes</div>
        <div class="weather-sub">Three atmospheres, all drawn in your theme</div>
      </div>
      <div class="weather-grid" id="weatherGrid">
        <button class="weather-tile" data-mode="off" title="No effect"><i class="fas fa-ban"></i><span>Off</span></button>
        <button class="weather-tile mode-aurora" data-mode="aurora" title="Slow light ribbons"><i class="fas fa-meteor"></i><span>Aurora</span></button>
        <button class="weather-tile mode-drift"  data-mode="drift"  title="Floating motes of light"><i class="fas fa-wind"></i><span>Drift</span></button>
        <button class="weather-tile mode-rain"   data-mode="rain"   title="Quiet rainfall"><i class="fas fa-cloud-rain"></i><span>Rain</span></button>
      </div>
      <div class="weather-row">
        <span class="weather-row-label"><i class="fas fa-sliders"></i> Intensity</span>
        <input type="range" id="wIntensity" min="0" max="100" step="1" class="weather-slider">
      </div>
      <div class="weather-row">
        <span class="weather-row-label"><i class="fas fa-volume-low"></i> Ambient Audio</span>
        <label class="weather-switch"><input type="checkbox" id="wAudio"><span class="ws-track"><span class="ws-knob"></span></span></label>
      </div>
      <div class="weather-row" id="wVolRow">
        <span class="weather-row-label"><i class="fas fa-volume-high"></i> Volume</span>
        <div style="display:flex;align-items:center;gap:8px;flex:1">
          <input type="range" id="wVolume" min="0" max="100" step="1" class="weather-slider" style="flex:1">
          <span id="wVolPct" style="font-size:11px;color:var(--text-3);min-width:30px;text-align:right"></span>
        </div>
      </div>
      <div class="weather-foot"><i class="fas fa-wand-magic-sparkles"></i> Your vibe is saved locally</div>
    `;
    // wire events
    panel.querySelectorAll('.weather-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        setMode(btn.dataset.mode);
        syncPanel();
      });
    });
    const intEl = panel.querySelector('#wIntensity');
    const volEl = panel.querySelector('#wVolume');
    const audEl = panel.querySelector('#wAudio');
    intEl.addEventListener('input', () => setIntensity(intEl.value / 100));
    volEl.addEventListener('input', () => {
      setVolume(volEl.value / 100);
      const pct = panel.querySelector('#wVolPct');
      if (pct) pct.textContent = volEl.value + '%';
    });
    audEl.addEventListener('change', () => setAudio(audEl.checked));
    syncPanel();
  }
  function syncPanel(){
    const panel = document.getElementById('weatherDropdown');
    if (!panel || panel.dataset.built !== '1') return;
    panel.querySelectorAll('.weather-tile').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === state.mode);
    });
    const intEl = panel.querySelector('#wIntensity');
    const volEl = panel.querySelector('#wVolume');
    const audEl = panel.querySelector('#wAudio');
    if (intEl) intEl.value = (state.intensity * 100) | 0;
    if (volEl) volEl.value = (state.volume * 100) | 0;
    if (audEl) audEl.checked = state.audio;
    const pct = panel.querySelector('#wVolPct');
    if (pct) pct.textContent = ((state.volume * 100) | 0) + '%';
    const volRow = panel.querySelector('#wVolRow');
    if (volRow) volRow.style.display = state.audio ? '' : 'none';
  }

  window.toggleWeatherPanel = function(){
    const panel = document.getElementById('weatherDropdown');
    if (!panel) return;
    buildPanel();
    // close other dropdowns
    document.querySelectorAll('.dropdown-panel').forEach(d => {
      if (d !== panel) d.classList.add('hidden');
    });
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) syncPanel();
  };

  // Close on outside click
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('weatherWrap');
    const panel = document.getElementById('weatherDropdown');
    if (!wrap || !panel) return;
    if (panel.classList.contains('hidden')) return;
    if (!wrap.contains(e.target)) panel.classList.add('hidden');
  });

  // expose
  window.GTWeather = { setMode, setIntensity, setAudio, setVolume, getState, start, stop };
})();
