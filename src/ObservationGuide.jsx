import React from 'react';
import {useLab} from './context';
import Icon from './icons';
import {MISSIONS} from './model/observations';

export function MissionGuide(){
 const {s,missionId,chooseMission}=useLab();
 const mission=MISSIONS.find(m=>m.id===missionId)||MISSIONS[0];
 const recorded=MISSIONS.filter(m=>s.notes.some(n=>n.missionIds?.includes(m.id))).length;
 return <section className="mission-guide" aria-label="도시 관찰 미션">
  <div className="mission-heading"><span><Icon name="search" size={14}/>질문을 따라 관찰해요</span><small>근거 담은 질문 {recorded}/4 · 모두 채우지 않아도 괜찮아요</small></div>
  <div className="mission-tabs" role="group" aria-label="관찰 질문 선택">{MISSIONS.map((m,i)=><button key={m.id} aria-pressed={mission.id===m.id} onClick={()=>chooseMission(m.id)}><i>{s.notes.some(n=>n.missionIds?.includes(m.id))?<Icon name="check" size={10}/>:i+1}</i>{m.label}</button>)}</div>
  <h2>{mission.question}</h2><p>{mission.hint}</p>
 </section>;
}

export function EvidenceMapBar(){
 const {s,selectedEvidence,focusEvidence,setMobile}=useLab();
 const note=s.notes.find(n=>n.cell===selectedEvidence)||s.notes[0];
 return <section className="evidence-map-bar" aria-label="배치하며 보는 관찰 근거"><div><span><Icon name="note" size={14}/>관찰 근거 {s.notes.length}개 <small>· {s.selected}호 배치 중</small></span>{note?<p><strong>{note.name} · {note.cell}</strong>{note.rows.map(r=><span key={r.id}>{r.name} {r.value}</span>)}</p>:<p>도시 관찰에서 근거를 담으면 배치할 때 이곳과 지도에 함께 보여요.</p>}</div><button onClick={()=>{if(note)focusEvidence(note.cell,{move:false});setMobile('insight');}}><Icon name="note" size={14}/>근거 보기</button></section>;
}

export function PlacementEvidence(){
 const {s,selectedEvidence,focusEvidence,setStage,setMobile,setDialog}=useLab();
 return <><div className="inspector-head"><span className="eyebrow">FROM OBSERVATION TO PLACEMENT</span><h2><Icon name="note" size={18}/>관찰에서 가져온 근거 <small>{s.notes.length}</small></h2></div><p className="evidence-intro">근거를 누르면 지도에서 그 장소를 짚어 줍니다. 관찰한 내용을 보면서 도로 위 출발점을 정해 보세요.</p>
 <div className="evidence-list" aria-label="배치에 참고할 관찰 근거">{s.notes.length?s.notes.map((n,i)=><article key={n.cell} className={`evidence-card ${selectedEvidence===n.cell?'selected':''}`}>
  <button className="evidence-place" aria-pressed={selectedEvidence===n.cell} onClick={()=>focusEvidence(n.cell)}><i>{i+1}</i><span><strong>{n.name}</strong><small>200m칸 {n.cell} · 지도에서 보기</small></span><Icon name="locate" size={15}/></button>
  {!!n.missionIds?.length&&<div className="evidence-questions">{n.missionIds.map(id=><span key={id}>{MISSIONS.find(m=>m.id===id)?.label}</span>)}</div>}
  {n.reason&&<p className="evidence-reason"><Icon name="message" size={13}/>{n.reason}</p>}
  <dl>{n.rows.map(r=><div key={r.id}><dt><i style={{background:r.color}}/>{r.name}</dt><dd>{r.value}</dd><small>{r.period}</small>{['voices','traffic'].includes(r.id)&&r.detail&&<p>{r.detail}</p>}</div>)}</dl>
  <button className="evidence-layers" onClick={()=>focusEvidence(n.cell,{layers:true})}><Icon name="layers" size={13}/>이 근거의 자료 겹쳐 보기</button>
 </article>):<div className="evidence-empty"><Icon name="note" size={25}/><h3>아직 담아 둔 근거가 없어요.</h3><p>도시 관찰에서 장소를 누르고 발견한 점을 근거로 담아 보세요. 지금 배치는 유지됩니다.</p><button className="secondary full" onClick={()=>{setStage('observe');setMobile('map');}}>관찰 미션으로 돌아가기<Icon name="arrow" size={14}/></button></div>}</div>
 <div className="evidence-footer"><button onClick={()=>setStage('observe')}><Icon name="back" size={13}/>근거 더 찾기</button><button onClick={()=>setDialog('record')}>탐구 기록<Icon name="external" size={12}/></button></div></>;
}
