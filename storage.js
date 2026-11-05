/* Browser-local comparisons only. Reading corrupt data never overwrites it. */
(function(root){
'use strict';
const KEY='lockout-lab:comparisons:v1',LIMIT=20,SCENARIOS=['fast','medium','slow'];
function validateConfig(config){
 if(!config||!SCENARIOS.includes(config.scenario))throw new Error('공격 조건을 다시 선택해 주세요.');
 for(const side of ['a','b']){if(!config[side])throw new Error('정책 입력값이 없습니다.');root.LockoutEngine.validate(config[side].threshold,config[side].seconds);}
 return {scenario:config.scenario,a:{threshold:config.a.threshold,seconds:config.a.seconds},b:{threshold:config.b.threshold,seconds:config.b.seconds}};
}
function validateName(name){if(typeof name!=='string'||!name.trim()||name.trim().length>30||/[\u0000-\u001f\u007f]/.test(name))throw new Error('비교 이름을 1~30자로 입력해 주세요.');return name.trim();}
function validateSummary(summary){
 const keys=['reduction','attackBaseline','attackPolicy','normalOffered','normalBlocked','normalCorrect','normalCorrectBlocked','normalSuccess','normalSuccessBaseline'];
 if(!summary||!keys.every(k=>typeof summary[k]==='number'&&Number.isFinite(summary[k])&&summary[k]>=0))throw new Error('저장된 결과 형식이 올바르지 않습니다.');
 return Object.fromEntries(keys.map(k=>[k,summary[k]]));
}
function create(getStorage){
 function storage(){try{const s=getStorage();if(!s)throw new Error();return s;}catch{throw new Error('브라우저 저장소를 사용할 수 없습니다. 비교와 JSON 저장은 계속 사용할 수 있어요.');}}
 function read(){
 let raw;try{raw=storage().getItem(KEY);}catch(e){throw new Error(e.message.includes('저장소')?e.message:'저장 목록을 읽지 못했습니다. 비교 기능은 계속 사용할 수 있어요.');}
 if(raw===null)return [];
 try{
 const data=JSON.parse(raw);if(data.version!==1||!Array.isArray(data.items)||data.items.length>LIMIT)throw new Error();
 const ids=new Set();
 return data.items.map(item=>{
 if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(item.id)||ids.has(item.id)||typeof item.savedAt!=='string'||!Number.isFinite(Date.parse(item.savedAt)))throw new Error();ids.add(item.id);
 return {id:item.id,name:validateName(item.name),savedAt:item.savedAt,config:validateConfig(item.config),results:{a:validateSummary(item.results?.a),b:validateSummary(item.results?.b)}};
 });
 }catch{throw new Error('저장 자료를 읽을 수 없습니다. 기존 자료는 바꾸지 않았어요. 비교 기능은 계속 사용할 수 있습니다.');}
 }
 function write(items){try{storage().setItem(KEY,JSON.stringify({version:1,items}));}catch{throw new Error('저장하지 못했습니다. 저장 공간이나 브라우저 권한을 확인해 주세요. 기존 목록은 유지됩니다.');}}
 function add(name,config,results){
 name=validateName(name);config=validateConfig(config);const safeResults={a:validateSummary(results.a),b:validateSummary(results.b)};const items=read();
 if(items.length>=LIMIT)throw new Error('비교는 최대 20개까지 저장할 수 있어요. 기존 기록을 삭제한 뒤 저장해 주세요.');
 const id=typeof root.crypto?.randomUUID==='function'?root.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const item={id,name,savedAt:new Date().toISOString(),config,results:safeResults};write([item,...items]);return item;
 }
 function remove(id){const items=read();if(!items.some(x=>x.id===id))throw new Error('삭제할 기록을 찾지 못했습니다. 목록을 다시 확인해 주세요.');write(items.filter(x=>x.id!==id));}
 return {read,add,remove};
}
root.PolicyStorage={create,validateConfig,validateName,validateSummary,KEY,LIMIT};
})(globalThis);
