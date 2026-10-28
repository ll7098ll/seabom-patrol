import {Network,simulate} from '../model/engine.js';
import {signature,restorePlan} from '../model/placement.js';
import {auditRun} from './audit.js';
import {buildOperations,auditOperations} from './operations.js';
let D,net;const cache=new Map();
function calculate(plan){
 const valid=restorePlan(plan,net,{complete:true});if(!valid)throw new Error('순찰차 10대를 모두 도로 위에 놓아 주세요.');
 const key=signature(valid);if(cache.has(key))return cache.get(key);
 const r=simulate(D,net,valid,{trace:true,seed:21});
 const logs=new Map();for(const l of r.assignmentLog){if(!logs.has(l.requestId))logs.set(l.requestId,[]);logs.get(l.requestId).push(l);}
 const records=[...r.results,...r.inTransit].map(q=>{const car=r.cars.find(c=>c.id===q.cars[0]),job=car.tasks.find(t=>t.requestId===q.id);return {id:q.id,ownerId:q.ownerId,zone:q.zone_id,type:q.request_type,priority:q.priority,t:q.t,receivedAt:q.received_at,xy:q.xy,roadXY:q.target.xy,carId:q.cars[0],cars:q.cars,path:job.outbound,response:q.response,handling:q.handling_delay_s/60,wait:q.wait,prepare:q.prepareMinutes,drive:q.driveMinutes,access:q.accessMinutes,onScene:q.on_scene_minutes,paperwork:q.paperwork_minutes,arrival:q.arrival,dispatch:q.dispatch,requiredArrival:q.requiredArrival,requiredUnits:q.required_units,release:job.release,returnEnd:job.end,inTransit:q.arrival>r.horizon,decisions:logs.get(q.id),legs:job.trip.legs.map(l=>({road:l.edge.name,id:l.edge.id,time:l.time,from:l.from.xy,to:l.to.xy}))};});
 const operations=buildOperations(r),audit=auditRun(r);audit.checks.push(...auditOperations(operations));audit.allPassed=audit.checks.every(c=>c.pass);
 const result={signature:key,plan:valid,model:r.model,policy:r.policy,total:r.total,arrived:r.results.length,notArrived:r.notArrived,inTransit:r.inTransit.length,missed:r.missed.map(q=>({id:q.id,zone:q.zone_id})),mean:r.mean,p90:r.p90,urgentRate:r.urgentRate,urgentCount:r.urgentCount,zones:r.zones,audit,records,operations,seed:r.seed};
 cache.set(key,result);if(cache.size>8)cache.delete(cache.keys().next().value);return result;
}
self.onmessage=({data})=>{try{if(!D){D=data.city;net=new Network(D.graph);}const reference=calculate(data.reference),current=calculate(data.plan);self.postMessage({reference,current,token:data.token});}catch(e){self.postMessage({error:e.message,token:data.token});}};
