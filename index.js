const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const auth = require('./auth');
const discord = require('./discord');
const { getUsers } = require('./db');

auth.ensureOwner();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONT_ORIGIN = process.env.FRONT_ORIGIN || true;

app.use(cors({ origin: FRONT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Fichiers du site
const ROOT = path.join(__dirname, '..');
app.use(express.static(ROOT));

function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  const payload = token && auth.verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Non connecté' });
  const user = require('./db').findUser((u) => u.id === payload.id);
  if (!user) return res.status(401).json({ error: 'Session invalide' });
  req.user = user;
  next();
}

function requireStaff(req, res, next) {
  requireAuth(req, res, () => {
    if (!['staff', 'admin', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Staff / Owner uniquement' });
    }
    next();
  });
}

function requireOwner(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Owner uniquement' });
    }
    next();
  });
}

function setToken(res, user) {
  const token = auth.sign(user);
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });
  return token;
}

// —— Auth ——
app.get('/api/me', (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  const payload = token && auth.verifyToken(token);
  if (!payload) return res.json({ user: null });
  const user = require('./db').findUser((u) => u.id === payload.id);
  res.json({ user: auth.publicUser(user) });
});

app.post('/api/auth/register', (req, res) => {
  try {
    const user = auth.registerEmail(req.body);
    const token = setToken(res, user);
    res.json({ user: auth.publicUser(user), token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const user = auth.loginEmail(req.body);
    const token = setToken(res, user);
    res.json({ user: auth.publicUser(user), token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/staff-login', (req, res) => {
  try {
    const user = auth.loginStaff(req.body);
    const token = setToken(res, user);
    res.json({ user: auth.publicUser(user), token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/auth/discord', (req, res) => {
  const url = discord.authUrl('hub');
  if (!url) {
    return res.status(503).json({
      error: 'Discord OAuth non configuré. Définis DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI.',
    });
  }
  res.redirect(url);
});

app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect('/login.html?error=oauth');
    const tokens = await discord.exchangeCode(code);
    const profile = await discord.fetchUser(tokens.access_token);
    const user = auth.findOrCreateDiscordUser(profile);
    // stocke access token discord en mémoire session simplifiée via cookie séparé (optionnel)
    setToken(res, user);
    res.cookie('discord_at', tokens.access_token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });
    res.redirect('/dashboard.html');
  } catch (e) {
    console.error('discord callback', e);
    res.redirect('/login.html?error=' + encodeURIComponent(e.message));
  }
});

// —— Owner : créer staff ——
app.post('/api/staff/create', requireOwner, (req, res) => {
  try {
    const user = auth.createStaffAccount(req.body, req.user);
    res.json({ user: auth.publicUser(user) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/staff/list', requireOwner, (req, res) => {
  const users = getUsers().users
    .filter((u) => ['staff', 'admin', 'owner'].includes(u.role))
    .map(auth.publicUser);
  res.json({ users });
});

// —— Dashboard serveurs ——
app.get('/api/guilds', requireAuth, async (req, res) => {
  try {
    const at = req.cookies?.discord_at;
    if (!at) {
      return res.json({
        guilds: [],
        note: 'Connecte-toi avec Discord pour voir les serveurs. (Compte email seul = pas de liste guilds Discord.)',
      });
    }
    const guilds = await discord.mutualGuilds(at);
    res.json({ guilds });
  } catch (e) {
    res.status(500).json({ error: e.message, guilds: [] });
  }
});

// Santé
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    discordOAuth: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET),
    botToken: Boolean(process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN),
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Vynox Hub API + site sur http://localhost:${PORT}`);
  console.log(`   Owner bootstrap: user="${process.env.OWNER_USERNAME || 'owner'}"`);
});
