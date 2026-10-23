const assert = require('node:assert/strict');
const {analyzePersonality} = require('../personality-rules.js');
const base = {mileage:12500,depYears:6,energy1:16,energy2:1,parking:1000};
const result = {yearTotal:30000};
const analyze = (patch={},type='ev') => analyzePersonality({...base,...patch},result,type);
const cases = [
  ['road',{mileage:60000}],['explorer',{mileage:28000}],
  ['hidden',{mileage:1500}],['freedom',{mileage:5000}],
  ['efficient',{energy1:10}],['hungry',{energy1:30}],
  ['cheap',{energy2:.3}],['premium',{energy2:2.5}],
  ['companion',{depYears:14}],['changer',{depYears:2}],
  ['parking',{parking:12000}],['everyday',{}]
];
for(const [id,patch] of cases) {
  const summary=analyze(patch);
  assert.equal(summary.identity.id,id);
  assert.equal(summary.tags.length,3);
  assert.ok(summary.reason.length > 10);
  assert.deepEqual(summary,analyze(patch));
}
assert.equal(analyze({mileage:28000,energy2:.1}).identity.id,'cheap','strong price trait must outrank moderate mileage');
assert.equal(analyze({energy1:5,energy2:8},'gas').identity.id,'efficient');
assert.match(analyze({energy1:5,energy2:8},'gas').identity.declaration,/油量/);
assert.ok(!['cheap','premium'].includes(analyze({energy2:0}).identity.id));
assert.ok(!['hidden','cheap','efficient'].includes(analyze({mileage:0,energy1:0,energy2:0}).identity.id));
assert.equal(analyze({depYears:15,energy1:0,energy2:0}).identity.id,'companion');
assert.equal(analyze({energy1:13}).identity.id,'efficient');
assert.equal(analyze({energy1:13.01}).identity.id,'everyday');
console.log('personality rules: all 12 results, independent scoring, fuel types, boundaries and zero inputs passed');
