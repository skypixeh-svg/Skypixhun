/**
 * OAuth Discord + liste des guilds (là où le user a le bot si BOT_TOKEN fourni)
 */
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '';

function authUrl(state) {
  if (!CLIENT_ID) return null;
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email guilds',
    state: state || 'hub',
    prompt: 'none',
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('OAuth token failed: ' + (await res.text()));
  return res.json();
}

async function fetchUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Discord user failed');
  return res.json();
}

async function fetchUserGuilds(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function fetchBotGuildIds() {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    if (!res.ok) return null;
    const guilds = await res.json();
    return new Set(guilds.map((g) => g.id));
  } catch {
    return null;
  }
}

/** Guilds du user où le bot est présent (si BOT_TOKEN) */
async function mutualGuilds(accessToken) {
  const [userGuilds, botIds] = await Promise.all([
    fetchUserGuilds(accessToken),
    fetchBotGuildIds(),
  ]);
  if (!botIds) {
    // sans bot token : on renvoie les guilds user (admin only filter côté front optionnel)
    return userGuilds.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      permissions: g.permissions,
      botPresent: null,
    }));
  }
  return userGuilds
    .filter((g) => botIds.has(g.id))
    .map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner,
      permissions: g.permissions,
      botPresent: true,
    }));
}

module.exports = {
  authUrl,
  exchangeCode,
  fetchUser,
  fetchUserGuilds,
  mutualGuilds,
  CLIENT_ID,
  REDIRECT_URI,
};
