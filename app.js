'use strict';
(()=>{
const $=id=>document.getElementById(id),names={fast:'빠름 · 0.5초',medium:'중간 · 2초',slow:'느림 · 10초'};
let state=null;
const fmt=n=>n.toLocaleString('ko-KR'),pct=n=>n.toFixed(2)+'%';
for(let i=1;i<=30;i++){$('rep').add(new Option(i+'회',String(i)));}
function outcome(value){return ({blocked:'차단',success:'성공',failure:'오답 검사'})[value];}
function renderTrace(){
 if(!state)return;
 const run=state.result.runs[Number($('rep').value)-1],filter=$('filter').value;
 const rows=run.policy.trace.filter(e=>filter==='all'||(e.normal&&(filter!=='blocked'||e.result==='blocked')));
 const fragment=document.createDocumentFragment();
 for(const e of rows){
 const tr=document.createElement('tr');if(e.normal)tr.className='normal-row';
 const baseline=run.baseline.trace[e.id-1];
 const values=[e.time.toFixed(2)+'초',e.normal?'정상':'공격',e.correct?'정답':'오답',outcome(baseline.result),outcome(e.result),String(e.failures),e.until===null?'—':e.until.toFixed(2)+'초'];
 values.forEach((v,i)=>{const td=document.createElement('td');if(i===4){const tag=document.createElement('span');tag.className='tag '+e.result;tag.textContent=v;td.append(tag);}else td.textContent=v;tr.append(td);});fragment.append(tr);
 }
 if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.textContent='이 반복에서 차단된 정상 요청은 없습니다. 다른 반복이나 필터를 선택해 보세요.';tr.append(td);fragment.append(tr);}
 $('trace-body').replaceChildren(fragment);
 $('trace-count').textContent=fmt(rows.length)+'건 표시 / '+fmt(run.policy.trace.length)+'건 전체';
 $('trace-note').textContent='600초는 가상 시간입니다. '+$('rep').value+'회 요청을 시간순으로 표시합니다. 차단 중에는 비밀번호를 검사하지 않아 정답 입력도 차단될 수 있습니다.';
}
function run(){
 try{
 const thresholdText=$('threshold').value.trim(),secondsText=$('seconds').value.trim();
 if(!thresholdText||!secondsText)throw new Error('실패 횟수와 차단 시간을 모두 입력해 주세요.');
 const threshold=Number(thresholdText),seconds=Number(secondsText),scenario=$('scenario').value;
 if(!Object.hasOwn(names,scenario))throw new Error('공격 간격을 다시 선택해 주세요.');
 const result=LockoutEngine.aggregate(RESEARCH_DATA[scenario],threshold,seconds);
 state={threshold,seconds,scenario,result};$('form-error').textContent='';
 for(const id of ['threshold','seconds'])$(id).removeAttribute('aria-invalid');
 const original=threshold===5&&seconds===30;
 $('mode').textContent=original?'논문 재현':'추가 탐색';$('mode').className='pill'+(original?'':' explore');
 $('condition').textContent=names[scenario]+' · '+threshold+'회 / '+seconds+'초 · 30쌍';
 $('reduction').textContent=pct(result.reduction);
 const normalRate=result.normalBlocked/result.normalOffered*100;
 $('normal-rate').textContent=pct(normalRate);
 $('reduction-bar').style.width=Math.max(0,Math.min(100,result.reduction))+'%';$('normal-bar').style.width=normalRate+'%';
 $('attack-counts').textContent='공격 검사 '+result.attackBaseline.toFixed(2)+' → '+result.attackPolicy.toFixed(2)+'건 / 반복';
 $('normal-counts').textContent='정상 요청 '+fmt(result.normalOffered)+'건 중 '+fmt(result.normalBlocked)+'건 차단';
 $('correct-count').textContent=fmt(result.normalCorrect)+'건 중 '+fmt(result.normalCorrectBlocked)+'건';
 $('success-count').textContent=fmt(result.normalSuccessBaseline)+' → '+fmt(result.normalSuccess)+'건';
 $('interpret-title').textContent='공격 검사는 '+pct(result.reduction)+' 줄고, 정상 요청은 '+pct(normalRate)+' 막혔습니다.';
 $('interpret-text').textContent=original?'논문의 원본 요청을 같은 규칙으로 다시 계산한 결과입니다. 검사 횟수 감소만으로 좋은 정책이라고 판단하지 말고, 정상 접근 손실도 함께 확인하세요.':'현재 결과는 논문의 원본 자료에 새 규칙을 적용한 추가 탐색입니다. 다른 규칙보다 우수하다고 검증된 값이나 실제 서비스 권장 설정은 아닙니다.';
 $('download-status').textContent='';renderTrace();
 }catch(error){$('form-error').textContent=error.message+' 마지막으로 성공한 비교 결과는 그대로 보입니다.';for(const id of ['threshold','seconds'])$(id).setAttribute('aria-invalid','true');}
}
$('controls').addEventListener('submit',e=>{e.preventDefault();run();});
$('scenario').addEventListener('change',run);
$('reset').addEventListener('click',()=>{$('threshold').value='5';$('seconds').value='30';run();});
for(const id of ['threshold','seconds'])$(id).addEventListener('input',()=>{if(state)$('form-error').textContent='입력값이 바뀌었어요. ‘이 규칙으로 비교’를 누르면 아래 결과가 갱신됩니다.';});
for(const id of ['rep','filter'])$(id).addEventListener('change',renderTrace);
$('download').addEventListener('click',()=>{
 if(!state)return;
 try{
 const {threshold,seconds,scenario,result}=state;
 const report={app:'Lockout Lab',paper:'로그인 실패 후 일시 차단 정책의 효과와 정상 사용자 차단',data:'과제10 원본 합성 요청 / 계정 1개 / 가상 시간 600초 / 30쌍',mode:threshold===5&&seconds===30?'논문 재현':'추가 탐색',scenario,threshold,lockSeconds:seconds,metrics:{attackReductionMeanPct:result.reduction,attackCheckedBaselineMean:result.attackBaseline,attackCheckedPolicyMean:result.attackPolicy,normalBlocked:result.normalBlocked,normalOffered:result.normalOffered,normalBlockedPct:result.normalBlocked/result.normalOffered*100,normalCorrect:result.normalCorrect,normalCorrectBlocked:result.normalCorrectBlocked,normalSuccessBaseline:result.normalSuccessBaseline,normalSuccess:result.normalSuccess},limitation:'합성 자료의 사건 기반 모의실험. 공격 성공률이나 실제 서비스 성능, 권장값을 뜻하지 않음.'};
 const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='lockout-lab-'+scenario+'-'+threshold+'-'+seconds+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('download-status').textContent='현재 화면에 표시된 비교 결과를 JSON 파일로 저장했습니다.';
 }catch{$('download-status').textContent='저장하지 못했어요. 브라우저의 다운로드 허용 설정을 확인해 주세요.';}
});
run();
})();
