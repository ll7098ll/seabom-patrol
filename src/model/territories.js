// Fixed service districts from road travel time. No test-week requests enter this calculation.
export const DISTRICT_COLORS=['#5566df','#3797ac','#9275ca','#3f9c92','#6c83b0','#b17b91','#748f62','#b39159','#7b7ed0','#668e9e'];
export const PATROL_SPEED=20;
const EPS=1e-8,dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const fraction=(edge,xy)=>{const[a,b]=edge.geometry.coordinates,dx=b[0]-a[0],dy=b[1]-a[1];return ((xy[0]-a[0])*dx+(xy[1]-a[1])*dy)/(dx*dx+dy*dy);};
function shortest(adj,from){const d=new Map([[from,0]]),prev=new Map(),used=new Set();while(true){let at=null,best=Infinity;for(const [id,n]of d)if(!used.has(id)&&n<best){best=n;at=id;}if(at===null)break;used.add(at);for(const arc of adj.get(at)||[]){const n=best+arc.time;if(n<(d.get(arc.to)??Infinity)-EPS){d.set(arc.to,n);prev.set(arc.to,{...arc,from:at});}}}return {d,prev};}
function pathTo(paths,to){const legs=[];let at=to;while(paths.prev.has(at)){const a=paths.prev.get(at);legs.unshift(a.leg);at=a.from;}return legs;}
function reachable(adj,start){const seen=new Set([start]),todo=[start];while(todo.length)for(const a of adj.get(todo.pop())||[])if(!seen.has(a.to)){seen.add(a.to);todo.push(a.to);}return seen;}

export function createTerritories(D,net,plan){
 const locations=new Map(net.ids.map(id=>[id,net.atNode(id)])),roots=new Map(),seedsByEdge=new Map();
 for(const c of plan){const h=c.edgeId?net.atEdge(c.edgeId,c.f):net.atNode(c.node);let root=h.node;if(!root){if(h.f<EPS)root=h.edge.from;else if(h.f>1-EPS)root=h.edge.to;else{root=`@${h.edge.id}:${h.f.toFixed(10)}`;locations.set(root,h);if(!seedsByEdge.has(h.edge.id))seedsByEdge.set(h.edge.id,[]);seedsByEdge.get(h.edge.id).push({key:root,f:h.f});}}roots.set(c.id,root);}
 const adj=new Map([...locations.keys()].map(k=>[k,[]])),pieces=[],lengths=new Map();
 for(const edge of net.edges){const points=[{key:edge.from,f:0},...(seedsByEdge.get(edge.id)||[]),{key:edge.to,f:1}].sort((a,b)=>a.f-b.f).filter((p,i,a)=>!i||p.key!==a[i-1].key);const w=net.weight(edge);
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],time=(b.f-a.f)*w;if(time<EPS)continue;const piece={edge,a:a.key,b:b.key,f0:a.f,f1:b.f,time};pieces.push(piece);if(edge.direction!=='reverse')adj.get(a.key).push({to:b.key,time});if(edge.direction!=='forward')adj.get(b.key).push({to:a.key,time});}
 }
 const best=new Map(),owners=new Map(),used=new Set();for(const c of plan.slice().sort((a,b)=>a.id-b.id)){const k=roots.get(c.id);if(!best.has(k)){best.set(k,0);owners.set(k,c.id);}}
 while(true){let at=null,score=Infinity;for(const [id,n]of best)if(!used.has(id)&&(n<score-EPS||Math.abs(n-score)<EPS&&(owners.get(id)<(owners.get(at)??Infinity)))){at=id;score=n;}if(at===null)break;used.add(at);for(const a of adj.get(at)||[]){const n=score+a.time,old=best.get(a.to)??Infinity;if(n<old-EPS||Math.abs(n-old)<EPS&&owners.get(at)<(owners.get(a.to)??Infinity)){best.set(a.to,n);owners.set(a.to,owners.get(at));}}
 }
 const neighbors=new Map(plan.map(c=>[c.id,new Set()])),segments=[],piecesByEdge=new Map();
 const add=(piece,f0,f1,id,ka,kb)=>{if(!id||f1-f0<EPS)return;const edge=piece.edge,from=net.atEdge(edge.id,f0),to=net.atEdge(edge.id,f1),ratio=f1-f0;locations.set(ka,from);locations.set(kb,to);segments.push({owner:id,edge,fromKey:ka,toKey:kb,from,to,time:net.weight(edge)*ratio,patrolTime:(edge.length_m/Math.min(edge.speed_kph,PATROL_SPEED)/1000*60*(Math.max(1,edge.time_factors.all||1))+(edge.junction_delay_seconds||0)/60)*ratio,metres:edge.length_m*ratio});};
 for(const piece of pieces){if(!piecesByEdge.has(piece.edge.id))piecesByEdge.set(piece.edge.id,[]);piecesByEdge.get(piece.edge.id).push(piece);const oa=owners.get(piece.a),ob=owners.get(piece.b),da=best.get(piece.a)??Infinity,db=best.get(piece.b)??Infinity;
  if(oa&&ob&&oa!==ob){neighbors.get(oa)?.add(ob);neighbors.get(ob)?.add(oa);}
  if(piece.edge.direction==='forward'){add(piece,piece.f0,piece.f1,oa,piece.a,piece.b);continue;}if(piece.edge.direction==='reverse'){add(piece,piece.f0,piece.f1,ob,piece.a,piece.b);continue;}
  const u=Math.max(0,Math.min(1,(db+piece.time-da)/(2*piece.time)));if(oa===ob||u>=1-EPS)add(piece,piece.f0,piece.f1,oa,piece.a,piece.b);else if(u<=EPS)add(piece,piece.f0,piece.f1,ob,piece.a,piece.b);else{const f=piece.f0+(piece.f1-piece.f0)*u,k=`!${piece.edge.id}:${f.toFixed(10)}`;add(piece,piece.f0,f,oa,piece.a,k);add(piece,f,piece.f1,ob,k,piece.b);}
 }
 function ownerAt(loc){if(loc.node)return owners.get(loc.node)??null;const ps=piecesByEdge.get(loc.edge.id)||[];if(loc.f<EPS)return owners.get(loc.edge.from)??null;if(loc.f>1-EPS)return owners.get(loc.edge.to)??null;const p=ps.find(p=>loc.f>=p.f0-EPS&&loc.f<=p.f1+EPS);if(!p)return null;const u=(loc.f-p.f0)/(p.f1-p.f0),a=loc.edge.direction!=='reverse'?(best.get(p.a)??Infinity)+u*p.time:Infinity,b=loc.edge.direction!=='forward'?(best.get(p.b)??Infinity)+(1-u)*p.time:Infinity;if(Math.abs(a-b)<EPS)return Math.min(owners.get(p.a)??Infinity,owners.get(p.b)??Infinity);return a<b?owners.get(p.a)??null:owners.get(p.b)??null;}
 const districts=plan.map(c=>({id:c.id,home:locations.get(roots.get(c.id)).xy,root:roots.get(c.id),color:DISTRICT_COLORS[c.id-1],neighbors:[...neighbors.get(c.id)].sort((a,b)=>a-b),cells:[],segments:segments.filter(s=>s.owner===c.id),history:new Map(),route:null}));
 for(const g of D.grid||[]){if(!g.land_fraction)continue;const target=net.access(g.xy,g.zone_id?.[0]);const owner=target&&ownerAt(target);districts.find(d=>d.id===owner)?.cells.push(g.id);}
 // Historical observations only; the future request list is deliberately not inspected.
 for(const e of D.events||[]){const loc=net.access(e.xy,e.zone_id?.[0]),id=loc&&ownerAt(loc),district=districts.find(d=>d.id===id);if(!district)continue;const candidates=district.segments.filter(s=>s.edge.id===loc.edge.id).flatMap(s=>[s.fromKey,s.toKey]);let key=null,near=Infinity;for(const k of candidates){const d=dist(loc.xy,locations.get(k).xy);if(d<near){near=d;key=k;}}if(key)district.history.set(key,(district.history.get(key)||0)+1);}
 for(const d of districts)d.route=makeRoute(d,locations);
 return {districts,segments,ownerAt,neighbors,roots,locations};
}

function makeRoute(d,locations){const adj=new Map(),reverse=new Map();const add=(from,to,segment,back)=>{if(!adj.has(from))adj.set(from,[]);if(!reverse.has(to))reverse.set(to,[]);const leg={edge:segment.edge,from:back?segment.to:segment.from,to:back?segment.from:segment.to,time:segment.patrolTime,metres:segment.metres};adj.get(from).push({to,time:leg.time,leg});reverse.get(to).push({to:from});};for(const s of d.segments){if(s.edge.direction!=='reverse')add(s.fromKey,s.toKey,s,false);if(s.edge.direction!=='forward')add(s.toKey,s.fromKey,s,true);}
 const out=reachable(adj,d.root),back=reachable(reverse,d.root),allowed=new Set([...out].filter(k=>back.has(k))),candidates=[...allowed].filter(k=>k!==d.root),home=locations.get(d.root),route={home,legs:[],duration:0,metres:0,speed:PATROL_SPEED,warning:null};
 if(!candidates.length){route.warning='배치점에서 구역 안으로 왕복할 수 있는 순찰 도로가 없습니다. 배치점을 옮겨 주세요.';return route;}
 const choices=new Set([...d.history].filter(([k])=>allowed.has(k)&&k!==d.root).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,2).map(x=>x[0]));
 for(let i=0;i<6;i++){const angle=(i+d.id%6)*Math.PI/3;let key=null,score=-Infinity;for(const k of candidates){const p=locations.get(k).xy,dx=p[0]-home.xy[0],dy=p[1]-home.xy[1],n=dx*Math.cos(angle)+dy*Math.sin(angle)-Math.abs(dx*Math.sin(angle)-dy*Math.cos(angle))*.2;if(n>score){score=n;key=k;}}if(key)choices.add(key);}
 const targets=[...choices].sort((a,b)=>{const p=locations.get(a).xy,q=locations.get(b).xy;return Math.atan2(p[1]-home.xy[1],p[0]-home.xy[0])-Math.atan2(q[1]-home.xy[1],q[0]-home.xy[0]);});const shift=d.id%targets.length;targets.push(...targets.splice(0,shift));targets.push(d.root);let from=d.root;
 for(const to of targets){const paths=shortest(adj,from);if(!Number.isFinite(paths.d.get(to)))continue;for(const leg of pathTo(paths,to)){route.legs.push({...leg,start:route.duration});route.duration+=leg.time;route.metres+=leg.metres;}from=to;}
 if(route.duration<EPS)route.warning='순환 가능한 순찰 경로가 없어 배치점에서 대기합니다.';return route;
}

export function patrolAt(route,elapsed){if(!route?.legs.length||!route.duration)return {...route?.home,phase:0,path:[]};const phase=((elapsed%route.duration)+route.duration)%route.duration;const leg=route.legs.find(l=>phase<l.start+l.time-EPS)||route.legs.at(-1),u=Math.max(0,Math.min(1,(phase-leg.start)/leg.time)),xy=leg.from.xy.map((v,k)=>v+(leg.to.xy[k]-v)*u);return {edge:leg.edge,f:fraction(leg.edge,xy),xy,phase,path:[xy,...route.legs.filter(l=>l.start>=leg.start).map(l=>l.to.xy)]};}
export function rejoinPatrol(net,target,route,home,period='all',scenario='normal'){if(!route?.legs.length)return {trip:net.travel(target,home,period,scenario),phase:0};let best=null;for(const leg of route.legs){if(target.edge?.id===leg.edge.id){const a=fraction(leg.edge,leg.from.xy),b=fraction(leg.edge,leg.to.xy);if(target.f>=Math.min(a,b)-EPS&&target.f<=Math.max(a,b)+EPS){return {trip:net.travel(target,target,period,scenario),phase:leg.start+(target.f-a)/(b-a)*leg.time};}}const trip=net.travel(target,leg.from,period,scenario);if(!best||trip.time<best.trip.time-EPS)best={trip,phase:leg.start};}return best;}
export function serializeDistricts(territories){return territories.districts.map(d=>({id:d.id,home:d.home,color:d.color,neighbors:d.neighbors,cells:d.cells,segments:d.segments.map(s=>({edgeId:s.edge.id,from:s.from.xy,to:s.to.xy,metres:s.metres})),route:d.route,warning:d.route.warning,roadMetres:d.segments.reduce((n,s)=>n+s.metres,0)}));}
