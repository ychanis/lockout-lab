'use strict';
(()=>{
const $=id=>document.getElementById(id),names={fast:'빠름 · 0.5초',medium:'중간 · 2초',slow:'느림 · 10초'};
const store=PolicyStorage.create(()=>window.localStorage);
let state=null;
const fmt=n=>n.toLocaleString('ko-KR'),pct=n=>n.toFixed(2)+'%',normalRate=r=>r.normalBlocked/r.normalOffered*100;
const summary=r=>PolicyStorage.validateSummary(r);
for(let i=1;i<=30;i++)$('rep').add(new Option(i+'회',String(i)));
function outcome(value){return ({blocked:'차단',success:'성공',failure:'오답 검사'})[value];}
function renderTrace(){
 if(!state)return;
 const side=$('trace-policy').value,run=state.results[side].runs[Number($('rep').value)-1],filter=$('filter').value;
 const rows=run.policy.trace.filter(e=>filter==='all'||(e.normal&&(filter!=='blocked'||e.result==='blocked'))),fragment=document.createDocumentFragment();
 for(const e of rows){const tr=document.createElement('tr');if(e.normal)tr.className='normal-row';
 const baseline=run.baseline.trace[e.id-1],values=[e.time.toFixed(2)+'초',e.normal?'정상':'공격',e.correct?'정답':'오답',outcome(baseline.result),outcome(e.result),String(e.failures),e.until===null?'—':e.until.toFixed(2)+'초'];
 values.forEach((v,i)=>{const td=document.createElement('td');if(i===4){const tag=document.createElement('span');tag.className='tag '+e.result;tag.textContent=v;td.append(tag);}else td.textContent=v;tr.append(td);});fragment.append(tr);}
 if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.textContent='이 반복에서 차단된 정상 요청은 없습니다. 다른 반복이나 필터를 선택해 보세요.';tr.append(td);fragment.append(tr);}
 $('trace-body').replaceChildren(fragment);$('trace-count').textContent=fmt(rows.length)+'건 표시 / '+fmt(run.policy.trace.length)+'건 전체';
 $('trace-note').textContent='정책 '+side.toUpperCase()+' · '+$('rep').value+'회 · 가상 시간 600초. 정답 요청도 계정이 잠긴 동안에는 검사하지 않고 차단합니다.';
}
function markDirty(){if(state){$('form-error').textContent='입력값이 바뀌었어요. ‘두 정책 비교’를 눌러 결과를 갱신해 주세요.';$('save-comparison').disabled=true;}}
function readConfig(){
 const config={scenario:$('scenario').value};for(const side of ['a','b']){const t=$('threshold-'+side).value.trim(),s=$('seconds-'+side).value.trim();if(!t||!s)throw new Error('두 정책의 실패 횟수와 차단 시간을 모두 입력해 주세요.');config[side]={threshold:Number(t),seconds:Number(s)};}return PolicyStorage.validateConfig(config);
}
function renderResults(){
 const {config,results}=state;
 for(const side of ['a','b']){const r=results[side],p=config[side],original=p.threshold===5&&p.seconds===30;
 $(side+'-mode').textContent=original?'논문 재현':'추가 탐색';$(side+'-mode').className='pill'+(original?'':' explore');
 $(side+'-rule').textContent=p.threshold+'회 실패 · '+p.seconds+'초 차단';
 $(side+'-reduction').textContent=pct(r.reduction);$(side+'-normal').textContent=pct(normalRate(r));
 $(side+'-attack-counts').textContent='공격 검사 '+r.attackBaseline.toFixed(2)+' → '+r.attackPolicy.toFixed(2)+'건 / 반복';
 $(side+'-normal-counts').textContent='정상 '+fmt(r.normalOffered)+'건 중 '+fmt(r.normalBlocked)+'건 차단';
 $(side+'-correct').textContent=fmt(r.normalCorrect)+'건 중 '+fmt(r.normalCorrectBlocked)+'건';
 $(side+'-success').textContent=fmt(r.normalSuccessBaseline)+' → '+fmt(r.normalSuccess)+'건';}
 $('condition').textContent=names[config.scenario]+' · 같은 자료 30쌍씩';
 const same=config.a.threshold===config.b.threshold&&config.a.seconds===config.b.seconds;
 $('interpret-title').textContent=same?'같은 규칙을 적용해 두 정책의 결과가 같습니다.':'공격 검사와 정상 접근의 차이를 함께 보세요.';
 const reduction=results.b.reduction-results.a.reduction,blocked=normalRate(results.b)-normalRate(results.a),success=results.b.normalSuccess-results.a.normalSuccess;
 const signed=n=>(n>0?'+':'')+n.toFixed(2);
 $('difference-reduction').textContent=signed(reduction)+'%p';$('difference-normal').textContent=signed(blocked)+'%p';$('difference-success').textContent=(success>0?'+':'')+fmt(success)+'건';
 $('interpret-text').textContent='차이는 정책 B − A입니다. 공격 검사 감소율이 높아져도 정상 차단이 함께 늘 수 있어요. 한 지표로 우수한 정책을 자동 판정하지 않습니다.';
 renderTrace();
}
function run(config){
 try{config=config||readConfig();PolicyStorage.validateConfig(config);const results={};for(const side of ['a','b'])results[side]=LockoutEngine.aggregate(RESEARCH_DATA[config.scenario],config[side].threshold,config[side].seconds);state={config,results};$('form-error').textContent='';$('save-comparison').disabled=false;$('download-status').textContent='';for(const input of document.querySelectorAll('#controls input'))input.removeAttribute('aria-invalid');renderResults();return true;}
 catch(error){$('form-error').textContent=error.message+' 마지막 유효 결과는 그대로 보입니다.';$('save-comparison').disabled=true;return false;}
}
function setControls(config){$('scenario').value=config.scenario;for(const side of ['a','b']){$('threshold-'+side).value=config[side].threshold;$('seconds-'+side).value=config[side].seconds;}}
function renderSaved(){
 const list=$('saved-list');list.replaceChildren();let items;
 try{items=store.read();$('saved-count').textContent=items.length+' / 20개';}
 catch(error){$('storage-status').textContent=error.message;$('saved-count').textContent='읽기 불가';return;}
 if(!items.length){const p=document.createElement('p');p.className='saved-empty';p.textContent='아직 저장한 비교가 없습니다. 두 정책을 비교한 뒤 이름을 붙여 저장해 보세요.';list.append(p);return;}
 for(const item of items){const card=document.createElement('article');card.className='saved-card';const title=document.createElement('h4');title.textContent=item.name;const meta=document.createElement('p');meta.textContent=names[item.config.scenario]+' · A '+item.config.a.threshold+'회/'+item.config.a.seconds+'초 · B '+item.config.b.threshold+'회/'+item.config.b.seconds+'초';const date=document.createElement('small');date.textContent=new Date(item.savedAt).toLocaleString('ko-KR');
 const load=document.createElement('button');load.type='button';load.textContent='불러오기';load.setAttribute('aria-label',item.name+' 불러오기');load.addEventListener('click',()=>{setControls(item.config);if(run(item.config)){$('comparison-name').value=item.name;$('storage-status').textContent='‘'+item.name+'’의 두 정책을 불러와 같은 자료로 다시 계산했습니다.';}});
 const remove=document.createElement('button');remove.type='button';remove.className='delete';remove.textContent='삭제';remove.setAttribute('aria-label',item.name+' 삭제');remove.addEventListener('click',()=>{try{store.remove(item.id);renderSaved();$('storage-status').textContent='‘'+item.name+'’ 기록을 삭제했습니다.';}catch(error){$('storage-status').textContent=error.message;}});
 const actions=document.createElement('div');actions.className='saved-actions';actions.append(load,remove);card.append(title,meta,date,actions);list.append(card);}
}
$('controls').addEventListener('submit',e=>{e.preventDefault();run();});$('scenario').addEventListener('change',()=>run());
for(const input of document.querySelectorAll('#controls input'))input.addEventListener('input',markDirty);
$('reset').addEventListener('click',()=>{setControls({scenario:$('scenario').value,a:{threshold:5,seconds:30},b:{threshold:5,seconds:30}});run();});
for(const id of ['rep','filter','trace-policy'])$(id).addEventListener('change',renderTrace);
$('save-form').addEventListener('submit',e=>{e.preventDefault();if(!state||$('save-comparison').disabled)return;try{const name=PolicyStorage.validateName($('comparison-name').value);store.add(name,state.config,{a:summary(state.results.a),b:summary(state.results.b)});renderSaved();$('storage-status').textContent='‘'+name+'’ 비교를 이 브라우저에 저장했습니다. 새로고침 후에도 불러올 수 있어요.';$('comparison-name').value='';}catch(error){$('storage-status').textContent=error.message;}});
$('refresh-saved').addEventListener('click',()=>{$('storage-status').textContent='';renderSaved();});
window.addEventListener('storage',e=>{if(e.key===PolicyStorage.KEY||e.key===null)renderSaved();});
$('download').addEventListener('click',()=>{if(!state)return;try{const report={app:'Lockout Lab',version:2,paper:'로그인 실패 후 일시 차단 정책의 효과와 정상 사용자 차단',data:'원본 합성 요청 / 계정 1개 / 600초 / 조건별 30쌍',config:state.config,results:{a:summary(state.results.a),b:summary(state.results.b)},limitation:'합성 자료의 추가 탐색. 실제 서비스 권장값이나 공격 성공률이 아님.'};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='lockout-lab-comparison-'+state.config.scenario+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('download-status').textContent='화면의 두 정책과 결과를 JSON으로 저장했습니다.';}catch{$('download-status').textContent='파일을 저장하지 못했습니다. 다운로드 설정을 확인해 주세요.';}});
run();renderSaved();
})();
