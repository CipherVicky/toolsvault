// ============================================================
// AI GENERATOR — unified page for all ai-* tool slugs
// Routes to image / video / audio / describe / bg-remove UI
// ============================================================

// ── Config ────────────────────────────────────────────────

// Real brand logo URLs per company
const _AIG_LOGOS = {
  graphico:   '/app/img/logo.png',
  bfl:        'https://www.google.com/s2/favicons?domain=blackforestlabs.ai&sz=64',     // Black Forest Labs (Flux)
  freepik:    'https://www.google.com/s2/favicons?domain=freepik.com&sz=64',            // Freepik (Mystic, Classic)
  bytedance:  'https://www.google.com/s2/favicons?domain=bytedance.com&sz=64',          // ByteDance (Seedream, Seedance)
  ideogram:   'https://www.google.com/s2/favicons?domain=ideogram.ai&sz=64',
  xai:        'https://www.google.com/s2/favicons?domain=x.ai&sz=64',                  // xAI (Grok)
  google:     'https://www.google.com/s2/favicons?domain=google.com&sz=64',            // Google (Imagen, Veo, Gemini)
  recraft:    'https://www.google.com/s2/favicons?domain=recraft.ai&sz=64',
  alibaba:    'https://www.google.com/s2/favicons?domain=qwen.ai&sz=64',               // Alibaba (Qwen)
  reve:       'https://www.google.com/s2/favicons?domain=reve.art&sz=64',
  kling:      'https://www.google.com/s2/favicons?domain=klingai.com&sz=64',           // Kuaishou (Kling)
  minimax:    'https://www.google.com/s2/favicons?domain=minimaxi.com&sz=64',          // Minimax (Hailuo)
  wan:        'https://www.google.com/s2/favicons?domain=wanxiang.ai&sz=64',           // Wan
  elevenlabs: 'https://www.google.com/s2/favicons?domain=elevenlabs.io&sz=64',
  openai:     'https://www.google.com/s2/favicons?domain=openai.com&sz=64',            // OpenAI (Sora, GPT Image)
  runway:     'https://www.google.com/s2/favicons?domain=runwayml.com&sz=64',
  deepmind:   'https://www.google.com/s2/favicons?domain=deepmind.google&sz=64',       // Google DeepMind (Veo)
  pixverse:   'https://www.google.com/s2/favicons?domain=pixverse.ai&sz=64',
  luma:       'https://www.google.com/s2/favicons?domain=lumalabs.ai&sz=64',
};

const AI_TOOL_CONFIGS = {
  'ai-nano-banana': {
    type: 'nano',
    name: 'Nano Banana All Image Models',
    desc: 'Google Nano Banana — references (style/character), AI prompt, up to 4K',
    icon: 'fa-wand-magic-sparkles',
    logo: _AIG_LOGOS.deepmind,
    color: '#4285f4',
    // All unlimited (free) — Google Nano Banana family. 4K is a resolution, not a model.
    models: [
      { id: 'imagen-nano-banana-2',       name: 'Google Nano Banana Pro', badge: 'Best', note: 'Gemini 3.0 Pro · refs · up to 4K', res: ['1k','2k','4k'], refs: true },
      { id: 'imagen-nano-banana-2-flash', name: 'Google Nano Banana 2',    badge: '',     note: 'Gemini 3.1 Flash · refs · up to 4K', res: ['1k','2k','4k'], refs: true },
      { id: 'imagen-nano-banana',         name: 'Google Nano Banana',      badge: '',      note: 'Original · references · 1K', res: [], refs: true },
    ]
  },
  'ai-unlimited': {
    type: 'image',
    name: 'AI Image Generator Unlimited',
    desc: 'Best-in-class models — all unlimited, zero credits',
    icon: 'fa-wand-magic-sparkles',
    logo: _AIG_LOGOS.graphico,
    color: '#8b5cf6',
    models: [
      { id: 'flux-2',               name: 'Flux.2 Pro',            badge: 'Best',    note: 'Sharpest details' },
      { id: 'mystic-2-5',           name: 'Mystic 2.5',            badge: 'Popular', note: 'Vivid & creative' },
      { id: 'seedream-4-5',         name: 'Seedream 4.5',          badge: '',        note: 'Photorealistic' },
      { id: 'grok',                 name: 'Grok',                  badge: '',        note: 'High creativity' },
      { id: 'ideogram',             name: 'Ideogram',              badge: '',        note: 'Best text in image' },
      { id: 'imagen-nano-banana-2', name: 'Google Nano Banana Pro', badge: '',       note: 'Google quality' },
      { id: 'recraft-v4',           name: 'Recraft V4',            badge: '',        note: 'Vector & design' },
      { id: 'reve',                 name: 'Reve',                  badge: '',        note: 'Cinematic style' },
      { id: 'flux-realism',         name: 'Flux Realism',          badge: '',        note: 'Ultra realistic' },
      // 4K is a resolution param on the base (unlimited) model, not a separate model id
      { id: 'seedream-4-5-4k',      apiModel: 'seedream-4-5', resolution: '4k', name: 'Seedream 4.5 4K', badge: '4K', note: 'Ultra high-res' },
      { id: 'imagen-nano-banana-2-4k', apiModel: 'imagen-nano-banana-2', resolution: '4k', name: 'Nano Banana Pro 4K', logo: _AIG_LOGOS.deepmind, badge: '4K', note: 'Ultra-res Google Imagen' },
      // ── Credit-based premium image models ──
      { id: 'flux-2-max',           name: 'Flux.2 Max',            logo: _AIG_LOGOS.bfl,     badge: '',      cost: 10,  note: 'Sharpest possible Flux' },
      { id: 'gpt-medium',           name: 'GPT Image',             logo: _AIG_LOGOS.openai,  badge: '',      cost: 50, note: 'OpenAI image quality' },
      { id: 'gpt-2',                name: 'GPT Image 2',           logo: _AIG_LOGOS.openai,  badge: 'Latest', cost: 50, note: 'Latest OpenAI image model' },
      { id: 'recraft-v4-pro',       name: 'Recraft V4 Pro',        logo: _AIG_LOGOS.recraft, badge: '',      cost: 50, note: 'Pro vector & design' },
    ]
  },
  'ai-flux': {
    type: 'image',
    name: 'Flux Image Generator',
    desc: 'State-of-the-art models by Black Forest Labs',
    icon: 'fa-bolt',
    logo: _AIG_LOGOS.bfl,
    color: '#6366f1',
    models: [
      { id: 'flux-2',            name: 'Flux.2 Pro',       badge: 'Best', note: 'Latest & sharpest' },
      { id: 'flux-2-klein',      name: 'Flux.2 Klein',     badge: '',     note: 'Compact + fast' },
      { id: 'flux-pro-plus',     name: 'Flux.1.1',         badge: '',     note: 'High fidelity' },
      { id: 'flux-dev',          name: 'Flux.1',           badge: '',     note: 'Standard quality' },
      { id: 'flux-realism',      name: 'Flux.1 Realism',   badge: '',     note: 'Ultra realistic' },
      { id: 'flux-kontext',      name: 'Flux Kontext Pro', badge: '',     note: 'Context-aware' },
      { id: 'flux-kontext-high', name: 'Flux Kontext Max', badge: '',     note: 'Max context' },
      { id: 'flux',              name: 'Flux.1 Fast',      badge: 'Fast', note: 'Fastest generation' },
      { id: 'flux-2-max',        name: 'Flux.2 Max',       logo: _AIG_LOGOS.bfl, badge: '', cost: 10, note: 'Sharpest possible Flux' },
    ]
  },
  'ai-mystic': {
    type: 'image',
    name: 'Mystic Image Generator',
    desc: 'Powerful Mystic AI model family',
    icon: 'fa-hat-wizard',
    logo: _AIG_LOGOS.freepik,
    color: '#a855f7',
    models: [
      { id: 'mystic-2-5',          name: 'Mystic 2.5',          badge: 'Best', note: 'Latest version' },
      { id: 'mystic-2-5-flexible', name: 'Mystic 2.5 Flexible', badge: '',     note: 'More creative' },
      { id: 'mystic-2-5-fluid',    name: 'Mystic 2.5 Fluid',    badge: '',     note: 'Smooth results' },
      { id: 'mystic',              name: 'Mystic 1.0',          badge: '',     note: 'Classic Mystic' },
    ]
  },
  'ai-seedream': {
    type: 'image',
    name: 'Seedream Image Generator',
    desc: 'ByteDance\'s Seedream high-quality image models',
    icon: 'fa-seedling',
    logo: _AIG_LOGOS.bytedance,
    color: '#10b981',
    models: [
      { id: 'seedream-5-lite', name: 'Seedream 5 Lite', badge: 'Latest', note: 'Newest model' },
      { id: 'seedream-4-5',    name: 'Seedream 4.5',    badge: 'Best',   note: 'Best balance' },
      { id: 'seedream-4-5-4k', apiModel: 'seedream-4-5', resolution: '4k', name: 'Seedream 4.5 4K', badge: '4K', note: 'Ultra high-res' },
      { id: 'seedream-4',      name: 'Seedream 4',      badge: '',       note: 'Solid quality' },
      { id: 'seedream-4-4k',   name: 'Seedream 4 4K',   badge: '4K',     note: 'High-res v4' },
      { id: 'seedream',        name: 'Seedream',        badge: '',       note: 'Classic version' },
    ]
  },
  'ai-ideogram': {
    type: 'image',
    name: 'Ideogram Image Generator',
    desc: 'Best AI model for text inside images',
    icon: 'fa-font',
    logo: _AIG_LOGOS.ideogram,
    color: '#f59e0b',
    models: [
      { id: 'ideogram',           name: 'Ideogram',           badge: 'Best', note: 'Great text rendering' },
    ]
  },
  'ai-grok': {
    type: 'image',
    name: 'Grok Image Generator',
    desc: 'xAI\'s powerful Grok image generation models',
    icon: 'fa-robot',
    logo: _AIG_LOGOS.xai,
    color: '#06b6d4',
    models: [
      { id: 'grok',      name: 'Grok',      badge: 'Best', note: 'High creativity' },
    ]
  },
  'ai-google': {
    type: 'image',
    name: 'Google Imagen Generator',
    desc: 'Google\'s Nano Banana photorealistic models',
    icon: 'fa-google',
    logo: _AIG_LOGOS.google,
    color: '#4285f4',
    models: [
      { id: 'imagen-nano-banana-2', name: 'Nano Banana Pro', badge: 'Best', note: '1K/period cap' },
      { id: 'imagen-nano-banana',   name: 'Nano Banana',     badge: '',     note: 'No cap' },
      { id: 'imagen-nano-banana-2-4k', apiModel: 'imagen-nano-banana-2', resolution: '4k', name: 'Nano Banana Pro 4K', logo: _AIG_LOGOS.deepmind, badge: '4K', note: 'Ultra-res Google Imagen' },
    ]
  },
  'ai-recraft': {
    type: 'image',
    name: 'Recraft Image Generator',
    desc: 'Vector-style and design-quality image generation',
    icon: 'fa-pen-ruler',
    logo: _AIG_LOGOS.recraft,
    color: '#ec4899',
    models: [
      { id: 'recraft-v4',   name: 'Recraft V4',   badge: 'Best', note: 'Latest version' },
      { id: 'recraft-v4-1', name: 'Recraft V4.1', badge: '',     note: '100 gen/period cap' },
      { id: 'recraft-v4-pro', name: 'Recraft V4 Pro', badge: '', cost: 210, note: 'Pro vector & design' },
    ]
  },
  'ai-qwen': {
    type: 'image',
    name: 'Qwen Image Generator',
    desc: 'Alibaba\'s Qwen visual AI generation models',
    icon: 'fa-atom',
    logo: _AIG_LOGOS.alibaba,
    color: '#f97316',
    models: [
      { id: 'qwen',      name: 'Qwen',      badge: 'Best', note: 'Standard generation' },
    ]
  },
  'ai-reve': {
    type: 'image',
    name: 'Reve Image Generator',
    desc: 'Cinematic quality image generation with Reve',
    icon: 'fa-film',
    logo: _AIG_LOGOS.reve,
    color: '#8b5cf6',
    models: [
      { id: 'reve', name: 'Reve', badge: 'Best', note: 'Cinematic style' },
    ]
  },
  'ai-classic': {
    type: 'image',
    name: 'Classic Image Generator',
    desc: 'Reliable Classic AI generation models',
    icon: 'fa-image',
    logo: _AIG_LOGOS.freepik,
    color: '#64748b',
    models: [
      { id: 'classic', name: 'Classic',      badge: 'Best', note: 'Reliable quality' },
      { id: 'fast',    name: 'Classic Fast', badge: 'Fast', note: 'Instant results' },
    ]
  },
  'ai-z-image': {
    type: 'image',
    name: 'Z-Image Generator',
    desc: 'Powerful unlimited generation with Z-Image',
    icon: 'fa-z',
    logo: _AIG_LOGOS.freepik,
    color: '#14b8a6',
    models: [
      { id: 'z-image', name: 'Z-Image', badge: 'Best', note: 'Unlimited' },
    ]
  },

  // ── Video ────────────────────────────────────────────────
  'ai-video': {
    type: 'video',
    name: 'AI Video Generator',
    desc: 'Generate cinematic videos from text or image prompts',
    icon: 'fa-video',
    logo: _AIG_LOGOS.kling,
    color: '#ef4444',
    models: [
      // ── Daily (free) models — included with plan, per-day limit ──
      {
        id: 'kling-25', name: 'Kling 2.5', logo: _AIG_LOGOS.kling, badge: 'Best', free: true,
        note: 'Highest quality, start image optional',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
      {
        id: 'minimax-video-2_3', name: 'Minimax Hailuo 2.3', logo: _AIG_LOGOS.minimax, badge: '', free: true,
        note: 'Text-to-video only, 768p · 6 sec',
        requiresImage: false, supportsImage: false, durations: [6], maxRes: '768p'
      },
      {
        id: 'minimax-video-2_3-fast', name: 'Minimax Hailuo Fast', logo: _AIG_LOGOS.minimax, badge: 'Fast', free: true,
        note: 'Start image required, fast generation',
        requiresImage: true, supportsImage: true, durations: [6], maxRes: '768p'
      },
      {
        id: 'wan-2-2', name: 'Wan 2.2', logo: _AIG_LOGOS.wan, badge: '', free: true,
        note: 'Start image required, 480p',
        requiresImage: true, supportsImage: true, durations: [5], maxRes: '480p'
      },
      // ── Credit-based premium models ──
      {
        id: 'bytedance-seedance-fast-2.0', name: 'Seedance 2.0 Fast', logo: _AIG_LOGOS.bytedance, badge: 'Popular', cost: 10,
        note: 'Fast cinematic video, image optional',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
      {
        id: 'bytedance-seedance-pro-2.0', name: 'Seedance 2.0 Pro', logo: _AIG_LOGOS.bytedance, badge: '', cost: 10,
        note: 'Higher quality Seedance',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
      {
        id: 'minimax-video-02', name: 'Minimax Hailuo 02', logo: _AIG_LOGOS.minimax, badge: '', cost: 10,
        note: 'Smooth realistic motion',
        requiresImage: false, supportsImage: true, durations: [6], maxRes: '1080p'
      },
      {
        id: 'grok-default', name: 'Grok Video', logo: _AIG_LOGOS.xai, badge: '', cost: 10,
        note: 'xAI cinematic generation',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
      {
        id: 'pixverse-6', name: 'PixVerse 6', logo: _AIG_LOGOS.pixverse, badge: '', cost: 10,
        note: 'Stylised & anime motion',
        requiresImage: false, supportsImage: true, durations: [5, 8], maxRes: '1080p'
      },
      {
        id: 'kling-30', name: 'Kling 3.0', logo: _AIG_LOGOS.kling, badge: 'Best', cost: 50,
        note: 'Flagship Kling — top quality',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
      {
        id: 'kling-26', name: 'Kling 2.6', logo: _AIG_LOGOS.kling, badge: '', cost: 50,
        note: 'High-detail Kling',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
      {
        id: 'google-veo3_1-fast', name: 'Veo 3.1 Fast', logo: _AIG_LOGOS.deepmind, badge: '', cost: 150,
        note: 'Google Veo — fast mode',
        requiresImage: false, supportsImage: true, durations: [5, 8], maxRes: '1080p'
      },
      {
        id: 'runway-std', name: 'Runway Gen 4', logo: _AIG_LOGOS.runway, badge: '', cost: 150,
        note: 'Runway cinematic engine',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
      {
        id: 'openai-sora2-standard', name: 'Sora 2', logo: _AIG_LOGOS.openai, badge: 'Latest', cost: 150,
        note: 'OpenAI Sora 2',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
      {
        id: 'google-veo3_1', name: 'Veo 3.1', logo: _AIG_LOGOS.deepmind, badge: '', cost: 150,
        note: 'Google Veo 3.1 — premium',
        requiresImage: false, supportsImage: true, durations: [5, 8], maxRes: '1080p'
      },
      {
        id: 'runway-gen45', name: 'Runway Gen 4.5', logo: _AIG_LOGOS.runway, badge: '', cost: 400,
        note: 'Runway flagship',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
      {
        id: 'openai-sora2-pro', name: 'Sora 2 Pro', logo: _AIG_LOGOS.openai, badge: 'Ultra', cost: 400,
        note: 'OpenAI Sora 2 Pro — best quality',
        requiresImage: false, supportsImage: true, durations: [5, 10], maxRes: '1080p'
      },
    ]
  },

  // ── Audio ────────────────────────────────────────────────
  'ai-audio': {
    type: 'audio',
    name: 'AI Text-to-Speech',
    desc: 'Natural-sounding voices with ElevenLabs & Google',
    icon: 'fa-microphone',
    logo: _AIG_LOGOS.elevenlabs,
    color: '#f59e0b',
  },

  // ── Utility ──────────────────────────────────────────────
  'ai-describe': {
    type: 'describe',
    name: 'AI Image Describer',
    desc: 'Generate detailed descriptions for any image — unlimited, no credits',
    icon: 'fa-eye',
    logo: _AIG_LOGOS.graphico,
    color: '#10b981',
  },
  'ai-bg-remove': {
    type: 'bg-remove',
    name: 'AI Background Remover',
    desc: 'Remove backgrounds instantly — transparent PNG, unlimited',
    icon: 'fa-scissors',
    logo: _AIG_LOGOS.graphico,
    color: '#ec4899',
  },
};

const ASPECT_RATIOS = [
  { id: '1:1',  label: '1:1',  note: '1024×1024' },
  { id: '16:9', label: '16:9', note: '1024×576'  },
  { id: '9:16', label: '9:16', note: '576×1024'  },
  { id: '4:3',  label: '4:3',  note: '1024×768'  },
  { id: '3:4',  label: '3:4',  note: '768×1024'  },
  { id: '4:5',  label: '4:5',  note: '832×1024'  },
  { id: '3:2',  label: '3:2',  note: '1024×683'  },
  { id: '2:3',  label: '2:3',  note: '683×1024'  },
];

const VOICES = [
  { id: 'Rachel',    name: 'Rachel',    gender: 'F', accent: 'American',   style: 'Calm' },
  { id: 'Aria',      name: 'Aria',      gender: 'F', accent: 'American',   style: 'Expressive' },
  { id: 'Sarah',     name: 'Sarah',     gender: 'F', accent: 'American',   style: 'Soft' },
  { id: 'Laura',     name: 'Laura',     gender: 'F', accent: 'American',   style: 'Upbeat' },
  { id: 'Charlotte', name: 'Charlotte', gender: 'F', accent: 'British',    style: 'Warm' },
  { id: 'Alice',     name: 'Alice',     gender: 'F', accent: 'British',    style: 'Confident' },
  { id: 'Matilda',   name: 'Matilda',   gender: 'F', accent: 'American',   style: 'Friendly' },
  { id: 'A-Xee',     name: 'A-Xee',     gender: 'M', accent: 'American',   style: 'Natural' },
  { id: 'Adam',      name: 'Adam',      gender: 'M', accent: 'American',   style: 'Deep' },
  { id: 'Antoni',    name: 'Antoni',    gender: 'M', accent: 'American',   style: 'Well-rounded' },
  { id: 'Josh',      name: 'Josh',      gender: 'M', accent: 'American',   style: 'Deep' },
  { id: 'Sam',       name: 'Sam',       gender: 'M', accent: 'American',   style: 'Raspy' },
  { id: 'Dave',      name: 'Dave',      gender: 'M', accent: 'British',    style: 'Conversational' },
  { id: 'Charlie',   name: 'Charlie',   gender: 'M', accent: 'Australian', style: 'Natural' },
  { id: 'Brian',     name: 'Brian',     gender: 'M', accent: 'American',   style: 'Deep' },
  { id: 'George',    name: 'George',    gender: 'M', accent: 'British',    style: 'Warm' },
];

const AUDIO_MODELS = [
  { id: 'eleven_v3',         name: 'ElevenLabs v3',  note: 'Best quality · natural', badge: 'Best' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5',     note: 'Fast · low latency',     badge: 'Fast' },
  { id: 'gemini_v2_5_pro',   name: 'Gemini 2.5 Pro', note: 'Google TTS · 5 credits', badge: '' },
];

// Badge accent CSS vars
const _aigBadgeAccents = {
  'Best':    '--mc-bar:#8b5cf6;--mc-bg:rgba(139,92,246,.1)',
  'Popular': '--mc-bar:#f59e0b;--mc-bg:rgba(245,158,11,.1)',
  'Fast':    '--mc-bar:#06b6d4;--mc-bg:rgba(6,182,212,.1)',
  '4K':      '--mc-bar:#ec4899;--mc-bg:rgba(236,72,153,.1)',
  'Latest':  '--mc-bar:#10b981;--mc-bg:rgba(16,185,129,.1)',
  'New':     '--mc-bar:#10b981;--mc-bg:rgba(16,185,129,.1)',
};
const _aigBadgeClass = {
  'Best':'aig-mb-best','Popular':'aig-mb-popular','Fast':'aig-mb-fast',
  '4K':'aig-mb-4k','Latest':'aig-mb-latest','New':'aig-mb-new',
};

// ── Credits state ─────────────────────────────────────────
let _aigCredits = { balance: 0, used: 0, plan_allocation: 0, plan: 'free', loaded: false };
let _aigUsage = { daily: {} };  // { daily: { image:{used,limit}, video:{...}, audio:{...} } }

async function _aigLoadCredits() {
  if (!userToken) return;
  try {
    const data = await api('/api/user/credits');
    _aigCredits = { ...data, loaded: true };
    _aigRefreshCreditsDisplay();
  } catch { /* silent */ }
  try {
    _aigUsage = await api('/api/ai/usage');
  } catch { /* silent */ }
  // If the picker was rendered before visibility was known (cold first open) and a
  // now-hidden model is still showing, re-render the current generator cleanly.
  try {
    const cfg = AI_TOOL_CONFIGS[_aigState.toolSlug];
    if (cfg && cfg.models && document.getElementById('aigModelPanel')) {
      const visIds = new Set(_aigVisibleModels(cfg).map(m => m.id));
      const shownIds = Array.from(document.querySelectorAll('#aigModelPanel .aig-drop-item')).map(i => i.dataset.model);
      const mismatch = shownIds.length !== visIds.size || shownIds.some(id => !visIds.has(id));
      if (mismatch) { aiGenOpen(_aigState.toolSlug); return; }
    }
  } catch { /* silent */ }
  _aigRefreshCostPills();
  _aigUpdateModelStatus();
}

function _aigRefreshCreditsDisplay() {
  const el = document.getElementById('aigCreditsDisplay');
  if (!el) return;
  const { balance, used, plan_allocation, unlimited } = _aigCredits;
  if (unlimited) {
    el.innerHTML = `
    <div class="aig-cr-wrap" title="Unlimited credits (admin-granted)">
      <i class="fas fa-infinity aig-cr-icon"></i>
      <div class="aig-cr-info"><span class="aig-cr-balance">Unlimited credits</span></div>`;
    return;
  }
  const total = balance;
  const pct = plan_allocation > 0 ? Math.min(100, Math.round((used / plan_allocation) * 100)) : 0;
  el.innerHTML = `
    <div class="aig-cr-wrap" title="${used} used of ${plan_allocation} plan allocation · ${balance} total balance">
      <i class="fas fa-coins aig-cr-icon"></i>
      <div class="aig-cr-info">
        <span class="aig-cr-balance">${total.toLocaleString()} credits</span>
        ${plan_allocation > 0 ? `<div class="aig-cr-bar"><div class="aig-cr-bar-fill" style="width:${pct}%"></div></div>` : ''}
      </div>
      <button class="aig-cr-buy" onclick="showPage('pricing')" title="Buy more credits"><i class="fas fa-plus"></i></button>
    </div>`;
}

// ── Shared state ──────────────────────────────────────────

let _aigState = {
  toolSlug: null,
  toolType: 'image',
  selectedModel: null,
  aspectRatio: '1:1',
  numImages: 1,
  duration: 5,
  selectedVoice: 'A-Xee',
  audioModel: 'eleven_v3',
  speed: 1.0,
  startImageData: null,
  describeImageData: null,
  bgrImageData: null,
  // R2 URLs (set in the background after a file is picked) — preferred over base64
  // at generate time so big images bypass Render egress. Null = use base64 fallback.
  startImageUrl: null,
  describeImageUrl: null,
  bgrImageUrl: null,
  generating: false,
  results: []
};

// Upload a picked image straight to Cloudflare R2 (bypasses Render egress). Sets
// the resulting fetchable URL via setUrl(). Silent no-op on any failure → the
// generate call falls back to base64-through-server, so AI tools never break.
async function _aigUploadToR2(file, setUrl) {
  try {
    const ct = file.type || 'image/png';
    const r = await api('/api/ai/upload-url', 'POST', { contentType: ct });
    if (!r || !r.putUrl) return;
    const put = await fetch(r.putUrl, { method: 'PUT', headers: { 'Content-Type': ct }, body: file });
    if (put.ok) setUrl(r.getUrl);
  } catch (e) { /* fallback to base64 */ }
}

// Voice preview state
let _aigVoiceAudio = null;
let _aigPlayingVoiceId = null;
let _aigVoicesCache = null;
let _aigVoiceSearchTerm = '';
let _aigCurrentGenderFilter = 'all';
let _aigCurrentAccentFilter = 'all';
let _aigCurrentAgeFilter = 'all';
let _aigCurrentProviderFilter = 'all';
let _aigCurrentUseCaseFilter = 'all';

const _VOICES_LS_KEY = 'gt_voices_v1';
const _VOICES_LS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Generator session persistence (survives refresh / back button) ──────────
// Per-tool localStorage entry tracks BOTH an in-progress job AND the last finished
// result, so neither a running task nor a completed one disappears on refresh.
// We only store a tiny pointer (job id) or small CDN URLs / text — the work runs
// server-side and media lives on the proxy CDN, so this costs ~0 Render/Cloudflare
// storage or bandwidth. Entries auto-expire after 2 hours.
const _AIGEN_TTL = 2 * 60 * 60 * 1000;
let _aigActivePoll = null; // { poll, prog } interval handles for the running poll
function _aigSesKey(slug) { return 'gt_aigen_' + slug; }
function _aigSesSave(slug, o) { try { localStorage.setItem(_aigSesKey(slug), JSON.stringify({ ...o, ts: Date.now() })); } catch (e) {} }
function _aigSesClear(slug) { try { localStorage.removeItem(_aigSesKey(slug)); } catch (e) {} }
function _aigSesGet(slug) {
  try {
    const s = JSON.parse(localStorage.getItem(_aigSesKey(slug)) || 'null');
    if (!s) return null;
    if (Date.now() - (s.ts || 0) > _AIGEN_TTL) { _aigSesClear(slug); return null; }
    return s;
  } catch (e) { return null; }
}
function _aigClearActivePoll() { clearInterval(_aigProgInterval); _aigProgInterval = null; if (_aigActivePoll) { clearInterval(_aigActivePoll.poll); if (_aigActivePoll.prog) clearInterval(_aigActivePoll.prog); _aigActivePoll = null; } }

// ── Shared generation progress bar (used by image / audio / video) ───────────
// Smoothly eases a bar toward 95% over the expected duration, shows % + live
// status messages + elapsed/ETA. Completes to 100% on success, removed on error.
let _aigProgInterval = null;
function _aigFmtDur(s) { s = Math.max(0, Math.round(s)); return s >= 60 ? Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's' : s + 's'; }
function _aigProgressStart(opts) {
  const resultsEl = document.getElementById('aigResults');
  if (!resultsEl) return;
  const empty = document.getElementById('aigEmpty'); if (empty) empty.style.display = 'none';
  const totalSec = opts.totalSec || 60;
  const etaTxt = totalSec >= 60 ? '~' + Math.round(totalSec / 60) + ' min est.' : '~' + totalSec + 's est.';
  let card = document.getElementById('aigGenProgress');
  if (!card) {
    card = document.createElement('div');
    card.id = 'aigGenProgress'; card.className = 'aig-gen-progress';
    card.innerHTML = `
      <div class="aig-gp-head">
        <div class="aig-gp-icon"><i class="fas ${opts.icon || 'fa-wand-magic-sparkles'} fa-beat"></i></div>
        <div class="aig-gp-text">
          <div class="aig-gp-title">${opts.title || 'Generating…'}</div>
          <div class="aig-gp-sub" id="aigGpSub">${opts.sub || ''}</div>
        </div>
        <div class="aig-gp-pct" id="aigGpPct">0%</div>
        <button class="aig-gp-cancel" onclick="_aigCancel()" title="Cancel generation"><i class="fas fa-xmark"></i></button>
      </div>
      <div class="aig-gp-track"><div class="aig-gp-bar" id="aigGpBar"></div></div>
      <div class="aig-gp-foot"><span id="aigGpElapsed"><i class="far fa-clock"></i> 0s</span><span id="aigGpEta">${etaTxt}</span></div>`;
    resultsEl.prepend(card);
  }
  const startTs = opts.startTs || Date.now();
  const msgs = opts.statusMsgs || null;
  clearInterval(_aigProgInterval);
  const tick = () => {
    const elapsed = (Date.now() - startTs) / 1000;
    let pct = (1 - Math.exp(-elapsed / (totalSec * 0.5))) * 95; // ease-out, asymptotes near 95% (never "finishes" early)
    pct = Math.max(2, Math.min(95, pct));
    const bar = document.getElementById('aigGpBar'); if (bar) bar.style.width = pct.toFixed(1) + '%';
    const p = document.getElementById('aigGpPct'); if (p) p.textContent = Math.round(pct) + '%';
    const el = document.getElementById('aigGpElapsed'); if (el) el.innerHTML = '<i class="far fa-clock"></i> ' + _aigFmtDur(elapsed);
    const eta = document.getElementById('aigGpEta'); if (eta) { const rem = totalSec - elapsed; eta.textContent = rem > 1 ? '~' + _aigFmtDur(rem) + ' left' : 'almost done…'; }
    const sub = document.getElementById('aigGpSub'); if (sub && msgs) { const m = msgs.slice().reverse().find(([s]) => elapsed >= s); if (m) sub.textContent = m[1]; }
  };
  tick();
  _aigProgInterval = setInterval(tick, 500);
}
// Cancel the in-progress generation: stop polling + progress, tell the server to
// skip charging, clear the saved session, and reset the UI. Works for all types.
function _aigCancel() {
  const slug = _aigState.toolSlug;
  const ses = _aigSesGet(slug);
  const jobId = ses && ses.jobId;
  _aigClearActivePoll();      // stops the poll loop + the shared progress interval
  _aigProgressStop(false);    // removes the progress card
  _aigSesClear(slug);         // forget the job so it won't resume on refresh
  _aigState.generating = false;
  if (jobId) { api('/api/ai/jobs/' + jobId + '/cancel', 'POST').catch(() => {}); } // best-effort, no charge
  // reset the generate button for the current tool type
  if (_aigState.toolType === 'audio') { _aigAudioBtnReset && _aigAudioBtnReset(); }
  else if (_aigState.toolType === 'video') { const b = document.getElementById('aigGenerateBtn'); if (b) { b.disabled = false; b.innerHTML = '<i class="fas fa-clapperboard"></i> Generate'; } }
  else { _aigImageBtnReset && _aigImageBtnReset(); }
  document.getElementById('aigSkeletons')?.remove();
  const empty = document.getElementById('aigEmpty'); if (empty) empty.style.display = '';
  toast('Generation cancelled', 'info');
}
function _aigProgressStop(complete) {
  clearInterval(_aigProgInterval); _aigProgInterval = null;
  const card = document.getElementById('aigGenProgress');
  if (!card) return;
  if (complete) {
    const bar = document.getElementById('aigGpBar'); if (bar) bar.style.width = '100%';
    const p = document.getElementById('aigGpPct'); if (p) p.textContent = '100%';
    const sub = document.getElementById('aigGpSub'); if (sub) sub.textContent = 'Done!';
    setTimeout(() => document.getElementById('aigGenProgress')?.remove(), 450);
  } else {
    card.remove();
  }
}

// ── Entry point ───────────────────────────────────────────

function aiGenOpen(slug) {
  const config = AI_TOOL_CONFIGS[slug];
  if (!config) return;
  sessionStorage.setItem('gt_last_ai_tool', slug);
  _aigState.toolSlug = slug;
  _aigState.toolType = config.type || 'image';
  _aigState.selectedModel = config.models ? (_aigVisibleModels(config)[0] || config.models[0]).id : null;
  _aigState.aspectRatio = '1:1';
  _aigState.numImages = 1;
  _aigState.duration = 5;
  _aigState.generating = false;
  _aigState.results = [];
  _aigState.startImageData = null;
  _aigState.describeImageData = null;
  _aigState.bgrImageData = null;
  _aigState.startImageUrl = null;
  _aigState.describeImageUrl = null;
  _aigState.bgrImageUrl = null;
  _aigState.resolution = '';   // '' = Auto → don't send the param (raw API default = original quality)
  _aigState.aiPrompt = false;  // off = send your exact prompt (raw API), on = let the model refine it
  _aigState.references = [];
  showPage('ai-gen');
  history.replaceState({ page: 'ai-gen', aiSlug: slug }, '', `/app/ai-gen/${slug}`);
  switch (_aigState.toolType) {
    case 'video':     _aigRenderVideo(config);    break;
    case 'audio':     _aigRenderAudio(config);    break;
    case 'describe':  _aigRenderDescribe(config); break;
    case 'bg-remove': _aigRenderBgRemove(config); break;
    case 'nano':      _aigRenderNano(config);     break;
    default:          _aigRenderNano(config);     break; // all image tools use the rich, capability-aware renderer
  }
}

// ── Shared header ─────────────────────────────────────────

function _aigHeader(config, badgeHtml) {
  _aigLoadCredits(); // refresh credits every time a generator opens
  return `
    <div class="aig-header">
      <button class="aig-back" onclick="showPage('tools')"><i class="fas fa-arrow-left"></i> Back</button>
      <div class="aig-header-info">
        <div class="aig-header-icon" style="background:linear-gradient(135deg,${config.color}22,${config.color}44);color:${config.color}">
          ${config.logo
            ? `<img src="${config.logo}" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:6px" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><i class="fas ${config.icon}" style="display:none"></i>`
            : `<i class="fas ${config.icon}"></i>`
          }
        </div>
        <div>
          <h1 class="aig-title">${config.name}</h1>
          <p class="aig-desc">${config.desc}</p>
        </div>
      </div>
      <div class="aig-header-right">
        ${badgeHtml}
        <div id="aigCreditsDisplay" class="aig-credits-display"></div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin:0 0 14px;padding:9px 14px;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.28);border-radius:10px;font-size:12.5px;color:#fcd34d">
      <i class="fas fa-triangle-exclamation"></i>
      <span><b>Save your result right after it's ready.</b> Generated files are temporary and expire — download the image, video or audio to keep it. We don't store them permanently.</span>
    </div>`;
}

// ── Model dropdown HTML helper ────────────────────────────

function _aigModelDropHtml(config, selectedId) {
  const visModels = _aigVisibleModels(config);
  const sel = visModels.find(m => m.id === selectedId) || visModels[0];
  const bClass = _aigBadgeClass[sel.badge] || '';

  const items = visModels.map(m => {
    const accent = _aigBadgeAccents[m.badge] || '--mc-bar:#4b5563;--mc-bg:rgba(75,85,99,.06)';
    const bc = _aigBadgeClass[m.badge] || '';
    const isActive = m.id === selectedId;
    let extras = '';
    if (m.maxRes) extras += `<span class="aig-model-res-badge">${m.maxRes}</span>`;
    if (m.requiresImage) extras += `<span class="aig-model-req-badge"><i class="fas fa-image" style="font-size:8px"></i> Required</span>`;
    else if (m.supportsImage) extras += `<span class="aig-model-opt-badge"><i class="fas fa-image" style="font-size:8px"></i> Optional</span>`;
    const logoHtml = (m.logo || config.logo)
      ? `<img src="${m.logo || config.logo}" alt="" class="aig-drop-item-logo" onerror="this.style.display='none'">`
      : '';
    return `<button class="aig-drop-item${isActive ? ' active' : ''}" data-model="${m.id}"
      style="${accent}" onclick="_aigSelectModelDrop('${m.id}')">
      ${logoHtml}
      <div class="aig-drop-item-body">
        <div class="aig-drop-item-row">
          <span class="aig-drop-item-name">${m.name}</span>
          ${m.badge ? `<span class="aig-model-badge ${bc}">${m.badge}</span>` : ''}
          ${_aigCostPill(m)}
          ${extras}
          <i class="fas fa-check aig-drop-item-check"></i>
        </div>
        ${m.note ? `<div class="aig-drop-item-note">${m.note}</div>` : ''}
      </div>
    </button>`;
  }).join('');

  return `
    <div class="aig-ctrl-group" style="width:100%">
      <div class="aig-ctrl-label">Model</div>
      <div class="aig-drop-outer">
        <button class="aig-drop-trigger" id="aigModelTrigger" onclick="_aigToggleModelDrop(event)" aria-expanded="false">
          <span id="aigModelTriggerName">${sel.name}</span>
          ${sel.badge ? `<span class="aig-model-badge ${bClass}" id="aigModelTriggerBadge">${sel.badge}</span>` : '<span id="aigModelTriggerBadge" style="display:none"></span>'}
          <span id="aigModelTriggerCost">${_aigCostPill(sel)}</span>
          <i class="fas fa-chevron-down aig-drop-chevron"></i>
        </button>
        <div class="aig-drop-panel" id="aigModelPanel">${items}</div>
      </div>
    </div>
    <div class="aig-model-status" id="aigModelStatus"></div>`;
}

// Models a NORMAL user may see. A model is hidden when the live admin config says
// is_user_visible=0 (credit models are hidden by default, admin-toggleable). Until
// /api/ai/usage has loaded we can't know, so show all (then _aigLoadCredits re-renders
// once the real visibility arrives). Never returns an empty list — if everything is
// hidden we keep the first model so the picker isn't broken (the server still blocks it).
function _aigVisibleModels(config) {
  if (!config || !Array.isArray(config.models)) return [];
  if (!(_aigUsage && _aigUsage.models)) return config.models;
  const vis = config.models.filter(m => {
    const c = _aigUsage.models[m.id];
    return !c || c.visible !== false;
  });
  return vis.length ? vis : config.models;
}

// Per-model config from the live admin DB (mode/cost/limit/used); falls back to hardcoded `cost`
function _aigModelCfg(m) {
  if (!m) return null;
  if (_aigUsage && _aigUsage.models && _aigUsage.models[m.id]) return _aigUsage.models[m.id];
  // fallback from the static config
  if (m.cost) return { mode: 'credit', cost: m.cost };
  return { mode: 'daily', limit: null, used: 0 };
}

// Cost pill: credit models show "N credits"; daily models show the per-plan
// allowance ("N/day"); only genuinely-uncapped models show "Free".
function _aigCostPill(m) {
  const cfg = _aigModelCfg(m);
  if (cfg && cfg.mode === 'credit' && cfg.cost > 0) return `<span class="aig-cost-pill credit"><i class="fas fa-coins"></i> ${cfg.cost}</span>`;
  if (cfg && cfg.mode === 'daily' && cfg.limit != null) {
    if (cfg.limit > 0) return `<span class="aig-cost-pill daily" style="color:#38bdf8;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.28)"><i class="fas fa-bolt"></i> ${cfg.limit}/day</span>`;
    return `<span class="aig-cost-pill locked" style="color:#f59e0b;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.28)"><i class="fas fa-lock"></i> Upgrade</span>`;
  }
  return `<span class="aig-cost-pill free"><i class="fas fa-infinity"></i> Free</span>`;
}

// Refresh all visible cost pills (dropdown items + trigger) after live config loads
function _aigRefreshCostPills() {
  const config = AI_TOOL_CONFIGS[_aigState.toolSlug];
  if (!config || !config.models) return;
  document.querySelectorAll('#aigModelPanel .aig-drop-item').forEach(item => {
    const m = config.models.find(x => x.id === item.dataset.model);
    if (!m) return;
    const row = item.querySelector('.aig-drop-item-row');
    const old = row && row.querySelector('.aig-cost-pill');
    if (old) { const tmp = document.createElement('div'); tmp.innerHTML = _aigCostPill(m); old.replaceWith(tmp.firstElementChild); }
  });
  const sel = config.models.find(x => x.id === _aigState.selectedModel);
  const tc = document.getElementById('aigModelTriggerCost');
  if (tc && sel) tc.innerHTML = _aigCostPill(sel);
}

// Status line under the model picker: per-day remaining (daily) or credit cost + balance
function _aigUpdateModelStatus() {
  const el = document.getElementById('aigModelStatus');
  if (!el) return;
  const config = AI_TOOL_CONFIGS[_aigState.toolSlug];
  const m = config && config.models ? config.models.find(x => x.id === _aigState.selectedModel) : null;
  if (!m) { el.innerHTML = ''; return; }
  const cfg = _aigModelCfg(m);
  if (cfg && cfg.mode === 'credit' && cfg.cost > 0) {
    const bal = _aigCredits.balance || 0;
    const enough = bal >= cfg.cost;
    el.innerHTML = `<span class="aig-ms ${enough ? '' : 'aig-ms-low'}">
      <i class="fas fa-coins"></i> Costs <b>${cfg.cost} credits</b> per generation · You have <b>${bal.toLocaleString()}</b>
      ${enough ? '' : ` — <a onclick="showPage('pricing')" style="color:var(--accent);cursor:pointer">buy more</a>`}
    </span>`;
  } else if (cfg && cfg.mode === 'daily' && cfg.limit != null) {
    const left = Math.max(0, (cfg.limit || 0) - (cfg.used || 0));
    el.innerHTML = `<span class="aig-ms ${left === 0 ? 'aig-ms-low' : ''}">
      <i class="fas fa-bolt"></i> <b>${left}</b> of <b>${cfg.limit || 0}</b> ${escapeHtml(m.name)} generations left today
      ${left === 0 ? ` — <a onclick="showPage('pricing')" style="color:var(--accent);cursor:pointer">upgrade</a>` : ''}
    </span>`;
  } else {
    el.innerHTML = '';
  }
}

function _aigDailyCat(type) {
  if (type === 'video') return 'video';
  if (type === 'image') return 'image';
  if (type === 'audio') return 'audio';
  return null;
}

// Audio model dropdown HTML
function _aigAudioModelDropHtml() {
  const sel = AUDIO_MODELS.find(m => m.id === _aigState.audioModel) || AUDIO_MODELS[0];
  const bClass = _aigBadgeClass[sel.badge] || '';

  const items = AUDIO_MODELS.map(m => {
    const accent = _aigBadgeAccents[m.badge] || '--mc-bar:#4b5563;--mc-bg:rgba(75,85,99,.06)';
    const bc = _aigBadgeClass[m.badge] || '';
    const isActive = m.id === _aigState.audioModel;
    return `<button class="aig-drop-item${isActive ? ' active' : ''}" data-model="${m.id}"
      style="${accent}" onclick="_aigSelectAudioModelDrop('${m.id}')">
      <div class="aig-drop-item-body">
        <div class="aig-drop-item-row">
          <span class="aig-drop-item-name">${m.name}</span>
          ${m.badge ? `<span class="aig-model-badge ${bc}">${m.badge}</span>` : ''}
          <i class="fas fa-check aig-drop-item-check"></i>
        </div>
        ${m.note ? `<div class="aig-drop-item-note">${m.note}</div>` : ''}
      </div>
    </button>`;
  }).join('');

  return `
    <div class="aig-ctrl-group" style="width:100%">
      <div class="aig-ctrl-label">TTS Model</div>
      <div class="aig-drop-outer">
        <button class="aig-drop-trigger" id="aigAudioModelTrigger" onclick="_aigToggleAudioModelDrop(event)" aria-expanded="false" style="min-width:100%;box-sizing:border-box">
          <span id="aigAudioModelTriggerName">${sel.name}</span>
          ${sel.badge ? `<span class="aig-model-badge ${bClass}" id="aigAudioModelTriggerBadge">${sel.badge}</span>` : '<span id="aigAudioModelTriggerBadge" style="display:none"></span>'}
          <i class="fas fa-chevron-down aig-drop-chevron"></i>
        </button>
        <div class="aig-drop-panel" id="aigAudioModelPanel">${items}</div>
      </div>
    </div>`;
}

// ── Dropdown logic ────────────────────────────────────────

function _aigToggleModelDrop(e) {
  e.stopPropagation();
  const trigger = document.getElementById('aigModelTrigger');
  const panel = document.getElementById('aigModelPanel');
  if (!trigger || !panel) return;
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  trigger.setAttribute('aria-expanded', String(!isOpen));
  if (!isOpen) {
    const onOutside = (ev) => {
      if (!trigger.contains(ev.target) && !panel.contains(ev.target)) {
        panel.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onOutside);
      }
    };
    setTimeout(() => document.addEventListener('click', onOutside), 0);
  }
}

function _aigSelectModelDrop(id) {
  const config = AI_TOOL_CONFIGS[_aigState.toolSlug];
  const m = config?.models?.find(x => x.id === id);
  if (!m) return;
  _aigState.selectedModel = id;
  const triggerName = document.getElementById('aigModelTriggerName');
  const triggerBadge = document.getElementById('aigModelTriggerBadge');
  if (triggerName) triggerName.textContent = m.name;
  if (triggerBadge) {
    if (m.badge) { triggerBadge.textContent = m.badge; triggerBadge.className = `aig-model-badge ${_aigBadgeClass[m.badge] || ''}`; triggerBadge.style.display = ''; }
    else { triggerBadge.style.display = 'none'; }
  }
  const triggerCost = document.getElementById('aigModelTriggerCost');
  if (triggerCost) triggerCost.innerHTML = _aigCostPill(m);
  document.querySelectorAll('#aigModelPanel .aig-drop-item').forEach(item => item.classList.toggle('active', item.dataset.model === id));
  const panel = document.getElementById('aigModelPanel');
  const trigger = document.getElementById('aigModelTrigger');
  if (panel) panel.classList.remove('open');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
  _aigUpdateModelStatus();
  if (_aigState.toolType === 'video') _aigVideoModelChanged(id);
  if (_aigState.toolType === 'nano') _aigNanoModelChanged(id);
}

function _aigToggleAudioModelDrop(e) {
  e.stopPropagation();
  const trigger = document.getElementById('aigAudioModelTrigger');
  const panel = document.getElementById('aigAudioModelPanel');
  if (!trigger || !panel) return;
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  trigger.setAttribute('aria-expanded', String(!isOpen));
  if (!isOpen) {
    const onOutside = (ev) => {
      if (!trigger.contains(ev.target) && !panel.contains(ev.target)) {
        panel.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onOutside);
      }
    };
    setTimeout(() => document.addEventListener('click', onOutside), 0);
  }
}

function _aigSelectAudioModelDrop(id) {
  const m = AUDIO_MODELS.find(x => x.id === id);
  if (!m) return;
  _aigState.audioModel = id;
  const triggerName = document.getElementById('aigAudioModelTriggerName');
  const triggerBadge = document.getElementById('aigAudioModelTriggerBadge');
  if (triggerName) triggerName.textContent = m.name;
  if (triggerBadge) {
    if (m.badge) { triggerBadge.textContent = m.badge; triggerBadge.className = `aig-model-badge ${_aigBadgeClass[m.badge] || ''}`; triggerBadge.style.display = ''; }
    else { triggerBadge.style.display = 'none'; }
  }
  document.querySelectorAll('#aigAudioModelPanel .aig-drop-item').forEach(item => item.classList.toggle('active', item.dataset.model === id));
  const panel = document.getElementById('aigAudioModelPanel');
  const trigger = document.getElementById('aigAudioModelTrigger');
  if (panel) panel.classList.remove('open');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

// ── IMAGE GENERATOR ───────────────────────────────────────

function _aigRender(config) {
  const page = document.getElementById('page-ai-gen');
  if (!page) return;
  const sel = config.models[0];

  page.innerHTML = `
    <div class="aig-wrap">
      ${_aigHeader(config, ``)}
      <div class="aig-split-layout">

        <!-- Left: sticky controls -->
        <div class="aig-left-panel">
          <div class="aig-panel-card">
            <div class="aig-prompt-label">Prompt</div>
            <textarea id="aigPrompt" class="aig-prompt" placeholder="Describe your image — style, lighting, mood, colors, subject, composition…" rows="5"></textarea>
            <div class="aig-prompt-hint">Add "cinematic", "4K", "sharp focus", "golden hour" for better results</div>
          </div>
          <div class="aig-panel-card">
            ${_aigModelDropHtml(config, sel.id)}
            <div class="aig-ctrl-row">
              <div class="aig-ctrl-group">
                <div class="aig-ctrl-label">Aspect Ratio</div>
                <div class="aig-ratio-pills">
                  ${ASPECT_RATIOS.map(r => `<button class="aig-ratio-pill${r.id === '1:1' ? ' active' : ''}" data-ratio="${r.id}" onclick="_aigSelectRatio('${r.id}')" title="${r.note}">${r.label}</button>`).join('')}
                </div>
              </div>
              <div class="aig-ctrl-group">
                <div class="aig-ctrl-label">Images</div>
                <div class="aig-count-pills">
                  ${[1,2,3,4].map(n => `<button class="aig-count-pill${n === 1 ? ' active' : ''}" onclick="_aigSelectNum(${n})">${n}</button>`).join('')}
                </div>
              </div>
            </div>
          </div>
          <button class="aig-generate-btn aig-generate-btn-full" id="aigGenerateBtn" onclick="_aigGenerate()">
            <i class="fas fa-wand-magic-sparkles"></i> Generate
          </button>
        </div>

        <!-- Right: results -->
        <div class="aig-right-panel">
          <div class="aig-results" id="aigResults">
            <div class="aig-results-empty" id="aigEmpty">
              <i class="fas fa-image"></i>
              <p>Your generated images will appear here</p>
              <span>Generation takes 10–30 seconds</span>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  // Restore after refresh / back: resume an in-progress job or re-show last images
  const ses = _aigSesGet(_aigState.toolSlug);
  if (ses && ses.kind === 'image') {
    if (ses.status === 'processing' && ses.jobId) _aigImagePoll(ses.jobId, _aigState.toolSlug, { model: ses.model, ratio: ses.ratio, num: ses.num, startTs: ses.ts });
    else if (ses.status === 'done' && ses.result?.images) _aigRenderImageGrid(ses.result.images, ses.model, ses.ratio);
  }
}

function _aigSelectRatio(id) {
  _aigState.aspectRatio = id;
  document.querySelectorAll('.aig-ratio-pill').forEach(b => b.classList.toggle('active', b.dataset.ratio === id));
}
function _aigSelectNum(n) {
  _aigState.numImages = n;
  document.querySelectorAll('.aig-count-pill').forEach(b => b.classList.toggle('active', +b.textContent === n));
}

// ── Nano Banana "all image models" renderer (references + AI prompt + resolution) ──
const _NANO_REF_MAX = 14;
const _AIG_REF_ICON = { style: 'fa-star', character: 'fa-user', image: 'fa-image' };
let _aigRefPendingType = 'image';

function _aigRenderNano(config) {
  const page = document.getElementById('page-ai-gen');
  if (!page) return;
  const sel = config.models[0];
  page.innerHTML = `
    <div class="aig-wrap">
      ${_aigHeader(config, ``)}
      <div class="aig-split-layout">
        <div class="aig-left-panel">
          <div class="aig-panel-card">
            ${_aigModelDropHtml(config, sel.id)}
          </div>

          <div class="aig-panel-card" id="aigRefCard" style="display:${_aigShowRefsFor(sel.id, sel) ? '' : 'none'}">
            <div class="aig-ctrl-label" style="display:flex;justify-content:space-between;align-items:center">
              <span>References <span style="color:var(--text-3);font-weight:500">· optional</span></span>
              <span id="aigRefCount" style="color:var(--text-3);font-weight:600">0/${_NANO_REF_MAX}</span>
            </div>
            <div class="aig-ref-grid" id="aigRefGrid"></div>
            <div class="aig-ref-btns">
              <button class="aig-ref-add" onclick="_aigNanoAddRef('style')"><i class="fas fa-star"></i> Style</button>
              <button class="aig-ref-add" onclick="_aigNanoAddRef('character')"><i class="fas fa-user"></i> Character</button>
              <button class="aig-ref-add" onclick="_aigNanoAddRef('image')"><i class="fas fa-plus"></i> Add</button>
            </div>
            <input type="file" id="aigRefInput" accept="image/*" style="display:none" onchange="_aigNanoOnRefFile(this)">
            <div class="aig-prompt-hint">Add up to ${_NANO_REF_MAX} images to copy a style or keep a character consistent.</div>
          </div>

          <div class="aig-panel-card">
            <div class="aig-prompt-label" style="display:flex;justify-content:space-between;align-items:center">
              <span>Prompt</span>
              <span class="aig-switch-label">AI prompt
                <span class="aig-switch ${_aigState.aiPrompt ? 'on' : ''}" id="aigAiPromptSw" onclick="_aigToggleAiPrompt()"><span class="aig-switch-knob"></span></span>
              </span>
            </div>
            <textarea id="aigPrompt" class="aig-prompt" placeholder="Describe your image — style, lighting, mood, subject, composition…" rows="5"></textarea>
            <div class="aig-prompt-hint">AI prompt ON lets the model refine your wording for a better result.</div>
          </div>

          <div class="aig-panel-card">
            <div class="aig-ctrl-group" style="margin-bottom:12px">
              <div class="aig-ctrl-label">Aspect Ratio</div>
              <div class="aig-ratio-pills">
                ${ASPECT_RATIOS.map(r => `<button class="aig-ratio-pill${r.id === '1:1' ? ' active' : ''}" data-ratio="${r.id}" onclick="_aigSelectRatio('${r.id}')" title="${r.note}">${r.label}</button>`).join('')}
              </div>
            </div>
            <div class="aig-ctrl-row">
              <div class="aig-ctrl-group" id="aigResGroup" style="display:${_aigHasResChoice(sel.id, sel) ? '' : 'none'}">
                <div class="aig-ctrl-label">Resolution</div>
                <div class="aig-count-pills" id="aigResPills">${_aigNanoResPillsHtml(sel)}</div>
              </div>
              <div class="aig-ctrl-group">
                <div class="aig-ctrl-label">Images</div>
                <div class="aig-count-pills" id="aigImgPills">${_aigImagesPillsHtml(_aigMaxImagesFor(sel.id, sel))}</div>
              </div>
            </div>
          </div>

          <button class="aig-generate-btn aig-generate-btn-full" id="aigGenerateBtn" onclick="_aigNanoGenerate()">
            <i class="fas fa-wand-magic-sparkles"></i> Generate
          </button>
        </div>

        <div class="aig-right-panel">
          <div class="aig-results" id="aigResults">
            <div class="aig-results-empty" id="aigEmpty">
              <i class="fas fa-image"></i>
              <p>Your generated images will appear here</p>
              <span>Generation takes 10–40 seconds</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  _aigNanoRenderRefs();
  _aigLoadModelCaps(); // fetch per-model capabilities, then refine the controls
  const ses = _aigSesGet(_aigState.toolSlug);
  if (ses && ses.kind === 'image') {
    if (ses.status === 'processing' && ses.jobId) _aigImagePoll(ses.jobId, _aigState.toolSlug, { model: ses.model, ratio: ses.ratio, num: ses.num, startTs: ses.ts });
    else if (ses.status === 'done' && ses.result?.images) _aigRenderImageGrid(ses.result.images, ses.model, ses.ratio);
  }
}

function _aigToggleAiPrompt() {
  _aigState.aiPrompt = !_aigState.aiPrompt;
  document.getElementById('aigAiPromptSw')?.classList.toggle('on', _aigState.aiPrompt);
}
function _aigSelectResolution(v) {
  _aigState.resolution = v;
  document.querySelectorAll('.aig-res-pill').forEach(b => b.classList.toggle('active', b.dataset.res === v));
}
// ── Per-model capabilities (resolutions / references / max images) ──────────
// Loaded once from the proxy's /v1/models so EVERY image tool shows exactly the
// controls each selected model supports — not hardcoded.
let _aigModelCaps = null;
// Built-in capability map (Magnific Image Models table, API.md verified 2026-06-08).
// `res` = selectable resolution tiers above the 1K base; `refs` = supports reference
// images. Source of truth until the proxy's /v1/models exposes these fields itself
// (then the server-provided _aigModelCaps takes precedence automatically).
const _AIG_CAPS_STATIC = {
  'flux-2': { refs: true, res: ['1k','2k'], max: 2 }, 'flux-2-klein': { refs: true, res: ['1k','2k'], max: 2 }, 'flux-2-flex': { refs: true, res: ['1k','2k'], max: 4 },
  'flux-dev': { refs: true }, 'flux-kontext': { refs: true }, 'flux-kontext-high': { refs: true, max: 2 }, 'flux-2-max': { refs: true, res: ['1k','2k'], max: 1 },
  'mystic': { refs: true }, 'mystic-2-5': { refs: true },
  'seedream-4-5': { refs: true, res: ['2k','4k'] }, 'seedream-4': { refs: true }, 'seedream-4-4k': { refs: true }, 'seedream': { refs: true }, 'seedream-5-lite': { refs: true, res: ['2k','3k'] },
  'imagen-nano-banana': { refs: true }, 'imagen-nano-banana-2-flash': { refs: true, res: ['1k','2k','4k'] }, 'imagen-nano-banana-2': { refs: true, res: ['1k','2k','4k'] },
  'gpt-medium': { refs: true, max: 1 }, 'gpt-high': { refs: true, max: 1 }, 'gpt-2': { refs: true, res: ['1k','2k','4k'], max: 1 },
  'ideogram': { refs: true, max: 2 }, 'qwen': { refs: true, max: 2 }, 'grok': { refs: true }, 'reve': { refs: true }, 'runway-gen4': { refs: true, max: 2 },
};
function _aigCapsFor(id) { return (_aigModelCaps && _aigModelCaps[id]) || null; }
// Merge: live proxy caps (if exposed) → built-in static map → per-model config hints
function _aigCapMerged(id, m) {
  const proxy = _aigCapsFor(id);
  if (proxy) return { refs: !!proxy.refs, resolutions: proxy.resolutions || [], maxImages: proxy.maxImages || 4 };
  const st = _AIG_CAPS_STATIC[id];
  if (st) return { refs: !!st.refs, resolutions: st.res || [], maxImages: st.max || 4 };
  return { refs: !!(m && m.refs), resolutions: (m && m.res) || [], maxImages: (m && m.maxImages) || 4 };
}
function _aigResListFor(id, m) {
  return (_aigCapMerged(id, m).resolutions || []).map(x => String(x).toLowerCase()).filter(x => ['1k', '2k', '3k', '4k'].includes(x));
}
function _aigHasResChoice(id, m) { return _aigResListFor(id, m).some(x => x !== '1k'); } // a real choice = something above 1K
function _aigShowRefsFor(id, m) { return !!_aigCapMerged(id, m).refs; }
function _aigMaxImagesFor(id, m) { return Math.max(1, Math.min(4, _aigCapMerged(id, m).maxImages || 4)); }
async function _aigLoadModelCaps() {
  if (_aigModelCaps) { if (_aigState.toolType === 'image' || _aigState.toolType === 'nano') _aigNanoModelChanged(_aigState.selectedModel); return; }
  try {
    const c = await api('/api/ai/models');
    if (c && typeof c === 'object' && Object.keys(c).length) {
      _aigModelCaps = c;
      if (_aigState.toolType === 'image' || _aigState.toolType === 'nano') _aigNanoModelChanged(_aigState.selectedModel);
    }
  } catch (e) { /* keep static fallback */ }
}

// Resolution pills adapt to the selected model — only the tiers it actually supports
// (proxy 400s on an unsupported tier). Always offers "Auto" (model's native default).
function _aigNanoResPillsHtml(m) {
  const sup = _aigResListFor(m && m.id, m);
  const opts = [['', 'Auto']];
  ['1k', '2k', '3k', '4k'].forEach(t => { if (sup.includes(t)) opts.push([t, t.toUpperCase()]); });
  const cur = _aigState.resolution || '';
  return opts.map(([v, l]) => `<button class="aig-res-pill${v === cur ? ' active' : ''}" data-res="${v}" onclick="_aigSelectResolution('${v}')">${l}</button>`).join('');
}
function _aigImagesPillsHtml(max) {
  const n = _aigState.numImages || 1; const mx = Math.max(1, Math.min(4, max || 4));
  let h = ''; for (let k = 1; k <= mx; k++) h += `<button class="aig-count-pill${k === n ? ' active' : ''}" onclick="_aigSelectNum(${k})">${k}</button>`;
  return h;
}
function _aigNanoModelChanged(id) {
  const config = AI_TOOL_CONFIGS[_aigState.toolSlug];
  const m = config?.models?.find(x => x.id === id);
  // Resolution: reset to Auto if the new model doesn't support the current tier; show/hide the group
  const resList = _aigResListFor(id, m);
  if (_aigState.resolution && !resList.includes(_aigState.resolution)) _aigState.resolution = '';
  const resPills = document.getElementById('aigResPills'); if (resPills) resPills.innerHTML = _aigNanoResPillsHtml(m);
  const resGroup = document.getElementById('aigResGroup'); if (resGroup) resGroup.style.display = _aigHasResChoice(id, m) ? '' : 'none';
  // References: only models that support them; clear any refs if switching to one that doesn't
  const showRefs = _aigShowRefsFor(id, m);
  const refCard = document.getElementById('aigRefCard'); if (refCard) refCard.style.display = showRefs ? '' : 'none';
  if (!showRefs && (_aigState.references || []).length) { _aigState.references = []; _aigNanoRenderRefs(); }
  // Images: cap to the model's max
  const max = _aigMaxImagesFor(id, m);
  if ((_aigState.numImages || 1) > max) _aigState.numImages = 1;
  const imgPills = document.getElementById('aigImgPills'); if (imgPills) imgPills.innerHTML = _aigImagesPillsHtml(max);
}

function _aigNanoAddRef(type) {
  if ((_aigState.references || []).length >= _NANO_REF_MAX) { toast(`Up to ${_NANO_REF_MAX} references`, 'warning'); return; }
  _aigRefPendingType = type;
  const inp = document.getElementById('aigRefInput');
  if (inp) { inp.value = ''; inp.click(); }
}
function _aigNanoOnRefFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const ref = { type: _aigRefPendingType || 'image', url: null, thumb: '', uploading: true };
  _aigState.references.push(ref);
  const reader = new FileReader();
  reader.onload = e => { ref.thumb = e.target.result; if (!ref.url) ref.url = e.target.result; _aigNanoRenderRefs(); }; // base64 = thumb + fallback url
  reader.readAsDataURL(file);
  _aigNanoRenderRefs();
  // Upload to R2 → use the URL instead of base64 (saves Render egress); base64 stays as fallback
  _aigUploadToR2(file, (u) => { ref.url = u; ref.uploading = false; _aigNanoRenderRefs(); });
  setTimeout(() => { if (ref.uploading) { ref.uploading = false; _aigNanoRenderRefs(); } }, 8000);
}
function _aigNanoRemoveRef(i) { _aigState.references.splice(i, 1); _aigNanoRenderRefs(); }
function _aigNanoRenderRefs() {
  const cnt = document.getElementById('aigRefCount');
  if (cnt) cnt.textContent = `${(_aigState.references || []).length}/${_NANO_REF_MAX}`;
  const grid = document.getElementById('aigRefGrid');
  if (!grid) return;
  grid.innerHTML = (_aigState.references || []).map((r, i) => `
    <div class="aig-ref-thumb">
      <img src="${r.thumb || r.url}" alt="">
      <span class="aig-ref-type"><i class="fas ${_AIG_REF_ICON[r.type] || 'fa-image'}"></i></span>
      ${r.uploading ? '<span class="aig-ref-up"><i class="fas fa-spinner fa-spin"></i></span>' : ''}
      <button class="aig-ref-x" onclick="_aigNanoRemoveRef(${i})" title="Remove"><i class="fas fa-times"></i></button>
    </div>`).join('');
}

async function _aigNanoGenerate() {
  if (_aigState.generating) return;
  const prompt = document.getElementById('aigPrompt')?.value?.trim();
  if (!prompt) { toast('Enter a prompt first', 'warning'); return; }
  if ((_aigState.references || []).some(r => r.uploading)) { toast('Reference images still uploading…', 'warning'); return; }
  _aigState.generating = true;
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…'; }
  _aigShowImageSkeletons(_aigState.numImages);
  try {
    const refs = (_aigState.references || []).filter(r => r.url).map(r => ({ type: r.type, url: r.url }));
    // Default request mirrors the raw API exactly — only add params the user opts into.
    const body = {
      prompt, model: _aigState.selectedModel,
      num_images: _aigState.numImages, aspect_ratio: _aigState.aspectRatio,
      slug: _aigState.toolSlug
    };
    if (_aigState.resolution) body.resolution = _aigState.resolution; // only when user picks 1K/2K/4K
    if (_aigState.aiPrompt) body.prompt_mode = 'auto';                 // only when AI-prompt toggle is on
    if (refs.length) body.references = refs;
    const start = await api('/api/ai/images/generate', 'POST', body);
    const jobId = start.job_id;
    const meta = { model: _aigState.selectedModel, ratio: _aigState.aspectRatio, num: _aigState.numImages, startTs: Date.now() };
    if (!jobId) {
      if (start.data) {
        _aigRenderImageGrid(start.data, meta.model, meta.ratio);
        _aigSesSave(_aigState.toolSlug, { kind: 'image', status: 'done', result: { images: start.data }, model: meta.model, ratio: meta.ratio });
        _aigLoadCredits();
      }
      _aigImageBtnReset();
      return;
    }
    _aigSesSave(_aigState.toolSlug, { kind: 'image', status: 'processing', jobId, ...meta });
    _aigImagePoll(jobId, _aigState.toolSlug, meta);
  } catch (e) {
    document.getElementById('aigSkeletons')?.remove();
    _aigImageBtnReset();
    _aigHandleGenError(e);
  }
}

function _aigImageBtnReset() {
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate'; }
  _aigState.generating = false;
}
function _aigShowImageSkeletons(n) {
  const resultsEl = document.getElementById('aigResults');
  const empty = document.getElementById('aigEmpty'); if (empty) empty.style.display = 'none';
  if (document.getElementById('aigSkeletons') || !resultsEl) return;
  const sk = document.createElement('div');
  sk.id = 'aigSkeletons'; sk.className = 'aig-result-grid';
  sk.innerHTML = Array(Math.max(1, n || 1)).fill(0).map(() => `<div class="aig-result-skeleton"><div class="aig-skeleton-inner"></div></div>`).join('');
  resultsEl.prepend(sk);
}
function _aigRenderImageGrid(images, model, ratio) {
  const resultsEl = document.getElementById('aigResults');
  document.getElementById('aigSkeletons')?.remove();
  if (!images || !images.length || !resultsEl) return;
  const grid = document.createElement('div');
  grid.className = 'aig-result-grid';
  grid.innerHTML = images.map((img, i) => `
    <div class="aig-result-card" style="animation-delay:${i * 0.08}s">
      <div class="aig-result-img-wrap">
        <img src="${img.url}" alt="Generated" class="aig-result-img" loading="lazy" onclick="_aigViewFull('${img.url}')">
        <div class="aig-result-overlay">
          <button class="aig-result-action" onclick="_aigDownload('${img.url}', event)" title="Download"><i class="fas fa-download"></i></button>
          <button class="aig-result-action" onclick="_aigViewFull('${img.url}')" title="Fullscreen"><i class="fas fa-expand"></i></button>
        </div>
      </div>
      <div class="aig-result-meta">
        <span class="aig-result-model">${model || ''}</span>
        <span class="aig-result-ratio">${ratio || ''}</span>
      </div>
    </div>`).join('');
  resultsEl.prepend(grid);
}

// Poll an image job to completion (reusable by generate + resume-after-refresh)
function _aigImagePoll(jobId, slug, meta) {
  _aigClearActivePoll();
  _aigState.generating = true;
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…'; }
  _aigShowImageSkeletons(meta?.num || 1);
  const _res = _aigState.resolution || '';
  const _m = (meta?.model || '');
  let _tot = _res === '4k' ? 180 : _res === '2k' ? 85 : 40;       // higher res renders take longer
  if (/gpt|recraft-v4-pro|flux-2-max/.test(_m)) _tot = Math.max(_tot, 120); // credit/GPT models are slower
  _tot = Math.max(_tot, 25 * (meta?.num || 1));                    // more images = more time
  // startTs persists across refresh/back so the bar shows REAL elapsed time, never restarts
  _aigProgressStart({
    icon: 'fa-image', title: 'Generating your image…', sub: 'Warming up the model…', totalSec: _tot, startTs: meta?.startTs || Date.now(),
    statusMsgs: [[0, 'Warming up the model…'], [8, 'Composing your image…'], [22, 'Painting details & lighting…'], [70, 'Rendering high resolution…'], [140, 'Finalizing…']]
  });
  let polls = 0; const maxPolls = 150; // 1K is fast, but 2K/4K take minutes — ~7.5 min ceiling (> server's 6 min)
  const poll = setInterval(async () => {
    polls++;
    if (polls > maxPolls) { clearInterval(poll); _aigActivePoll = null; _aigImageBtnReset(); _aigSesClear(slug); _aigProgressStop(false); document.getElementById('aigSkeletons')?.remove(); _aigHandleGenError(new Error('This is taking longer than usual. Please try again.')); return; }
    try {
      const st = await api('/api/ai/jobs/' + jobId);
      if (st.status === 'done' && st.data?.images) {
        clearInterval(poll); _aigActivePoll = null; _aigImageBtnReset(); _aigProgressStop(true);
        _aigSesSave(slug, { kind: 'image', status: 'done', result: { images: st.data.images }, model: meta?.model, ratio: meta?.ratio });
        _aigRenderImageGrid(st.data.images, meta?.model, meta?.ratio);
        toast(`Generated ${st.data.images.length} image${st.data.images.length > 1 ? 's' : ''}!`, 'success');
        _aigLoadCredits();
      } else if (st.status === 'failed') {
        clearInterval(poll); _aigActivePoll = null; _aigImageBtnReset(); _aigSesClear(slug); _aigProgressStop(false);
        document.getElementById('aigSkeletons')?.remove();
        _aigHandleGenError(new Error(st.error || 'Generation failed'));
      }
    } catch (e) { /* transient — keep polling */ }
  }, 3000);
  _aigActivePoll = { poll, prog: null };
}

async function _aigGenerate() {
  if (_aigState.generating) return;
  const prompt = document.getElementById('aigPrompt')?.value?.trim();
  if (!prompt) { toast('Enter a prompt first', 'warning'); return; }
  _aigState.generating = true;
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…'; }
  _aigShowImageSkeletons(_aigState.numImages);

  try {
    // Some UI entries (e.g. "Nano Banana Pro 4K") map to a base model + a resolution
    // param — 4K/2K are resolutions, not separate model ids.
    const _cfg = AI_TOOL_CONFIGS[_aigState.toolSlug];
    const _sel = _cfg && _cfg.models ? _cfg.models.find(x => x.id === _aigState.selectedModel) : null;
    const _apiModel = (_sel && _sel.apiModel) || _aigState.selectedModel;
    const _body = { prompt, model: _apiModel, num_images: _aigState.numImages, aspect_ratio: _aigState.aspectRatio, slug: _aigState.toolSlug };
    if (_sel && _sel.resolution) _body.resolution = _sel.resolution;
    const start = await api('/api/ai/images/generate', 'POST', _body);
    const jobId = start.job_id;
    const meta = { model: _aigState.selectedModel, ratio: _aigState.aspectRatio, num: _aigState.numImages, startTs: Date.now() };
    if (!jobId) {
      // Back-compat: server returned a direct sync result
      if (start.data) { _aigRenderImageGrid(start.data, meta.model, meta.ratio); _aigLoadCredits(); }
      _aigImageBtnReset();
      return;
    }
    _aigSesSave(_aigState.toolSlug, { kind: 'image', status: 'processing', jobId, ...meta });
    _aigImagePoll(jobId, _aigState.toolSlug, meta);
  } catch (e) {
    document.getElementById('aigSkeletons')?.remove();
    _aigImageBtnReset();
    _aigHandleGenError(e);
  }
}

// Shared error handler for all generators — clear messages for limits/credits
// Classify an error so we can show the right, reassuring message:
//  - plan/gt_credits/daily → the user's own GraphicoToolz account (actionable)
//  - user → a quick fix (missing prompt / start image)
//  - provider → our/provider side; the user's credits were NOT used (reassure)
function _aigClassifyError(e) {
  const data = (e && e.data) || {};
  const codeOrMsg = data.error;
  const rawMsg = (e && e.message) || (typeof codeOrMsg === 'string' ? codeOrMsg : '') || '';
  const m = rawMsg.toLowerCase();

  // Our app's own gating (the user's GraphicoToolz account)
  if (codeOrMsg === 'plan_required')
    return { kind: 'plan', title: 'Upgrade required', text: 'AI generators are available on the Basic plan and above. Upgrade your plan to start creating.' };
  if (codeOrMsg === 'insufficient_credits')
    return { kind: 'gt_credits', title: 'Not enough credits', text: data.message || `This model needs ${data.cost || ''} credits and you have ${data.balance || 0}. Top up your credits, or pick an unlimited model.` };
  if (codeOrMsg === 'daily_limit')
    return { kind: 'daily', title: "Daily limit reached", text: data.message || `You've used today's ${data.category || ''} limit on your plan. It resets at midnight UTC — or switch to a credit model to keep going.` };

  // Simple validation the user can fix
  if (/start_image|start image|requires start/i.test(rawMsg))
    return { kind: 'user', title: 'Start image needed', text: 'This model needs a start image. Please upload one and try again.' };
  if (/prompt is required/i.test(m))
    return { kind: 'user', title: 'Prompt needed', text: 'Please enter a prompt first, then generate.' };

  // Everything else is provider/our side → reassure, credits not used
  let text = 'This is a temporary issue on our side — not a problem with your account.';
  if (/no active accounts|slots busy|all account|busy|capacity|503|429/i.test(rawMsg))
    text = 'Our generation servers are busy right now. This is on our side, not your account.';
  else if (/temporarily unavailable|try again/i.test(rawMsg))
    text = 'This model is temporarily unavailable or at capacity. This is on our side, not your account.';
  else if (/insufficient credits|not enough credits|requires \d+ credits|top up/i.test(rawMsg))
    text = 'This model is temporarily out of provider capacity on our side. Nothing is wrong with your account.';
  else if (/unknown model|invalid_value|not available/i.test(rawMsg))
    text = 'This model isn’t available right now. Please pick another model — this is on our side.';
  return { kind: 'provider', title: 'Temporary issue — not your account', text };
}

function _aigHandleGenError(e) {
  const c = _aigClassifyError(e);
  toast(c.kind === 'provider' ? c.title : c.text, c.kind === 'provider' || c.kind === 'user' ? 'error' : 'warning');
  if (c.kind === 'gt_credits' || c.kind === 'daily') _aigLoadCredits();
  _aigShowErrorCard(c);
}

// Render the error visibly in the results area, styled + worded per type.
function _aigShowErrorCard(c) {
  const resultsEl = document.getElementById('aigResults');
  if (!resultsEl) return;
  const empty = document.getElementById('aigEmpty'); if (empty) empty.style.display = 'none';
  document.getElementById('aigErrorCard')?.remove();
  const esc = (s) => (typeof escapeHtml === 'function') ? escapeHtml(String(s)) : String(s);

  const provider = c.kind === 'provider';
  // provider = blue/calm + reassurance; account/validation = amber
  const accent = provider ? '#60a5fa' : '#fbbf24';
  const bg = provider ? 'rgba(96,165,250,.08)' : 'rgba(245,158,11,.08)';
  const border = provider ? 'rgba(96,165,250,.32)' : 'rgba(245,158,11,.32)';
  const icon = provider ? 'fa-screwdriver-wrench' : (c.kind === 'user' ? 'fa-circle-info' : 'fa-triangle-exclamation');

  let cta = '';
  if (c.kind === 'plan' || c.kind === 'gt_credits')
    cta = `<button onclick="showPage('pricing')" style="background:${accent};color:#0b0b12;border:none;border-radius:8px;padding:8px 18px;font-size:12.5px;font-weight:700;cursor:pointer;margin-right:8px">${c.kind === 'plan' ? 'View plans' : 'Get credits'}</button>`;

  const reassure = provider
    ? `<div style="display:inline-flex;align-items:center;gap:7px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3);color:#86efac;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;margin-bottom:12px"><i class="fas fa-shield-halved"></i> Your credits were NOT used</div><div style="font-size:12px;color:#9ca3af;margin-bottom:14px">Please try again in a few minutes, switch to another model, or contact our support team for an update and resolution.</div>`
    : '';

  const card = document.createElement('div');
  card.id = 'aigErrorCard';
  card.innerHTML = `
    <div style="background:${bg};border:1px solid ${border};border-radius:14px;padding:22px;text-align:center;max-width:480px;margin:8px auto">
      <div style="font-size:32px;color:${accent};margin-bottom:8px"><i class="fas ${icon}"></i></div>
      <div style="font-size:16px;font-weight:700;color:#f3f4f6;margin-bottom:8px">${esc(c.title)}</div>
      <div style="font-size:13.5px;color:#e5e7eb;line-height:1.55;margin-bottom:14px;word-break:break-word">${esc(c.text)}</div>
      ${reassure}
      <div>${cta}<button onclick="document.getElementById('aigErrorCard')?.remove()" style="background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:8px 18px;font-size:12.5px;font-weight:600;cursor:pointer">Dismiss</button></div>
    </div>`;
  resultsEl.prepend(card);
}

// ── Download / view helpers ───────────────────────────────

function _aigSlug(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40) || Date.now().toString();
}
async function _aigForceDownload(url, filename, btn) {
  // Show instant feedback on the clicked button so the user knows it's working
  let prevHtml = null;
  if (btn) { prevHtml = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
  const restore = () => { if (btn) { btn.disabled = false; if (prevHtml !== null) btn.innerHTML = prevHtml; } };

  if (url.startsWith('data:')) {
    try {
      const blob = await fetch(url).then(r => r.blob());
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } finally { restore(); }
    return;
  }
  // 1) Try downloading STRAIGHT from the CDN (zero server bandwidth). A cross-origin
  //    fetch only succeeds if the CDN sends CORS headers; if it throws, we fall back
  //    to the Render proxy below — so this never breaks, it just saves egress when it can.
  try {
    const direct = await fetch(url, { mode: 'cors' });
    if (direct.ok) {
      const blob = await direct.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      restore(); return;
    }
  } catch (_) { /* CDN blocked CORS → use the Render proxy fallback below */ }
  // 2) Fallback: stream through our server (uses Render bandwidth — only when CORS is unavailable)
  try {
    const token = userToken || (sessionStorage.getItem('user_token')||localStorage.getItem('user_token'));
    const res = await fetch(`/api/ai/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`, {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    });
    if (!res.ok) throw new Error('proxy ' + res.status);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch {
    window.open(url, '_blank'); // last-resort fallback — opens in new tab
  } finally { restore(); }
}
function _aigDownload(url, ev) {
  const prompt = document.getElementById('aigPrompt')?.value?.trim() || '';
  const model = _aigState.selectedModel || 'image';
  const ext = url.split('?')[0].split('.').pop() || 'jpg';
  _aigForceDownload(url, `graphicotoolz-${model}-${_aigSlug(prompt)}.${ext}`, ev?.currentTarget);
}
function _aigDownloadVideo(url, ev) {
  const prompt = document.getElementById('aigPrompt')?.value?.trim() || '';
  const model = _aigState.selectedModel || 'video';
  toast('Preparing your video download…', 'info');
  _aigForceDownload(url, `graphicotoolz-${model}-${_aigSlug(prompt)}.mp4`, ev?.currentTarget);
}
function _aigDownloadAudio(url, ev) {
  const text = document.getElementById('aigAudioText')?.value?.trim() || '';
  const voice = _aigState.selectedVoice || 'tts';
  _aigForceDownload(url, `graphicotoolz-tts-${voice}-${_aigSlug(text)}.mp3`, ev?.currentTarget);
}
function _aigDownloadBgr(url, ev) {
  _aigForceDownload(url, `graphicotoolz-bg-removed-${Date.now()}.png`, ev?.currentTarget);
}
function _aigViewFull(url) {
  let ol = document.getElementById('aigFullOverlay');
  if (!ol) {
    ol = document.createElement('div');
    ol.id = 'aigFullOverlay'; ol.className = 'aig-full-overlay';
    ol.onclick = e => { if (e.target === ol) ol.remove(); };
    ol.innerHTML = `<button class="aig-full-close" onclick="document.getElementById('aigFullOverlay').remove()"><i class="fas fa-times"></i></button><img id="aigFullImg" class="aig-full-img">`;
    document.body.appendChild(ol);
  }
  document.getElementById('aigFullImg').src = url;
  ol.style.display = 'flex';
}

// ── VIDEO GENERATOR ───────────────────────────────────────

function _aigRenderVideo(config) {
  const page = document.getElementById('page-ai-gen');
  if (!page) return;
  const firstModel = config.models[0];
  _aigState.selectedModel = firstModel.id;
  _aigState.duration = firstModel.durations[0];
  _aigState.aspectRatio = '16:9';

  page.innerHTML = `
    <div class="aig-wrap">
      ${_aigHeader(config, ``)}
      <div class="aig-split-layout">

        <!-- Left: sticky controls -->
        <div class="aig-left-panel">
          <div class="aig-panel-card">
            <div class="aig-prompt-label">Video Prompt</div>
            <textarea id="aigPrompt" class="aig-prompt" placeholder="Describe the video — scene, action, camera movement, style, mood…" rows="5"></textarea>
            <div class="aig-prompt-hint">Describe camera motion ("slow pan left"), lighting, and action for best results</div>
          </div>
          <div class="aig-panel-card">
            ${_aigModelDropHtml(config, firstModel.id)}
            <div class="aig-ctrl-row">
              <div class="aig-ctrl-group">
                <div class="aig-ctrl-label">Ratio</div>
                <div class="aig-ratio-pills">
                  ${['1:1','16:9','9:16'].map(r => `<button class="aig-ratio-pill${r === '16:9' ? ' active' : ''}" data-ratio="${r}" onclick="_aigSelectRatio('${r}')">${r}</button>`).join('')}
                </div>
              </div>
              <div class="aig-ctrl-group" id="aigVideoDurationCtrl" style="${firstModel.durations.length > 1 ? '' : 'display:none'}">
                <div class="aig-ctrl-label">Duration</div>
                <div class="aig-count-pills">
                  ${(firstModel.durations || [5]).map(d => `<button class="aig-count-pill${d === _aigState.duration ? ' active' : ''}" data-dur="${d}" onclick="_aigVideoSelectDuration(${d})">${d}s</button>`).join('')}
                </div>
              </div>
            </div>
          </div>
          <!-- Start image (shown/hidden per model) -->
          <div class="aig-panel-card" id="aigVideoImageSection" style="${firstModel.supportsImage ? '' : 'display:none'}">
            <div class="aig-prompt-label">
              Start Image
              <span id="aigImgRequired" class="aig-tag-required" style="${firstModel.requiresImage ? '' : 'display:none'}">Required</span>
              <span id="aigImgOptional" class="aig-tag-optional" style="${!firstModel.requiresImage && firstModel.supportsImage ? '' : 'display:none'}">Optional</span>
            </div>
            <div class="aig-img-upload-area" id="aigImgUploadArea"
              onclick="document.getElementById('aigImgFileInput').click()"
              ondragover="event.preventDefault()" ondrop="_aigVideoHandleDrop(event)">
              <i class="fas fa-image" style="font-size:22px;margin-bottom:6px;opacity:.4"></i>
              <span style="font-weight:600;font-size:13px">Click to upload or drag & drop</span>
            </div>
            <div class="aig-or-divider"><span>or paste image URL</span></div>
            <input type="text" id="aigImgUrl" class="aig-text-input" placeholder="https://…" oninput="_aigVideoHandleUrl(this.value)">
            <input type="file" id="aigImgFileInput" accept="image/*" style="display:none" onchange="_aigVideoHandleFile(this)">
            <div id="aigImgPreviewWrap" style="display:none">
              <img id="aigImgPreview" class="aig-img-preview" style="max-height:160px;margin-top:10px">
              <button class="aig-img-clear" onclick="_aigVideoClearImage()"><i class="fas fa-times"></i> Clear</button>
            </div>
          </div>
          <button class="aig-generate-btn aig-generate-btn-red aig-generate-btn-full" id="aigGenerateBtn" onclick="_aigVideoGenerate()">
            <i class="fas fa-clapperboard"></i> Generate Video
          </button>
        </div>

        <!-- Right: results -->
        <div class="aig-right-panel">
          <div class="aig-results aig-video-results" id="aigResults">
            <div class="aig-results-empty" id="aigEmpty">
              <i class="fas fa-video"></i>
              <p>Your generated video will appear here</p>
              <span>Generation takes 2–10 minutes</span>
            </div>
          </div>
        </div>

      </div>
    </div>`;

  // Restore after a refresh / back-button return: resume an in-progress job, or
  // re-show the last finished video.
  const ses = _aigSesGet(_aigState.toolSlug);
  if (ses && ses.kind === 'video') {
    if (ses.model) _aigState.selectedModel = ses.model;
    if (ses.aspectRatio) _aigState.aspectRatio = ses.aspectRatio;
    if (ses.status === 'processing' && ses.jobId) _aigVideoPoll(ses.jobId, ses.ts);
    else if (ses.status === 'done' && ses.result?.url) _aigRenderVideoResult(ses.result.url);
  }
}

function _aigVideoModelChanged(modelId) {
  const config = AI_TOOL_CONFIGS[_aigState.toolSlug];
  if (!config || config.type !== 'video') return;
  const m = config.models.find(x => x.id === modelId);
  if (!m) return;
  _aigState.duration = m.durations[0];

  const imgSection = document.getElementById('aigVideoImageSection');
  const durCtrl = document.getElementById('aigVideoDurationCtrl');
  const reqTag = document.getElementById('aigImgRequired');
  const optTag = document.getElementById('aigImgOptional');

  if (imgSection) imgSection.style.display = m.supportsImage ? '' : 'none';
  if (reqTag) reqTag.style.display = m.requiresImage ? '' : 'none';
  if (optTag) optTag.style.display = (!m.requiresImage && m.supportsImage) ? '' : 'none';
  if (durCtrl) {
    durCtrl.style.display = m.durations.length > 1 ? '' : 'none';
    if (m.durations.length > 1) {
      durCtrl.querySelectorAll('.aig-count-pill').forEach(b => {
        const d = parseInt(b.dataset.dur);
        b.classList.toggle('active', d === m.durations[0]);
      });
    }
  }
}

function _aigVideoSelectDuration(d) {
  _aigState.duration = d;
  document.querySelectorAll('[data-dur]').forEach(b => b.classList.toggle('active', parseInt(b.dataset.dur) === d));
}

function _aigVideoHandleFile(input) {
  const file = input.files[0];
  if (!file) return;
  _aigState.startImageUrl = null;
  const reader = new FileReader();
  reader.onload = e => { _aigState.startImageData = e.target.result; _aigShowImgPreview(e.target.result); };
  reader.readAsDataURL(file);
  _aigUploadToR2(file, u => { _aigState.startImageUrl = u; });
}
function _aigVideoHandleUrl(url) {
  if (!url) { _aigState.startImageData = null; _aigState.startImageUrl = null; return; }
  _aigState.startImageData = url; _aigState.startImageUrl = null; // a pasted URL is used directly
  _aigShowImgPreview(url);
}
function _aigVideoHandleDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  _aigState.startImageUrl = null;
  const reader = new FileReader();
  reader.onload = ev => { _aigState.startImageData = ev.target.result; _aigShowImgPreview(ev.target.result); };
  reader.readAsDataURL(file);
  _aigUploadToR2(file, u => { _aigState.startImageUrl = u; });
}
function _aigShowImgPreview(src) {
  const wrap = document.getElementById('aigImgPreviewWrap');
  const img = document.getElementById('aigImgPreview');
  const area = document.getElementById('aigImgUploadArea');
  if (wrap && img) { img.src = src; wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '8px'; }
  if (area) area.style.display = 'none';
}
function _aigVideoClearImage() {
  _aigState.startImageData = null;
  _aigState.startImageUrl = null;
  const wrap = document.getElementById('aigImgPreviewWrap');
  const area = document.getElementById('aigImgUploadArea');
  const urlInput = document.getElementById('aigImgUrl');
  if (wrap) wrap.style.display = 'none';
  if (area) area.style.display = '';
  if (urlInput) urlInput.value = '';
  const fi = document.getElementById('aigImgFileInput');
  if (fi) fi.value = '';
}

async function _aigVideoGenerate() {
  if (_aigState.generating) return;
  const prompt = document.getElementById('aigPrompt')?.value?.trim();
  if (!prompt) { toast('Enter a prompt', 'warning'); return; }

  const config = AI_TOOL_CONFIGS[_aigState.toolSlug];
  const model = config?.models?.find(m => m.id === _aigState.selectedModel);
  if (model?.requiresImage && !_aigState.startImageData) {
    toast('This model requires a start image', 'warning'); return;
  }

  _aigState.generating = true;
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…'; }

  try {
    const body = { prompt, model: _aigState.selectedModel, aspect_ratio: _aigState.aspectRatio, slug: _aigState.toolSlug };
    if (_aigState.startImageData) body.start_image = _aigState.startImageUrl || _aigState.startImageData;
    if (_aigState.duration) body.duration = _aigState.duration;

    // Start the async job — returns instantly with a job_id
    const start = await api('/api/ai/videos/generate', 'POST', body);
    const jobId = start.job_id;
    if (!jobId) {
      if (start.data?.url) { _aigRenderVideoResult(start.data.url); _aigState.generating = false; if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-clapperboard"></i> Generate'; } return; }
      throw new Error(start.error || 'Could not start video job');
    }
    // Persist a tiny pointer so a refresh / back button resumes this job
    _aigSesSave(_aigState.toolSlug, { kind: 'video', status: 'processing', jobId, model: _aigState.selectedModel, aspectRatio: _aigState.aspectRatio });
    _aigVideoPoll(jobId, Date.now());
  } catch (e) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-clapperboard"></i> Generate'; }
    _aigState.generating = false;
    _aigHandleGenError(e);
  }
}

// Render a finished video into the results area (shared by generate + resume)
function _aigRenderVideoResult(videoUrl) {
  const resultsEl = document.getElementById('aigResults');
  document.getElementById('aigGenProgress')?.remove();
  const card = document.createElement('div');
  card.className = 'aigv-result-card';
  card.innerHTML = `
    <div class="aigv-video-wrap">
      <video controls class="aigv-video" src="${videoUrl}" preload="metadata"></video>
    </div>
    <div class="aigv-result-meta">
      <span class="aig-result-model">${_aigState.selectedModel || ''}</span>
      <span>${_aigState.aspectRatio || ''}</span>
      <button class="aigv-download-btn" onclick="_aigDownloadVideo('${videoUrl}', event)">
        <i class="fas fa-download"></i> Download
      </button>
    </div>`;
  if (resultsEl) resultsEl.prepend(card);
}

// Poll a video job to completion. Reusable by initial generate AND by resume-after-refresh.
function _aigVideoPoll(jobId, startTs) {
  _aigClearActivePoll(); // never run two pollers at once (e.g. navigate away + back)
  const slug = _aigState.toolSlug;
  _aigState.generating = true;
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…'; }
  const empty = document.getElementById('aigEmpty');
  if (empty) empty.style.display = 'none';
  const resultsEl = document.getElementById('aigResults');

  _aigProgressStart({
    icon: 'fa-clapperboard', title: 'Generating your video…',
    sub: 'This takes 2–10 minutes. You can leave this page — it keeps going and resumes here.',
    totalSec: 420, startTs,
    statusMsgs: [
      [0, 'Queuing generation request…'], [15, 'Rendering initial frames…'],
      [60, 'Generating motion sequence…'], [150, 'Applying motion smoothing…'],
      [270, 'Compositing video frames…'], [360, 'Encoding final video…'], [420, 'Almost done, finalizing…'],
    ]
  });

  const stop = () => { clearInterval(poll); _aigActivePoll = null; _aigState.generating = false; if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-clapperboard"></i> Generate'; } };
  const finishOk = (url) => {
    stop(); _aigProgressStop(true);
    // Persist the finished result so it stays after a refresh (until it expires)
    _aigSesSave(slug, { kind: 'video', status: 'done', result: { url }, model: _aigState.selectedModel, aspectRatio: _aigState.aspectRatio });
    _aigRenderVideoResult(url); toast('Video generated!', 'success'); _aigLoadCredits();
  };
  const finishErr = (e) => { stop(); _aigProgressStop(false); _aigSesClear(slug); if (empty) empty.style.display = ''; _aigHandleGenError(e); };

  let polls = 0;
  const maxPolls = 192; // ~16 min, exceeds server's 15-min cap
  const poll = setInterval(async () => {
    polls++;
    if (polls > maxPolls) { finishErr(new Error('Video is taking longer than expected. Check back shortly — your credit was not charged unless it completes.')); return; }
    try {
      const st = await api('/api/ai/jobs/' + jobId);
      if (st.status === 'done' && st.data?.url) { finishOk(st.data.url); }
      else if (st.status === 'failed') { finishErr(new Error(st.error || 'Generation failed')); }
    } catch (e) { /* transient — keep polling */ }
  }, 5000);
  _aigActivePoll = { poll, prog: null }; // progress interval is managed by _aigProgressStart/Stop
}

// ── AUDIO GENERATOR ───────────────────────────────────────

function _aigRenderAudio(config) {
  const page = document.getElementById('page-ai-gen');
  if (!page) return;
  _aigState.selectedVoice = 'A-Xee';
  _aigState.audioModel = 'eleven_v3';
  _aigVoiceSearchTerm = '';
  _aigCurrentGenderFilter = 'all';
  _aigCurrentAccentFilter = 'all';
  _aigCurrentAgeFilter = 'all';
  _aigCurrentProviderFilter = 'all';
  _aigCurrentUseCaseFilter = 'all';

  page.innerHTML = `
    <div class="aig-wrap">
      ${_aigHeader(config, ``)}

      <div class="aig-audio-layout">

        <!-- Left: text + settings + generate + results -->
        <div class="aig-audio-left">
          <div class="aig-panel-card">
            <div class="aig-prompt-label" style="display:flex;justify-content:space-between;align-items:center">
              <span>Text to Convert</span>
              <span id="aigAudioCharCount" style="font-weight:600;color:var(--text-3)">0 / 5000</span>
            </div>
            <textarea id="aigAudioText" class="aig-prompt" placeholder="Type or paste the text you want to convert to speech — narration, scripts, voice-overs…" rows="7" oninput="_aigAudioCharCount()" style="min-height:160px"></textarea>
            <div class="aig-prompt-hint">Natural sentences work best. Punctuation controls pacing and tone.</div>
          </div>
          <div class="aig-panel-card">
            ${_aigAudioModelDropHtml()}
            <div style="margin-top:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div class="aig-ctrl-label">Playback Speed</div>
                <span id="aigSpeedVal" style="font-size:13px;font-weight:700;color:var(--accent)">1.0×</span>
              </div>
              <input type="range" class="aig-speed-slider" min="0.5" max="2.0" step="0.1" value="1.0" oninput="_aigSpeedChange(this.value)" id="aigSpeedSlider">
              <div style="display:flex;justify-content:space-between;margin-top:4px">
                <span style="font-size:10px;color:var(--text-3)">0.5× Slow</span>
                <span style="font-size:10px;color:var(--text-3)">2.0× Fast</span>
              </div>
            </div>
          </div>
          <button class="aig-generate-btn aig-generate-btn-amber aig-generate-btn-full" id="aigGenerateBtn" onclick="_aigAudioGenerate()">
            <i class="fas fa-microphone"></i> Generate Audio
          </button>
          <div class="aig-results" id="aigResults">
            <div class="aig-results-empty" id="aigEmpty">
              <i class="fas fa-waveform-lines"></i>
              <p>Your generated audio will appear here</p>
              <span>Generation takes 5–15 seconds</span>
            </div>
          </div>
        </div>

        <!-- Right: voice panel — all voices with full filters -->
        <div class="aig-voice-panel">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--text-1)">Choose Voice</div>
              <div id="aigVoiceCount" style="font-size:11px;color:var(--text-3);margin-top:2px">Loading voices…</div>
            </div>
            <button class="aig-vf-reset" onclick="_aigVoiceResetFilters()" title="Reset all filters"><i class="fas fa-rotate-left"></i></button>
          </div>
          <input type="text" class="aig-voice-search" id="aigVoiceSearch" placeholder="Search by name…" oninput="_aigVoiceSearch(this.value)">

          <!-- Gender -->
          <div class="aig-vf-row">
            <span class="aig-vf-row-label">Gender</span>
            <div class="aig-vf-pills" id="aigGenderPills">
              <button class="aig-vf-pill active" data-g="all"    onclick="_aigVoiceFilter('all')">All</button>
              <button class="aig-vf-pill"        data-g="female" onclick="_aigVoiceFilter('female')">♀ Female</button>
              <button class="aig-vf-pill"        data-g="male"   onclick="_aigVoiceFilter('male')">♂ Male</button>
            </div>
          </div>

          <!-- Age -->
          <div class="aig-vf-row">
            <span class="aig-vf-row-label">Age</span>
            <div class="aig-vf-pills" id="aigAgePills">
              <button class="aig-vf-pill active" data-a="all"         onclick="_aigVoiceAgeFilter('all')">All</button>
              <button class="aig-vf-pill"        data-a="young"       onclick="_aigVoiceAgeFilter('young')">Young</button>
              <button class="aig-vf-pill"        data-a="middle_aged" onclick="_aigVoiceAgeFilter('middle_aged')">Mid-Age</button>
              <button class="aig-vf-pill"        data-a="old"         onclick="_aigVoiceAgeFilter('old')">Old</button>
            </div>
          </div>

          <!-- Accent (scrollable) -->
          <div class="aig-vf-row">
            <span class="aig-vf-row-label">Accent</span>
            <div class="aig-vf-pills aig-vf-pills-scroll" id="aigAccentPills">
              <button class="aig-vf-pill active" data-ac="all"           onclick="_aigVoiceAccentFilter('all')">All</button>
              <button class="aig-vf-pill"        data-ac="american"      onclick="_aigVoiceAccentFilter('american')">🇺🇸 American</button>
              <button class="aig-vf-pill"        data-ac="british"       onclick="_aigVoiceAccentFilter('british')">🇬🇧 British</button>
              <button class="aig-vf-pill"        data-ac="australian"    onclick="_aigVoiceAccentFilter('australian')">🇦🇺 Australian</button>
              <button class="aig-vf-pill"        data-ac="irish"         onclick="_aigVoiceAccentFilter('irish')">🇮🇪 Irish</button>
              <button class="aig-vf-pill"        data-ac="indian"        onclick="_aigVoiceAccentFilter('indian')">🇮🇳 Indian</button>
              <button class="aig-vf-pill"        data-ac="canadian"      onclick="_aigVoiceAccentFilter('canadian')">🇨🇦 Canadian</button>
              <button class="aig-vf-pill"        data-ac="south-african" onclick="_aigVoiceAccentFilter('south-african')">🇿🇦 S.African</button>
              <button class="aig-vf-pill"        data-ac="nigerian"      onclick="_aigVoiceAccentFilter('nigerian')">🇳🇬 Nigerian</button>
              <button class="aig-vf-pill"        data-ac="american-southern" onclick="_aigVoiceAccentFilter('american-southern')">🇺🇸 Southern</button>
              <button class="aig-vf-pill"        data-ac="transatlantic" onclick="_aigVoiceAccentFilter('transatlantic')">Transatlantic</button>
              <button class="aig-vf-pill"        data-ac="standard"      onclick="_aigVoiceAccentFilter('standard')">Standard</button>
            </div>
          </div>

          <!-- Provider -->
          <div class="aig-vf-row">
            <span class="aig-vf-row-label">Provider</span>
            <div class="aig-vf-pills" id="aigProviderPills">
              <button class="aig-vf-pill active" data-p="all"         onclick="_aigVoiceProviderFilter('all')">All</button>
              <button class="aig-vf-pill"        data-p="elevenlabs"  onclick="_aigVoiceProviderFilter('elevenlabs')">ElevenLabs</button>
              <button class="aig-vf-pill"        data-p="google"      onclick="_aigVoiceProviderFilter('google')">Google</button>
            </div>
          </div>

          <div class="aig-voice-grid-wrap">
            <div class="aig-voice-grid" id="aigVoiceGrid">
              ${Array(12).fill(0).map(() => `
                <div class="aig-voice-skeleton">
                  <div class="aig-vsk-circle"></div>
                  <div class="aig-vsk-lines"><div class="aig-vsk-line"></div><div class="aig-vsk-line"></div></div>
                </div>`).join('')}
            </div>
          </div>
        </div>

      </div>
    </div>`;

  _aigLoadVoices('all');

  // Restore after refresh / back: resume an in-progress job or re-show last audio
  const ses = _aigSesGet(_aigState.toolSlug);
  if (ses && ses.kind === 'audio') {
    if (ses.status === 'processing' && ses.jobId) _aigAudioPoll(ses.jobId, _aigState.toolSlug, ses.textPreview, ses.ts);
    else if (ses.status === 'done' && ses.result?.url) _aigRenderAudioResult(ses.result, ses.textPreview);
  }
}

// ── Voice system — API-driven with character photos ──────

async function _aigLoadVoices(genderFilter) {
  // 1. Try localStorage cache first — has all 486 voices with photos + preview URLs
  if (!_aigVoicesCache) {
    try {
      const stored = localStorage.getItem(_VOICES_LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed._ts && (Date.now() - parsed._ts) < _VOICES_LS_TTL &&
            Array.isArray(parsed.voices) && parsed.voices.length > 16) {
          _aigVoicesCache = parsed.voices;
          _aigVoicesCache._fromApi = true;
        }
      }
    } catch {}
  }

  // 2. If still nothing, build 16 static fallback so grid isn't empty
  if (!_aigVoicesCache) {
    _aigVoicesCache = VOICES.map(v => ({
      name: v.name, gender: v.gender === 'F' ? 'female' : 'male',
      accent_id: v.accent.toLowerCase(), preview_image_url: '', example_mp3_url: ''
    }));
  }

  // 3. Always render what we have immediately — clears skeleton on every open
  _aigRenderVoiceGrid(genderFilter);

  // 4. Already have full API list (from localStorage or this session) — done
  if (_aigVoicesCache._fromApi) return;

  // 5. Fetch full 486 voices from API in background (proxy may be sleeping ~30-60s)
  try {
    const raw = await api('/api/ai/voices');
    // API returns either a plain array OR { provider, voices: [...] }
    const allVoices = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.voices) ? raw.voices : null);
    if (allVoices && allVoices.length > 16) {
      const sorted = allVoices.sort((a, b) => {
        const ga = (a.gender || '').toLowerCase(), gb = (b.gender || '').toLowerCase();
        if (ga !== gb) return ga === 'female' ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      sorted._fromApi = true;
      _aigVoicesCache = sorted;
      // Save to localStorage — next visit shows all 486 with previews instantly
      try { localStorage.setItem(_VOICES_LS_KEY, JSON.stringify({ _ts: Date.now(), voices: sorted })); } catch {}
      _aigRenderVoiceGrid(_aigCurrentGenderFilter);
    }
  } catch { /* keep fallback — already rendered */ }
}

function _aigRenderVoiceGrid(genderFilter) {
  const grid = document.getElementById('aigVoiceGrid');
  if (!grid) return;
  _aigCurrentGenderFilter = genderFilter || 'all';

  if (!_aigVoicesCache) {
    grid.innerHTML = Array(8).fill(0).map(() => `
      <div class="aig-voice-skeleton">
        <div class="aig-vsk-circle"></div>
        <div class="aig-vsk-lines"><div class="aig-vsk-line"></div><div class="aig-vsk-line"></div></div>
      </div>`).join('');
    _aigUpdateVoiceCount(0, 0);
    return;
  }

  let list = _aigVoicesCache;
  if (_aigCurrentGenderFilter !== 'all')
    list = list.filter(v => (v.gender || '').toLowerCase() === _aigCurrentGenderFilter);
  if (_aigCurrentAgeFilter !== 'all')
    list = list.filter(v => (v.age || '').toLowerCase() === _aigCurrentAgeFilter);
  if (_aigCurrentAccentFilter !== 'all')
    list = list.filter(v => (v.accent_id || '').toLowerCase() === _aigCurrentAccentFilter);
  if (_aigCurrentProviderFilter !== 'all')
    list = list.filter(v => (v.provider || '').toLowerCase() === _aigCurrentProviderFilter);
  if (_aigVoiceSearchTerm) {
    const term = _aigVoiceSearchTerm.toLowerCase();
    list = list.filter(v =>
      (v.name || '').toLowerCase().includes(term) ||
      (v.accent_id || '').toLowerCase().includes(term) ||
      (v.use_case || '').toLowerCase().includes(term) ||
      (v.description || '').toLowerCase().includes(term)
    );
  }
  grid.innerHTML = list.length
    ? list.map(v => _aigVoiceCardHtml(v)).join('')
    : `<div style="grid-column:1/-1;padding:24px 0;text-align:center;color:var(--text-3);font-size:13px"><i class="fas fa-search" style="font-size:22px;margin-bottom:8px;display:block;opacity:.3"></i>No voices match these filters</div>`;
  _aigUpdateVoiceCount(list.length, _aigVoicesCache.length);
}

function _aigVoiceSearch(term) {
  _aigVoiceSearchTerm = term;
  _aigRenderVoiceGrid(_aigCurrentGenderFilter);
}

function _aigUpdateVoiceCount(shown, total) {
  const el = document.getElementById('aigVoiceCount');
  if (!el) return;
  if (total === 0) { el.textContent = 'Loading voices…'; return; }
  const isFull = _aigVoicesCache && _aigVoicesCache._fromApi;
  const countStr = shown === total ? `${total} voices` : `${shown} of ${total} voices`;
  el.textContent = isFull ? countStr : `${countStr} · loading more…`;
}

function _aigVoiceCardHtml(v) {
  const isActive = v.name === _aigState.selectedVoice;
  const isPlaying = v.name === _aigPlayingVoiceId;
  const isFemale = (v.gender || '').toLowerCase() === 'female';
  const gClass = isFemale ? 'aig-vf' : 'aig-vm';
  const gBClass = isFemale ? 'aig-voice-gbadge-f' : 'aig-voice-gbadge-m';
  const gLabel = isFemale ? 'F' : 'M';
  const emoji = isFemale ? '👩' : '👨';
  const accent = v.accent_id ? (v.accent_id.charAt(0).toUpperCase() + v.accent_id.slice(1)) : '';
  const previewUrl = v.example_mp3_url || '';

  return `<button class="aig-voice-card${isActive ? ' active' : ''}"
    data-voice="${v.name}" data-gender="${v.gender || ''}" data-preview="${previewUrl}"
    onclick="_aigSelectVoice('${v.name}')">
    ${v.preview_image_url
      ? `<img class="aig-voice-photo ${gClass}" src="${v.preview_image_url}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : ''}
    <div class="aig-voice-placeholder ${isFemale ? 'aig-voice-f' : 'aig-voice-m'}" style="${v.preview_image_url ? 'display:none' : ''}">${emoji}</div>
    <div class="aig-voice-name">${v.name}<span class="aig-voice-gbadge ${gBClass}">${gLabel}</span></div>
    ${accent ? `<div class="aig-voice-meta">${accent}</div>` : ''}
    <button class="aig-voice-preview${isPlaying ? ' vp-playing' : ''}"
      onclick="event.stopPropagation();_aigPreviewVoice('${v.name}','${previewUrl}')"
      title="${isPlaying ? 'Stop preview' : 'Preview voice'}">
      <i class="fas ${isPlaying ? 'fa-stop' : 'fa-play'}"></i>
    </button>
  </button>`;
}

function _aigVoiceCardFallbackHtml(v) {
  const isActive = v.id === _aigState.selectedVoice;
  const isPlaying = v.id === _aigPlayingVoiceId;
  const isFemale = v.gender === 'F';
  const gBClass = isFemale ? 'aig-voice-gbadge-f' : 'aig-voice-gbadge-m';
  const gLabel = isFemale ? 'F' : 'M';
  const emoji = isFemale ? '👩' : '👨';
  return `<button class="aig-voice-card${isActive ? ' active' : ''}"
    data-voice="${v.id}" data-gender="${v.gender}" data-preview=""
    onclick="_aigSelectVoice('${v.id}')">
    <div class="aig-voice-placeholder ${isFemale ? 'aig-voice-f' : 'aig-voice-m'}">${emoji}</div>
    <div class="aig-voice-name">${v.name}<span class="aig-voice-gbadge ${gBClass}">${gLabel}</span></div>
    <div class="aig-voice-meta">${v.accent}</div>
    <button class="aig-voice-preview${isPlaying ? ' vp-playing' : ''}"
      onclick="event.stopPropagation();_aigPreviewVoice('${v.id}','')"
      title="Preview voice">
      <i class="fas ${isPlaying ? 'fa-stop' : 'fa-play'}"></i>
    </button>
  </button>`;
}

function _aigPreviewVoice(voiceId, previewUrl) {
  if (_aigPlayingVoiceId === voiceId) {
    if (_aigVoiceAudio) { _aigVoiceAudio.pause(); _aigVoiceAudio = null; }
    _aigPlayingVoiceId = null;
    _aigUpdatePreviewBtns();
    return;
  }
  if (_aigVoiceAudio) { _aigVoiceAudio.pause(); _aigVoiceAudio = null; }
  if (!previewUrl) { toast('No preview available for this voice', 'info'); return; }

  _aigPlayingVoiceId = voiceId;
  _aigUpdatePreviewBtns();

  const audio = new Audio(previewUrl);
  _aigVoiceAudio = audio;
  audio.onended = () => { _aigPlayingVoiceId = null; _aigVoiceAudio = null; _aigUpdatePreviewBtns(); };
  audio.onerror = () => {
    _aigPlayingVoiceId = null; _aigVoiceAudio = null; _aigUpdatePreviewBtns();
    toast('Preview unavailable', 'error');
  };
  audio.play().catch(() => { _aigPlayingVoiceId = null; _aigVoiceAudio = null; _aigUpdatePreviewBtns(); });
}

function _aigUpdatePreviewBtns() {
  document.querySelectorAll('.aig-voice-card').forEach(card => {
    const btn = card.querySelector('.aig-voice-preview');
    if (!btn) return;
    const isPlaying = card.dataset.voice === _aigPlayingVoiceId;
    btn.classList.toggle('vp-playing', isPlaying);
    const icon = btn.querySelector('i');
    if (icon) icon.className = `fas ${isPlaying ? 'fa-stop' : 'fa-play'}`;
    btn.title = isPlaying ? 'Stop preview' : 'Preview voice';
  });
}

function _aigVoiceFilter(f) {
  document.querySelectorAll('#aigGenderPills .aig-vf-pill').forEach(b => b.classList.toggle('active', b.dataset.g === f));
  _aigCurrentGenderFilter = f;
  _aigRenderVoiceGrid(_aigCurrentGenderFilter);
}
function _aigVoiceAgeFilter(f) {
  document.querySelectorAll('#aigAgePills .aig-vf-pill').forEach(b => b.classList.toggle('active', b.dataset.a === f));
  _aigCurrentAgeFilter = f;
  _aigRenderVoiceGrid(_aigCurrentGenderFilter);
}
function _aigVoiceAccentFilter(f) {
  document.querySelectorAll('#aigAccentPills .aig-vf-pill').forEach(b => b.classList.toggle('active', b.dataset.ac === f));
  _aigCurrentAccentFilter = f;
  _aigRenderVoiceGrid(_aigCurrentGenderFilter);
}
function _aigVoiceProviderFilter(f) {
  document.querySelectorAll('#aigProviderPills .aig-vf-pill').forEach(b => b.classList.toggle('active', b.dataset.p === f));
  _aigCurrentProviderFilter = f;
  _aigRenderVoiceGrid(_aigCurrentGenderFilter);
}
function _aigVoiceResetFilters() {
  _aigCurrentGenderFilter = 'all';
  _aigCurrentAgeFilter = 'all';
  _aigCurrentAccentFilter = 'all';
  _aigCurrentProviderFilter = 'all';
  _aigVoiceSearchTerm = '';
  const searchEl = document.getElementById('aigVoiceSearch');
  if (searchEl) searchEl.value = '';
  document.querySelectorAll('#aigGenderPills .aig-vf-pill').forEach(b => b.classList.toggle('active', b.dataset.g === 'all'));
  document.querySelectorAll('#aigAgePills .aig-vf-pill').forEach(b => b.classList.toggle('active', b.dataset.a === 'all'));
  document.querySelectorAll('#aigAccentPills .aig-vf-pill').forEach(b => b.classList.toggle('active', b.dataset.ac === 'all'));
  document.querySelectorAll('#aigProviderPills .aig-vf-pill').forEach(b => b.classList.toggle('active', b.dataset.p === 'all'));
  _aigRenderVoiceGrid('all');
}

function _aigSelectVoice(id) {
  _aigState.selectedVoice = id;
  document.querySelectorAll('.aig-voice-card').forEach(c => c.classList.toggle('active', c.dataset.voice === id));
}

function _aigSelectAudioModel(id) {
  _aigState.audioModel = id;
}

function _aigSpeedChange(val) {
  _aigState.speed = parseFloat(val);
  const el = document.getElementById('aigSpeedVal');
  if (el) el.textContent = parseFloat(val).toFixed(1) + '×';
}

function _aigAudioCharCount() {
  const ta = document.getElementById('aigAudioText');
  const el = document.getElementById('aigAudioCharCount');
  if (ta && el) el.textContent = ta.value.length + ' / 5000';
}

function _aigAudioBtnReset() {
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-microphone"></i> Generate Audio'; }
  _aigState.generating = false;
}
function _aigShowAudioProgress(startTs) {
  _aigProgressStart({
    icon: 'fa-microphone-lines', title: 'Generating audio…', sub: 'Preparing the voice…', totalSec: 20, startTs: startTs || Date.now(),
    statusMsgs: [[0, 'Preparing the voice…'], [5, 'Synthesizing speech…'], [13, 'Finalizing audio…']]
  });
}
function _aigRenderAudioResult(d, textPreview) {
  const resultsEl = document.getElementById('aigResults');
  document.getElementById('aigAudioProgress')?.remove();
  if (!d || !d.url || !resultsEl) return;
  const card = document.createElement('div');
  card.className = 'aiga-result-card';
  card.innerHTML = `
    <div class="aiga-result-header">
      <div>
        <div class="aiga-result-voice">${escapeHtml(d.voice || _aigState.selectedVoice || 'Voice')}</div>
        ${textPreview ? `<div class="aiga-result-text">${escapeHtml(textPreview)}</div>` : ''}
      </div>
    </div>
    <audio controls class="aiga-audio-player" src="${d.url}" preload="metadata"></audio>
    <div class="aiga-result-footer">
      <span>${escapeHtml(d.model || _aigState.audioModel || '')}</span>
      <button class="aiga-download-btn" onclick="_aigDownloadAudio('${d.url}', event)">
        <i class="fas fa-download"></i> Download MP3
      </button>
    </div>`;
  resultsEl.prepend(card);
}

// Poll an audio job to completion (reusable by generate + resume-after-refresh)
function _aigAudioPoll(jobId, slug, textPreview, startTs) {
  _aigClearActivePoll();
  _aigState.generating = true;
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…'; }
  _aigShowAudioProgress(startTs);
  let polls = 0; const maxPolls = 60; // ~3 min ceiling
  const poll = setInterval(async () => {
    polls++;
    if (polls > maxPolls) { clearInterval(poll); _aigActivePoll = null; _aigAudioBtnReset(); _aigSesClear(slug); _aigProgressStop(false); _aigHandleGenError(new Error('This is taking longer than usual. Please try again.')); return; }
    try {
      const st = await api('/api/ai/jobs/' + jobId);
      if (st.status === 'done' && st.data?.url) {
        clearInterval(poll); _aigActivePoll = null; _aigAudioBtnReset(); _aigProgressStop(true);
        _aigSesSave(slug, { kind: 'audio', status: 'done', result: st.data, textPreview });
        _aigRenderAudioResult(st.data, textPreview);
        toast('Audio generated!', 'success'); _aigLoadCredits();
      } else if (st.status === 'failed') {
        clearInterval(poll); _aigActivePoll = null; _aigAudioBtnReset(); _aigSesClear(slug); _aigProgressStop(false);
        _aigHandleGenError(new Error(st.error || 'Generation failed'));
      }
    } catch (e) { /* transient — keep polling */ }
  }, 3000);
  _aigActivePoll = { poll, prog: null };
}

async function _aigAudioGenerate() {
  if (_aigState.generating) return;
  const text = document.getElementById('aigAudioText')?.value?.trim();
  if (!text) { toast('Enter text to convert', 'warning'); return; }
  _aigState.generating = true;
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating…'; }
  const audioStart = Date.now();
  _aigShowAudioProgress(audioStart);
  const textPreview = text.substring(0, 100) + (text.length > 100 ? '…' : '');

  try {
    const start = await api('/api/ai/audio/generate', 'POST', { text, voice: _aigState.selectedVoice, model: _aigState.audioModel, speed: _aigState.speed, slug: _aigState.toolSlug });
    const jobId = start.job_id;
    if (!jobId) {
      if (start.data?.url) { _aigRenderAudioResult(start.data, textPreview); _aigLoadCredits(); }
      _aigAudioBtnReset();
      return;
    }
    _aigSesSave(_aigState.toolSlug, { kind: 'audio', status: 'processing', jobId, textPreview });
    _aigAudioPoll(jobId, _aigState.toolSlug, textPreview, audioStart);
  } catch (e) {
    document.getElementById('aigAudioProgress')?.remove();
    _aigAudioBtnReset();
    _aigHandleGenError(e);
  }
}

// ── IMAGE DESCRIBER ───────────────────────────────────────

function _aigRenderDescribe(config) {
  const page = document.getElementById('page-ai-gen');
  if (!page) return;
  page.innerHTML = `
    <div class="aig-wrap">
      ${_aigHeader(config, ``)}

      <div class="aig-split-layout">

        <!-- Left: sticky controls -->
        <div class="aig-left-panel">
          <div class="aig-panel-card">
            <div class="aig-prompt-label">Upload Image</div>
            <div class="aig-img-upload-area aig-img-upload-area-lg" id="aigDescUploadArea"
              onclick="document.getElementById('aigDescFileInput').click()"
              ondragover="event.preventDefault()" ondrop="_aigDescHandleDrop(event)">
              <i class="fas fa-cloud-upload-alt" style="font-size:32px;margin-bottom:10px;opacity:.4"></i>
              <span style="font-weight:600;font-size:14px">Click to upload or drag & drop</span>
              <span style="font-size:11px;opacity:.5;margin-top:4px">JPG, PNG, WebP, GIF supported</span>
            </div>
            <input type="file" id="aigDescFileInput" accept="image/*" style="display:none" onchange="_aigDescHandleFile(this)">
            <div class="aig-or-divider"><span>or paste image URL</span></div>
            <input type="text" id="aigDescUrl" class="aig-text-input" placeholder="https://example.com/image.jpg" oninput="_aigDescHandleUrl(this.value)">
            <div id="aigDescPreviewWrap" style="display:none">
              <img id="aigDescPreview" class="aig-img-preview">
              <button class="aig-img-clear" onclick="_aigDescClear()"><i class="fas fa-times"></i> Clear</button>
            </div>
          </div>
          <button class="aig-generate-btn aig-generate-btn-green aig-generate-btn-full" id="aigGenerateBtn" onclick="_aigDescribe()">
            <i class="fas fa-eye"></i> Describe Image
          </button>
        </div>

        <!-- Right: results -->
        <div class="aig-right-panel">
          <div class="aig-results" id="aigResults">
            <div class="aig-results-empty" id="aigEmpty">
              <i class="fas fa-eye"></i>
              <p>Upload an image to get its AI description</p>
              <span>Detailed description ready in 3–5 seconds</span>
            </div>
          </div>
        </div>

      </div>
    </div>`;
}

function _aigDescHandleFile(input) {
  const file = input.files[0];
  if (!file) return;
  _aigState.describeImageUrl = null;
  const reader = new FileReader();
  reader.onload = e => { _aigState.describeImageData = e.target.result; _aigDescShowPreview(e.target.result); };
  reader.readAsDataURL(file);
  _aigUploadToR2(file, u => { _aigState.describeImageUrl = u; });
}
function _aigDescHandleDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  _aigState.describeImageUrl = null;
  const reader = new FileReader();
  reader.onload = ev => { _aigState.describeImageData = ev.target.result; _aigDescShowPreview(ev.target.result); };
  reader.readAsDataURL(file);
  _aigUploadToR2(file, u => { _aigState.describeImageUrl = u; });
}
function _aigDescHandleUrl(url) {
  _aigState.describeImageData = url || null;
  _aigState.describeImageUrl = null; // pasted URL used directly
  if (url) _aigDescShowPreview(url);
  else _aigDescClear();
}
function _aigDescShowPreview(src) {
  const wrap = document.getElementById('aigDescPreviewWrap');
  const img = document.getElementById('aigDescPreview');
  const area = document.getElementById('aigDescUploadArea');
  if (wrap && img) { img.src = src; wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '8px'; wrap.style.marginTop = '12px'; }
  if (area) area.style.display = 'none';
}
function _aigDescClear() {
  _aigState.describeImageData = null;
  _aigState.describeImageUrl = null;
  const wrap = document.getElementById('aigDescPreviewWrap');
  const area = document.getElementById('aigDescUploadArea');
  const urlIn = document.getElementById('aigDescUrl');
  if (wrap) wrap.style.display = 'none';
  if (area) area.style.display = '';
  if (urlIn) urlIn.value = '';
  const fi = document.getElementById('aigDescFileInput');
  if (fi) fi.value = '';
}

async function _aigDescribe() {
  if (_aigState.generating) return;
  if (!_aigState.describeImageData) { toast('Upload or paste an image URL first', 'warning'); return; }
  _aigState.generating = true;
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Describing…'; }
  const empty = document.getElementById('aigEmpty');
  if (empty) empty.style.display = 'none';

  try {
    const res = await api('/api/ai/images/describe', 'POST', { image: _aigState.describeImageUrl || _aigState.describeImageData });
    const desc = res.description || '';
    if (!desc) { toast('No description returned', 'error'); if (empty) empty.style.display = ''; return; }
    const resultsEl = document.getElementById('aigResults');
    const card = document.createElement('div');
    card.className = 'aigd-result-card';
    card.innerHTML = `
      <div class="aigd-result-header">
        <i class="fas fa-quote-left" style="color:var(--accent);opacity:.5"></i>
        <button class="aiga-copy-btn" onclick="_aigCopyText(\`${desc.replace(/`/g,'\\`').replace(/\$/g,'\\$')}\`)">
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
      <p class="aigd-result-text">${escapeHtml(desc)}</p>
      <div class="aigd-result-footer">
        <span>${desc.split(' ').length} words</span>
        <span>${new Date().toLocaleTimeString()}</span>
      </div>`;
    if (resultsEl) resultsEl.prepend(card);
    toast('Image described!', 'success');
  } catch (e) {
    if (empty) empty.style.display = '';
    toast(e.message || 'Description failed. Try again.', 'error');
  } finally {
    _aigState.generating = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-eye"></i> Describe Image'; }
  }
}

function _aigCopyText(text) {
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard!', 'success'));
}

// ── BACKGROUND REMOVER ────────────────────────────────────

function _aigRenderBgRemove(config) {
  const page = document.getElementById('page-ai-gen');
  if (!page) return;
  page.innerHTML = `
    <div class="aig-wrap">
      ${_aigHeader(config, ``)}

      <div class="aig-split-layout">

        <!-- Left: sticky controls -->
        <div class="aig-left-panel">
          <div class="aig-panel-card">
            <div class="aig-prompt-label">Upload Image</div>
            <div class="aig-img-upload-area aig-img-upload-area-lg" id="aigBgrUploadArea"
              onclick="document.getElementById('aigBgrFileInput').click()"
              ondragover="event.preventDefault()" ondrop="_aigBgrHandleDrop(event)">
              <i class="fas fa-scissors" style="font-size:32px;margin-bottom:10px;opacity:.4"></i>
              <span style="font-weight:600;font-size:14px">Click to upload or drag & drop</span>
              <span style="font-size:11px;opacity:.5;margin-top:4px">JPG, PNG, WebP — background will be removed</span>
            </div>
            <input type="file" id="aigBgrFileInput" accept="image/*" style="display:none" onchange="_aigBgrHandleFile(this)">
            <div class="aig-or-divider"><span>or paste image URL</span></div>
            <input type="text" id="aigBgrUrl" class="aig-text-input" placeholder="https://example.com/image.jpg" oninput="_aigBgrHandleUrl(this.value)">
            <div id="aigBgrPreviewWrap" style="display:none">
              <img id="aigBgrPreview" class="aig-img-preview">
              <button class="aig-img-clear" onclick="_aigBgrClear()"><i class="fas fa-times"></i> Clear</button>
            </div>
          </div>
          <button class="aig-generate-btn aig-generate-btn-pink aig-generate-btn-full" id="aigGenerateBtn" onclick="_aigBgRemove()">
            <i class="fas fa-scissors"></i> Remove Background
          </button>
        </div>

        <!-- Right: results -->
        <div class="aig-right-panel">
          <div class="aig-results" id="aigResults">
            <div class="aig-results-empty" id="aigEmpty">
              <i class="fas fa-scissors"></i>
              <p>Upload an image to remove its background</p>
              <span>Returns a transparent PNG in 2–5 seconds</span>
            </div>
          </div>
        </div>

      </div>
    </div>`;
}

function _aigBgrHandleFile(input) {
  const file = input.files[0];
  if (!file) return;
  _aigState.bgrImageUrl = null;
  const reader = new FileReader();
  reader.onload = e => { _aigState.bgrImageData = e.target.result; _aigBgrShowPreview(e.target.result); };
  reader.readAsDataURL(file);
  _aigUploadToR2(file, u => { _aigState.bgrImageUrl = u; });
}
function _aigBgrHandleDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  _aigState.bgrImageUrl = null;
  const reader = new FileReader();
  reader.onload = ev => { _aigState.bgrImageData = ev.target.result; _aigBgrShowPreview(ev.target.result); };
  reader.readAsDataURL(file);
  _aigUploadToR2(file, u => { _aigState.bgrImageUrl = u; });
}
function _aigBgrHandleUrl(url) {
  _aigState.bgrImageData = url || null;
  _aigState.bgrImageUrl = null; // pasted URL used directly
  if (url) _aigBgrShowPreview(url);
  else _aigBgrClear();
}
function _aigBgrShowPreview(src) {
  const wrap = document.getElementById('aigBgrPreviewWrap');
  const img = document.getElementById('aigBgrPreview');
  const area = document.getElementById('aigBgrUploadArea');
  if (wrap && img) { img.src = src; wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '8px'; wrap.style.marginTop = '12px'; }
  if (area) area.style.display = 'none';
}
function _aigBgrClear() {
  _aigState.bgrImageData = null;
  _aigState.bgrImageUrl = null;
  const wrap = document.getElementById('aigBgrPreviewWrap');
  const area = document.getElementById('aigBgrUploadArea');
  const urlIn = document.getElementById('aigBgrUrl');
  if (wrap) wrap.style.display = 'none';
  if (area) area.style.display = '';
  if (urlIn) urlIn.value = '';
  const fi = document.getElementById('aigBgrFileInput');
  if (fi) fi.value = '';
}

async function _aigBgRemove() {
  if (_aigState.generating) return;
  if (!_aigState.bgrImageData) { toast('Upload or paste an image URL first', 'warning'); return; }
  _aigState.generating = true;
  const btn = document.getElementById('aigGenerateBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing…'; }
  const empty = document.getElementById('aigEmpty');
  if (empty) empty.style.display = 'none';

  try {
    const res = await api('/api/ai/images/remove-background', 'POST', { image: _aigState.bgrImageUrl || _aigState.bgrImageData });
    // Proxy now returns a CDN `url` (served direct from Magnific's CDN — no server egress).
    // Keep `result_b64` as a fallback in case of rollback.
    const resultUrl = res.url || res.result_b64;
    if (!resultUrl) { toast('No result returned', 'error'); if (empty) empty.style.display = ''; return; }

    const originalSrc = _aigState.bgrImageData;
    const resultsEl = document.getElementById('aigResults');
    const card = document.createElement('div');
    card.className = 'aigbgr-result-card';
    card.innerHTML = `
      <div class="aigbgr-compare">
        <div class="aigbgr-compare-item">
          <div class="aigbgr-compare-label">Original</div>
          <img src="${typeof originalSrc === 'string' && originalSrc.startsWith('http') ? originalSrc : (originalSrc || '')}" class="aigbgr-compare-img" alt="Original">
        </div>
        <div class="aigbgr-compare-arrow"><i class="fas fa-arrow-right"></i></div>
        <div class="aigbgr-compare-item aigbgr-result-item">
          <div class="aigbgr-compare-label">Background Removed</div>
          <div class="aigbgr-checker">
            <img src="${resultUrl}" class="aigbgr-compare-img" alt="Result">
          </div>
        </div>
      </div>
      <div class="aigbgr-footer">
        <button class="aig-generate-btn aig-generate-btn-pink aigbgr-dl-btn" onclick="_aigDownloadBgr('${resultUrl}', event)">
          <i class="fas fa-download"></i> Download PNG
        </button>
      </div>`;
    if (resultsEl) resultsEl.prepend(card);
    toast('Background removed!', 'success');
  } catch (e) {
    if (empty) empty.style.display = '';
    if (e.data?.error === 'plan_required') toast('Upgrade to Basic or higher to use AI generators', 'warning');
    else toast(e.message || 'Background removal failed. Try again.', 'error');
  } finally {
    _aigState.generating = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-scissors"></i> Remove Background'; }
  }
}
