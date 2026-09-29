
(function () {
  const cfg = window.HUB_CONFIG || {};
  function setHref(id, url) {
    const el = document.getElementById(id);
    if (!el) return;
    if (url) el.href = url;
    else {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Configure le lien dans js/config.js');
      });
    }
  }
  setHref('invite-vynox', cfg.bots?.vynox?.invite);
  setHref('invite-raidx', cfg.bots?.raidx?.invite);
  setHref('link-support', cfg.supportInvite);
})();
