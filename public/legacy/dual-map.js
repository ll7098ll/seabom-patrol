(function(root){
'use strict';
// The comparison view shares the existing GIS datasets and learning record.
// It never recommends a plan or computes a second simulation.
function createDualMap({data:D,GIS,engine:E,net,state,journey:j,persisted,onSelect,onEvidence,onSave,onEdit,onAdvanced}){
 const board=document.getElementById('comparison-workspace'),$=s=>board.querySelector(s),$$=s=>[...board.querySelectorAll(s)];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=(n,p=0)=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:p}):'—';
 const names={all:'전체',day:'주간',evening:'저녁',night:'심야'},ranges={all:'24시간',day:'06–18시',evening:'18–22시',night:'22–06시'},plans={current:'나의 배치',original:'처음 판단',ai:'추천 배치'};
 const ui={enabled:true,notesOpen:false,left:'day',right:'night',metric:'calls',resultMetric:'response_mean',leftPlan:'current',rightPlan:'ai',zone:'A2',mapMode:'grid'};
 const resultMetrics=['response_mean','response_p90','response_urgent'];
 if(persisted&&typeof persisted==='object'){
  for(const k of ['enabled','notesOpen'])if(typeof persisted[k]==='boolean')ui[k]=persisted[k];
  for(const k of ['left','right'])if(names[persisted[k]])ui[k]=persisted[k];
  for(const k of ['leftPlan','rightPlan'])if(plans[persisted[k]])ui[k]=persisted[k];
  if(D.metrics.some(m=>m.id===persisted.metric))ui.metric=persisted.metric;
  if(resultMetrics.includes(persisted.resultMetric))ui.resultMetric=persisted.resultMetric;
  if(D.zones.some(z=>z.id===persisted.zone))ui.zone=persisted.zone;
  if(['grid','zone'].includes(persisted.mapMode))ui.mapMode=persisted.mapMode;
 }
 const Y=y=>4000-y,line=xy=>xy.map((p,i)=>`${i?'L':'M'}${p[0]} ${Y(p[1])}`).join(''),polygon=geo=>geo.coordinates.map(r=>line(r)+'Z').join('');
 const zones=new Map(D.zones.map(z=>[z.id,z])),grid=new Map(D.grid.map(g=>[g.id,g]));
 const borders=new Map(D.zones.map(z=>[z.id,D.grid.filter(g=>g.zone_id===z.id&&g.land_fraction>0).map(g=>{const b=g.bbox;return [[-1,0,[[b[0],b[1]],[b[0],b[3]]]],[1,0,[[b[2],b[1]],[b[2],b[3]]]],[0,-1,[[b[0],b[1]],[b[2],b[1]]]],[0,1,[[b[0],b[3]],[b[2],b[3]]]]].filter(([dx,dy])=>{const n=grid.get(`${g.ix+dx}-${g.iy+dy}`);return !n||n.zone_id!==z.id||!n.land_fraction;}).map(v=>line(v[2])).join('');}).join('')]));
 const shared={zoom:1,x:3000,y:2000},maps=[];let current=null,lastStage=0;
 const ns='http://www.w3.org/2000/svg',node=(tag,attrs={},text)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
 function mode(){return j.step===1?'data':j.step===3&&j.firstPlan&&state.aiPlan?'plans':j.step===4&&state.runs?'results':'single';}
 function plan(key){if(j.step===4&&state.runs)return state.runs[key].plan;return key==='original'?j.firstPlan:key==='ai'?state.aiPlan:state.cars;}
 function dataState(side){return {...state,metric:mode()==='results'?ui.resultMetric:ui.metric,period:ui[side],runKey:ui[side+'Plan'],requestType:'all',runs:state.runs};}
 const precision=m=>m.kind==='count'?0:m.kind==='road'?2:1;
 function values(side){if(mode()==='plans'){const p=plan(ui[side+'Plan'])||[];const zv=new Map(D.zones.map(z=>[z.id,0]));for(const car of p){const xy=net.nodes.get(car.node).xy,g=grid.get(`${Math.floor(xy[0]/200)}-${Math.floor(xy[1]/200)}`);if(g)zv.set(g.zone_id,zv.get(g.zone_id)+1);}return {zv,gv:new Map(),total:p.length};}return GIS.dataset(dataState(side));}
 function metric(){return mode()==='plans'?{id:'allocation',name:'생활권별 순찰차 대기 위치',short:'순찰차',unit:'대',kind:'count',period:false,note:'차량의 대기 위치를 포함하는 200m 격자의 생활권 기준입니다.'}:GIS.metric(dataState('left'));}
 function heading(side){return mode()==='data'?names[ui[side]]:plans[ui[side+'Plan']];}
 function context(side){const m=metric();if(mode()==='plans')return `${plans[ui[side+'Plan']]} · 대기 위치`;if(mode()==='results')return `10/12–10/18 · ${plans[ui[side+'Plan']]}${state.dirty?' · 변경 전 결과':''}`;if(!m.period)return '2026년 10월 가상 기준';const accumulated=['calls','urgent','incidents','serious','workload'].includes(m.id)||m.record_filter;return `${names[ui[side]]} ${ranges[ui[side]]} · ${accumulated?'9/14–10/11 · 28일 누적':m.id==='footfall'?'대표 1일':m.kind==='road'?'대표 시간당 평균':'대표 시간대 평균'}`;}
 const mapHTML=side=>`<section class="dual-pane" aria-label="${side==='left'?'왼쪽':'오른쪽'} 비교 지도"><div class="dual-pane-head"><label>${side==='left'?'왼쪽':'오른쪽'}<select data-dual-side="${side}" aria-label="${side==='left'?'왼쪽':'오른쪽'} 비교 조건"></select></label><span data-dual-total="${side}"></span></div><div class="dual-map" data-dual-map="${side}"><svg class="dual-geography" role="img" aria-label="새봄시의 도로, 건물, 하천과 비교 자료"></svg><div class="dual-labels"></div><span class="dual-map-caption">서쪽 A구역 · 동쪽 B구역</span><span class="dual-north" aria-hidden="true">↑ N</span><div class="dual-map-tools"><button data-dual-zoom="in" aria-label="${side==='left'?'왼쪽':'오른쪽'}에서 두 지도 확대">＋</button><button data-dual-zoom="out" aria-label="${side==='left'?'왼쪽':'오른쪽'}에서 두 지도 축소">−</button><button data-dual-zoom="fit" aria-label="${side==='left'?'왼쪽':'오른쪽'}에서 두 지도 전체 보기">⌖</button></div><div class="dual-map-bottom"><div class="dual-legend"></div><div class="dual-scale"><i></i><span>500 m</span></div></div></div></section>`;
 board.innerHTML=`<div class="dual-toolbar"><div class="dual-heading"><h2 id="dual-title">시간대를 나란히 비교하기</h2><span id="dual-subtitle">같은 지도 · 같은 색 범위</span></div><div class="dual-actions"><label class="sr-label" for="dual-metric">비교할 자료</label><select id="dual-metric" aria-label="비교할 자료"></select><select id="dual-geography" aria-label="비교 지도 공간 단위"><option value="grid">200m 격자</option><option value="zone">생활권</option></select><button class="secondary" id="dual-swap">⇄ 좌우 바꾸기</button><button class="secondary" id="dual-advanced">레이어 탐색</button></div></div><div class="dual-map-grid">${mapHTML('left')}${mapHTML('right')}</div><div class="dual-result-summary" id="dual-result-summary" hidden></div><section class="dual-table-section" aria-labelledby="dual-table-title"><div class="dual-table-heading"><h3 id="dual-table-title">생활권별 신고·도움 요청</h3><button class="secondary" id="dual-keep">＋ 선택한 비교 담기</button></div><div class="dual-table-scroll"><table class="dual-table"><thead><tr><th scope="col">생활권</th><th scope="col" id="dual-left-heading"></th><th scope="col" id="dual-right-heading"></th><th scope="col" id="dual-difference-heading">오른쪽−왼쪽</th></tr></thead><tbody id="dual-rows"></tbody></table></div><p id="dual-context" class="dual-context"></p></section><div id="dual-live" class="sr-label" role="status" aria-live="polite"></div>`;
 function openNotes(open=true,focus=false){ui.notesOpen=open;syncStage();onEdit();onSave();if(open&&focus)document.getElementById('lesson-title').focus({preventScroll:true});}
 function syncStage(){if(lastStage&&lastStage!==j.step)ui.enabled=true;const m=mode(),active=ui.enabled&&m!=='single'&&!state.selectedCar;
  document.body.classList.toggle('compare-mode',active);document.body.classList.toggle('notebook-open',active&&ui.notesOpen);board.hidden=!active;document.querySelector('.map-area').hidden=active;document.getElementById('lesson-panel').hidden=active&&!ui.notesOpen;
  const toggle=document.getElementById('workspace-toggle');toggle.hidden=m==='single';toggle.textContent=active?'단일 지도':'나란히 비교';toggle.removeAttribute('aria-pressed');
  const notebook=document.getElementById('notebook-toggle');notebook.setAttribute('aria-expanded',String(!document.getElementById('lesson-panel').hidden));notebook.firstChild.textContent=j.step===1?'근거 노트 ':'활동 기록 ';document.getElementById('evidence-count').textContent=j.evidence.length;document.getElementById('close-notebook').hidden=!active;
  if(lastStage!==j.step){lastStage=j.step;shared.zoom=1;shared.x=3000;shared.y=2000;render();}
 }
 function render(){const m=mode();if(m==='single')return;const meta=metric(),left=values('left'),right=values('right');const geography=m==='plans'||m==='results'||meta.kind==='survey'||meta.kind==='rate'?'zone':ui.mapMode;
  let max=Math.max(0,...[...(geography==='zone'?left.zv:left.gv).values(),...(geography==='zone'?right.zv:right.gv).values()].filter(Number.isFinite));if(meta.unit==='%')max=100;if(meta.kind==='road')max=Math.max(1.6,...net.edges.flatMap(e=>['left','right'].map(s=>e.traffic[ui[s]].capacity_ratio)));
  current={mode:m,meta,left,right,max,geography};
  $('#dual-title').textContent=m==='data'?'시간대를 나란히 비교하기':m==='plans'?'내 판단과 추천 비교하기':'같은 요청, 다른 배치의 결과';
  $('#dual-subtitle').textContent=m==='data'?'두 지도의 확대·이동이 함께 움직입니다.':m==='plans'?'통계·규칙 기반 추천 · 최초 판단 보존':state.dirty?'조건이 바뀐 뒤 재실행이 필요합니다.':'같은 요청·같은 상황에서 비교';
  const metrics=m==='results'?resultMetrics.map(id=>GIS.metric({...state,metric:id})):D.metrics;
  $('#dual-metric').hidden=m==='plans';$('#dual-metric').innerHTML=metrics.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');$('#dual-metric').value=m==='results'?ui.resultMetric:ui.metric;
  $('#dual-geography').hidden=m!=='data'||meta.kind!=='count';$('#dual-geography').value=ui.mapMode;$('#dual-advanced').textContent=m==='data'?'레이어 탐색':m==='plans'?'배치 수정':'운영 재생·상세';
  for(const side of ['left','right']){const select=$(`[data-dual-side="${side}"]`),options=m==='data'?names:plans;select.innerHTML=Object.entries(options).map(([key,name])=>`<option value="${key}">${name}</option>`).join('');select.value=m==='data'?ui[side]:ui[side+'Plan'];select.disabled=m==='data'&&!meta.period;
   const d=side==='left'?left:right; $(`[data-dual-total="${side}"]`).textContent=m==='data'?(meta.period?ranges[ui[side]]+' · ':'시간대 공통 · ')+fmt(d.total,precision(meta))+meta.unit:fmt(d.total,precision(meta))+meta.unit;
  }
  $('#dual-table-title').textContent=meta.name;$('#dual-left-heading').textContent=heading('left')+' · '+meta.unit;$('#dual-right-heading').textContent=heading('right')+' · '+meta.unit;$('#dual-difference-heading').textContent='오른쪽−왼쪽 · '+(meta.unit==='%'?'%p':meta.unit);
  $('#dual-rows').innerHTML=D.zones.map(z=>{const a=left.zv.get(z.id),b=right.zv.get(z.id),difference=Number.isFinite(a)&&Number.isFinite(b)?b-a:null;return `<tr class="${z.id===ui.zone?'selected':''}"><th scope="row"><button data-dual-zone="${z.id}" aria-pressed="${z.id===ui.zone}"><span>${z.id}</span>${esc(z.name)}</button></th><td>${fmt(a,precision(meta))}</td><td>${fmt(b,precision(meta))}</td><td>${difference>0?'+':''}${fmt(difference,precision(meta))}</td></tr>`;}).join('');
  $('#dual-keep').disabled=m!=='data'&&state.dirty;$('#dual-keep').hidden=m==='plans';$('#dual-context').textContent=context('left')+' / '+context('right')+' · '+(meta.note||'')+(meta.kind==='survey'?' 생활권별 자발적 응답 비율이며 시간대별 조사가 아닙니다.':'');
  $('#dual-result-summary').hidden=m!=='results';if(m==='results')$('#dual-result-summary').innerHTML=['left','right'].map(side=>{const r=state.runs[ui[side+'Plan']];return `<div><strong>${heading(side)}</strong><span>출동 ${fmt(r.total)}건</span><span>미배정 <b>${r.missed.length}건</b></span><span>긴급 8분 이내 <b>${fmt(r.urgentRate*100,1)}%</b></span>${r.commitments.length?`<span>방문 약속 이행 / 미이행 ${r.fulfilled} / ${r.skipped}</span>`:''}</div>`;}).join('');
  maps.forEach(map=>map.updateData());
 }
 function evidence(){if(!current)return null;const{mode:m,meta,left,right}=current,z=zones.get(ui.zone);if(!z||m==='plans'||(m==='results'&&state.dirty))return null;return {id:['paired',z.id,meta.id,m==='data'?ui.left:ui.leftPlan,m==='data'?ui.right:ui.rightPlan,m==='results'?j.runSpec?.at:''].join('|'),label:z.name+' · '+heading('left')+' / '+heading('right')+' 비교',zoneId:z.id,cellId:null,period:m==='data'?ui.left:state.period,values:['left','right'].map(side=>({metric:meta.id,label:heading(side)+' · '+meta.name,value:(side==='left'?left:right).zv.get(z.id)??null,unit:meta.unit,context:context(side),denominator:meta.kind==='survey'?`${z[meta.id]} / ${z.survey_n}명 응답`:''}))};}
 function selectZone(id){if(!zones.has(id))return;ui.zone=id;if(shared.zoom>1){shared.x=zones.get(id).anchor_xy[0];shared.y=Y(zones.get(id).anchor_xy[1]);}onSelect(id);render();$('#dual-live').textContent=zones.get(id).name+'을 두 지도에서 선택했습니다.';}
 board.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.dualZone)selectZone(button.dataset.dualZone);});
 board.addEventListener('change',e=>{const t=e.target;if(t.dataset.dualSide)ui[t.dataset.dualSide+(mode()==='data'?'':'Plan')]=t.value;else if(t.id==='dual-metric')ui[mode()==='results'?'resultMetric':'metric']=t.value;else if(t.id==='dual-geography')ui.mapMode=t.value;else return;render();onSave();});
 $('#dual-swap').onclick=()=>{const suffix=mode()==='data'?'':'Plan';[ui['left'+suffix],ui['right'+suffix]]=[ui['right'+suffix],ui['left'+suffix]];render();onSave();};
 $('#dual-keep').onclick=()=>{const e=evidence();if(e)onEvidence(e);};
 $('#dual-advanced').onclick=()=>{ui.enabled=false;syncStage();onSave();if(mode()==='data')onAdvanced();else onEdit();};
 document.getElementById('workspace-toggle').onclick=()=>{ui.enabled=!ui.enabled;syncStage();render();onEdit();onSave();};
 document.getElementById('notebook-toggle').onclick=()=>openNotes(!ui.notesOpen,true);document.getElementById('close-notebook').onclick=()=>openNotes(false);
 function createMap(container,side){const svg=container.querySelector('svg'),labels=container.querySelector('.dual-labels'),world=node('g'),base=node('g'),heat=node('g'),roads=node('g'),fleet=node('g'),outline=node('path',{fill:'none',stroke:'#315db8','stroke-width':1.5,'vector-effect':'non-scaling-stroke','stroke-dasharray':'4 3','pointer-events':'none'});
  base.append(node('rect',{x:0,y:0,width:6000,height:4000,fill:'#f0f1ed'}));for(const land of D.map.landuses)base.append(node('path',{d:polygon(land.geometry),fill:land.kind==='park'?'#d5e1cf':'#e2e4de'}));
  base.append(node('path',{d:D.map.buildings.map(b=>polygon(b.geometry)).join(''),fill:'#dce0da',stroke:'#d3d8d0','stroke-width':3}),node('path',{d:polygon(D.map.river.geometry),fill:'#c3d8e3'}));
  for(const kind of ['local','arterial','footway','bridge']){const edges=net.edges.filter(e=>e.kind===kind),width=kind==='arterial'||kind==='bridge'?40:kind==='footway'?12:18,path=edges.map(e=>line(e.geometry.coordinates)).join('');base.append(node('path',{d:path,fill:'none',stroke:'#d4dbd5','stroke-width':width+8}),node('path',{d:path,fill:'none',stroke:'#ffffff','stroke-width':width}));}
  world.append(base,heat,roads,outline,fleet);svg.append(world);
  const labelNodes=D.zones.map(z=>{const b=document.createElement('button');b.className='dual-place';b.dataset.dualZone=z.id;b.setAttribute('aria-label',z.name+' 선택');labels.append(b);return{z,b};});
  const map={container,side,scale:.1,updateData(){if(!current)return;const d=current[side],m=current.meta;heat.replaceChildren();roads.replaceChildren();
   if(current.mode!=='plans'){if(m.kind==='road'){for(const edge of net.edges){const value=edge.traffic[ui[side]].capacity_ratio;roads.append(node('path',{d:line(edge.geometry.coordinates),fill:'none',stroke:'#b5742c','stroke-opacity':.15+.85*value/(current.max||1),'stroke-width':32}));}}
    else if(current.geography==='zone'){for(const z of D.zones){const value=d.zv.get(z.id);heat.append(node('path',{d:GIS.zonePaths.get(z.id),fill:Number.isFinite(value)?(current.mode==='results'?'#4a7ab3':'#c77f31'):'#b0b6be','fill-opacity':Number.isFinite(value)?(value>0?.09+.55*value/(current.max||1):0):.16}));}}
    else for(const g of D.grid){const value=d.gv.get(g.id);if(value>0&&g.land_fraction>0)heat.append(node('path',{d:GIS.gridPath(g),fill:'#c77f31','fill-opacity':.09+.55*value/(current.max||1)}));}
   }
   const legend=container.querySelector('.dual-legend');legend.innerHTML=current.mode==='plans'?'숫자 = 순찰차 번호':`<span>0</span><i class="dual-ramp ${current.mode==='results'?'result':''}"></i><span>${fmt(current.max,precision(m))}${esc(m.unit)} / ${m.kind==='road'?'도로':current.geography==='zone'?'생활권':'격자'}</span>`;
   this.draw();
  },draw(){const width=container.clientWidth,height=container.clientHeight;if(width<1||height<1)return;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);const fit=Math.max(.01,Math.min((width-38)/6000,(height-35)/4000)),s=fit*shared.zoom,tx=width/2-shared.x*s,ty=height/2-shared.y*s;this.scale=s;world.setAttribute('transform',`translate(${tx} ${ty}) scale(${s})`);outline.setAttribute('d',borders.get(ui.zone)||'');
   for(const{z,b}of labelNodes){const x=tx+z.anchor_xy[0]*s,y=ty+Y(z.anchor_xy[1])*s;b.style.left=x+'px';b.style.top=y+'px';b.hidden=x<30||x>width-30||y<20||y>height-30;b.textContent=Math.min(width,6000*s)<550&&z.id!==ui.zone?z.id:z.name;b.setAttribute('aria-pressed',String(z.id===ui.zone));}
   const distance=[500,200,100,50].find(n=>n*s<90)||20;container.querySelector('.dual-scale i').style.width=distance*s+'px';container.querySelector('.dual-scale span').textContent=distance+' m';this.drawFleet();
  },drawFleet(){fleet.replaceChildren();if(!current||current.mode==='data')return;const p=plan(ui[side+'Plan'])||[];for(const car of p){const xy=net.nodes.get(car.node).xy;const g=node('g',{'data-vehicle':car.id,transform:`translate(${xy[0]} ${Y(xy[1])}) scale(${1/this.scale})`});g.append(node('circle',{r:10,fill:ui[side+'Plan']==='ai'?'#9b6d36':'#315db8',stroke:'#fff','stroke-width':1.5}),node('text',{'text-anchor':'middle','dominant-baseline':'central','font-size':11,fill:'#fff'},car.id));fleet.append(g);}}
  };
  container.querySelectorAll('[data-dual-zoom]').forEach(b=>b.onclick=()=>{if(b.dataset.dualZoom==='fit'){shared.zoom=1;shared.x=3000;shared.y=2000;}else shared.zoom=Math.min(5,Math.max(.8,shared.zoom*(b.dataset.dualZoom==='in'?1.25:.8)));maps.forEach(x=>x.draw());});
  let drag=null,dragged=false;svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,cx:shared.x,cy:shared.y};dragged=false;svg.setPointerCapture(e.pointerId);svg.classList.add('dragging');});
  svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<4&&!dragged)return;dragged=true;shared.x=Math.max(-600,Math.min(6600,drag.cx-dx/map.scale));shared.y=Math.max(-400,Math.min(4400,drag.cy-dy/map.scale));maps.forEach(m=>m.draw());});
  svg.addEventListener('pointerup',e=>{if(!drag)return;const wasDrag=dragged;drag=null;svg.classList.remove('dragging');if(wasDrag)return;const rect=svg.getBoundingClientRect(),x=shared.x+(e.clientX-rect.left-rect.width/2)/map.scale,y=4000-(shared.y+(e.clientY-rect.top-rect.height/2)/map.scale),g=grid.get(`${Math.floor(x/200)}-${Math.floor(y/200)}`);if(g?.land_fraction>0)selectZone(g.zone_id);});
  const end=()=>{drag=null;svg.classList.remove('dragging');};svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);
  svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect(),old=map.scale,next=Math.min(5,Math.max(.8,shared.zoom*(e.deltaY<0?1.12:1/1.12))),ratio=next/shared.zoom;shared.x+=(e.clientX-r.left-r.width/2)/old*(1-1/ratio);shared.y+=(e.clientY-r.top-r.height/2)/old*(1-1/ratio);shared.zoom=next;maps.forEach(m=>m.draw());},{passive:false});
  maps.push(map);new ResizeObserver(()=>map.draw()).observe(container);
 }
 $$('[data-dual-map]').forEach(n=>createMap(n,n.dataset.dualMap));
 return {render,syncStage,openNotes,snapshot:()=>({...ui}),get active(){return !board.hidden;}};
}
root.createSaebomDualMap=createDualMap;
})(typeof window==='undefined'?globalThis:window);
