const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { findUser, upsertUser, getUsers } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-vynox-hub-secret';
const OWNER_BOOTSTRAP = process.env.OWNER_USERNAME || 'owner';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'owner123';

function ensureOwner() {
  const data = getUsers();
  let owner = data.users.find((u) => u.role === 'owner' && u.username === OWNER_BOOTSTRAP);
  if (!owner) {
    owner = {
      id: uuid(),
      username: OWNER_BOOTSTRAP,
      email: null,
      passwordHash: bcrypt.hashSync(OWNER_PASSWORD, 10),
      role: 'owner',
      discordId: null,
      createdAt: Date.now(),
    };
    data.users.push(owner);
    require('./db').saveUsers(data);
    console.log(`[auth] Owner bootstrap: ${OWNER_BOOTSTRAP} / (mot de passe env OWNER_PASSWORD)`);
  }
}

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    email: u.email || null,
    role: u.role,
    discordId: u.discordId || null,
    createdAt: u.createdAt,
  };
}

function registerEmail({ email, password, username }) {
  email = String(email || '').trim().toLowerCase();
  username = String(username || '').trim();
  if (!email || !password || password.length < 6) {
    throw new Error('Email et mot de passe (6+ caractères) requis.');
  }
  if (findUser((u) => u.email === email)) throw new Error('Email déjà utilisé.');
  if (username && findUser((u) => u.username?.toLowerCase() === username.toLowerCase())) {
    throw new Error('Nom d’utilisateur déjà pris.');
  }
  const user = {
    id: uuid(),
    username: username || email.split('@')[0],
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: 'user',
    discordId: null,
    createdAt: Date.now(),
  };
  upsertUser(user);
  return user;
}

function loginEmail({ email, password }) {
  email = String(email || '').trim().toLowerCase();
  const user = findUser((u) => u.email === email);
  if (!user || !user.passwordHash) throw new Error('Identifiants invalides.');
  if (!bcrypt.compareSync(password, user.passwordHash)) throw new Error('Identifiants invalides.');
  return user;
}

/** Staff / Owner : username + password, PAS d'email obligatoire */
function loginStaff({ username, password }) {
  username = String(username || '').trim();
  const user = findUser(
    (u) =>
      u.username?.toLowerCase() === username.toLowerCase() &&
      (u.role === 'staff' || u.role === 'owner' || u.role === 'admin')
  );
  if (!user || !user.passwordHash) throw new Error('Compte staff introuvable.');
  if (!bcrypt.compareSync(password, user.passwordHash)) throw new Error('Mot de passe incorrect.');
  return user;
}

function createStaffAccount({ username, password, role }, actor) {
  if (!actor || (actor.role !== 'owner' && actor.role !== 'admin')) {
    throw new Error('Owner uniquement.');
  }
  role = role === 'owner' ? 'owner' : role === 'admin' ? 'admin' : 'staff';
  username = String(username || '').trim();
  if (!username || !password || password.length < 4) {
    throw new Error('Username + mot de passe requis.');
  }
  if (findUser((u) => u.username?.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username déjà pris.');
  }
  const user = {
    id: uuid(),
    username,
    email: null,
    passwordHash: bcrypt.hashSync(password, 10),
    role,
    discordId: null,
    createdAt: Date.now(),
    createdBy: actor.id,
  };
  upsertUser(user);
  return user;
}

function linkDiscord(userId, discordProfile) {
  const user = findUser((u) => u.id === userId);
  if (!user) throw new Error('User introuvable');
  // Si un compte existe déjà avec ce discordId, on fusionne côté appelant
  user.discordId = discordProfile.id;
  user.discordTag = `${discordProfile.username}`;
  user.avatar = discordProfile.avatar;
  upsertUser(user);
  return user;
}

function findOrCreateDiscordUser(profile) {
  let user = findUser((u) => u.discordId === profile.id);
  if (user) return user;
  user = {
    id: uuid(),
    username: profile.username,
    email: profile.email || null,
    passwordHash: null,
    role: 'user',
    discordId: profile.id,
    discordTag: profile.username,
    avatar: profile.avatar,
    createdAt: Date.now(),
  };
  upsertUser(user);
  return user;
}

module.exports = {
  ensureOwner,
  sign,
  verifyToken,
  publicUser,
  registerEmail,
  loginEmail,
  loginStaff,
  createStaffAccount,
  linkDiscord,
  findOrCreateDiscordUser,
  JWT_SECRET,
};
