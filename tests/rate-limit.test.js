const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const visitApi = fs.readFileSync(path.join(__dirname, '..', 'api', 'visit.js'), 'utf8');
const eventApi = fs.readFileSync(path.join(__dirname, '..', 'api', 'event.js'), 'utf8');

assert.match(visitApi, /cf-connecting-ip|x-forwarded-for|x-real-ip/i, 'visit API should derive a client IP');
assert.match(visitApi, /NX/, 'visit API should use Redis NX-style dedupe or throttling');
assert.match(eventApi, /cf-connecting-ip|x-forwarded-for|x-real-ip/i, 'event API should derive a client IP');
assert.match(eventApi, /429|thrott|cooldown|duplicate/i, 'event API should expose throttling behavior');

console.log('rate limit contract passed');
