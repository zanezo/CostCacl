const assert = require('node:assert/strict');
const { eligibleIdentities, rangeToValue, valueToRange, validateValue } = require('../personal-car-share.js');
const ids = (mileage, depYears = 6, perKm = 2) => eligibleIdentities({ mileage, depYears }, { perKm }).map(x => x.id);
assert.equal(ids(7999)[0], 'freedom');
assert.equal(ids(8000)[0], 'everyday');
assert.equal(ids(24999)[0], 'everyday');
assert.equal(ids(25000)[0], 'explorer');
assert.equal(ids(12500, 8)[0], 'companion');
assert.equal(ids(12500, 7, 1)[0], 'saver');
assert.equal(ids(12500, 7, 1.01)[0], 'everyday');
assert.ok(!ids(0, 8, 0).includes('saver'));
assert.ok(ids(30000, 8, 0.5).includes('everyday'));
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
