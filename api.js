const API = ''; // même origine si servi par server/

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function getMe() {
  try {
    const d = await api('/api/me');
    return d.user;
  } catch {
    return null;
  }
}

window.HubAPI = { api, getMe };
