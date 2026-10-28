import {MODEL} from '../model/engine.js';
export const epsilon=1e-7;
const close=(a,b)=>Math.abs(a-b)<epsilon;
const sum=xs=>xs.reduce((a,b)=>a+b,0);

export function auditRun(run){
  const requests=[...run.results,...run.inTransit],tasks=run.cars.flatMap(c=>c.tasks);
  const decompositionErrors=requests.map(r=>({id:r.id,error:Math.abs(r.response-(r.handling_delay_s/60+r.wait+r.prepareMinutes+r.driveMinutes+r.accessMinutes))}));
  const maxError=Math.max(0,...decompositionErrors.map(r=>r.error));
  const overlaps=run.cars.flatMap(c=>c.tasks.slice(1).filter((t,i)=>t.start<c.tasks[i].release-epsilon).map(t=>({car:c.id,request:t.requestId})));
  const routes=tasks.filter(t=>!close(sum(t.trip.legs.map(l=>l.time)),t.trip.time));
  const wrongDirection=tasks.flatMap(t=>t.trip.legs.filter(l=>{const [a,b]=l.edge.geometry.coordinates,delta=(l.to.xy[0]-l.from.xy[0])*(b[0]-a[0])+(l.to.xy[1]-l.from.xy[1])*(b[1]-a[1]);return l.edge.direction==='forward'?delta<-epsilon:l.edge.direction==='reverse'?delta>epsilon:false;}));
  const choices=(run.assignmentLog||[]).filter(log=>log.chosen.some((id,i)=>id!==log.candidates[i]?.id));
  const values=run.results.map(r=>r.response).sort((a,b)=>a-b),mean=values.length?sum(values)/values.length:null,p90=values.length?values[Math.ceil(.9*values.length)-1]:null;
  const urgent=run.requests.filter(r=>r.priority==='urgent'),urgentOnTime=run.results.filter(r=>r.priority==='urgent'&&r.response<=8).length;
  const checks=[
    {id:'total',name:'요청 총수 보존',pass:run.results.length+run.inTransit.length+run.missed.length===run.total,detail:`도착 ${run.results.length} + 이동 중 ${run.inTransit.length} + 미배정 ${run.missed.length} = ${run.total}건`},
    {id:'formula',name:'도착시간 5항의 합계',pass:maxError<epsilon,detail:`모든 배정 요청을 확인. 최대 오차 ${maxError.toExponential(2)}분`},
    {id:'overlap',name:'한 차량의 중복 업무 금지',pass:overlaps.length===0,detail:`${tasks.length}개 차량 업무에서 이전 현장 접근·업무·차량 복귀 중 재배정 ${overlaps.length}건`},
    {id:'route',name:'도로 구간 시간 합계',pass:routes.length===0,detail:`${tasks.length}개 출동 경로의 구간 합계와 이동시간 비교`},
    {id:'oneway',name:'일방통행 준수',pass:wrongDirection.length===0,detail:`차량 출동의 도로 진행 방향 위반 ${wrongDirection.length}건`},
    {id:'choice',name:'배정 규칙에 따른 가용 후보 순서',pass:!!run.assignmentLog&&choices.length===0,detail:`${run.assignmentLog?.length||0}회 배정에서 담당→인접 지원→확대 지원 순서와 단계 내 도로 이동시간 비교. 동률이면 차량 번호순`},
    {id:'mean',name:'평균·90% 시간의 분모',pass:(mean===null?run.mean===null:close(mean,run.mean))&&(p90===null?run.p90===null:close(p90,run.p90)),detail:`관찰 종료 전에 도착한 ${values.length}건으로 다시 집계`},
    {id:'urgent',name:'긴급 도착률의 분모',pass:urgent.length?(close(run.urgentRate,urgentOnTime/urgent.length)):run.urgentRate===null,detail:`8분 이내 도착 ${urgentOnTime} / 긴급 요청 전체 ${urgent.length}건`},
    {id:'support',name:'지원 차량 도착 전 업무 완료 방지',pass:requests.every(r=>{if(r.required_units===1)return true;if(r.requiredArrival===null)return tasks.filter(t=>t.requestId===r.id).every(t=>t.leave===Infinity);return r.requiredArrival>=r.arrival-epsilon&&tasks.filter(t=>t.requestId===r.id).every(t=>t.leave>=r.requiredArrival+r.on_scene_minutes+r.paperwork_minutes-epsilon);}),detail:'2대 요청은 첫 도착과 지원 차량 도착을 구분. 모든 참여 차량이 지원 도착 뒤 현장 업무·기록 시간이 지나야 현장을 떠나는지 확인'},
    {id:'access',name:'현장 접근과 차량 복귀 시간 반영',pass:tasks.every(t=>close(t.sceneArrival-t.arrive,t.accessMinutes)&&(!Number.isFinite(t.release)||close(t.release-t.leave,t.accessMinutes))),detail:`도로에서 현장까지 거리 ÷ 분당 ${MODEL.walkMetresPerMinute}m. 현장 종료 후 차량으로 돌아오는 시간도 업무에 포함`}
  ];
  return {allPassed:checks.every(c=>c.pass),checks,maxError,taskCount:tasks.length,urgentOnTime,arrived:values.length};
}

