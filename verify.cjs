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


// v2 comparisons and isolated browser-storage fault tests.
vm.runInThisContext(fs.readFileSync(path.join(root,'storage.js'),'utf8'));
const config={scenario:'fast',a:{threshold:5,seconds:30},b:{threshold:5,seconds:10}};
const a=LockoutEngine.aggregate(RESEARCH_DATA.fast,5,30),b=LockoutEngine.aggregate(RESEARCH_DATA.fast,5,10);
assert.notEqual(a.normalBlocked,b.normalBlocked);
assert.deepEqual(PolicyStorage.validateSummary(a),PolicyStorage.validateSummary(LockoutEngine.aggregate(RESEARCH_DATA.fast,5,30)));
let raw=null;const memory={getItem:()=>raw,setItem:(key,value)=>{raw=value;}};
const store=PolicyStorage.create(()=>memory);
assert.deepEqual(store.read(),[]);
const record=store.add('테스트 비교',config,{a,b});
assert.equal(store.read()[0].name,'테스트 비교');
assert.deepEqual(store.read()[0].config,config);
assert.equal(store.read()[0].results.a.normalBlocked,a.normalBlocked);
const reopened=PolicyStorage.create(()=>memory);assert.equal(reopened.read()[0].id,record.id);
const preserved=raw;
assert.throws(()=>store.add('',config,{a,b}));assert.equal(raw,preserved);
assert.throws(()=>store.add('x',{...config,a:{threshold:0,seconds:30}},{a,b}));assert.equal(raw,preserved);
reopened.remove(record.id);assert.equal(store.read().length,0);
for(let i=0;i<20;i++)store.add('기록 '+i,config,{a,b});
const full=raw;assert.throws(()=>store.add('초과',config,{a,b}));assert.equal(raw,full);
raw='{broken';assert.throws(()=>store.read());assert.throws(()=>store.add('새 비교',config,{a,b}));assert.equal(raw,'{broken');
raw=JSON.stringify({version:99,items:[]});assert.throws(()=>store.read());
raw=preserved;
const quota=PolicyStorage.create(()=>({getItem:()=>raw,setItem:()=>{throw new Error('QuotaExceeded');}}));
assert.throws(()=>quota.add('용량 오류',config,{a,b}));assert.equal(raw,preserved);
assert.throws(()=>quota.remove(record.id));assert.equal(raw,preserved);
const denied=PolicyStorage.create(()=>{throw new Error('SecurityError');});assert.throws(()=>denied.read());
assert.equal(LockoutEngine.aggregate(RESEARCH_DATA.fast,5,30).normalBlocked,553);
const bad=JSON.parse(preserved);bad.items[0].config.a.threshold=NaN;raw=JSON.stringify(bad);assert.throws(()=>store.read());
raw=preserved;const untrusted=store.add('<img src=x onerror=alert(1)>',config,{a,b});assert.equal(store.read()[0].name,untrusted.name);
console.log(JSON.stringify({v2:'PASS',samePolicy:'PASS',differentPolicies:'PASS',storageRoundTrip:'PASS',reopenAndDelete:'PASS',corruptDataPreserved:'PASS',quotaAndPermissionFailures:'PASS',limitAndInvalidConfig:'PASS'},null,2));
