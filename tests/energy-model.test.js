const assert=require('node:assert/strict');
const {calculateEnergy}=require('../energy-model.js');
const d={mileage:10000,energy1:16,energy2:1,fuelConsumption:6,fuelPrice:8};
assert.equal(calculateEnergy({...d,type:'ev'}).total,1600);
assert.equal(calculateEnergy({...d,type:'gas',energy1:8,energy2:8}).total,6400);
for(const type of ['phev','erev']) {
  const r=calculateEnergy({...d,type,electricShare:50});
  assert.equal(r.electric,800);assert.equal(r.fuel,2400);assert.equal(r.total,3200);
  assert.equal(calculateEnergy({...d,type,electricShare:100}).total,1600);
  assert.equal(calculateEnergy({...d,type,electricShare:0}).total,4800);
  assert.equal(calculateEnergy({...d,type,electricShare:80,mileage:0}).total,0);
}
console.log('energy model: pure electric/fuel, mixed share, endpoints and zero mileage passed');
