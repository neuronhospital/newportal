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



/* Global Recovery Engine: recovery execution is owned by the Service Worker.
 * Pages only publish mutations, observe persistent state, and render the bar.
 */
const RECOVERY_STATE_KEY="RECOVERY_STATE_V1";
const RECOVERY_VERIFICATION_TIMEOUTS=[6500,9000,13000];
const RECOVERY_NOT_FOUND_DELAY_MS=2000;
const RECOVERY_CACHE_SYNC_RETRY_DELAY_MS=1000;
const RECOVERY_FAILED_STATE_EXPIRY_MS=5*60*1000;
const recoveryRuns=new Map();
let recoveryEnsurePromise=null;

const recoveryClone=x=>JSON.parse(JSON.stringify(x));
const recoveryRead=async()=>{
 try{const x=await self.IDB?.get?.("meta",RECOVERY_STATE_KEY);return Array.isArray(x?.state)?x.state:[];}catch(_){return[];}
};
const recoveryWrite=async state=>{
 const value={key:RECOVERY_STATE_KEY,type:"RECOVERY_STATE",state,updatedAt:Date.now()};
 await self.IDB.replace("meta",RECOVERY_STATE_KEY,value);
};
const recoveryBroadcast=async state=>{
 try{const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});list.forEach(c=>{try{c.postMessage({type:"NEURON_RECOVERY_STATE",state});}catch(_){}});}catch(_){ }
};
const recoverySave=async state=>{await recoveryWrite(state);await recoveryBroadcast(state);return state;};
const recoveryGet=(state,id)=>state.find(x=>x.id===id)||null;
const recoveryUpsert=async patch=>{
 const state=await recoveryRead(),i=state.findIndex(x=>x.id===patch.id),existing=i>=0?state[i]:null,next=i>=0?{...existing,...patch}:{...patch};
 if(i>=0)state[i]=next;else state.push(next);
 await recoverySave(state);return next;
};
const recoveryRemove=async id=>{const state=await recoveryRead();await recoverySave(state.filter(x=>x.id!==id));};
const recoveryResultBroadcast=async detail=>{try{const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});list.forEach(c=>{try{c.postMessage({type:"NEURON_RECOVERY_RESULT",detail});}catch(_){}});}catch(_){}};
const recoveryName=x=>String(x?.payload?.childName||x?.payload?.patientName||"Patient").trim()||"Patient";
const recoveryNormalizeName=v=>String(v==null?"":v).trim().replace(/\s+/g," ").toLowerCase();
const recoveryNormalizePhone=v=>String(v==null?"":v).replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");

async function recoveryVerify(x,timeout){
 try{
  const p=x.payload||{},t=x.type;
  if(t==="OPD_BOOKING")return await self.NeuronAPI.call("checkBookingRequest",{bookingRequestId:x.id,city:p.city,appointmentDate:p.appointmentDate||"",whatsapp:p.whatsapp||"",childName:p.childName||p.patientName||""},timeout);
  if(t==="EEG_BOOKING")return await self.NeuronAPI.call("checkEEGBookingRequest",{eegBookingRequestId:x.id,appointmentId:p.appointmentId,rowNumber:p.rowNumber,city:p.city},timeout);
  if(t==="EEG_CALLS_BOOKING")return await self.NeuronAPI.call("checkEEGCallsBookingRequest",{bookingRequestId:x.id},timeout);
  if(t==="OPD_UPDATE")return await self.NeuronAPI.call("checkOPDUpdateStatus",p,timeout);
  if(t==="EEG_UPDATE")return await self.NeuronAPI.call("checkEEGUpdateStatus",p,timeout);
  if(t==="REFUND")return await self.NeuronAPI.call("checkRefundStatus",p,timeout);
 }catch(_){return null;}
 return null;
}
function recoveryMatchesBooking(x,r){
 if(!r||r.ok!==true||r.found!==true)return false;
 const p=r.patient&&typeof r.patient==="object"?r.patient:{},payload=x.payload||{};
 const expectedName=recoveryNormalizeName(payload.childName||payload.patientName),returnedName=recoveryNormalizeName(r.patientName||p.name);
 if(expectedName&&(!returnedName||expectedName!==returnedName))return false;
 const expectedCity=String(payload.city||"").trim().toLowerCase(),returnedCity=String(r.city||p.city||"").trim().toLowerCase();
 if(expectedCity&&returnedCity&&expectedCity!==returnedCity)return false;
 if(x.type==="EEG_BOOKING"){
  const expectedAppointmentId=String(payload.appointmentId||"").trim(),returnedAppointmentId=String(r.appointmentId||p.appointmentId||"").trim();
  if(expectedAppointmentId&&(!returnedAppointmentId||expectedAppointmentId!==returnedAppointmentId))return false;
 }
 if(x.type==="EEG_CALLS_BOOKING"){
  const expectedPhone=recoveryNormalizePhone(payload.whatsapp),returnedPhone=recoveryNormalizePhone(r.whatsapp||p.whatsapp);
  if(expectedPhone&&(!returnedPhone||expectedPhone!==returnedPhone))return false;
 }
 const expectedDate=String(payload.appointmentDate||"").trim(),returnedDate=String(r.date||p.date||"").trim();
 if(expectedDate&&returnedDate&&expectedDate!==returnedDate)return false;
 return true;
}
function recoveryMatchesOperation(x,r){
 if(!r||r.ok!==true||r.found!==true)return false;
 if(x.type==="REFUND"){
  const p=x.payload||{};
  if(p.updateOPD===true&&String(r.opdRefund??"")==="")return false;
  if(p.updateEEG===true&&String(r.eegRefund??"")==="")return false;
 }
 return true;
}
async function recoverySyncWithRetry(fn){try{return await fn();}catch(_){await new Promise(r=>setTimeout(r,RECOVERY_CACHE_SYNC_RETRY_DELAY_MS));try{return await fn();}catch(_){return undefined;}}}
async function recoverySyncMutationToToday(x,result){
 const p=x.payload||{};
 if(x.type==="OPD_UPDATE"){
  const q=result.patient||result;
  await recoverySyncWithRetry(()=>self.IDB.patchTodayPatient_({appointmentId:p.appointmentId,city:p.city,date:p.appointmentDate,patch:{name:q.name??p.name,age:q.age??p.age,ageUnit:q.ageUnit??p.ageUnit,address:q.address??p.address,referredBy:q.referredBy??p.referredBy,whatsapp:q.whatsapp??p.whatsappNew??p.whatsapp,nextFollowupCity:q.nextFollowupCity??p.nextFollowupCity,opdCharges:q.opdCharges??p.opdCharges,totalOPDCharges:q.totalOPDCharges??q.opdCharges??p.opdCharges,opdCashPaid:q.opdCashPaid??p.opdCashPaid,opdOnlinePaid:q.opdOnlinePaid??p.opdOnlinePaid}}));return;
 }
 if(x.type==="EEG_UPDATE"){
  const q=result.patient||result;
  await recoverySyncWithRetry(()=>self.IDB.patchTodayPatient_({appointmentId:p.appointmentId,city:p.city,date:p.appointmentDate,patch:{eegCharges:q.eegCharges??p.eegCharges,eegCashPaid:q.eegCashPaid??p.eegCashPaid,eegOnlinePaid:q.eegOnlinePaid??p.eegOnlinePaid,eegTotalPaid:q.eegTotalPaid??q.eegCharges??p.eegCharges}}));return;
 }
 if(x.type==="REFUND"){
  const patch={};
  if(p.updateOPD===true&&String(result.opdRefund??"")!==""){patch.opdRefund=result.opdRefund;patch.opdRefundProvided=true;}
  if(p.updateEEG===true&&String(result.eegRefund??"")!==""){patch.eegRefund=result.eegRefund;patch.eegRefundProvided=true;}
  await recoverySyncWithRetry(()=>self.IDB.patchTodayPatient_({appointmentId:p.appointmentId,city:p.city,date:p.appointmentDate,patch}));
 }
}
async function recoveryComplete(x,result){
 if(x.type==="OPD_UPDATE"||x.type==="EEG_UPDATE"||x.type==="REFUND"){
  await recoverySyncMutationToToday(x,result);
  try{await self.IDB.put("tx",{...x,status:"complete",result,recoveredAt:Date.now()});}catch(_){ }
  const state=await recoveryUpsert({id:x.id,type:x.type,status:"recovered",payload:x.payload||{},result,phase:"recovered",updatedAt:Date.now()});
  await recoveryResultBroadcast({status:"recovered",type:x.type,patientName:recoveryName(x),result,payload:x.payload,globalHandled:x.type!=="OPD_BOOKING"});
  return state;
 }
 const booking={
  kind:x.type,appointmentId:result.appointmentId||x.payload?.appointmentId||"",date:result.date||x.payload?.appointmentDate||"",time:result.time||x.payload?.time||"",
  patientName:result.patientName||result.patient?.name||x.payload?.childName||x.payload?.patientName||"",age:result.age??result.patient?.age??x.payload?.age,ageUnit:result.ageUnit||result.patient?.ageUnit||x.payload?.ageUnit||"",
  address:(result.address??result.patient?.address??x.payload?.address)||"",patientType:(result.patientType??result.patient?.patientType??x.payload?.patientType)||"",whatsapp:(result.whatsapp??result.patient?.whatsapp??x.payload?.whatsapp)||"",
  city:result.city||result.patient?.city||x.payload?.city||"",referredBy:(result.referredBy??result.patient?.referredBy??x.payload?.referredBy)||"",nextFollowupCity:(result.nextFollowupCity??result.patient?.nextFollowupCity??x.payload?.nextFollowupCity)||"",
  bookingRequestId:x.type==="OPD_BOOKING"?x.id:(result.bookingRequestId||result.patient?.bookingRequestId||x.payload?.bookingRequestId||""),opdCharges:result.opdCharges??result.patient?.opdCharges,opdCashPaid:result.opdCashPaid??result.patient?.opdCashPaid,opdOnlinePaid:result.opdOnlinePaid??result.patient?.opdOnlinePaid,opdTotalPaid:result.opdTotalPaid??result.patient?.opdTotalPaid,
  eegCharges:result.eegCharges??result.patient?.eegCharges,eegCashPaid:result.eegCashPaid??result.patient?.eegCashPaid,eegOnlinePaid:result.eegOnlinePaid??result.patient?.eegOnlinePaid,eegTotalPaid:result.eegTotalPaid??result.patient?.eegTotalPaid,eegBookingRequestId:x.type==="EEG_BOOKING"?x.id:(result.eegBookingRequestId||result.patient?.eegBookingRequestId||x.payload?.eegBookingRequestId||""),
  rowNumber:result.rowNumber??result.patient?.rowNumber??x.payload?.rowNumber,paymentReceived:result.paymentReceived??result.patient?.paymentReceived??x.payload?.paymentReceived,eegTechnician:result.eegTechnician??result.patient?.eegTechnician
 };
 try{await self.IDB.put("tx",{...x,status:"complete",result,recoveredAt:Date.now()});}catch(_){ }
 try{void self.IDB.syncBookingCaches_(booking);}catch(_){ }
 if(String(booking.kind||"")==="OPD_BOOKING"&&booking.city){
  void (async()=>{try{const refreshed=await self.IDB.getTodayOPDCache_(booking.city,{forceRefresh:true});const present=booking.appointmentId&&Array.isArray(refreshed?.patients)&&refreshed.patients.some(p=>String(p?.appointmentId||"").trim()===String(booking.appointmentId).trim());if(!present)await self.IDB.syncBookingCaches_(booking);}catch(_){ }})();
 }
 const state=await recoveryUpsert({id:x.id,type:x.type,status:"recovered",payload:x.payload||{},result,phase:"recovered",updatedAt:Date.now()});
 await recoveryResultBroadcast({status:"recovered",type:x.type,patientName:recoveryName(x),result,payload:x.payload,globalHandled:x.type!=="OPD_BOOKING"});
 return state;
}
async function recoveryFail(x){
 const failedAt=Date.now();
 try{await self.IDB.put("tx",{...x,status:"failed",failedAt,failureReason:"Request not found after recovery verification"});}catch(_){ }
 const state=await recoveryUpsert({id:x.id,type:x.type,status:"failed",payload:x.payload||{},result:null,phase:"failed",failedAt,updatedAt:failedAt});
 await recoveryResultBroadcast({status:"failed",type:x.type,patientName:recoveryName(x),result:null,payload:x.payload,globalHandled:x.type!=="OPD_BOOKING"});
 setTimeout(async()=>{try{const current=await recoveryRead(),item=recoveryGet(current,x.id);if(item?.status==="failed"&&Number(item.failedAt)===failedAt)await recoveryRemove(x.id);}catch(_){ }},RECOVERY_FAILED_STATE_EXPIRY_MS+50);
 return state;
}
async function recoveryWaitOnline(){while(self.navigator?.onLine===false)await new Promise(r=>setTimeout(r,1000));}
async function recoveryRun(x){
 if(!x?.id)return;
 if(recoveryRuns.has(x.id))return recoveryRuns.get(x.id);
 const run=(async()=>{
  try{
   let state=await recoveryRead(),current=recoveryGet(state,x.id);
   let attempt=Math.max(1,Math.min(3,Number(current?.attempt)||1));
   while(attempt<=3){
    current=recoveryGet(await recoveryRead(),x.id);if(!current||current.status!=="recovering")return;
    if(self.navigator?.onLine===false){await recoveryUpsert({id:x.id,status:"recovering",attempt,phase:"waiting_network",updatedAt:Date.now()});await recoveryWaitOnline();continue;}
    const phase=current.phase==="retry_wait"||current.phase==="confirming"?current.phase:(attempt===3?"final":"verifying");
    await recoveryUpsert({id:x.id,status:"recovering",attempt,phase,updatedAt:Date.now()});
    if(phase==="retry_wait"||phase==="confirming")await new Promise(r=>setTimeout(r,RECOVERY_NOT_FOUND_DELAY_MS));
    current=recoveryGet(await recoveryRead(),x.id);if(!current||current.status!=="recovering")return;
    if(current.phase==="retry_wait"||current.phase==="confirming"){attempt=Math.min(3,attempt+1);continue;}
    const result=await recoveryVerify(x,RECOVERY_VERIFICATION_TIMEOUTS[attempt-1]);
    if(result?.ok===true&&result?.found===true){
      const matches=(x.type==="OPD_BOOKING"||x.type==="EEG_BOOKING"||x.type==="EEG_CALLS_BOOKING")?recoveryMatchesBooking(x,result):recoveryMatchesOperation(x,result);
      if(matches){await recoveryComplete(x,result);return;}
    }else if(result?.ok===true&&result?.found===false){ }
    if(self.navigator?.onLine===false){await recoveryUpsert({id:x.id,status:"recovering",attempt,phase:"waiting_network",updatedAt:Date.now()});await recoveryWaitOnline();continue;}
    if(attempt===3){await recoveryFail(x);return;}
    await recoveryUpsert({id:x.id,status:"recovering",attempt,phase:result?.ok===true&&result?.found===false?"confirming":"retry_wait",updatedAt:Date.now()});
    await new Promise(r=>setTimeout(r,RECOVERY_NOT_FOUND_DELAY_MS));
    current=recoveryGet(await recoveryRead(),x.id);if(!current||current.status!=="recovering")return;
    attempt+=1;
   }
  }catch(e){
   const current=recoveryGet(await recoveryRead(),x.id);
   if(current?.status==="recovering")await recoveryUpsert({id:x.id,status:"recovering",phase:"retry_wait",nextAt:Date.now()+RECOVERY_NOT_FOUND_DELAY_MS,updatedAt:Date.now(),engineError:String(e?.message||e||"")});
  }finally{recoveryRuns.delete(x.id);}
 })();
 recoveryRuns.set(x.id,run);return run;
}
async function recoveryHandlePendingExpiry(x){
 if(!x?.id)return;
 const current=await self.IDB.get("tx",x.id).catch(()=>null);if(!current)return;
 if(current.status==="complete"||current.status==="failed")return;
 if(current.status==="uncertain"){await recoveryStartUncertain(current);return;}
 if(current.status!=="pending")return;
 const startedAt=Number(current.startedAt)||Number(current.updatedAt)||0,timeoutMs=Number(current.timeoutMs)||15000,expiresAt=startedAt+timeoutMs;
 if(!startedAt||Date.now()<expiresAt){setTimeout(()=>recoveryHandlePendingExpiry(current),Math.max(250,expiresAt-Date.now()+10));return;}
 const promoted=await self.IDB.promotePendingToUncertain(current.id,Date.now()).catch(()=>null);
 if(promoted?.status==="uncertain")await recoveryStartUncertain(promoted);
}
async function recoveryStartUncertain(x){
 const state=await recoveryRead(),existing=recoveryGet(state,x.id);
 if(existing?.status==="recovered"||existing?.status==="failed")return;
 const attempt=Math.max(1,Math.min(3,Number(existing?.attempt)||1));
 await recoveryUpsert({id:x.id,type:x.type,status:"recovering",payload:x.payload||{},result:existing?.result||null,attempt,phase:self.navigator?.onLine===false?"waiting_network":existing?.phase||"verifying",updatedAt:Date.now()});
 await recoveryRun({...x,status:"uncertain"});
}
async function ensureRecovery(){
 const pending=await self.IDB.pending().catch(()=>[]),now=Date.now();
 for(const x of pending){
  if(!x?.id)continue;
  if(x.status==="uncertain"){await recoveryStartUncertain(x);continue;}
  if(x.status!=="pending")continue;
  const startedAt=Number(x.startedAt)||Number(x.updatedAt)||0,timeoutMs=Number(x.timeoutMs)||15000;
  if(startedAt&&now>=startedAt+timeoutMs){const promoted=await self.IDB.promotePendingToUncertain(x.id,now).catch(()=>null);if(promoted?.status==="uncertain")await recoveryStartUncertain(promoted);}
  else{await recoveryUpsert({id:x.id,type:x.type,status:"pending",payload:x.payload||{},startedAt,timeoutMs,updatedAt:now});if(startedAt&&timeoutMs>0)setTimeout(()=>recoveryHandlePendingExpiry(x),Math.max(250,startedAt+timeoutMs-Date.now()+10));}
 }
 const state=await recoveryRead();
 for(const x of state.filter(x=>x.status==="recovering")){
  const tx=await self.IDB.get("tx",x.id).catch(()=>null);
  if(tx?.status==="uncertain")await recoveryRun(tx);
 }
 return recoveryRead();
}
const requestRecovery=()=>{if(!recoveryEnsurePromise)recoveryEnsurePromise=ensureRecovery().finally(()=>{recoveryEnsurePromise=null;});return recoveryEnsurePromise;};

self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A.map(R))).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(a=>Promise.all(a.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("message",e=>{
 if(e.data?.type==="NEURON_RECOVERY_CONNECT"||e.data?.type==="NEURON_RECOVERY_RECONCILE"||e.data?.type==="NEURON_RECOVERY_DISMISS"){
  e.waitUntil((async()=>{
   if(e.data.type==="NEURON_RECOVERY_DISMISS"&&e.data.id)await recoveryRemove(String(e.data.id));
   const state=await requestRecovery();
   try{e.source?.postMessage({type:"NEURON_RECOVERY_STATE",state});}catch(_){}
  })());
  return;
 }
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
