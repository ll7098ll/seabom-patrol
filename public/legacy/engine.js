(function(root){
'use strict';
const MODEL={version:'elementary-2',traffic:'all',prepareMinutes:.5,walkMetresPerMinute:75,paperwork:[3,8],scene:{violence:[20,45],theft:[12,30],disorder:[8,22],traffic:[12,30],welfare:[18,40],assistance:[8,20]},note:'수업용 일상 운영 가정. 실제 경찰 성능을 예측하거나 보장하지 않습니다.'};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
class Network{
 constructor(data){this.nodes=new Map(data.nodes.map(n=>[n.id,n]));this.edges=data.edges.filter(e=>e.modes.includes('car'));this.ids=[...new Set(this.edges.flatMap(e=>[e.from,e.to]))];this.cache=new Map();this.adj=new Map(this.ids.map(id=>[id,[]]));for(const e of this.edges){if(e.direction!=='reverse')this.adj.get(e.from).push({to:e.to,edge:e});if(e.direction!=='forward')this.adj.get(e.to).push({to:e.from,edge:e});}}
 nearest(p){let best,d=Infinity;for(const id of this.ids){const k=distance(this.nodes.get(id).xy,p);if(k<d){d=k;best=id;}}return best;}
 period(min){const h=(min/60)%24;return h<6||h>=22?'night':h>=18?'evening':'day';}
 weight(e,period='all',scenario='normal'){if(scenario==='bridge'&&e.name==='상류 연결 다리')return Infinity;return e.length_m/e.speed_kph/1000*60*(e.time_factors[period]||1)*(scenario==='rain'?1.4:1)+(e.junction_delay_seconds||0)/60;}
 paths(from,period='all',scenario='normal'){
  const key=from+'|'+period+'|'+scenario;if(this.cache.has(key))return this.cache.get(key);
  const dist=new Map(this.ids.map(id=>[id,Infinity])),prev=new Map(),prevEdge=new Map(),used=new Set();dist.set(from,0);
  for(let k=0;k<this.ids.length;k++){let u=null,best=Infinity;for(const id of this.ids)if(!used.has(id)&&dist.get(id)<best){best=dist.get(id);u=id;}if(!u)break;used.add(u);for(const a of this.adj.get(u)||[]){const v=best+this.weight(a.edge,period,scenario);if(v<dist.get(a.to)){dist.set(a.to,v);prev.set(a.to,u);prevEdge.set(a.to,a.edge);}}}
  const result={dist,prev,prevEdge};this.cache.set(key,result);return result;
 }
 time(a,b,p='all',s='normal'){return this.paths(a,p,s).dist.get(b)??Infinity;}
 atNode(node){return {node,xy:this.nodes.get(node).xy};}
 // Attach to a road segment on the same bank, not a distant junction or a bridge deck.
 access(p,side){let best=null;for(const e of this.edges){if(e.kind==='bridge'||side&&(!e.from.startsWith(side)||!e.to.startsWith(side)))continue;const [a,b]=e.geometry.coordinates,dx=b[0]-a[0],dy=b[1]-a[1],f=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy))),xy=[a[0]+dx*f,a[1]+dy*f],d=distance(p,xy);if(!best||d<best.distance)best={edge:e,f,xy,distance:d};}return best;}
 endpoints(loc,outgoing,p,s){if(typeof loc==='string')loc=this.atNode(loc);if(loc.node)return[{node:loc.node,time:0,legs:[]}];if(loc.f<1e-9)return[{node:loc.edge.from,time:0,legs:[]}];if(loc.f>1-1e-9)return[{node:loc.edge.to,time:0,legs:[]}];const e=loc.edge,w=this.weight(e,p,s),options=[];
  if(!Number.isFinite(w))return options;
  const add=(node,f)=>{const target=this.atNode(node),time=Math.abs(f-loc.f)*w;options.push({node,time,legs:time?[{from:outgoing?loc:target,to:outgoing?target:loc,edge:e,time}]:[]});};
  if(outgoing?(e.direction!=='forward'):(e.direction!=='reverse'))add(e.from,0);
  if(outgoing?(e.direction!=='reverse'):(e.direction!=='forward'))add(e.to,1);
  return options;
 }
 travel(from,to,p='all',s='normal'){
  if(typeof from==='string')from=this.atNode(from);if(typeof to==='string')to=this.atNode(to);let best={time:Infinity,legs:[]};
  if(from.edge&&to.edge&&from.edge.id===to.edge.id){const e=from.edge,d=to.f-from.f,w=this.weight(e,p,s);if(Number.isFinite(w)&&((d>=0&&e.direction!=='reverse')||(d<=0&&e.direction!=='forward')))best={time:Math.abs(d)*w,legs:d?[{from,to,edge:e,time:Math.abs(d)*w}]:[]};}
  for(const a of this.endpoints(from,true,p,s))for(const b of this.endpoints(to,false,p,s)){const paths=this.paths(a.node,p,s),total=a.time+(paths.dist.get(b.node)??Infinity)+b.time;if(total>=best.time)continue;const middle=[];let id=b.node;while(id!==a.node){const prev=paths.prev.get(id),edge=paths.prevEdge.get(id);if(!prev)break;middle.unshift({from:this.atNode(prev),to:this.atNode(id),edge,time:this.weight(edge,p,s)});id=prev;}best={time:total,legs:[...a.legs,...middle,...b.legs]};}
  best.from=from;best.to=to;best.points=[from.xy,...best.legs.map(l=>l.to.xy)];return best;
 }
 route(a,b,p='all',s='normal'){return this.travel(a,b,p,s).points;}
 locationAlong(trip,elapsed){if(!trip.legs.length)return trip.to;let t=Math.max(0,elapsed);for(const l of trip.legs){if(t<=l.time){const u=l.time?t/l.time:1,xy=[l.from.xy[0]+(l.to.xy[0]-l.from.xy[0])*u,l.from.xy[1]+(l.to.xy[1]-l.from.xy[1])*u],e=l.edge,[a,b]=e.geometry.coordinates,dx=b[0]-a[0],dy=b[1]-a[1];return {edge:e,xy,f:Math.max(0,Math.min(1,((xy[0]-a[0])*dx+(xy[1]-a[1])*dy)/(dx*dx+dy*dy)))};}t-=l.time;}return trip.to;}
}
const receivedMinute=e=>(new Date(e.received_at)-new Date('2026-10-12T00:00:00+09:00'))/60000;
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function requestsFor(data,scenario='normal',seed=21){
 const random=seeded(seed),range=([a,b])=>a+(b-a)*random();
 const req=data.requests.filter(r=>r.dispatch_required).map(r=>({...r,t:receivedMinute(r),source_on_scene_minutes:r.on_scene_minutes,source_paperwork_minutes:r.paperwork_minutes,on_scene_minutes:range(MODEL.scene[r.request_type]||[15,35]),paperwork_minutes:range(MODEL.paperwork)}));
 if(scenario==='stadium')for(let i=0;i<42;i++){const zone=i%3===0?'A3':'B3',xy=zone==='A3'?[1800,1600]:[4400,1500];req.push({id:'GAME-'+i,zone_id:zone,xy,priority:i%9===0?'urgent':'priority',required_units:1,handling_delay_s:45,on_scene_minutes:range([15,35]),paperwork_minutes:range(MODEL.paperwork),t:5*1440+1200+random()*180,request_type:'assistance'});}return req.sort((a,b)=>a.t-b.t);
}
function recommend(data,net,{stage='initial',period='all',goal='efficient',weight=2,scenario='normal'}={}){
 const weights=new Map();for(const e of data.events){if(stage==='initial'&&e.first_visible_stage!=='initial')continue;const h=Number(e.occurred_at.slice(11,13));if(period!=='all'&&net.period(h*60)!==period)continue;const node=net.nearest(e.xy);weights.set(node,(weights.get(node)||0)+(e.legacy_strong?weight:1));}
 const targets=[...weights].map(([id,w])=>({id,w:goal==='equity'?Math.sqrt(w):w})),candidates=net.ids.filter((_,i)=>i%3===0),selected=[],best=targets.map(()=>Infinity);
 for(let k=0;k<10;k++){let choice=null,bestScore=Infinity;for(const c of candidates){if(selected.includes(c))continue;if(goal==='equity'&&k<2&&((k===0&&!c.startsWith('A'))||(k===1&&!c.startsWith('B'))))continue;const d=net.paths(c,period,scenario).dist;let score=0;for(let i=0;i<targets.length;i++){const t=Math.min(best[i],d.get(targets[i].id));score+=targets[i].w*(goal==='equity'?t*t:t);}if(score<bestScore){bestScore=score;choice=c;}}if(!choice)choice=net.ids[k];selected.push(choice);targets.forEach((t,i)=>best[i]=Math.min(best[i],net.time(choice,t.id,period,scenario)));}return selected.map((node,i)=>({id:i+1,node}));
}
function simulate(data,net,plan,{scenario='normal',seed=21,commitments=[],horizon=10080}={}){
 if(plan.length!==10||new Set(plan.map(c=>c.id)).size!==10||plan.some(c=>!net.ids.includes(c.node)))throw new Error('순찰차 10대를 모두 도로 위에 배치해 주세요.');
 const p=MODEL.traffic,cars=plan.map(c=>({...c,freeAt:0,busy:0,tasks:[],calls:0})),requests=requestsFor(data,scenario,seed).filter(r=>r.t>=0&&r.t<horizon).map(r=>({...r,target:net.access(r.xy,r.zone_id?.[0]),ready:r.t+r.handling_delay_s/60}));
 const jobs=[];for(const c of commitments)for(let day=0;day<7;day++)jobs.push({t:day*1440+(c.zone_id==='A1'?660:1230),voice:c,target:net.access(c.geometry.type==='Point'?c.geometry.coordinates:c.geometry.type==='LineString'?c.geometry.coordinates[0]:c.geometry.coordinates[0][0],c.zone_id[0])});jobs.sort((a,b)=>a.t-b.t);requests.sort((a,b)=>a.ready-b.ready);
 const queue=[],records=new Map(),assignments=new Map();let ri=0,ji=0,now=0,fulfilled=0,skipped=0;const priority={urgent:0,priority:1,standard:2};
 function location(car,time){const last=car.tasks.at(-1);return last&&time>=last.release&&time<last.end?net.locationAlong(last.returnTrip,time-last.release):net.atNode(car.node);}
 function task(car,target,trip,start,stay,type,requestId,access=0,allArrival=null){
  const prev=car.tasks.at(-1);if(prev&&prev.end>start){prev.interrupted=true;prev.end=start;}
  const depart=start+MODEL.prepareMinutes,arrive=depart+trip.time,sceneArrival=arrive+access,leave=Math.max(sceneArrival,allArrival??sceneArrival)+stay,release=leave+access,returnTrip=net.travel(target,car.node,p,scenario),end=release+returnTrip.time;
  const job={start,depart,arrive,sceneArrival,leave,release,end,from:trip.from,to:target,type,requestId,outbound:trip.points,inbound:returnTrip.points,trip,returnTrip,accessMinutes:access};car.tasks.push(job);car.freeAt=release;return job;
 }
 while(now<horizon){
  while(ri<requests.length&&requests[ri].ready<=now)queue.push(requests[ri++]);queue.sort((a,b)=>(priority[a.priority]-priority[b.priority])||a.ready-b.ready);
  for(let q=0;q<queue.length;){const r=queue[q],available=cars.filter(c=>c.freeAt<=now).map(c=>({c,trip:net.travel(location(c,now),r.target,p,scenario)})).filter(x=>Number.isFinite(x.trip.time)).sort((a,b)=>a.trip.time-b.trip.time||a.c.id-b.c.id);
   if(!available.length){q++;continue;}
   const assigned=assignments.get(r.id)||[],chosen=available.slice(0,r.required_units-assigned.length),access=r.target.distance/MODEL.walkMetresPerMinute;
   for(const {c,trip}of chosen){const job=task(c,r.target,trip,now,r.on_scene_minutes+r.paperwork_minutes,'call',r.id,access,Infinity);assigned.push({c,job});c.calls++;}
   assignments.set(r.id,assigned);assigned.sort((a,b)=>a.job.sceneArrival-b.job.sceneArrival);
   const complete=assigned.length===r.required_units,allArrival=complete?Math.max(...assigned.map(x=>x.job.sceneArrival)):null;
   if(complete)for(const {c,job}of assigned){job.leave=allArrival+r.on_scene_minutes+r.paperwork_minutes;job.release=job.leave+access;job.end=job.release+job.returnTrip.time;c.freeAt=job.release;}
   const first=assigned[0].job;
   records.set(r.id,{...r,dispatch:first.start,firstDispatch:Math.min(...assigned.map(x=>x.job.start)),arrival:first.sceneArrival,requiredArrival:allArrival,supportPending:!complete,response:first.sceneArrival-r.t,roadResponse:first.arrive-r.t,accessMinutes:access,wait:first.start-r.ready,prepareMinutes:MODEL.prepareMinutes,driveMinutes:first.trip.time,cars:assigned.map(x=>x.c.id)});
   if(complete)queue.splice(q,1);else q++;

  }
  while(ji<jobs.length&&jobs[ji].t<=now){const j=jobs[ji++],available=cars.filter(c=>c.freeAt<=now).map(c=>({c,trip:net.travel(location(c,now),j.target,p,scenario)})).filter(x=>Number.isFinite(x.trip.time)).sort((a,b)=>a.trip.time-b.trip.time);if(available.length&&!queue.length){task(available[0].c,j.target,available[0].trip,now,10,'visit',j.voice.id,j.target.distance/MODEL.walkMetresPerMinute);fulfilled++;}else skipped++;}
  const nextArrival=ri<requests.length?requests[ri].ready:Infinity,nextJob=ji<jobs.length?jobs[ji].t:Infinity,nextRelease=queue.length?Math.min(...cars.filter(c=>c.freeAt>now).map(c=>c.freeAt)):Infinity,next=Math.min(nextArrival,nextJob,nextRelease);if(!Number.isFinite(next)||next>=horizon)break;now=next>now?next:now+.00001;
 }
 const results=[...records.values()];
 const arrived=results.filter(r=>r.arrival<=horizon),inTransit=results.filter(r=>r.arrival>horizon),byId=new Set(results.map(r=>r.id)),missed=requests.filter(r=>!byId.has(r.id)),notArrived=missed.length+inTransit.length;
 const values=arrived.map(r=>r.response).sort((a,b)=>a-b),mean=values.length?values.reduce((a,b)=>a+b,0)/values.length:null,p90=values.length?values[Math.ceil(values.length*.9)-1]:null,urgent=requests.filter(r=>r.priority==='urgent'),urgentOnTime=arrived.filter(r=>r.priority==='urgent'&&r.response<=8).length;
 const zones=data.zones.map(z=>{const rs=arrived.filter(r=>r.zone_id===z.id);return{id:z.id,n:rs.length,mean:rs.length?rs.reduce((a,b)=>a+b.response,0)/rs.length:null,late:rs.filter(r=>r.response>8).length,missed:missed.filter(r=>r.zone_id===z.id).length,inTransit:inTransit.filter(r=>r.zone_id===z.id).length};});
 for(const c of cars)c.busy=c.tasks.reduce((s,t)=>s+Math.max(0,Math.min(horizon,t.end)-t.start),0);
 return {model:MODEL.version,plan:plan.map(c=>({...c})),scenario,seed,cars,requests,results:arrived,inTransit,missed,notArrived,mean,p90,urgentRate:urgent.length?urgentOnTime/urgent.length:null,urgentCount:urgent.length,fulfilled,skipped,zones,total:requests.length,horizon,commitments:commitments.map(c=>c.id)};
}
function positionAt(car,time,net){const t=car.tasks.find(t=>t.start<=time&&time<t.end);if(!t)return{xy:net.nodes.get(car.node).xy,state:'대기'};if(time<t.depart)return{xy:t.from.xy,state:'출동 준비'};if(time<t.arrive)return{xy:net.locationAlong(t.trip,time-t.depart).xy,state:'출동 이동'};if(time<t.sceneArrival)return{xy:t.to.xy,state:'현장 접근'};if(time<t.leave)return{xy:t.to.xy,state:t.type==='visit'?'주민 방문':'현장 처리'};if(time<t.release)return{xy:t.to.xy,state:'차량 복귀'};return{xy:net.locationAlong(t.returnTrip,time-t.release).xy,state:'복귀'};}
const api={Network,recommend,simulate,positionAt,requestsFor,MODEL};root.SaebomEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
