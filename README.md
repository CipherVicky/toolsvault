# ToolsVault - Security Suite & Access Arsenal

A production-grade, full-stack cybersecurity & access suite recreation rebranded to **ToolsVault** with authentic enterprise-grade authentication, Bcrypt password hashing, signed JSON Web Tokens (JWT), route guard redirection, and neon cyber HUD design.

## 🛡️ Quick Start

### 1. Start the Server
```bash
cd /home/vicky/graphicotoolz-platform
node server.js
```

The application is live at:
👉 **`http://localhost:3000`**

### 2. Demo Credentials
- **Email:** `demo@toolsvault.com`
- **Password:** `password123`
- **Active Plan:** Premium Access Arsenal (1,500 Credits, role: `admin`, all 109 tools unlocked)
- Or use the **1-Click Demo Login** button directly on the `/login` portal!

---

## 🔒 Full-Stack Security Architecture

1. **Enterprise-Grade Password Storage**:
   - Industry-standard **Bcrypt with 10 salt rounds** (`bcryptjs`).
   - Plaintext passwords are never stored in memory or disk.
   - User database persists safely in `data/users.json`.

2. **Cryptographically Signed JWT Bearer Authentication**:
   - Cryptographically signed JSON Web Tokens (`jsonwebtoken`) with `HS256`.
   - 30-day bearer session with expiration validation.
   - Protected API route guards for tools, AI generators, user profile, and affiliate ledgers.

3. **Complete Route Protection & Redirection**:
   - Accessing `/login` or `/register` directly renders the dedicated ToolsVault cyber authentication portal.
   - Unauthenticated access to protected tools redirects users to `/login` with return parameters.
   - Upon authentication, users are automatically returned to their intended tool or dashboard.

4. **Brand & Color Palette Overhaul**:
   - **Primary Neon Mint:** `#00ff9d` / `#00f0a8`
   - **Electric Cyan:** `#00e5ff`
   - **Obsidian Cyber Slate:** `#05090d`, `#091117`, `#0e1922`
   - **Logo & Banner:** Shield insignia and horizontal arsenal banner integrated seamlessly.
