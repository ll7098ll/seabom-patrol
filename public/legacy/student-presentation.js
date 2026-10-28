(function(root){
'use strict';
function createStudentPresentation(D,GIS,net,L){
 const Y=y=>4000-y,fmt=(n,p=0)=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:p}),esc=L.escape;
 const configs={
  requests:{metric:['calls'],unit:'건',dot:1,color:'#d46619',period:'9/14–10/11 · 28일',ramp:['#fff5e7','#fbd2a1','#f39a4f','#d9631d','#842d0c']},
  harm:{metric:['incidents'],unit:'건',dot:1,color:'#bb3653',period:'9/14–10/11 · 28일',ramp:['#fff0f2','#f4c3cd','#e8859b','#b93657','#711e38']},
  people:{metric:['presence'],unit:'명',dot:100,color:'#366fc0',period:'대표 하루 · 평균 인원',ramp:['#f0f6ff','#c3d7f7','#83ade7','#3e72bb','#183c77']},
  care:{metric:['children','older'],unit:'명',dot:50,color:'#158c93',period:'10월 기준 · 어린이·어르신',ramp:['#effafa','#bee7e7','#7ac6c8','#2b9299','#10545b']},
  lighting:{metric:['light_outages','obstacles','unsignalized'],unit:'개',dot:1,color:'#a47b10',period:'10월 기준 · 세 종류의 불편 요소',ramp:['#fffbe8','#f2e4aa','#dfc56b','#b18a24','#6f510d']},
  cameras:{metric:['cameras'],unit:'대',dot:1,color:'#2a874b',period:'10월 기준 · 설치 위치',ramp:['#f0f9ef','#c7e6c6','#8bc78e','#3f9254','#17572a']},
  traffic:{unit:'배',color:'#8254b3',period:'대표 교통 · 교통량 / 도로 용량',ramp:['#f3effb','#ded0f0','#b99bd9','#8055b1','#48266d']},
  voices:{color:'#c4508b',period:'가상 주민의 장소별 경험'}
 };
 const catalog=L.catalog.map(l=>({...l,...configs[l.id]})),lookup=new Map(catalog.map(l=>[l.id,l])),cells=new Map(D.grid.map(g=>[g.id,g])),datasets=new Map(),dotCache=new Map(),heatCache=new Map(),svgCache=new Map();
 const quantitative=id=>!!lookup.get(id)?.metric;
 const effectiveMode=(id,mode)=>id==='traffic'?'area':id==='voices'?'voices':['heat','dots','area'].includes(mode)?mode:'heat';
 const focusFor=(enabled,focus)=>enabled.includes(focus)?focus:enabled.find(id=>lookup.has(id))||null;
 function dataset(id){if(datasets.has(id))return datasets.get(id);const l=lookup.get(id);if(!l?.metric)return null;const sources=l.metric.map(metric=>GIS.dataset({metric,period:'all',requestType:'all',layers:{}}).gv),values=new Map(D.grid.map(g=>[g.id,sources.reduce((n,v)=>n+(v.get(g.id)||0),0)])),v=[...values.values()],result={values,total:v.reduce((a,b)=>a+b,0),max:Math.max(0,...v)};datasets.set(id,result);return result;}
 function bands(id){const d=dataset(id),step=Math.max(1,Math.ceil(d.max/5)),count=Math.max(1,Math.ceil(d.max/step)),ramp=lookup.get(id).ramp;return Array.from({length:count},(_,i)=>({min:i*step+1,max:(i+1)*step,color:ramp[count===1?4:Math.round((count<4?1:0)+i*(count<4?3:4)/(count-1))]}));}
 function shade(id,value){if(value===0)return '#ffffff';return bands(id).find(b=>value<=b.max)?.color||lookup.get(id).ramp[4];}
 function inRiver([x,y]){const p=D.map.river.geometry.coordinates[0];let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const[a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
 function dots(id){if(dotCache.has(id))return dotCache.get(id);const l=lookup.get(id),d=dataset(id);let points=[];
  if(id==='cameras'||id==='lighting'){const source=id==='cameras'?D.assets.filter(a=>a.kind==='cctv'):[...D.assets.filter(a=>a.kind==='streetlight'&&a.status==='outage'),...D.street_features.filter(f=>f.kind==='obstacle'||f.kind==='crossing'&&!f.signalized)];points=source.map(p=>({xy:p.xy,cell:Math.floor(p.xy[0]/200)+'-'+Math.floor(p.xy[1]/200),outage:p.status==='outage'&&id==='cameras'}));}
  else{const counts=D.grid.map((g,i)=>({g,i,n:Math.floor(d.values.get(g.id)/l.dot),fraction:d.values.get(g.id)/l.dot%1})),remainder=Math.round(d.total/l.dot)-counts.reduce((n,c)=>n+c.n,0);counts.slice().sort((a,b)=>b.fraction-a.fraction||a.i-b.i).slice(0,remainder).forEach(c=>c.n++);
   for(const {g,n}of counts){let seed=(g.ix*2917+g.iy*1351+37+[...id].reduce((n,c)=>n+c.charCodeAt(0),0))>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<n;i++){let xy;for(let attempt=0;attempt<200;attempt++){xy=[g.bbox[0]+5+random()*190,g.bbox[1]+5+random()*190];if(!inRiver(xy))break;}if(inRiver(xy)){let found=null;for(let x=g.bbox[0]+2;x<g.bbox[2]&&!found;x+=4)for(let y=g.bbox[1]+2;y<g.bbox[3];y+=4)if(!inRiver([x,y])){found=[x,y];break;}if(found)xy=found;}points.push({xy,cell:g.id});}}
  }
  dotCache.set(id,points);return points;
 }
 function heatField(id){if(heatCache.has(id))return heatCache.get(id);const width=300,height=200,sigma=160,step=20,reach=24,values=new Float64Array(width*height),d=dataset(id),normal=1e6/(2*Math.PI*sigma*sigma);let max=0;
  for(const g of D.grid){const n=d.values.get(g.id);if(!n)continue;const gx=g.xy[0]/step,gy=Y(g.xy[1])/step;for(let y=Math.max(0,Math.floor(gy-reach));y<Math.min(height,Math.ceil(gy+reach));y++)for(let x=Math.max(0,Math.floor(gx-reach));x<Math.min(width,Math.ceil(gx+reach));x++){const d2=((x+.5-gx)*step)**2+((y+.5-gy)*step)**2;if(d2<=9*sigma*sigma)values[y*width+x]+=n*Math.exp(-d2/(2*sigma*sigma))*normal;}}
  for(const n of values)max=Math.max(max,n);const field={values,max,width,height};heatCache.set(id,field);return field;
 }
 function heatImage(id){const field=heatField(id);if(field.url)return field.url;const canvas=document.createElement('canvas');canvas.width=field.width;canvas.height=field.height;const ctx=canvas.getContext('2d'),im=ctx.createImageData(field.width,field.height),rgb=lookup.get(id).ramp.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));for(let i=0;i<field.values.length;i++){const t=field.max?field.values[i]/field.max:0,k=t*4,j=Math.min(3,Math.floor(k)),f=k-j;for(let c=0;c<3;c++)im.data[4*i+c]=rgb[j][c]*(1-f)+rgb[j+1][c]*f;im.data[4*i+3]=t<.015?0:255*Math.pow(t,1.6)*.98;}ctx.putImageData(im,0,0);field.url=canvas.toDataURL();return field.url;}
 function voicePosition(v){const c=v.geometry.coordinates;return v.geometry.type==='Point'?c:v.geometry.type==='LineString'?c[Math.floor(c.length/2)]:[0,1].map(i=>(Math.min(...c[0].map(p=>p[i]))+Math.max(...c[0].map(p=>p[i])))/2);}
 const voices=D.voices.map(v=>({...v,xy:voicePosition(v)})),line=p=>p.map(([x,y],i)=>(i?'L':'M')+x+','+Y(y)).join(' ');
 const trafficBand=n=>n<.4?0:n<.6?1:n<.8?2:n<1?3:4;
 function draw(id,requested){const mode=effectiveMode(id,requested),key=[id,mode].join('|');if(svgCache.has(key))return svgCache.get(key);const l=lookup.get(id);let svg='';
  if(quantitative(id)){if(mode==='dots'){const radius=id==='requests'?1.55:id==='harm'?1.8:['cameras','lighting'].includes(id)?2.8:1.9;svg=dots(id).map(p=>`<circle class="density-dot" data-screen-radius="${radius}" data-cell="${p.cell}" cx="${p.xy[0]}" cy="${Y(p.xy[1])}" r="${radius*7}" fill="${p.outage?'#7a8389':l.color}" fill-opacity=".82"/>`).join('');}
   else if(mode==='heat')svg=`<image x="0" y="0" width="6000" height="4000" href="${heatImage(id)}" preserveAspectRatio="none"/>`;
   else{const d=dataset(id);svg=D.grid.filter(g=>g.land_fraction>0).map(g=>`<path data-cell="${g.id}" d="${GIS.gridPath(g)}" fill="${shade(id,d.values.get(g.id))}" fill-opacity="${d.values.get(g.id)===0?0:.92}" stroke="${d.values.get(g.id)===0?'none':'#ffffff'}" stroke-width=".55" vector-effect="non-scaling-stroke"/>`).join('');}
   svg=`<g clip-path="url(#land-mask)">${svg}</g>`;
  }else if(id==='traffic')svg=net.edges.map(e=>`<path data-road="${e.id}" d="${line(e.geometry.coordinates)}" fill="none" stroke="${l.ramp[trafficBand(e.traffic.all.capacity_ratio)]}" stroke-opacity="1" stroke-width="${1+e.traffic.all.capacity_ratio*2.5}" vector-effect="non-scaling-stroke" stroke-linecap="round"/>`).join('');
  else svg=voices.map(v=>`<g transform="translate(${v.xy[0]} ${Y(v.xy[1])})"><g data-voice-id="${v.id}" data-screen-scale="1" class="voice-bubble" opacity="1"><path d="M-7-6H7V4H-2L-6 8V4H-7Z" fill="${l.color}" stroke="white" stroke-width="1.1"/><path d="M-3-2H3M-3 1H1" stroke="white" stroke-width="1"/><title>${esc(v.speaker_description)} · ${esc(v.quote)}</title></g></g>`).join('');
  svgCache.set(key,svg);return svg;
 }
 function layerView(id,views={}){const v=views?.[id]||{};return {mode:effectiveMode(id,v.mode),opacity:Number.isFinite(v.opacity)?Math.max(.1,Math.min(1,v.opacity)):id==='voices'?1:id==='traffic'?.85:.7};}
 function render(enabled,views={}){
  // Areas stay under points, roads, and stories so each kind remains visible and clickable.
  const rank=id=>id==='voices'?4:id==='traffic'?3:({area:0,heat:1,dots:2}[layerView(id,views).mode]);
  return catalog.filter(l=>enabled.includes(l.id)).sort((a,b)=>rank(a.id)-rank(b.id)).map(l=>{const v=layerView(l.id,views);return `<g data-student-layer="${l.id}" data-representation="${v.mode}" opacity="${v.opacity}" style="mix-blend-mode:${quantitative(l.id)?'multiply':'normal'}">${draw(l.id,v.mode)}</g>`;}).join('');
 }
 function legend(id,requested){if(!id)return '<span class="legend-empty">왼쪽에서 살펴볼 자료를 켜 주세요.</span>';const l=lookup.get(id),mode=effectiveMode(id,requested);let mark='',note='',title='';if(mode==='voices'){title='이야기가 기록된 장소';note='개인의 경험을 점수로 바꾸지 않아요.';mark=`<span class="dot-key" style="--color:${l.color}">분홍 말풍선 · 눌러서 읽기</span>`;}
  else if(id==='traffic'){title='도로의 혼잡도';note='교통량 / 도로 용량';mark=`<div class="legend-ramp"><div class="ramp-colors">${l.ramp.map(c=>`<i style="background:${c}"></i>`).join('')}</div><div class="legend-ticks"><span>&lt;0.4</span><span>0.4–0.6</span><span>0.6–0.8</span><span>0.8–1</span><span>≥1배</span></div></div>`;}
  else if(mode==='heat'){title='어디에 몰려 있나요?';note=`주변 밀도 · ${l.unit}/km²`;const h=heatField(id);mark=`<div class="legend-ramp"><div class="ramp-gradient" style="background:linear-gradient(90deg,${l.ramp.join(',')})"></div><div class="legend-ticks"><span>0 · 적음</span><span>${fmt(h.max/2,1)}</span><span>${fmt(h.max,1)} · 많음</span></div></div>`;}
  else if(mode==='dots'){title='어느 지점에 얼마나 있나요?';note=['cameras','lighting'].includes(id)?'시설·불편 요소의 원자료 위치':'200m칸 안의 수량 표현용 대표점';mark=`<span class="dot-key" style="--color:${l.color}"><i></i>점 1개 = ${l.dot>1?'약 ':''}${l.dot}${l.unit}</span>`;}
  else{title='어느 칸에 더 많나요?';note=`200m칸당 ${l.unit} · 0은 빈 칸`;const bs=bands(id);mark=`<div class="legend-ramp"><div class="ramp-colors">${bs.map(b=>`<i style="background:${b.color}"></i>`).join('')}</div><div class="legend-ticks">${bs.map(b=>`<span>${b.min===b.max?b.min:b.min+'–'+b.max}</span>`).join('')}</div></div>`;}
  return `<div class="legend-title"><b>${l.name} · ${title}</b><small>${note}</small></div>${mark}`;
 }
 function cellAt(xy){return cells.get(Math.floor(xy[0]/200)+'-'+Math.floor(xy[1]/200))||null;}
 function nearestRoad(xy){let nearest=null;for(const e of net.edges){const p=e.geometry.coordinates;for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((xy[0]-a[0])*dx+(xy[1]-a[1])*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(xy[0]-a[0]-t*dx,xy[1]-a[1]-t*dy);if(!nearest||d<nearest.d)nearest={edge:e,d};}}return nearest?.edge;}
 function pointRows(cellId,enabled,{roadId=null,voiceId=null}={}){const g=cells.get(cellId);if(!g)return[];return catalog.filter(l=>enabled.includes(l.id)).map(l=>{let value,detail;if(quantitative(l.id)){value=`${fmt(dataset(l.id).values.get(g.id))}${l.unit}`;detail=`200m칸 ${g.id} · ${l.id==='people'?'평균 인원':l.id==='care'?'어린이·어르신 합계':l.id==='lighting'?'고장 조명·장애물·무신호 횡단의 합계':'원자료 수량'}`;}else if(l.id==='traffic'){const e=net.edges.find(e=>e.id===roadId)||nearestRoad(g.xy);value=e?fmt(e.traffic.all.capacity_ratio,2)+'배':'자료 없음';detail=e?e.name+' · 가까운 도로의 교통량 / 도로 용량':'연결된 도로 없음';}else{const local=voices.filter(v=>v.zone_id===g.zone_id);const v=voices.find(v=>v.id===voiceId)||local.slice().sort((a,b)=>Math.hypot(a.xy[0]-g.xy[0],a.xy[1]-g.xy[1])-Math.hypot(b.xy[0]-g.xy[0],b.xy[1]-g.xy[1]))[0];value=v?'주민 경험':'기록 없음';detail=v?`${v.speaker_description}: “${v.quote}”`:'이 주변에 기록된 이야기가 없어요.';}return {id:l.id,name:l.name,color:l.color,value,detail,period:l.period};});}
 return {catalog,lookup,quantitative,effectiveMode,layerView,focusFor,dataset,bands,shade,dots,heatField,render,legend,cellAt,nearestRoad,pointRows,voices};
}
root.createStudentPresentation=createStudentPresentation;if(typeof module!=='undefined')module.exports={createStudentPresentation};
})(typeof window==='undefined'?globalThis:window);
