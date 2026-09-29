(async function () {
  const slot = document.getElementById('nav-auth');
  if (!slot) return;
  const user = await window.HubAPI.getMe();
  if (user) {
    slot.innerHTML = `
      <span class="user-chip">
        <strong>${escapeHtml(user.username)}</strong>
        <span class="role">${escapeHtml(user.role)}</span>
      </span>
      <a class="btn btn-sm btn-ghost" href="dashboard.html">Dashboard</a>
      <button type="button" class="btn btn-sm btn-danger" id="btn-logout">Déco</button>
    `;
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await window.HubAPI.api('/api/auth/logout', { method: 'POST' });
      location.href = 'index.html';
    });
  } else {
    slot.innerHTML = `<a class="btn btn-sm btn-primary" href="login.html">Connexion</a>`;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();
