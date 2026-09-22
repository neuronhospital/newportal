const APP_VERSION=new URL(self.location.href).searchParams.get("v")||"unknown";
const C="neuron-static-"+APP_VERSION;
const A=["./","./index.html","./assets/doctor_photo.svg","./opd_booking.html","./eeg_booking.html","./opd_update.html","./eeg_update.html","./statistics.html","./eeg_calls_booking.html","./eeg_calls_update_stats.html","./css/base.css","./js/config.js","./js/api.js","./js/utils.js","./js/idb.js","./js/common.js","./js/schedule.js","./js/opd_update.js","./js/opd_booking.js","./js/opd_patient_list.js","./js/eeg_patient_list.js","./assets/icons/home.svg","./assets/icons/opd-booking.svg","./assets/icons/opd-update.svg","./assets/icons/eeg-booking.svg","./assets/icons/eeg_calls.svg","./assets/icons/eeg-update.svg","./assets/icons/statistics.svg","./assets/neuron_logo.svg","./assets/icons/calendar.svg","./js/eeg_booking.js","./js/eeg_update.js","./js/secure.js","./js/stats.js","./js/recovery.js","./js/eeg_calls_booking.js","./js/eeg_calls_update_stats.js","./manifest.webmanifest"];
const V=u=>{const x=new URL(u,self.location.origin);if(!x.searchParams.has("v"))x.searchParams.set("v",APP_VERSION);return x.href};
const R=u=>new Request(V(u),u instanceof Request?u:{method:"GET",credentials:"same-origin"});

/* Background Sync runs in the Service Worker, not in the individual HTML page. */
self.window=self;
try{const q="?v="+encodeURIComponent(APP_VERSION);importScripts("./js/config.js"+q,"./js/utils.js"+q,"./js/schedule.js"+q,"./js/api.js"+q,"./js/idb.js"+q);}catch(_){ }

const BG_STATE_KEY="BACKGROUND_SYNC_STATE_V1";
const OPD_INTERVAL_MS=15*60*1000;
const DISPLAY_MS=5000;
let ensurePromise=null;

const defaultState=()=>({
 OPD:{status:"idle",operationId:null,city:null,date:null,startedAt:0,finishedAt:0,lastStartAt:0,terminalUntil:0,error:""},
 Followup:{status:"idle",operationId:null,city:null,date:null,startedAt:0,finishedAt:0,lastStartAt:0,terminalUntil:0,error:""}
});
const cloneState=x=>JSON.parse(JSON.stringify(x));
const readState=async()=>{
 try{
  const s=await self.IDB?.get?.("meta",BG_STATE_KEY);
  if(s?.state)return s.state;
 }catch(_){ }
 return defaultState();
};
const writeState=async state=>{
 const value={key:BG_STATE_KEY,type:"BACKGROUND_SYNC_STATE",state,updatedAt:Date.now()};
 await self.IDB.replace("meta",BG_STATE_KEY,value);
};
const broadcast=async state=>{
 try{
  const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  list.forEach(c=>{try{c.postMessage({type:"NEURON_BACKGROUND_SYNC_STATE",state});}catch(_){ }});
 }catch(_){ }
};
const saveState=async state=>{await writeState(state);await broadcast(state);};
const nowToday=()=>{const p=self.U?.parts?.()||(()=>{const d=new Date();return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()};})();return `${p.y}${String(p.m).padStart(2,"0")}${String(p.d).padStart(2,"0")}`;};
const scheduledCity=()=>{
 try{
  const cities=Array.isArray(self.NEURON_CONFIG?.cities)?self.NEURON_CONFIG.cities:[];
  const p=self.U?.parts?.()||(()=>{const d=new Date();return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()};})();
  const key=String(p.d).padStart(2,"0")+String(p.m).padStart(2,"0")+p.y;
  const allowed=cities.filter(c=>(self.Schedule?.dates?.(c,p.y,p.m)||[]).includes(key));
  const current=self.Schedule?.cityAtNow?.(cities)||"";
  return String(allowed.includes(current)?current:(allowed[0]||"")).trim();
 }catch(_){return "";}
};
const opId=key=>`${key}-${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}`;
const startState=async(key,city,date)=>{
 const state=await readState(),now=Date.now(),next=cloneState(state);
 next[key]={status:"running",operationId:opId(key),city,date,startedAt:now,finishedAt:0,lastStartAt:now,terminalUntil:0,error:""};
 await saveState(next);return next[key].operationId;
};
const finishState=async(key,operationId,ok,error="")=>{
 const state=await readState(),current=state[key];
 if(!current||current.operationId!==operationId)return;
 const now=Date.now(),next=cloneState(state);
 next[key]={...current,status:ok?"success":"failed",finishedAt:now,terminalUntil:now+DISPLAY_MS,error:String(error||"")};
 await saveState(next);
 setTimeout(async()=>{
  try{
   const latest=await readState();
   if(latest[key]?.operationId===operationId&&Number(latest[key]?.terminalUntil)<=Date.now()){
    const cleared=cloneState(latest);cleared[key]={...cleared[key],status:"idle",operationId:null,finishedAt:0,terminalUntil:0,error:""};await saveState(cleared);
   }
  }catch(_){ }
 },DISPLAY_MS+50);
};
const recoverExpiredState=async state=>{
 let changed=false,next=cloneState(state),now=Date.now();
 for(const key of ["OPD","Followup"]){
  const x=next[key];
  if(x?.status==="running"&&Number(x.startedAt)>0&&now-Number(x.startedAt)>10*60*1000){
   next[key]={...x,status:"failed",finishedAt:now,terminalUntil:now+DISPLAY_MS,error:"Background synchronization was interrupted and will be retried when eligible."};changed=true;
  }else if((x?.status==="success"||x?.status==="failed")&&Number(x.terminalUntil)>0&&Number(x.terminalUntil)<=now){
   next[key]={...x,status:"idle",operationId:null,finishedAt:0,terminalUntil:0,error:""};changed=true;
  }
 }
 if(changed)await saveState(next);
 return next;
};

const runOpd=async(city,date)=>{
 let lastError="";
 for(let attempt=0;attempt<3;attempt++){
  const result=await self.IDB.syncTodayOPDCacheBackground_(city,date);
  if(result?.mode!=="FAILED")return {ok:true,result};
  lastError=result?.error||"OPD background synchronization failed.";
  if(attempt<2)await new Promise(r=>setTimeout(r,attempt===0?3000:5000));
 }
 return {ok:false,error:lastError};
};
const runFollowup=async city=>{
 try{
  const result=await self.IDB.startDailyFollowupBackgroundSync_(city);
  return result?.mode==="FAILED"?{ok:false,error:result?.error||"Follow-up background synchronization failed."}:{ok:true,result};
 }catch(e){return {ok:false,error:e?.message||String(e)};}
};

const ensureBackgroundSync=async()=>{
 const state0=await recoverExpiredState(await readState());
 const city=scheduledCity(),today=nowToday();
 if(!city)return state0;
 const state=await readState();
 const tasks=[];
 const opd=state.OPD;
 if(opd?.status!=="running"){
  const last=Number(opd?.lastStartAt)||0;
  if(!last||Date.now()-last>=OPD_INTERVAL_MS){
   const id=await startState("OPD",city,today);
   tasks.push((async()=>{const r=await runOpd(city,today);await finishState("OPD",id,r.ok,r.error||"");})());
  }
 }
 const follow=state.Followup;
 if(follow?.status!=="running"){
  let checked=false;
  try{const meta=await self.IDB.getFollowupMeta(city);checked=self.IDB.followupCheckedToday_(meta); }catch(_){checked=false;}
  if(!checked){
   const id=await startState("Followup",city,today);
   tasks.push((async()=>{const r=await runFollowup(city);await finishState("Followup",id,r.ok,r.error||"");})());
  }
 }
 if(tasks.length)await Promise.allSettled(tasks);
 return readState();
};
const requestEnsure=()=>{
 if(!ensurePromise)ensurePromise=ensureBackgroundSync().finally(()=>{ensurePromise=null;});
 return ensurePromise;
};

self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A.map(R))).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("message",e=>{
 if(e.data?.type!=="NEURON_BACKGROUND_SYNC_CONNECT"&&e.data?.type!=="NEURON_BACKGROUND_SYNC_PING")return;
 e.waitUntil((async()=>{
  const state=await recoverExpiredState(await readState());
  try{e.source?.postMessage({type:"NEURON_BACKGROUND_SYNC_STATE",state});}catch(_){ }
  await requestEnsure();
 })());
});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);if(u.origin!==location.origin)return;
 const r=R(e.request.url);
 if(new URL(e.request.url).pathname.endsWith("/js/config.js")){
   e.respondWith(fetch(r,{cache:"no-store"}).then(x=>{const q=x.clone();caches.open(C).then(c=>c.put(r,q));return x}).catch(()=>caches.match(r)));return;
 }
 if(e.request.mode==="navigate"){
   e.respondWith(fetch(r).then(x=>{const q=x.clone();caches.open(C).then(c=>c.put(r,q));return x})
   .catch(()=>caches.match(R("./index.html")).then(x=>x||caches.match(R("./")))));return;
 }
 e.respondWith(caches.match(r).then(cached=>{
   const fresh=fetch(r).then(x=>{const q=x.clone();caches.open(C).then(c=>c.put(r,q));return x}).catch(()=>cached);
   return cached||fresh;
 }));
});
