(function(root){
'use strict';
root.createStudentMap=function(D,GIS,net){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],safe=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),Y=y=>4000-y,pts=p=>p.map(([x,y])=>x+','+Y(y)).join(' '),line=p=>p.map(([x,y],i)=>(i?'L':'M')+x+','+Y(y)).join(' ');
const view={zoom:1,tx:0,ty:0,fit:1,width:0,height:0};
let onViewChange=()=>{};
function setOnViewChange(fn){onViewChange=fn;}
function marker(xy,html,extra=''){return `<g transform="translate(${xy[0]} ${Y(xy[1])})" ${extra}>${html}</g>`;}
function label(xy,text,size=65,fill='#627465'){return marker(xy,`<g class="reference-label"><text text-anchor="middle" font-size="12" font-weight="700" fill="#48695b" stroke="#fffefb" stroke-width="3" paint-order="stroke" class="map-label">${safe(text)}</text></g>`);}
function drawBase(){
 const river=D.map.river.geometry.coordinates[0];$('#land-mask').innerHTML=`<path d="M0 0H6000V4000H0Z ${line(river)}Z" clip-rule="evenodd" fill-rule="evenodd"/>`;let terrain='<rect x="-3000" y="-3000" width="12000" height="10000" fill="#f5f7f9"/>';
 terrain+='<path d="M-400 0Q1000 -100 1450 150T2600 20L2500 350Q1000 260 100 750Z" fill="#dae5ce"/><path d="M3400 -200Q4800 300 6300 -100L6400 600Q5100 240 3450 460Z" fill="#dde8d0"/>';
 terrain+='<rect x="70" y="70" width="5860" height="3860" rx="120" fill="#edf0ed"/>';
 terrain+=`<polygon points="${pts(river)}" fill="#b9d4df" stroke="#d8e9d4" stroke-width="65"/><polygon points="${pts(river)}" fill="url(#water-pattern)"/>`;
 for(const z of D.zones)terrain+=`<path class="zone-hit" data-zone="${z.id}" d="${GIS.zonePaths.get(z.id)}" fill="#f0eee8" opacity=".3" clip-path="url(#land-mask)"/>`;
 for(const l of D.map.landuses)terrain+=`<polygon points="${pts(l.geometry.coordinates[0])}" fill="${l.kind==='park'?'#e1e9dc':l.kind==='school'?'#e6e6d5':'#e4e7e5'}" stroke="#ffffff" stroke-width="10"/>`;
 $('#terrain').innerHTML=terrain;
 let roads='';const ordered=D.graph.edges.slice().sort((a,b)=>(a.kind==='bridge')-(b.kind==='bridge'));
 for(const e of ordered){const p=line(e.geometry.coordinates),w=e.kind==='bridge'?83:e.kind==='arterial'?46:e.kind==='footway'?12:25;roads+=`<path d="${p}" fill="none" stroke="${e.kind==='bridge'?'#bec7c0':e.kind==='footway'?'#d4d1b6':'#d9d8cf'}" stroke-width="${w+7}" stroke-linecap="round"/><path d="${p}" fill="none" stroke="${e.kind==='arterial'?'#fffdf8':e.kind==='footway'?'#fffbe8':'#fffdf7'}" stroke-width="${w}" stroke-linecap="round"/>`;if(e.kind==='bridge')roads+=`<path d="${p}" fill="none" stroke="#e6dfa9" stroke-width="3" stroke-dasharray="18 12"/>`;if(e.stairs){const c=e.geometry.coordinates[0];roads+=marker(c,'<text font-size="42" fill="#aab394">≋</text>');}}
 $('#roads').innerHTML=roads;
 $('#buildings').innerHTML=D.map.buildings.map((b,i)=>{const p=pts(b.geometry.coordinates[0]);return `<polygon points="${p}" transform="translate(4 5)" fill="#c5cbc3" opacity=".25"/><polygon points="${p}" fill="${b.use==='commercial'?['#ded5c7','#e3d9cb','#e4ddcf'][i%3]:b.use==='apartment'?['#d9dfdd','#d4dbd8','#dce2dd'][i%3]:['#e0dfd8','#deded6','#dcded7','#e5e2d9'][i%4]}" stroke="${b.use==='commercial'?'#d1c9bb':'#d0d3cc'}" stroke-width="2.4"/>`;}).join('');
 let landmarks='';
 // Public facilities are drawn as editable map geometry.
 landmarks+='<rect x="3870" y="1065" width="520" height="135" rx="9" fill="#ced6db" stroke="#aebdc4" stroke-width="7"/><rect x="3870" y="1200" width="110" height="200" rx="7" fill="#ced6db" stroke="#aebdc4" stroke-width="7"/><rect x="4050" y="1260" width="360" height="210" rx="35" fill="#e6d9b7" stroke="#f8f4e6" stroke-width="10"/><rect x="4095" y="1294" width="270" height="140" rx="10" fill="#c7d6aa" stroke="white" stroke-width="5"/><path d="M4230 1295V1434" stroke="white" stroke-width="4"/>';
 landmarks+='<rect x="1130" y="2360" width="265" height="100" rx="12" fill="#cad3d5" stroke="#b1bfc1" stroke-width="5"/><rect x="1110" y="2510" width="305" height="180" rx="15" fill="#d8dddc"/>';
 for(let i=0;i<5;i++)landmarks+=`<rect x="${1135+i*52}" y="2530" width="32" height="100" rx="5" fill="${i%2?'#87adb5':'#91b5a1'}" stroke="white" stroke-width="5"/>`;
 landmarks+='<rect x="5135" y="2890" width="225" height="145" rx="10" fill="#d0d2dd" stroke="#bcbecb" stroke-width="6"/><rect x="5160" y="2915" width="175" height="18" fill="#b9bfcc"/><path d="M5160 2960h175m-175 40h175" stroke="#b9bfcc" stroke-width="12"/>';
 landmarks+='<ellipse cx="3820" cy="3240" rx="170" ry="240" fill="#b4d6cf" stroke="#d9e8c7" stroke-width="25"/><ellipse cx="3880" cy="3270" rx="70" ry="100" fill="#d2e2bf"/>';
 for(let i=0;i<86;i++){const inB=i%2===0;let x=inB?3600+(i*137%840):510+(i*193%820),y=inB?530+(i*179%800):270+(i*97%430);if(inB&&Math.hypot((x-3820)/1,(y-760)/1.3)<230)continue;landmarks+=marker([x,y],`<circle r="${22+i%17}" fill="${['#bdd3a6','#c2d8ad','#b4cea0'][i%3]}"/><circle cy="-6" r="${14+i%10}" fill="#c4dbb3" opacity=".7"/>`);}
 $('#landmarks').innerHTML=landmarks;
 const icons={A1:'▥',A2:'▤',A3:'↔',A4:'♧',B1:'▣',B2:'⌂',B3:'♧',B4:'▥'};
 const positions={A1:[780,3380],A2:[1980,2920],A3:[1330,1550],A4:[940,440],B1:[4150,2800],B2:[5230,3310],B3:[4020,910],B4:[5250,1080]};
 let labels='';for(const z of D.zones){const pos=positions[z.id],width=Math.max(72,z.name.length*11+16);labels+=marker(pos,`<g class="zoom-label" data-zone="${z.id}" style="cursor:pointer"><rect x="${-width/2}" y="-20" width="${width}" height="24" rx="4" fill="#fffefb" stroke="#b8c8b8" stroke-width="1.3"/><text y="-4" text-anchor="middle" font-size="12" font-weight="700" fill="#193d31" class="map-label">${z.name}</text></g>`);}
 labels+=label([2900,3300],'새봄천',49,'#6d9ba2')+label([3000,2280],'상류 연결 다리',40,'#85988c')+label([3000,980],'하류 연결 다리',40,'#85988c');
 labels+='<text x="1100" y="160" text-anchor="middle" font-size="84" fill="#a9b4a1" letter-spacing="18">A 구역</text><text x="4800" y="160" text-anchor="middle" font-size="84" fill="#a9b4a1" letter-spacing="18">B 구역</text><text class="svg-road-label" x="1780" y="1768" font-size="30">햇살대로</text><text class="svg-road-label" x="4700" y="3073" font-size="30">물빛공원로</text>';
 const names=new Map();for(const e of net.edges.filter(e=>e.kind==='arterial')){if(!names.has(e.name))names.set(e.name,[]);names.get(e.name).push(e);}for(const [name,group]of names){const e=group[Math.floor(group.length/2)],a=e.geometry.coordinates[0],b=e.geometry.coordinates[1],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],angle=Math.abs(b[0]-a[0])<Math.abs(b[1]-a[1])?-90:0;labels+=marker(mid,`<text class="detail-road-name" transform="rotate(${angle})" text-anchor="middle" font-size="45" fill="#a3a99d" paint-order="stroke" stroke="#fff7e3" stroke-width="11">${name}</text>`);}$('#map-labels').innerHTML=labels;
 for(const z of D.zones)$('#place-search').insertAdjacentHTML('beforeend',`<option value="${z.id}">${z.name}</option>`);
}
function transform(){const s=view.fit*view.zoom;$('#map-world').setAttribute('transform',`translate(${view.tx} ${view.ty}) scale(${s})`);$$('.zoom-label,.reference-label').forEach(n=>n.setAttribute('transform',`scale(${1/s})`));$$('.detail-road-name').forEach(n=>{n.style.display=view.zoom>=1.5?'':'none';n.setAttribute('font-size',12/s);});scalePins();const distance=[1000,500,200,100,50].find(n=>n*s<=100)||20;$('#scale-line').style.width=distance*s+'px';$('#scale-label').textContent=distance+' m';onViewChange(view);}
function scalePins(){const scale=view.fit*view.zoom||.14;$$('.density-dot').forEach(n=>n.setAttribute('r',Number(n.dataset.screenRadius)/scale));$$('[data-screen-scale]').forEach(n=>n.setAttribute('transform',`scale(${Number(n.dataset.screenScale)/scale})`));}
function fit(preserve=false){const b=$('#map-container').getBoundingClientRect();if(b.width<40||b.height<160)return;if(preserve&&b.width===view.width&&b.height===view.height)return;const scale=view.fit*view.zoom,cx=(view.width/2-view.tx)/scale,cy=(view.height/2-view.ty)/scale;view.width=b.width;view.height=b.height;$('#city-map').setAttribute('viewBox',`0 0 ${b.width} ${b.height}`);view.fit=Math.min((b.width-50)/6000,(b.height-50)/4000);if(!preserve)view.zoom=1;view.tx=b.width/2-(preserve?cx:3000)*view.fit*view.zoom;view.ty=b.height/2-(preserve?cy:2000)*view.fit*view.zoom;transform();}
function resize(){fit(true);}
function zoom(factor,x=view.width/2,y=view.height/2){const next=Math.max(.8,Math.min(5.5,view.zoom*factor)),ratio=next/view.zoom;view.tx=x-(x-view.tx)*ratio;view.ty=y-(y-view.ty)*ratio;view.zoom=next;transform();}


return {drawBase,fit,resize,zoom,transform,view,line,marker,scalePins,setOnViewChange};
};
})(window);
