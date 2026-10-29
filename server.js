const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'toolsvault_sec_arsenal_jwt_secret_2026_super_secure';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static assets from both /app and root paths
const publicDir = path.join(__dirname, 'public');
app.use('/app/css', express.static(path.join(publicDir, 'css')));
app.use('/app/js', express.static(path.join(publicDir, 'js')));
app.use('/app/img', express.static(path.join(publicDir, 'img')));
app.use('/css', express.static(path.join(publicDir, 'css')));
app.use('/js', express.static(path.join(publicDir, 'js')));
app.use('/img', express.static(path.join(publicDir, 'img')));

// Load pre-extracted datasets
const toolsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'tools.json'), 'utf8'));
const categoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'categories.json'), 'utf8'));
const pricingData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'pricing.json'), 'utf8'));
const publicStatsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'public-stats.json'), 'utf8'));
const storeData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'store_products.json'), 'utf8'));

// ==========================================
// PERSISTENT USER DATA STORE (Bcrypt + JWT)
// ==========================================
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading users.json:', e.message);
  }

  // Seed default admin demo user if empty
  const defaultSalt = bcrypt.genSaltSync(10);
  const defaultHash = bcrypt.hashSync('password123', defaultSalt);
  const initialUsers = [
    {
      id: 1,
      first_name: 'Alex',
      last_name: 'Rivera',
      email: 'demo@toolsvault.com',
      password_hash: defaultHash,
      plan: 'premium',
      role: 'admin',
      credits: 1500,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      verified: true,
      created_at: '2026-01-15T10:00:00.000Z'
    }
  ];
  saveUsers(initialUsers);
  return initialUsers;
}

function saveUsers(usersList) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersList, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save users.json:', e.message);
  }
}

// In-Memory Database for State Management & Sync
let users = loadUsers();

let userFavorites = { 1: [1, 6, 42, 57] };
let pendingVerifications = {};
let userPurchasedTools = { 1: [1, 2, 3, 4, 5, 6, 7, 8, 42, 57, 200, 201, 202] };
let communityRequests = [
  { id: 1, tool_name: 'Leonardo.Ai Ultra', category: 'AI Tools', votes: 47, status: 'in-review', created_at: '2026-06-10' },
  { id: 2, tool_name: 'Perplexity Pro Team', category: 'AI Tools', votes: 89, status: 'planned', created_at: '2026-06-08' },
  { id: 3, tool_name: 'CapCut Pro Desktop', category: 'Video Tools', votes: 112, status: 'in-progress', created_at: '2026-06-05' }
];

let storeOrders = [
  {
    id: 'ORD-9821',
    user_id: 1,
    product_name: 'Figma Professional',
    selected_option: '1 Month',
    quantity: 1,
    total_amount: '$3.99',
    status: 'completed',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
  }
];

let affiliateData = {
  1: {
    registered: true,
    code: 'VAULT-ALEX',
    link: 'https://toolsvault.com/ref/VAULT-ALEX',
    tier: { name: 'Pro Partner', rate: 20 },
    payout_method: 'PayPal (alex.rivera@example.com)',
    unpaid_usd: 148.50,
    unpaid_inr: 12450,
    paid_usd: 384.00,
    paid_inr: 32180,
    clicks: 218,
    signups: 42,
    total_paid_sales: 18,
    config: {
      min_payout: 20,
      tiers: [
        { name: 'Starter', rate: 15, min: 0 },
        { name: 'Pro Partner', rate: 20, min: 10 },
        { name: 'VIP Elite', rate: 30, min: 50 }
      ]
    }
  }
};

let affiliatePayouts = [
  { id: 'PAY-104', amount_usd: 120.00, status: 'completed', method: 'PayPal', date: '2026-05-15' },
  { id: 'PAY-105', amount_usd: 264.00, status: 'completed', method: 'PayPal', date: '2026-06-01' }
];

// Sanitize user for safe response (never send password or hash to client)
function toSafeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    first_name: user.first_name || 'Operative',
    last_name: user.last_name || '',
    email: user.email,
    plan: user.plan || 'premium',
    role: user.role || 'user',
    credits: user.credits !== undefined ? user.credits : 1500,
    avatar_url: user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email || 'user')}`,
    verified: !!user.verified,
    created_at: user.created_at || new Date().toISOString()
  };
}

// Generate real signed JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      plan: user.plan || 'premium',
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Real Authentication Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please sign in to continue' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Reload users list if needed
    const user = users.find(u => u.id === payload.id);
    if (!user) return res.status(401).json({ error: 'User account not found', account_gone: true });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

// Optional Auth Middleware
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = users.find(u => u.id === payload.id) || null;
    } catch (e) {
      req.user = null;
    }
  }
  next();
}

// ========================
// PUBLIC API ROUTES
// ========================

// Public stats ticker
app.get('/api/public-stats', (req, res) => {
  res.json(publicStatsData);
});

// Categories list
app.get('/api/categories', (req, res) => {
  res.json(categoriesData);
});

// Tools directory
app.get('/api/tools', (req, res) => {
  res.json(toolsData);
});

// Frequently used / recent tools
app.get('/api/tools/frecent', optionalAuth, (req, res) => {
  const frecentSlugs = ['canva', 'envato-elements', 'chatgpt', 'ai-audio', 'flux-2-max', 'semrush'];
  const frecentTools = toolsData.filter(t => frecentSlugs.includes(t.slug));
  res.json(frecentTools);
});

// Single Tool Detail View
app.get('/api/tools/:slug', optionalAuth, (req, res) => {
  const slug = req.params.slug;
  const tool = toolsData.find(t => t.slug === slug);
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }

  // Detailed tool response matching ToolsVault structure
  const detailedTool = {
    ...tool,
    website_url: tool.website_url || `https://${tool.slug.replace(/-/g, '')}.com`,
    vault_mode: 'vault',
    hide_selectors: `[data-cy="gen-ai-toggle"]\n[data-cy="ai-generations-meter"]\na[href*="/generation-history"]\n[data-cy="profile-menu"]\n.user-settings\n.billing-tab`,
    credentials: [
      { id: 1, label: 'Vault Secure Tunnel 1 (US-East)', is_active: 1, last_verified: 'Just now' },
      { id: 2, label: 'Backup Cyber Tunnel 2 (EU-Frankfurt)', is_active: 1, last_verified: '5 mins ago' },
      { id: 3, label: 'VIP Stealth Dedicated Node', is_active: 1, last_verified: 'Active' }
    ],
    info_notes: 'Please do not sign out or modify profile settings inside the shared tool workspace.',
    info_limitations: 'Daily fair use limit applies to maintain maximum speed for all members.',
    demo_video_url: ''
  };

  res.json(detailedTool);
});

// Access Tool Session Endpoint
app.post('/api/tools/:id/access/:credId', authMiddleware, (req, res) => {
  const toolId = parseInt(req.params.id);
  const tool = toolsData.find(t => t.id === toolId);
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found in arsenal' });
  }

  const websiteUrl = tool.website_url || `https://${tool.slug.replace(/-/g, '')}.com`;
  res.json({
    success: true,
    tool_name: tool.name,
    auth_type: tool.auth_type || 'cookie',
    website_url: websiteUrl,
    vault_mode: 'vault',
    credential_data: {
      session_id: 'vault_sess_' + Date.now(),
      server: req.params.credId || '1'
    }
  });
});

// Search suggestions
app.get('/api/suggest', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json([]);
  const matches = toolsData
    .filter(t => t.name.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)))
    .slice(0, 8)
    .map(t => ({ id: t.id, name: t.name, slug: t.slug, icon: t.logo_url }));
  res.json(matches);
});

// Pricing & individual tools
app.get('/api/pricing', (req, res) => {
  res.json(pricingData);
});

// Credit packs
app.get('/api/payment/credit-packs', (req, res) => {
  res.json({
    packs: [
      { id: 'pack-500', credits: 500, price_usd: 5, price_inr: 420, bonus: 0, badge: '' },
      { id: 'pack-1200', credits: 1200, price_usd: 10, price_inr: 850, bonus: 200, badge: 'Popular' },
      { id: 'pack-3500', credits: 3500, price_usd: 25, price_inr: 2100, bonus: 700, badge: 'Best Value' },
      { id: 'pack-10000', credits: 10000, price_usd: 65, price_inr: 5400, bonus: 2500, badge: 'Studio Pro' }
    ]
  });
});

// Digital Store Products
app.get('/api/store/products', (req, res) => {
  res.json(storeData);
});

app.get('/api/store/products/:slug', (req, res) => {
  const slug = req.params.slug;
  const p = storeData.products.find(x => x.slug === slug || String(x.id) === slug);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

// Announcements banner
app.get('/api/announcements', (req, res) => {
  res.json({
    enabled: true,
    mode: 'single',
    interval: 6000,
    announcements: [
      {
        text: '🛡️ ToolsVault Arsenal Online: Kling 3.0 & Flux.2 Max are live in AI Studio! All 109+ premium tools armed.',
        style: 'info',
        link: '#tools'
      }
    ]
  });
});

// Settings & System Metadata
app.get('/api/settings/session-timeout', (req, res) => {
  res.json({ timeout_minutes: 120, idle_minutes: 45 });
});

app.get('/api/settings/extension', (req, res) => {
  res.json({
    extension_id: 'toolsvault-sec-arsenal-v2',
    min_version: '2.5.0',
    chrome_store_url: 'https://chrome.google.com/webstore/detail/toolsvault',
    direct_zip_url: '/extension-bundle.zip'
  });
});

app.get('/api/settings/support-widgets', (req, res) => {
  res.json({
    whatsapp_number: '+1 (555) 789-2044',
    telegram: 'ToolsVaultSupport',
    crisp_id: 'sample-crisp-id'
  });
});

// Notifications
app.get('/api/notifications', optionalAuth, (req, res) => {
  res.json({
    notifications: [
      {
        id: 1,
        type: 'success',
        title: 'Welcome to ToolsVault',
        message: 'Your cybersec access arsenal is fully armed. Access 109+ premium design, SEO, and AI suites securely.',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        read: false
      },
      {
        id: 2,
        type: 'promo',
        title: 'New AI Generator Deployed',
        message: 'Kling 3.0 High-Definition video generator is now unlocked for all armed members.',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        read: false
      }
    ],
    unread_count: 2
  });
});

app.post('/api/notifications/read-all', optionalAuth, (req, res) => {
  res.json({ success: true });
});

// Community Requests
app.get('/api/requests', (req, res) => {
  res.json(communityRequests);
});

app.post('/api/requests', optionalAuth, (req, res) => {
  const { tool_name, category } = req.body;
  if (!tool_name) return res.status(400).json({ error: 'Tool name is required' });
  const newReq = {
    id: communityRequests.length + 1,
    tool_name,
    category: category || 'Other',
    votes: 1,
    status: 'under-review',
    created_at: new Date().toISOString()
  };
  communityRequests.unshift(newReq);
  res.json({ success: true, request: newReq });
});

app.get('/api/reports/my-open', optionalAuth, (req, res) => {
  res.json([]);
});

// ========================
// AUTHENTICATION ROUTES (FULL-STACK SECURE)
// ========================

// Current authenticated user verification
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: toSafeUser(req.user)
  });
});

// User Registration
app.post('/api/auth/register', (req, res) => {
  const { first_name, last_name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Salt & hash password with bcrypt
  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);

  const newId = users.length > 0 ? Math.max(...users.map(u => u.id || 0)) + 1 : 1;
  const newUser = {
    id: newId,
    first_name: (first_name || 'Operative').trim(),
    last_name: (last_name || '').trim(),
    email: cleanEmail,
    password_hash,
    plan: 'premium',
    role: 'user',
    credits: 1500,
    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
    verified: true,
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  // Initialize defaults for new user
  userFavorites[newUser.id] = [1, 6, 42, 57];
  userPurchasedTools[newUser.id] = [1, 2, 3, 4, 5, 6, 7, 8, 42, 57, 200, 201, 202];

  const token = generateToken(newUser);
  res.json({
    token,
    user: toSafeUser(newUser),
    message: 'Account successfully registered and secured!'
  });
});

// User Login (Bcrypt verified)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter both email and password' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Verify password with bcrypt (or migrate legacy plain-text password if present)
  let passwordMatches = false;
  if (user.password_hash) {
    passwordMatches = bcrypt.compareSync(password, user.password_hash);
  } else if (user.password) {
    passwordMatches = (user.password === password);
    // Auto-upgrade to bcrypt hash
    if (passwordMatches) {
      user.password_hash = bcrypt.hashSync(password, 10);
      delete user.password;
      saveUsers(users);
    }
  }

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: toSafeUser(user)
  });
});

app.post('/api/auth/resend-code', (req, res) => {
  res.json({ success: true, message: 'Security code dispatched' });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// User Profile
app.get('/api/user/profile', authMiddleware, (req, res) => {
  res.json(toSafeUser(req.user));
});

app.get('/api/user/credits', authMiddleware, (req, res) => {
  res.json({
    credits: req.user.credits !== undefined ? req.user.credits : 1500,
    daily_resets: {
      images: 60,
      videos: 50,
      audio: 50
    }
  });
});

app.get('/api/user/purchased-tools', authMiddleware, (req, res) => {
  const purchased = userPurchasedTools[req.user.id] || [1, 2, 3, 4, 5, 6, 7, 8, 42, 57, 200, 201, 202];
  res.json({ tool_ids: purchased });
});

app.get('/api/user/activity', authMiddleware, (req, res) => {
  res.json([
    { id: 1, action: 'Authenticated into Canva Pro Cyber Tunnel', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, action: 'Rendered AI Asset via Flux.2 Max', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: 3, action: 'Connected to Envato Elements Vault Tunnel', timestamp: new Date(Date.now() - 14400000).toISOString() }
  ]);
});

// Favorites
app.get('/api/favorites', authMiddleware, (req, res) => {
  const favs = userFavorites[req.user.id] || [1, 6, 42, 57];
  res.json(favs);
});

app.post('/api/favorites/:toolId', authMiddleware, (req, res) => {
  const toolId = parseInt(req.params.toolId);
  if (!userFavorites[req.user.id]) userFavorites[req.user.id] = [];
  if (!userFavorites[req.user.id].includes(toolId)) {
    userFavorites[req.user.id].push(toolId);
  }
  res.json({ success: true, favorites: userFavorites[req.user.id] });
});

app.delete('/api/favorites/:toolId', authMiddleware, (req, res) => {
  const toolId = parseInt(req.params.toolId);
  if (userFavorites[req.user.id]) {
    userFavorites[req.user.id] = userFavorites[req.user.id].filter(id => id !== toolId);
  }
  res.json({ success: true, favorites: userFavorites[req.user.id] || [] });
});

// Home Feed
app.get('/api/home/feed', optionalAuth, (req, res) => {
  res.json({
    urgent: null,
    items: [
      {
        id: 'spotlight-1',
        icon: 'fa-shield-halved',
        title: 'ToolsVault Security Suite 2.0 Live',
        text: 'Access 109+ cutting-edge arsenals: ChatGPT Plus, Canva Pro, Envato Elements, Flux.2 Max & ElevenLabs.',
        cta_text: 'Explore Arsenal',
        cta_action: "showPage('tools')"
      },
      {
        id: 'spotlight-2',
        icon: 'fa-lock',
        title: 'Zero-Credential Vault Mode',
        text: 'Direct encrypted injection for all tools. No password leakage or session sharing conflicts.',
        cta_text: 'Launch Tool Hub',
        cta_action: "showPage('tools')"
      }
    ]
  });
});

// ========================
// AI SUITE API
// ========================

const sampleAiImages = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1618172193763-c511deb635ca?auto=format&fit=crop&w=1200&q=80'
];

app.post('/api/ai/images/generate', authMiddleware, (req, res) => {
  const { prompt, model, num } = req.body;
  const count = parseInt(num) || 1;

  if (req.user.credits >= 10) {
    req.user.credits -= 10;
    saveUsers(users);
  }

  const results = [];
  for (let i = 0; i < count; i++) {
    const randomImg = sampleAiImages[Math.floor(Math.random() * sampleAiImages.length)];
    results.push({ url: randomImg });
  }

  res.json({
    data: results,
    credits_remaining: req.user.credits
  });
});

app.post('/api/ai/videos/generate', authMiddleware, (req, res) => {
  if (req.user.credits >= 20) {
    req.user.credits -= 20;
    saveUsers(users);
  }
  res.json({
    data: {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    },
    credits_remaining: req.user.credits
  });
});

app.post('/api/ai/audio/generate', authMiddleware, (req, res) => {
  const { text, voice } = req.body;
  if (req.user.credits >= 5) {
    req.user.credits -= 5;
    saveUsers(users);
  }
  res.json({
    data: {
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      voice: voice || 'Adam',
      duration: '0:14'
    },
    credits_remaining: req.user.credits
  });
});

app.post('/api/ai/images/remove-background', authMiddleware, (req, res) => {
  res.json({
    data: {
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80'
    }
  });
});

app.post('/api/ai/images/describe', authMiddleware, (req, res) => {
  res.json({
    description: 'A cinematic high-resolution digital render with vibrant cyber neon mint lighting, intricate geometric patterns, and volumetric glass reflections.'
  });
});

app.get('/api/ai/models', (req, res) => {
  res.json({
    image_models: ['flux-2-max', 'gpt-2', 'recraft-v4-pro', 'seedream-4-5', 'mystic-2-5'],
    video_models: ['kling-3-0', 'kling-2-5', 'seedance-2-0', 'veo-2'],
    audio_models: ['elevenlabs-multilingual-v2', 'gemini-voice-turbo']
  });
});

app.get('/api/ai/voices', (req, res) => {
  res.json([
    { id: 'adam', name: 'Adam (Operative, Deep, American)' },
    { id: 'rachel', name: 'Rachel (Calm, Protocol Specialist)' },
    { id: 'bella', name: 'Bella (Warm, Cyber Analyst)' },
    { id: 'antoni', name: 'Antoni (Energetic, Modern)' }
  ]);
});

app.get('/api/ai/usage', authMiddleware, (req, res) => {
  res.json({
    daily_images_used: 12,
    daily_images_limit: 60,
    daily_videos_used: 3,
    daily_videos_limit: 50,
    daily_audio_used: 8,
    daily_audio_limit: 50
  });
});

// ========================
// STORE ORDERS API
// ========================

app.post('/api/store/orders', authMiddleware, (req, res) => {
  const { product_id, options, quantity, contact } = req.body;
  const prod = storeData.products.find(p => p.id === parseInt(product_id));
  
  const order = {
    id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
    user_id: req.user.id,
    product_name: prod ? prod.name : 'Store Item',
    options: options || {},
    quantity: quantity || 1,
    contact: contact || req.user.email,
    status: 'completed',
    created_at: new Date().toISOString()
  };

  storeOrders.unshift(order);
  res.json({ success: true, order });
});

app.get('/api/store/my-orders', authMiddleware, (req, res) => {
  const my = storeOrders.filter(o => o.user_id === req.user.id);
  res.json({ orders: my });
});

// ========================
// AFFILIATE SYSTEM API
// ========================

app.get('/api/affiliate/me', authMiddleware, (req, res) => {
  let aff = affiliateData[req.user.id];
  if (!aff) {
    aff = {
      registered: false,
      config: {
        min_payout: 20,
        tiers: [
          { name: 'Starter', rate: 15, min: 0 },
          { name: 'Pro Partner', rate: 20, min: 10 },
          { name: 'VIP Elite', rate: 30, min: 50 }
        ]
      }
    };
  }
  res.json(aff);
});

app.post('/api/affiliate/register', authMiddleware, (req, res) => {
  const code = 'VAULT-' + (req.user.first_name || 'VIP').toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
  affiliateData[req.user.id] = {
    registered: true,
    code,
    link: `https://toolsvault.com/ref/${code}`,
    tier: { name: 'Starter', rate: 15 },
    payout_method: req.body.payout_method || 'PayPal (user@example.com)',
    unpaid_usd: 0.00,
    unpaid_inr: 0,
    paid_usd: 0.00,
    paid_inr: 0,
    clicks: 1,
    signups: 0,
    total_paid_sales: 0,
    config: {
      min_payout: 20,
      tiers: [
        { name: 'Starter', rate: 15, min: 0 },
        { name: 'Pro Partner', rate: 20, min: 10 },
        { name: 'VIP Elite', rate: 30, min: 50 }
      ]
    }
  };
  res.json(affiliateData[req.user.id]);
});

app.get('/api/affiliate/links', authMiddleware, (req, res) => {
  const aff = affiliateData[req.user.id];
  if (!aff || !aff.registered) return res.json([]);
  res.json([
    { id: 1, name: 'Default Arsenal Link', url: aff.link, clicks: aff.clicks, conversions: aff.signups }
  ]);
});

app.get('/api/affiliate/conversions', authMiddleware, (req, res) => {
  res.json([
    { id: 1, user: 'm***@gmail.com', plan: 'Premium Arsenal (Monthly)', commission: '$2.10', date: '2026-06-18' },
    { id: 2, user: 'k***@yahoo.com', plan: 'AI Studio Elite (Yearly)', commission: '$18.00', date: '2026-06-14' },
    { id: 3, user: 'd***@outlook.com', plan: 'Standard Key', commission: '$1.50', date: '2026-06-10' }
  ]);
});

app.post('/api/affiliate/payout', authMiddleware, (req, res) => {
  const aff = affiliateData[req.user.id];
  if (!aff || aff.unpaid_usd < 20) {
    return res.status(400).json({ error: 'Minimum payout threshold is $20.00' });
  }
  const payout = {
    id: 'PAY-' + Math.floor(100 + Math.random() * 900),
    amount_usd: aff.unpaid_usd,
    status: 'pending',
    method: aff.payout_method,
    date: new Date().toISOString()
  };
  affiliatePayouts.unshift(payout);
  aff.paid_usd += aff.unpaid_usd;
  aff.unpaid_usd = 0;
  res.json({ success: true, payout });
});

app.get('/api/affiliate/payouts', authMiddleware, (req, res) => {
  res.json(affiliatePayouts);
});

// Dedicated routes for /login, /register, and SPA page fallbacks
app.get(['/login', '/register', '/signin', '/signup'], (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Serve frontend for all standard page routes
app.use((req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛡️  ToolsVault - Security Suite & Access Arsenal Running`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`🔑 Demo User: demo@toolsvault.com  Password: password123`);
  console.log(`📦 Loaded: 109 Tools | 11 Categories | 5 Plans | 8 Store Items`);
  console.log(`🔒 Security: Bcrypt Salt Rounds: 10 | JWT Exp: 30d`);
  console.log(`======================================================\n`);
});
