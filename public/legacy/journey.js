(function(root){
'use strict';
const copy=value=>JSON.parse(JSON.stringify(value));
const steps=[
 {name:'관찰하기',question:'어느 곳에 도움이 필요할까요?',description:'장소와 시간대를 비교하고, 내 판단의 출발점이 될 근거를 모아 보세요.',action:'이 근거로 배치하기'},
 {name:'내 판단',question:'10대를 어디에 두고 싶나요?',description:'지도의 차를 옮겨 보고, 어떤 결과를 예상하는지 남겨 보세요.',action:'내 판단을 남기고 추천 보기'},
 {name:'추천 검토',question:'추천과 내 생각은 어떻게 다른가요?',description:'추천의 기준과 주민의 이야기를 살피며 내 배치를 유지하거나 바꿔 보세요.',action:'같은 상황에서 실험하기'},
 {name:'결과 확인',question:'예상했던 결과가 나왔나요?',description:'도시 전체의 평균과 오래 기다린 장소를 함께 살펴보세요.',action:'결과를 바탕으로 판단하기'},
 {name:'다시 판단',question:'지금은 어떤 선택을 할까요?',description:'처음 생각과 비교해 최종 판단을 남기고, 더 알아볼 질문을 정리해 보세요.',action:'탐구 기록 완성하기'}
];
function fresh(){return {version:5,step:1,evidence:[],firstEvidence:[],firstObservation:'',firstPlan:null,firstPrediction:'',firstAt:null,notes:{observation:'',prediction:'',revision:'',result:'',reflection:'',remaining:''},voiceNotes:{},completed:[],finished:false,extension:false,history:[],runSpec:null};}
function validPlan(plan,ids){return Array.isArray(plan)&&plan.length===10&&new Set(plan.map(c=>c.id)).size===10&&plan.every(c=>Number.isInteger(c.id)&&c.id>=1&&c.id<=10&&ids.includes(c.node));}
function restore(saved,ids,voiceIds){const j=fresh();if(!saved||typeof saved!=='object')return j;
 const source=saved.journey||saved;
 for(const key of Object.keys(j.notes))if(typeof source.notes?.[key]==='string')j.notes[key]=source.notes[key].slice(0,1500);
 if(validPlan(source.firstPlan,ids)){j.firstPlan=copy(source.firstPlan);j.firstPrediction=typeof source.firstPrediction==='string'?source.firstPrediction:'';j.firstAt=source.firstAt||null;}
 for(const key of ['evidence','firstEvidence'])j[key]=Array.isArray(source[key])?copy(source[key].filter(e=>e&&typeof e.label==='string'&&Array.isArray(e.values)).slice(0,20)):[];
 j.firstObservation=typeof source.firstObservation==='string'?source.firstObservation:'';
 j.voiceNotes=Object.fromEntries(Object.entries(source.voiceNotes||{}).filter(([id,v])=>voiceIds.includes(id)&&typeof v==='string').map(([id,v])=>[id,v.slice(0,1500)]));
 if(source.version===5){j.step=Math.max(1,Math.min(5,Number(source.step)||1));j.completed=(source.completed||[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=5);j.finished=!!source.finished;j.extension=!!source.extension;j.history=Array.isArray(source.history)?copy(source.history).slice(-20):[];
  const r=source.runSpec;if(r&&['normal','bridge','stadium','rain'].includes(r.scenario)&&['all','day','evening','night'].includes(r.period)&&['efficient','equity'].includes(r.goal)&&['original','ai','current'].every(k=>validPlan(r.plans?.[k],ids))&&Array.isArray(r.commitments)&&r.commitments.every(id=>voiceIds.includes(id))){j.runSpec=copy(r);}
 }
 if(!j.firstPlan&&j.step>2)j.step=1;
 if(!j.runSpec&&j.step>3)j.step=j.firstPlan?3:1;
 return j;
}
function readyToPlan(j){return !!j.firstPlan||(j.evidence.length>0&&!!j.notes.observation.trim());}
function gate(j,target,dirty=false){
 if(target<=1)return null;
 if(!readyToPlan(j))return {step:1,field:j.evidence.length?'observation':null,message:j.evidence.length?'자료에서 발견한 점을 한 줄 남겨 주세요.':'지도의 장소를 선택하고 근거를 하나 담아 주세요.'};
 if(target>=3&&!j.firstPlan)return {step:2,field:'prediction',message:'내 배치와 예상을 먼저 남긴 뒤 추천을 살펴보세요.'};
 if(target>=4&&!j.runSpec)return {step:3,field:'revision',message:'추천을 검토한 이유를 남기고 같은 상황에서 실험해 보세요.'};
 if(target>=5&&(dirty||!j.notes.result.trim()))return {step:4,field:dirty?null:'result',message:dirty?'조건이 달라졌어요. 다시 실험한 결과로 판단해 주세요.':'예상과 비교해 알게 된 점을 한 줄 남겨 주세요.'};
 return null;
}
function first(j,cars,ids){if(j.firstPlan)return false;if(!readyToPlan(j)||!j.notes.prediction.trim()||!validPlan(cars,ids))throw new Error('근거와 예상, 순찰차 10대의 배치를 확인해 주세요.');j.firstPlan=copy(cars);j.firstPrediction=j.notes.prediction.trim();j.firstObservation=j.notes.observation;j.firstEvidence=copy(j.evidence);j.firstAt=new Date().toISOString();complete(j,2);return true;}
function complete(j,step){if(!j.completed.includes(step))j.completed.push(step);}
function invalidate(j){j.completed=j.completed.filter(n=>n<4);j.finished=false;}
function samePlan(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every(c=>b.some(x=>x.id===c.id&&x.node===c.node));}
function summarize(r){return {plan:copy(r.plan),mean:r.mean,p90:r.p90,urgentRate:r.urgentRate,total:r.total,missed:r.missed.length,fulfilled:r.fulfilled,skipped:r.skipped,zones:copy(r.zones)};}
const api={copy,steps,fresh,restore,validPlan,readyToPlan,gate,first,complete,invalidate,samePlan,summarize};
root.SaebomJourney=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
