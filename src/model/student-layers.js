function createStudentLayers(D,GIS,net){
 const catalog=[
  {id:'requests',name:'도움 요청',icon:'!',color:'#F07816',colorName:'주황',shape:'heat',note:'주황빛이 진할수록 요청이 많아요',key:'주황빛이 진할수록 요청이 많아요',period:'최근 28일',metrics:['calls','urgent','dispatch','two_units','traffic_calls','welfare_calls','violence_calls','theft_calls','workload']},
  {id:'harm',name:'확인된 사건',icon:'●',color:'#D6273F',colorName:'빨강',shape:'bubbles',note:'크고 진한 원일수록 사건이 많아요',key:'빨간 점: 주변 사건의 분포 · 크고 진한 곳에 더 많이 모여 있어요',period:'최근 28일',metrics:['incidents','serious']},
  {id:'people',name:'사람이 모이는 곳',icon:'▥',color:'#2563EB',colorName:'파랑',shape:'dots',note:'파란 점이 진한 곳에 사람이 모여요',key:'파란 점: 주변 평균 인원 · 크고 진한 곳에 사람이 많아요',period:'대표 하루',metrics:['presence','footfall','population','bus_stops']},
  {id:'care',name:'어린이·어르신',icon:'♡',color:'#009FAB',colorName:'청록',shape:'ring',note:'청록 고리는 어린이·어르신의 분포',key:'청록 고리: 어린이·어르신 분포 / 마름모: 학교·돌봄의 실제 자료 위치',period:'10월 기준',metrics:['children','older','schools','support','medical']},
  {id:'lighting',name:'어둡고 불편한 길',icon:'△',color:'#E1B000',colorName:'노랑',ink:'#403300',shape:'symbols',note:'노란 세모가 있는 곳을 살펴요',key:'노란 △: 조명 고장·장애물·무신호 횡단보도 위치 · 클수록 주변에 많아요',period:'10월 기준',metrics:['light_outages','streetlights','outage_rate','obstacles','crossings','unsignalized']},
  {id:'cameras',name:'CCTV',icon:'▣',color:'#16823B',colorName:'초록',shape:'symbols',note:'초록 기호는 CCTV가 있는 위치',key:'초록 카메라: 주변 CCTV 위치 · 클수록 여러 대 / 회색: 모두 미작동',period:'10월 기준',metrics:['cameras']},
  {id:'traffic',name:'출동하기 어려운 길',icon:'↝',color:'#7838C7',colorName:'보라',shape:'road',note:'보라색 도로가 진할수록 붐벼요',key:'보라색 도로가 진하고 굵을수록 붐벼요',period:'대표 교통',metrics:['traffic']},
  {id:'voices',name:'주민 이야기',icon:'“',color:'#DB2385',colorName:'분홍',shape:'voice',note:'분홍 말풍선이 있는 장소의 이야기',key:'분홍 말풍선: 주민 이야기가 기록된 자료 위치 · 눌러서 읽어요',period:'가상 면담·설문',metrics:['survey_avoid','survey_unsafe','survey_help','survey_hesitate','survey_walk','survey_lighting']}
 ];
 const fmt=n=>Number(n).toLocaleString('ko-KR'),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),Y=y=>4000-y,point=(xy,html)=>`<g transform="translate(${xy[0]} ${Y(xy[1])})">${html}</g>`;
 const base={period:'all',requestType:'all',representation:'dots',geography:'grid',hideValues:true,layers:{}};
 const metric=(id,zone)=>{const d=GIS.dataset({...base,metric:id});return zone?d.zv.get(zone):d.total;};
 const counts=(list,zone)=>list.filter(x=>x.zone_id===zone).length;
 function rows(zone,enabled){const z=D.zones.find(z=>z.id===zone);if(!z)return[];return catalog.filter(l=>enabled.includes(l.id)).map(l=>{let value,detail;
  if(l.id==='requests'){value=`${fmt(metric('calls',zone))}건`;detail=`그중 긴급 ${fmt(metric('urgent',zone))}건 · 9/14–10/11`;}
  if(l.id==='harm'){value=`${fmt(metric('incidents',zone))}건`;detail=`그중 중대한 피해 ${fmt(metric('serious',zone))}건 · 9/14–10/11`;}
  if(l.id==='people'){value=`평균 ${fmt(metric('presence',zone))}명`;detail=`보행 ${fmt(metric('footfall',zone))}통행/일 · 한 사람이 여러 번 지날 수 있어요`;}
  if(l.id==='care'){value=`어린이 ${fmt(z.children)}명`;detail=`어르신 ${fmt(z.older)}명 · 학교·돌봄 ${counts(D.facilities.filter(f=>['school','support'].includes(f.kind)),zone)}곳`;}
  if(l.id==='lighting'){value=`고장 조명 ${fmt(metric('light_outages',zone))}개`;detail=`설치 ${fmt(metric('streetlights',zone))}개 중 · 보행 장애물 ${metric('obstacles',zone)}곳 · 무신호 횡단 ${metric('unsignalized',zone)}곳`;}
  if(l.id==='cameras'){value=`${fmt(metric('cameras',zone))}대`;detail=`미작동 ${counts(D.assets.filter(a=>a.kind==='cctv'&&a.status==='outage'),zone)}대 · 촬영 범위·예방 효과와는 달라요`;}
  if(l.id==='traffic'){const v=metric('traffic',zone);value=v>=1?'많이 붐벼요':v>=.65?'조금 붐벼요':'비교적 여유로워요';detail=`도로 수용량 대비 평균 ${v.toFixed(2)}배 · 강은 다리로 건너요`;}
  if(l.id==='voices'){value=`이야기 ${counts(D.voices,zone)}개`;detail=`도움 요청을 망설인 응답 ${z.survey_hesitate}/${z.survey_n}명 · 가상 자발적 설문`;}
  return{id:l.id,name:l.name,color:l.color,value,detail,period:l.period};
 });}
 // Keep local distributions at every zoom. No neighborhood-centroid summary markers.
 const sizeFor=zoom=>zoom>=3.4?100:zoom>=1.8?200:400;
 const groupKey=(p,size)=>`${p.zone_id}|${Math.floor(p.xy[0]/size)}|${Math.floor(p.xy[1]/size)}`;
 const clusterCache=new Map(),cache=new Map();
 function voicePosition(v){const {type,coordinates:c}=v.geometry;if(type==='Point')return c;if(type==='LineString')return c[Math.floor(c.length/2)];if(type==='Polygon'){const ring=c[0];return [0,1].map(i=>(Math.min(...ring.map(p=>p[i]))+Math.max(...ring.map(p=>p[i])))/2);}throw new Error('지원하지 않는 이야기 위치: '+type);}
 const pointSources={
  harm:D.events,
  people:D.grid.map(g=>({...g,n:g.presence.all})).filter(g=>g.n>0),
  careDensity:D.grid.map(g=>({...g,n:g.children+g.older})).filter(g=>g.n>0),
  lighting:[...D.assets.filter(a=>a.kind==='streetlight'&&a.status==='outage').map(a=>({...a,kind:'outage'})),...D.street_features.filter(f=>f.kind==='obstacle'||f.kind==='crossing'&&!f.signalized)],
  cameras:D.assets.filter(a=>a.kind==='cctv'),
  care:D.facilities.filter(f=>['school','support'].includes(f.kind)),
  voices:D.voices.map(v=>({...v,xy:voicePosition(v)}))
 };
 function clusters(id,size){const key=`${id}|${size}`;if(clusterCache.has(key))return clusterCache.get(key);const groups=new Map();
  for(const p of pointSources[id]||[]){const k=groupKey(p,size);if(!groups.has(k))groups.set(k,{key:k,zone_id:p.zone_id,n:0,items:[]});const g=groups.get(k);g.n+=p.n||1;g.items.push(p);}
  for(const g of groups.values()){
   const center=[0,1].map(i=>g.items.reduce((sum,p)=>sum+p.xy[i]*(p.n||1),0)/g.n);
   // Choose an actual source position, never an invented zone center or offset badge.
   g.xy=g.items.reduce((best,p)=>Math.hypot(p.xy[0]-center[0],p.xy[1]-center[1])<Math.hypot(best.xy[0]-center[0],best.xy[1]-center[1])?p:best,g.items[0]).xy;
  }
  const result=[...groups.values()];clusterCache.set(key,result);return result;
 }
 function mark(g,id,content,extra=''){return point(g.xy,`<g data-zone="${g.zone_id}" data-cluster="${id}" data-${id.toLowerCase()}-count="${g.n}" data-source-x="${g.xy[0]}" data-source-y="${g.xy[1]}" data-screen-scale="1" ${extra}>${content}</g>`);}
 function renderOne(id,size){const key=`${id}|${size}`;if(cache.has(key))return cache.get(key);const l=catalog.find(l=>l.id===id);let svg='';
  if(id==='requests')svg=GIS.render({...base,metric:'calls',representation:'heat',geography:'grid',tint:l.color,heatContrast:true}).data.replace(/<path data-cell="[^"]*" d="[^"]*" fill="transparent" class="grid-hit"\s*[/]>/g,'');
  if(id==='people'){const groups=clusters(id,size),max=Math.max(1,...groups.map(g=>g.n));for(const g of groups){const t=g.n/max,r=1.2+4.5*Math.sqrt(t);svg+=mark(g,id,`<circle r="${r}" fill="#1c5dce" fill-opacity="${.10+.78*Math.pow(t,1.2)}"/><title>이 주변 평균 ${fmt(g.n)}명 · ${size}m칸 자료의 대표 위치</title>`);}}
  if(id==='traffic')for(const e of net.edges){const ratio=e.traffic.all.capacity_ratio,t=Math.max(0,Math.min(1,(ratio-.25)/.65)),strength=t*t,path=e.geometry.coordinates.map(([x,y],i)=>`${i?'L':'M'}${x},${Y(y)}`).join(' ');svg+=`<path data-road="${e.id}" d="${path}" fill="none" stroke="${l.color}" stroke-opacity="${.035+.965*strength}" stroke-width="${.35+3*strength}" vector-effect="non-scaling-stroke" stroke-linecap="round"><title>${escape(e.name)} · 교통량 / 도로 용량 ${ratio.toFixed(2)}배</title></path>`;}
  if(id==='harm'){const groups=clusters(id,size),max=Math.max(1,...groups.map(g=>g.n)),ramp=['#e7a4b0','#d8627b','#bd2e50','#961336','#6b0824'];for(const g of groups){const t=g.n/max,band=Math.min(4,Math.floor(t*5)),r=1.6+5.8*Math.sqrt(t);svg+=mark(g,id,`<circle r="${r}" fill="${ramp[band]}" fill-opacity="${.38+.62*Math.sqrt(t)}" stroke="white" stroke-opacity=".8" stroke-width=".7"/><title>이 주변 확인된 사건 ${g.n}건 · ${size}m칸 안 기록의 대표 위치</title>`);}}
  if(id==='care'){
   const groups=clusters('careDensity',size),max=Math.max(1,...groups.map(g=>g.n));for(const g of groups){const t=g.n/max,r=1.8+4.3*Math.sqrt(t);svg+=mark(g,'careDensity',`<circle r="${r}" fill="none" stroke="${l.color}" stroke-opacity="${.13+.67*Math.pow(t,1.1)}" stroke-width="${.8+1.1*t}"/><title>이 주변 어린이·어르신 ${fmt(g.n)}명 · 인구 격자 대표 위치</title>`);}
   for(const g of clusters(id,100))svg+=mark(g,id,`<path d="M0-7L7 0 0 7-7 0Z" fill="${l.color}" stroke="white" stroke-width="1.3"/><title>${escape(g.items.map(f=>f.name).join(', '))}</title>`);
  }
  if(id==='lighting'){const groups=clusters(id,size),max=Math.max(1,...groups.map(g=>g.n));for(const g of groups){const t=g.n/max,r=2.7+3.2*Math.sqrt(t),n=kind=>g.items.filter(p=>p.kind===kind).length;svg+=mark(g,id,`<path d="M0 ${-r}L${r} ${r*.8}H${-r}Z" fill="${t>.5?'#eeb913':'#ffeaa1'}" fill-opacity="${.5+.5*t}" stroke="#94720b" stroke-opacity="${.45+.55*t}" stroke-width=".85"/><title>이 주변 불편 ${g.n}곳 · 고장 조명 ${n('outage')}개 / 장애물 ${n('obstacle')}곳 / 무신호 횡단보도 ${n('crossing')}곳</title>`);}}
  if(id==='cameras'){const groups=clusters(id,size),max=Math.max(1,...groups.map(g=>g.n));for(const g of groups){const outage=g.items.filter(p=>p.status==='outage').length,t=g.n/max,r=3.2+2.2*Math.sqrt(t);svg+=mark(g,id,`<rect x="${-r}" y="${-r}" width="${r*2}" height="${r*2}" rx="1.5" fill="${outage===g.n?'#78827b':l.color}" fill-opacity="${.55+.45*t}" stroke="white" stroke-width=".9"/><path d="M-2.8-1.6H.4V1.6H-2.8ZM.4-1L2.8-2.3V2.3L.4 1Z" fill="white"/><title>이 주변 CCTV ${g.n}대 · 작동 ${g.n-outage}대 / 미작동 ${outage}대</title>`);}}
  if(id==='voices')for(const g of clusters(id,200))svg+=mark(g,id,`<path d="M-7-6H7V4H-2L-6 8V4H-7Z" fill="${l.color}" stroke="white" stroke-width="1.1"/><path d="M-3-2H3M-3 1H1" stroke="white" stroke-width="1.1"/><title>${escape(g.items.map(v=>v.speaker_description+': '+v.quote).join(' / '))}</title>`,`data-voices="${g.zone_id}" class="voice-bubble"`);
  svg=`<g data-student-layer="${id}">${svg}</g>`;cache.set(key,svg);return svg;
 }
 function render(enabled,zoom=1){const size=sizeFor(zoom),order=['requests','traffic','people','care','harm','lighting','cameras','voices'];return order.filter(id=>enabled.includes(id)).map(id=>renderOne(id,size)).join('');}
 return {catalog,rows,render,metric,escape,clusters,sizeFor};
}
export {createStudentLayers};
