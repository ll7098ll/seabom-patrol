import {MODEL} from './engine.js';
export const emptyPlan=()=>Array.from({length:10},(_,i)=>({id:i+1,edgeId:null,f:0}));
export const placed=plan=>plan.filter(c=>c.edgeId);
export const signature=plan=>plan.map(c=>`${c.id}:${c.edgeId||'-'}:${c.edgeId?c.f.toFixed(10):0}`).join('|');
export const clonePlan=plan=>plan.map(c=>({...c}));
export function restorePlan(raw,net,{complete=false}={}){
 if(!Array.isArray(raw)||raw.length!==10)return null;
 const sorted=raw.slice().sort((a,b)=>(a?.id??0)-(b?.id??0));
 if(sorted.some((c,i)=>!c||c.id!==i+1))return null;
 const plan=[];for(const c of sorted){if(c.edgeId===null&&!complete){plan.push({id:c.id,edgeId:null,f:0});continue;}try{net.atEdge(c.edgeId,c.f);plan.push({id:c.id,edgeId:c.edgeId,f:c.f});}catch{return null;}}
 return plan;
}
export function snapRoad(net,xy,maxDistance=120){
 if(!Array.isArray(xy)||xy.length!==2||!xy.every(Number.isFinite))return null;
 let best=null;
 for(const edge of net.edges){const[a,b]=edge.geometry.coordinates,dx=b[0]-a[0],dy=b[1]-a[1],length2=dx*dx+dy*dy;if(!length2)continue;const f=Math.max(0,Math.min(1,((xy[0]-a[0])*dx+(xy[1]-a[1])*dy)/length2)),p=[a[0]+dx*f,a[1]+dy*f],distance=Math.hypot(p[0]-xy[0],p[1]-xy[1]);if(distance<=maxDistance&&(!best||distance<best.distance))best={edgeId:edge.id,f,xy:p,distance,name:edge.name};}
 return best;
}
export function spreadPlan(D,net){const anchors=[[760,3300],[1850,3020],[2350,2400],[1250,1600],[1000,500],[4000,2700],[5250,3300],[4100,1000],[5250,1000],[4250,3460]];return anchors.map((p,i)=>{const s=snapRoad(net,p,Infinity);return {id:i+1,edgeId:s.edgeId,f:s.f};});}
export function clusteredPlan(net){const s=snapRoad(net,[850,3200],Infinity);return Array.from({length:10},(_,i)=>({id:i+1,edgeId:s.edgeId,f:.05+i*.1}));}
export function zoneAt(D,xy){return D.grid.find(g=>g.ix===Math.min(29,Math.max(0,Math.floor(xy[0]/200)))&&g.iy===Math.min(19,Math.max(0,Math.floor(xy[1]/200))))?.zone_id;}
export function previewDispatch(net,plan,request,{carId=null}={}){
 if(!request)return null;const target=net.access(request.xy,request.zone_id?.[0]);if(!target)return null;
 const candidates=placed(plan).map(c=>{const home=net.atEdge(c.edgeId,c.f),trip=net.travel(home,target,MODEL.traffic,'normal');return {id:c.id,home:home.xy,drive:trip.time,path:trip.points};}).filter(c=>Number.isFinite(c.drive)).sort((a,b)=>a.drive-b.drive||a.id-b.id);
 if(!candidates.length)return null;const first=carId?candidates.find(c=>c.id===carId):candidates[0];if(!first)return null;const handling=request.handling_delay_s/60,access=target.distance/MODEL.walkMetresPerMinute;
 return {id:request.id,carId:first.id,fastestId:candidates[0].id,scope:carId?'car':'fastest',candidates,xy:request.xy,roadXY:target.xy,path:first.path,drive:first.drive,handling,prepare:MODEL.prepareMinutes,access,wait:0,response:handling+MODEL.prepareMinutes+first.drive+access,requiredUnits:request.required_units,available:candidates.length,mode:'instant'};
}
