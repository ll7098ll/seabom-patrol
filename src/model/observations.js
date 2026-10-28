export const MISSIONS = [
 {id:'needs',label:'도움과 사건',question:'도움 요청과 확인된 사건은 같은 곳에 몰릴까요?',hint:'진한 곳을 찾아 두 자료를 번갈아 보세요. 요청 수와 사건 수가 다른 곳도 찾아보세요.',layers:['requests','harm'],prompt:'두 자료에서 어떤 차이를 발견했나요?'},
 {id:'people',label:'사람과 돌봄',question:'사람이 모이는 곳과 어린이·어르신이 많은 곳은 어디일까요?',hint:'시장의 붐비는 곳과 주택가·학교 주변을 비교해 보세요. 조용한 곳에도 도움이 필요할 수 있어요.',layers:['people','care'],prompt:'어떤 사람을 위해 이곳을 살피고 싶나요?'},
 {id:'roads',label:'출동하는 길',question:'가까워 보여도 도착하기 어려운 곳은 어디일까요?',hint:'붐비는 도로와 강을 건너는 다리를 살펴보세요. 지도에서 가까운 것과 빨리 갈 수 있는 것은 다를 수 있어요.',layers:['traffic'],prompt:'이곳으로 갈 때 어떤 길을 생각해야 할까요?'},
 {id:'voices',label:'주민의 경험',question:'숫자만으로 보이지 않는 주민의 불편은 무엇일까요?',hint:'분홍 말풍선을 누르고 조명·CCTV 자료를 함께 보세요. 시설의 수만으로 안전을 판단하지 말고 주민의 경험도 들어보세요.',layers:['voices','lighting','cameras'],prompt:'주민의 어떤 이야기를 배치에 반영하고 싶나요?'}
];

export function mergeObservationNote(notes,{cell,name,rows,missionId,reason=''}){
 const previous=notes.find(n=>n.cell===cell);
 const mergedRows=[...new Map([...(previous?.rows||[]),...rows].map(r=>[r.id,r])).values()];
 const missionIds=[...new Set([...(previous?.missionIds||[]),...(MISSIONS.some(m=>m.id===missionId)?[missionId]:[])])];
 const note={cell,name,rows:mergedRows,missionIds,reason:typeof reason==='string'&&reason.trim()?reason.trim().slice(0,240):previous?.reason||''};
 return previous?notes.map(n=>n.cell===cell?note:n):[...notes,note];
}

export function restoreObservationNotes(raw,D,P){
 if(!Array.isArray(raw))return[];
 let notes=[];
 for(const n of raw){
  const cell=D.grid.find(c=>c.id===n?.cell&&c.land_fraction>0);
  if(!cell||!Array.isArray(n.rows)||(!notes.some(p=>p.cell===cell.id)&&notes.length>=16))continue;
  const ids=[...new Set(n.rows.map(r=>r?.id).filter(id=>P.lookup.has(id)))];
  if(!ids.length)continue;
  const missionIds=Array.isArray(n.missionIds)?n.missionIds.filter(id=>MISSIONS.some(m=>m.id===id)):[];
  notes=mergeObservationNote(notes,{cell:cell.id,name:D.zones.find(z=>z.id===cell.zone_id)?.name||'관찰 지점',rows:P.pointRows(cell.id,ids),reason:n.reason});
  notes=notes.map(p=>p.cell===cell.id?{...p,missionIds:[...new Set([...p.missionIds,...missionIds])]}:p);
 }
 return notes;
}
