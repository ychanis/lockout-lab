const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=__dirname;
for(const file of ['data.js','engine.js'])vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'));
const reference=JSON.parse(fs.readFileSync(path.join(root,'research/summary.json'),'utf8'));
const report=[];
for(const expected of reference){
 const a=LockoutEngine.aggregate(RESEARCH_DATA[expected.scenario],5,30);
 assert.ok(Math.abs(a.reduction-expected.reduction_mean_pct)<1e-10);
 for(const [key,source]of Object.entries({attackBaseline:'attack_none_mean',attackPolicy:'attack_lock_mean',normalBlocked:'normal_blocked',normalOffered:'normal_offered',normalCorrect:'normal_correct',normalCorrectBlocked:'normal_correct_blocked',normalSuccess:'normal_success_lock',normalSuccessBaseline:'normal_success_none'}))assert.ok(Math.abs(a[key]-expected[source])<1e-10,key);
 for(const run of a.runs)for(const side of ['baseline','policy']){const c=run[side].counts;assert.equal(c.attackOffered,c.attackChecked+c.attackBlocked);assert.equal(c.normalOffered,c.normalChecked+c.normalBlocked);}
 report.push({scenario:expected.scenario,reduction:a.reduction,normalBlockedPct:100*a.normalBlocked/a.normalOffered});
}
// Independent boundary cases: threshold request inspected, expiry inclusive,
// blocked requests do not extend the lock, successful requests reset failures.
const t=LockoutEngine.evaluate([[0,0,0],[1,0,0],[2,1,1],[11,1,1],[12,0,0]],2,10).trace;
assert.equal(t[1].result,'failure');assert.equal(t[1].until,11);
assert.equal(t[2].result,'blocked');assert.equal(t[2].until,11);
assert.equal(t[3].result,'success');assert.equal(t[3].failures,0);
assert.equal(t[4].failures,1);
for(const args of [[0,30],[21,30],[1.5,30],[5,0],[5,301],[5,NaN],[Infinity,30]])assert.throws(()=>LockoutEngine.validate(...args));
assert.equal(Object.values(RESEARCH_DATA).reduce((sum,groups)=>sum+groups.reduce((n,r)=>n+r.length,0),0),48533);
console.log(JSON.stringify({status:'PASS',paperReproduced:report,pairedStreams:90,requests:48533,boundaryChecks:'PASS',invalidInputs:'PASS'},null,2));
