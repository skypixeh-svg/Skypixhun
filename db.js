const fs = require('fs');
const path = require('path');
const DATA = path.join(__dirname, 'data');
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

function load(name, fallback) {
  const p = path.join(DATA, name);
  try {
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, JSON.stringify(fallback, null, 2));
      return structuredClone(fallback);
    }
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return structuredClone(fallback);
  }
}
function save(name, data) {
  fs.writeFileSync(path.join(DATA, name), JSON.stringify(data, null, 2));
}

function getUsers() {
  return load('users.json', { users: [] });
}
function saveUsers(data) {
  save('users.json', data);
}

function findUser(pred) {
  return getUsers().users.find(pred);
}

function upsertUser(user) {
  const data = getUsers();
  const i = data.users.findIndex((u) => u.id === user.id);
  if (i >= 0) data.users[i] = user;
  else data.users.push(user);
  saveUsers(data);
  return user;
}

module.exports = { getUsers, saveUsers, findUser, upsertUser, load, save };
