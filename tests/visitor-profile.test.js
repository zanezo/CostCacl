const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('visitor-profile.js', 'utf8');
const values = new Map();
const storage = {getItem: key => values.get(key), setItem: (key, value) => values.set(key, value)};
function boot(localStorage = storage) {
  const context = {window: {}, localStorage, crypto: require('node:crypto').webcrypto, document: {dispatchEvent() {}}, Event};
  vm.runInNewContext(source, context);
  return context.window.VisitorProfile;
}
const first = boot();
assert.ok(first.nickname.length > 0);
assert.equal(first.revealed, false);
assert.equal(first.setNickname(''), false);
assert.equal(first.setNickname('车'.repeat(17)), false);
assert.equal(first.setNickname('  快乐小车主  '), true);
assert.equal(first.nickname, '快乐小车主');
const second = boot();
assert.equal(second.id, first.id);
assert.equal(second.nickname, '快乐小车主');
assert.equal(second.revealed, false);
const fallback = boot({getItem() {throw new Error('Blocked');}, setItem() {throw new Error('Blocked');}});
assert.ok(fallback.id);
assert.ok(fallback.nickname);
console.log('visitor profile: defaults, validation, identity stability, persistence and blocked storage passed');
