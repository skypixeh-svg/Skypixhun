// IDs bots + invites OAuth2
window.HUB_CONFIG = {
  supportInvite: '', // https://discord.gg/xxxxx

  bots: {
    vynox: {
      name: 'Vynox',
      clientId: '1546881872661844088',
      // permissions=8 = Administrator (à ajuster si besoin)
      invite:
        'https://discord.com/api/oauth2/authorize?client_id=1546881872661844088&permissions=8&scope=bot%20applications.commands',
    },
    raidx: {
      name: 'RaidX',
      clientId: '1554456963687907438',
      invite:
        'https://discord.com/api/oauth2/authorize?client_id=1554456963687907438&permissions=8&scope=bot%20applications.commands',
    },
  },
};
