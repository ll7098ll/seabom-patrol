(function(root){
'use strict';
function createStudentModel(D,net){
 const zoneIds=D.zones.map(z=>z.id),clone=x=>JSON.parse(JSON.stringify(x));
 const zoneForNode=id=>{const p=net.nodes.get(id)?.xy;if(!p)return null;const g=D.grid.find(g=>g.ix===Math.min(29,Math.max(0,Math.floor(p[0]/200)))&&g.iy===Math.min(19,Math.max(0,Math.floor(p[1]/200))));return g?.zone_id;};
 const homes=Object.fromEntries(D.zones.map(z=>{const candidates=net.ids.filter(id=>zoneForNode(id)===z.id);candidates.sort((a,b)=>Math.hypot(...net.nodes.get(a).xy.map((n,i)=>n-z.anchor_xy[i]))-Math.hypot(...net.nodes.get(b).xy.map((n,i)=>n-z.anchor_xy[i])));return[z.id,candidates[0]];}));
 const empty=()=>Object.fromEntries(zoneIds.map(id=>[id,0]));
 const validCounts=c=>!!c&&zoneIds.every(id=>Number.isInteger(c[id])&&c[id]>=0&&c[id]<=10)&&Object.keys(c).every(id=>zoneIds.includes(id))&&zoneIds.reduce((s,id)=>s+c[id],0)<=10;
 const total=c=>zoneIds.reduce((s,id)=>s+c[id],0),signature=c=>zoneIds.map(id=>c[id]).join(',');
 const plan=c=>{if(!validCounts(c)||total(c)!==10)throw new Error('남은 순찰차를 모두 배치해 주세요.');return zoneIds.flatMap(id=>Array.from({length:c[id]},()=>({node:homes[id],zone:id}))).map((c,i)=>({...c,id:i+1}));};
 const change=(c,id,delta)=>{const next={...c};if(!zoneIds.includes(id)||![1,-1].includes(delta))return null;next[id]+=delta;return validCounts(next)?next:null;};
 const allocation=p=>{const c=empty();for(const car of p){const z=zoneForNode(car.node);if(z)c[z]++;}return c;};
 const layerIds=['requests','harm','people','care','lighting','cameras','traffic','voices'];
 const layerDefaults=(mode='heat')=>Object.fromEntries(layerIds.map(id=>[id,{mode:id==='traffic'?'area':id==='voices'?'voices':mode,opacity:id==='voices'?1:id==='traffic'?.85:.7}]));
 const fresh=()=>({version:7,step:1,counts:empty(),enabled:['requests'],selected:'A2',mapView:{focus:'requests',mode:'heat',cell:'9-14',layers:layerDefaults()},reason:'',reflection:'',evidence:[],first:null,ai:null,last:null,firstResult:null,aiResult:null});
 const ready=s=>total(s.counts)===10&&s.reason.trim().length>0&&s.evidence.length>0;
 const capture=s=>{if(!ready(s))throw new Error('순찰차 10대와 근거, 배치 이유를 확인해 주세요.');if(!s.first)s.first=clone({counts:s.counts,reason:s.reason,evidence:s.evidence});return s.first;};
 const summarize=r=>{const slow=r.results.slice().sort((a,b)=>b.response-a.response)[0],car=slow&&r.cars.find(c=>c.id===slow.cars[0]),job=car?.tasks.find(t=>t.requestId===slow.id);return {model:r.model,mean:r.mean,p90:r.p90,urgentRate:r.urgentRate,urgentCount:r.urgentCount,total:r.total,arrived:r.results.length,notArrived:r.notArrived,unassigned:r.missed.length,inTransit:r.inTransit.length,zones:r.zones,slow:slow?{zone:slow.zone_id,response:slow.response,handling:slow.handling_delay_s/60,wait:slow.wait,prepare:slow.prepareMinutes,drive:slow.driveMinutes,access:slow.accessMinutes,xy:slow.xy,roadXY:slow.target.xy,path:job.outbound}:null};};
 function restore(raw){const s=fresh();if(!raw||raw.version!==7)return s;
  if(validCounts(raw.counts))s.counts=clone(raw.counts);s.step=[1,2,3].includes(raw.step)?raw.step:1;s.reason=typeof raw.reason==='string'?raw.reason.slice(0,800):'';s.reflection=typeof raw.reflection==='string'?raw.reflection.slice(0,800):'';
  if(zoneIds.includes(raw.selected))s.selected=raw.selected;if(Array.isArray(raw.enabled))s.enabled=[...new Set(raw.enabled.filter(id=>['requests','harm','people','care','lighting','cameras','traffic','voices'].includes(id)))];
  const mv=raw.mapView||{};s.mapView.focus=s.enabled.includes(mv.focus)?mv.focus:s.enabled[0]||'requests';s.mapView.mode=['heat','dots','area'].includes(mv.mode)?mv.mode:'heat';
  s.mapView.layers=layerDefaults(s.mapView.mode);for(const id of layerIds){const v=mv.layers?.[id];if(!v)continue;if(!['traffic','voices'].includes(id)&&['heat','dots','area'].includes(v.mode))s.mapView.layers[id].mode=v.mode;if(Number.isFinite(v.opacity))s.mapView.layers[id].opacity=Math.max(.1,Math.min(1,v.opacity));}
  const selectedCell=D.grid.find(g=>g.id===mv.cell&&g.land_fraction>0);if(selectedCell){s.mapView.cell=selectedCell.id;s.selected=selectedCell.zone_id;}else{const anchor=D.zones.find(z=>z.id===s.selected).anchor_xy;s.mapView.cell=D.grid.filter(g=>g.zone_id===s.selected&&g.land_fraction>0).sort((a,b)=>Math.hypot(a.xy[0]-anchor[0],a.xy[1]-anchor[1])-Math.hypot(b.xy[0]-anchor[0],b.xy[1]-anchor[1]))[0].id;}
  if(typeof mv.road==='string'&&net.edges.some(e=>e.id===mv.road))s.mapView.road=mv.road;if(typeof mv.voice==='string'&&D.voices.some(v=>v.id===mv.voice))s.mapView.voice=mv.voice;
  if(Array.isArray(raw.evidence))s.evidence=raw.evidence.filter(e=>zoneIds.includes(e.zone)&&Array.isArray(e.rows)).slice(0,16);
  if(raw.first&&validCounts(raw.first.counts)&&total(raw.first.counts)===10)s.first=clone(raw.first);
  if(validCounts(raw.ai)&&total(raw.ai)===10)s.ai=clone(raw.ai);
  const validResult=r=>r&&r.model===root.SaebomEngine.MODEL.version&&Array.isArray(r.zones)&&r.zones.length===8&&Number.isFinite(r.total)&&(r.mean===null||Number.isFinite(r.mean));
  if(raw.last&&validCounts(raw.last.counts)&&total(raw.last.counts)===10&&validResult(raw.last.result))s.last=clone(raw.last);
  if(validResult(raw.firstResult))s.firstResult=clone(raw.firstResult);if(validResult(raw.aiResult))s.aiResult=clone(raw.aiResult);if(s.step===3&&!s.last)s.step=2;return s;
 }
 return {zoneIds,homes,zoneForNode,empty,validCounts,total,signature,plan,change,allocation,fresh,ready,capture,summarize,restore,clone};
}
root.createStudentModel=createStudentModel;if(typeof module!=='undefined')module.exports={createStudentModel};
})(typeof window==='undefined'?globalThis:window);
