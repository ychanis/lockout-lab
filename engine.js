/* Original paper's event model, translated to JavaScript. No network requests. */
(function(root){
'use strict';
function validate(threshold,seconds){
 if(!Number.isInteger(threshold)||threshold<1||threshold>20)throw new Error('실패 횟수는 1~20 사이의 정수로 입력해 주세요.');
 if(!Number.isInteger(seconds)||seconds<1||seconds>300)throw new Error('차단 시간은 1~300초 사이의 정수로 입력해 주세요.');
}
function evaluate(events,threshold=5,seconds=30,enabled=true){
 validate(threshold,seconds);
 let failures=0,until=null;
 const counts={attackOffered:0,attackChecked:0,attackBlocked:0,normalOffered:0,normalChecked:0,normalBlocked:0,normalSuccess:0,normalCorrect:0,normalCorrectBlocked:0};
 const trace=[];
 for(let i=0;i<events.length;i++){
 const [time,normal,correct]=events[i]; const prefix=normal?'normal':'attack'; counts[prefix+'Offered']++;
 if(normal)counts.normalCorrect+=correct;
 if(until!==null&&time>=until){failures=0;until=null;}
 const blocked=enabled&&until!==null&&time<until;
 let result;
 if(blocked){counts[prefix+'Blocked']++;result='blocked';if(normal)counts.normalCorrectBlocked+=correct;}
 else{counts[prefix+'Checked']++;if(correct){failures=0;result='success';if(normal)counts.normalSuccess++;}
 else{failures++;result='failure';if(enabled&&failures>=threshold)until=time+seconds;}}
 trace.push({id:i+1,time,normal:!!normal,correct:!!correct,result,failures,until});
 }
 return {counts,trace};
}
function aggregate(streams,threshold,seconds){
 validate(threshold,seconds);
 if(!Array.isArray(streams)||!streams.length)throw new Error('선택한 예시 데이터를 찾지 못했어요. 파일을 다시 풀어 주세요.');
 const runs=streams.map(events=>({baseline:evaluate(events,threshold,seconds,false),policy:evaluate(events,threshold,seconds,true)}));
 const sum=(side,key)=>runs.reduce((n,r)=>n+r[side].counts[key],0);
 const reduction=runs.reduce((n,r)=>n+(r.baseline.counts.attackChecked-r.policy.counts.attackChecked)/r.baseline.counts.attackChecked*100,0)/runs.length;
 return {runs,reduction,attackBaseline:sum('baseline','attackChecked')/runs.length,attackPolicy:sum('policy','attackChecked')/runs.length,normalOffered:sum('policy','normalOffered'),normalBlocked:sum('policy','normalBlocked'),normalCorrect:sum('policy','normalCorrect'),normalCorrectBlocked:sum('policy','normalCorrectBlocked'),normalSuccess:sum('policy','normalSuccess'),normalSuccessBaseline:sum('baseline','normalSuccess')};
}
root.LockoutEngine={validate,evaluate,aggregate};
})(globalThis);
