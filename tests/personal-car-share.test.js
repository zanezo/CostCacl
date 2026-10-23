const assert = require('node:assert/strict');
const { analyzePersonality, eligibleIdentities, rangeToValue, valueToRange, validateValue, SHARE_DESTINATION } = require('../personal-car-share.js');
assert.equal(SHARE_DESTINATION, 'https://cost.ahopig.com/');
const summary = analyzePersonality({ mileage: 30000, depYears: 6 }, { perKm: 2, yearTotal: 60000, items: [{key:'energy', value:30000}] }, 'gas');
assert.equal(summary.identity.id, 'explorer');
assert.ok(summary.comment.length > 10);
assert.ok(summary.tags.includes('燃油搭子'));
assert.deepEqual(summary, analyzePersonality({ mileage: 30000, depYears: 6 }, { perKm: 2, yearTotal: 60000, items: [{key:'energy', value:30000}] }, 'gas'));
assert.match(analyzePersonality({mileage:0,depYears:6},{perKm:0,yearTotal:0,items:[]},'ev').comment, /未计入/);
for (const [id, values] of [['carPrice', [0, 30, 100, 300]], ['mileage', [0, 20000, 50000, 100000]]]) {
  values.forEach((v, i) => {
    assert.equal(rangeToValue(id, i * 100), v);
    assert.equal(valueToRange(id, v), i * 100);
  });
}
assert.equal(validateValue('carPrice', '18.88'), 18.88);
assert.equal(validateValue('carPrice', '380'), 380);
assert.equal(validateValue('mileage', '12345'), 12345);
assert.equal(validateValue('mileage', '120000'), 120000);
assert.equal(validateValue('mileage', '0'), 0);
for (const v of ['', '-1', 'Infinity', 'NaN', '10001', '12.345']) assert.equal(validateValue('carPrice', v), null);
for (const v of ['', '-1', '1.5', '1000001']) assert.equal(validateValue('mileage', v), null);
assert.equal(valueToRange('carPrice', 380), 300);
assert.equal(valueToRange('mileage', 120000), 300);
console.log('personal car share behavior passed');
