import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Network,requestsFor} from './model/engine';
import {createGIS} from './model/gis';
import {createStudentLayers} from './model/student-layers';
import {createStudentPresentation} from './model/student-presentation';
import {spreadPlan} from './model/placement';
import App from './App';
import './styles.css';
import './operations.css';
import './theme.css';
import './journey.css';
import './observations.css';
function Boot(){const [runtime,setRuntime]=useState(null),[error,setError]=useState('');useEffect(()=>{const c=new AbortController();fetch(`${import.meta.env.BASE_URL}data/saebom-city.json`,{signal:c.signal}).then(r=>{if(!r.ok)throw Error('도시 자료를 불러오지 못했어요.');return r.json();}).then(D=>{const net=new Network(D.graph),GIS=createGIS(D,net),L=createStudentLayers(D,GIS,net);setRuntime({D,net,GIS,P:createStudentPresentation(D,GIS,net,L),requests:requestsFor(D),example:spreadPlan(D,net)});}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[]);return runtime?<App {...runtime}/>:<div className="boot"><img src={`${import.meta.env.BASE_URL}brand/saebom-logo.svg`} alt="새봄시"/><span className="spinner"/><p>{error||'도로와 열 대의 순찰차를 준비하고 있어요.'}</p>{error&&<button onClick={()=>location.reload()}>다시 불러오기</button>}</div>;}
createRoot(document.getElementById('root')).render(<Boot/>);
