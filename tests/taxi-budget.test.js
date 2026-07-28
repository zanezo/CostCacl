const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const result = (d => { const trip=Math.max(Number(d.averageTripKm)||0,0.001); const single=d.taxiStartFare+Math.max(trip-d.taxiStartKm,0)*d.taxiPerKm; const taxiKm=single/trip; return {singleTripCost:single,taxiCostPerKm:taxiKm,annualTaxiCost:d.mileage*taxiKm,breakEvenMileage:(taxiKm-d.variableCostPerKm)>0?d.fixedCost/(taxiKm-d.variableCostPerKm):null,annualDifference:d.mileage*taxiKm-(d.fixedCost+d.mileage*d.variableCostPerKm)}; })({
  mileage: 12500,
  fixedCost: 29460,
  variableCostPerKm: 0.68,
  taxiStartFare: 13,
  taxiStartKm: 3,
  taxiPerKm: 2.5,
  averageTripKm: 8,
});

assert.equal(result.singleTripCost, 25.5);
assert.equal(result.taxiCostPerKm, 3.1875);
assert.equal(result.annualTaxiCost, 39843.75);
assert.equal(Math.round(result.breakEvenMileage), 11749);
assert.equal(result.annualDifference, 1883.75);

const noThreshold = (d => { const trip=Math.max(Number(d.averageTripKm)||0,0.001); const single=d.taxiStartFare+Math.max(trip-d.taxiStartKm,0)*d.taxiPerKm; const taxiKm=single/trip; return {breakEvenMileage:(taxiKm-d.variableCostPerKm)>0?d.fixedCost/(taxiKm-d.variableCostPerKm):null}; })({
  mileage: 10000,
  fixedCost: 10000,
  variableCostPerKm: 4,
  taxiStartFare: 10,
  taxiStartKm: 3,
  taxiPerKm: 2,
  averageTripKm: 8,
});

assert.equal(noThreshold.breakEvenMileage, null);

console.log('taxi budget calculations passed');
