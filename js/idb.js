window.IDB={
 db:null,
 CACHE_FRESHNESS_MS:30*60*1000,
 serialGap_(records,field="appointmentId"){
  const serials=(Array.isArray(records)?records:[]).map(x=>{const m=String(x?.[field]||"").match(/-(\d+)$/);return m?Number(m[1]):null}).filter(n=>Number.isInteger(n)&&n>=0);
  if(serials.length<2)return false;
  const unique=[...new Set(serials)].sort((a,b)=>a-b);
  for(let i=1;i<unique.length;i++)if(unique[i]!==unique[i-1]+1)return true;
  return false;
 },
 cacheStale_(cache,records,field="appointmentId"){
  if(!cache)return false;
  if(this.serialGap_(records,field))return true;
  const ts=Number(cache.lastServerCheckAt||cache.lastServerRefreshAt||cache.lastCheckedAt||0);
  return !!ts&&(Date.now()-ts>this.CACHE_FRESHNESS_MS);
 },
 markCacheStale_(cache,records,field="appointmentId"){
  if(!cache)return cache;
  if(this.cacheStale_(cache,records,field))return {...cache,status:"STALE"};
  return cache;
 },
 open(){if(this.db)return this.db;return this.db=new Promise((ok,no)=>{const r=indexedDB.open("NEURON_V2",6);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("followupCache"))d.createObjectStore("followupCache",{keyPath:"key"});if(!d.objectStoreNames.contains("tx")){const st=d.createObjectStore("tx",{keyPath:"id"});st.createIndex("status","status");st.createIndex("type","type")}if(!d.objectStoreNames.contains("cache"))d.createObjectStore("cache",{keyPath:"key"});if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta",{keyPath:"key"});if(!d.objectStoreNames.contains("statisticsRetrieval")){const st=d.createObjectStore("statisticsRetrieval",{keyPath:"retrievalKey"});st.createIndex("status","status");st.createIndex("updatedAt","updatedAt")}};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
 put(s,v){return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction(s,"readwrite");t.objectStore(s).put({...v,updatedAt:Date.now()});t.oncomplete=ok;t.onerror=()=>no(t.error)}))},
 get(s,k){return this.open().then(d=>new Promise((ok,no)=>{const r=d.transaction(s).objectStore(s).get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
 delete(s,k){return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction(s,"readwrite");t.objectStore(s).delete(k);t.oncomplete=ok;t.onerror=()=>no(t.error)}))},
 replace(s,k,v){return this.open().then(d=>new Promise((ok,no)=>{let settled=false;const done=fn=>x=>{if(settled)return;settled=true;fn(x)};const t=d.transaction(s,"readwrite"),st=t.objectStore(s);t.oncomplete=done(ok);t.onerror=done(()=>no(t.error||new Error("IndexedDB replacement failed.")));t.onabort=done(()=>no(t.error||new Error("IndexedDB replacement aborted.")));st.delete(k);st.put({...v,key:k,updatedAt:Date.now()});}))},
 all(s){return this.open().then(d=>new Promise((ok,no)=>{const r=d.transaction(s).objectStore(s).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
 pending(){return this.all("tx").then(a=>a.filter(x=>x.status==="pending"||x.status==="uncertain"))},
 deleteCacheByPrefixExcept(s,prefix,keepPrefix){return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction(s,"readwrite"),st=t.objectStore(s),r=st.openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;const k=String(c.key||"");if(k.startsWith(prefix)&&(!keepPrefix||!k.startsWith(keepPrefix)))c.delete();c.continue()};r.onerror=()=>no(r.error);t.oncomplete=ok;t.onerror=()=>no(t.error)}))},
 todayKey_(){
  const p=window.U?.parts?.()||(()=>{const d=new Date();return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()};})();
  return `${p.y}${String(p.m).padStart(2,"0")}${String(p.d).padStart(2,"0")}`;
 },
 normalizeWhatsApp_(v){
  const raw=String(v==null?"":v).replace(/\D/g,"");
  return raw.length>10?raw.slice(-10):raw;
 },
 findTodayPatientsByWhatsApp_({city,whatsapp,date}={}){
  const c=String(city||"").trim();
  const d=/^\d{8}$/.test(String(date||""))?String(date):this.todayKey_();
  const phone=this.normalizeWhatsApp_(whatsapp);
  const key=`OPD_TODAY|${d}|${c}`;
  if(!c||!phone)return Promise.resolve({cache:null,patients:[]});
  return this.get("cache",key).then(cache=>{
   const patients=Array.isArray(cache?.patients)?cache.patients.filter(p=>
    String(p?.city||c).trim()===c && this.normalizeWhatsApp_(p?.whatsapp)===phone
   ):[];
   return {cache:cache||null,patients,todayAppointmentFound:Array.isArray(cache?.patients)&&cache.patients.some(p=>String(p?.city||c).trim()===c)};
  });
 },
 getTodayPatientsByWhatsApp_({city,whatsapp}={}){
  const c=String(city||"").trim();
  const phone=this.normalizeWhatsApp_(whatsapp);
  const date=this.todayKey_();
  if(!c||!/^\d{10}$/.test(phone))return Promise.resolve({source:"invalid",patients:[],cache:null});
  return this.findTodayPatientsByWhatsApp_({city:c,whatsapp:phone,date}).then(async local=>{
   if(local.patients.length)return {source:"idb",patients:local.patients,cache:local.cache,todayAppointmentFound:local.todayAppointmentFound};
   const r=await window.NeuronAPI.call("getTodayOPDPatientList",{city:c},25000);
   if(!r||r.ok!==true)throw Error(r?.error||"Unable to retrieve today's OPD patient list.");
   const serverDate=/^\d{8}$/.test(String(r.date||""))?String(r.date):date;
   const serverCity=String(r.city||c).trim()||c;
   const patients=Array.isArray(r.patients)?r.patients:[];
   const now=Date.now();
   const key=`OPD_TODAY|${serverDate}|${serverCity}`;
   const record={key,type:"OPD_TODAY",date:serverDate,city:serverCity,patients:[...patients],
    status:r.complete===false?"CACHED_INCOMPLETE":"REFRESHED",complete:r.complete===true,
    lastServerRefreshAt:now,lastServerCheckAt:now,cachedAt:now};
   if(r.serialGapDetected===true||this.serialGap_(patients,"appointmentId"))record.status="STALE";
   await this.replace("cache",key,record);
   const matches=patients.filter(p=>String(p?.city||serverCity).trim()===c&&this.normalizeWhatsApp_(p?.whatsapp)===phone);
   return {source:"server",patients:matches,cache:record,todayAppointmentFound:patients.some(p=>String(p?.city||serverCity).trim()===c)};
  });
 },
 syncBookingCaches_(booking){return this.open().then(d=>new Promise((ok,no)=>{
  const kind=String(booking?.kind||"").trim();
  const appointmentId=String(booking?.appointmentId||"").trim();
  const city=String(booking?.city||"").trim();
  const date=String(booking?.date||booking?.appointmentDate||"").trim();
  const isTodayBooking=(kind==="OPD_BOOKING"||kind==="EEG_BOOKING") && city && /^\d{8}$/.test(date) && appointmentId;
  const isEEGCalls=kind==="EEG_CALLS_BOOKING";
  if(!isTodayBooking&&!isEEGCalls){ok({todayUpdated:false,eegCallsUpdated:false});return;}
  const t=d.transaction("cache","readwrite"),st=t.objectStore("cache");
  const opdKey=isTodayBooking?`OPD_TODAY|${date}|${city}`:"";
  const callsKey="eegCallsRawCacheV1";
  let opdCache=null,callsCache=null;
  let opdRead=!isTodayBooking,callsRead=!isEEGCalls;
  const result={todayUpdated:false,eegCallsUpdated:false};
  const normalizePayment=(v,fallback)=>{const n=Number(v);return Number.isFinite(n)?n:fallback;};
  const patientData=booking?.patient&&typeof booking.patient==="object"?booking.patient:{};
  const common={
    appointmentId,date,
    time:String(booking.time??patientData.time??"").trim(),
    name:booking.patientName??booking.name??patientData.name??"",
    age:booking.age??patientData.age,
    ageUnit:booking.ageUnit??patientData.ageUnit??"",
    address:booking.address??patientData.address??"",
    patientType:booking.patientType??patientData.patientType??"",
    whatsapp:booking.whatsapp??patientData.whatsapp??"",
    city:booking.city??patientData.city??city,
    referredBy:booking.referredBy??patientData.referredBy??"",
    nextFollowupCity:booking.nextFollowupCity??patientData.nextFollowupCity??""
  };
  const opdFields={
    opdCharges:booking.opdCharges??patientData.opdCharges,
    totalOPDCharges:booking.totalOPDCharges??patientData.totalOPDCharges??booking.opdCharges??patientData.opdCharges,
    opdCashPaid:booking.opdCashPaid??patientData.opdCashPaid,
    opdOnlinePaid:booking.opdOnlinePaid??patientData.opdOnlinePaid,
    opdTotalPaid:booking.opdTotalPaid??patientData.opdTotalPaid,
    opdRefund:patientData.opdRefund??0,eegRefund:patientData.eegRefund??0,
    opdRefundProvided:patientData.opdRefundProvided??false,eegRefundProvided:patientData.eegRefundProvided??false,
    bookingRequestId:booking.bookingRequestId??patientData.bookingRequestId??""
  };
  const eegPresent=booking.eegCharges!==undefined&&booking.eegCharges!==null&&String(booking.eegCharges).trim()!=="";
  const eegFields={
    eegCharges:eegPresent?Number(booking.eegCharges):patientData.eegCharges,
    eegCashPaid:eegPresent?normalizePayment(booking.eegCashPaid,0):patientData.eegCashPaid,
    eegOnlinePaid:eegPresent?normalizePayment(booking.eegOnlinePaid,0):patientData.eegOnlinePaid,
    eegTotalPaid:eegPresent?normalizePayment(booking.eegTotalPaid,0):patientData.eegTotalPaid,
    eegBookingRequestId:booking.eegBookingRequestId??patientData.eegBookingRequestId??"",
    eegUpdateRequestId:patientData.eegUpdateRequestId??""
  };
  const mergeDefined=(base,fields)=>Object.keys(fields).forEach(k=>{if(fields[k]!==undefined&&fields[k]!==null&&fields[k]!=="")base[k]=fields[k];});
  const makePatient=(existing)=>{
    const base={...(existing||{})};
    mergeDefined(base,common);
    if(kind==="OPD_BOOKING") mergeDefined(base,opdFields);
    if(kind==="EEG_BOOKING") mergeDefined(base,eegFields);
    if(kind==="OPD_BOOKING"&&!eegPresent&&!existing)Object.assign(base,{eegCharges:null,eegCashPaid:0,eegOnlinePaid:0,eegTotalPaid:0,eegBookingRequestId:"",eegUpdateRequestId:""});
    return base;
  };
  const sortPatients=patients=>patients.sort((a,b)=>{
    const sa=Number(String(a?.appointmentId||"").match(/-(\d+)$/)?.[1]),sb=Number(String(b?.appointmentId||"").match(/-(\d+)$/)?.[1]);
    if(Number.isFinite(sa)&&Number.isFinite(sb)&&sa!==sb)return sa-sb;
    return String(a?.time||"").localeCompare(String(b?.time||""));
  });
  const applyToday=cache=>{
    if(!cache||!Array.isArray(cache.patients))return;
    const patients=cache.patients.slice();
    const i=patients.findIndex(x=>String(x?.appointmentId||"").trim()===appointmentId);
    if(i>=0)patients[i]=makePatient(patients[i]);else patients.push(makePatient(null));
    sortPatients(patients);
    const next={...cache,patients,cacheUpdatedAt:Date.now()};
    if(this.cacheStale_(next,patients,"appointmentId"))next.status="STALE";
    st.put(next);
    result.todayUpdated=true;
  };
  const makeCallsRecord=()=>{
    const rowNumber=Number(booking.rowNumber);
    if(!Number.isInteger(rowNumber)||rowNumber<2)return null;
    const d=String(booking.date||"");
    return {
      rowNumber,
      appointmentId:String(booking.appointmentId||""),
      date:d,
      dateKey:/^\d{8}$/.test(d)?d:"",
      time:String(booking.time||""),
      patientName:String(booking.patientName||booking.name||""),
      age:booking.age,
      ageUnit:String(booking.ageUnit||""),
      ageText:(booking.age!=null&&booking.ageUnit)?`${booking.age} ${booking.ageUnit}`:"",
      address:String(booking.address||""),
      whatsapp:String(booking.whatsapp||""),
      referredBy:String(booking.referredBy||""),
      paymentReceived:normalizePayment(booking.paymentReceived,0),
      eegTechnician:String(booking.eegTechnician||"")
    };
  };
  const applyCalls=cache=>{
    if(!cache||!Array.isArray(cache.records))return;
    const record=makeCallsRecord();
    if(!record)return;
    const byRow=new Map(cache.records.map(x=>[Number(x?.rowNumber),x]));
    byRow.set(record.rowNumber,record);
    let records=Array.from(byRow.values()).sort((a,b)=>(Number(a.rowNumber)||0)-(Number(b.rowNumber)||0));
    if(records.length>120)records=records.slice(-120);
    const now=Date.now();
    const next={...cache,records,lastScannedRow:Math.max(Number(cache.lastScannedRow)||0,record.rowNumber),lastDataUpdatedAt:now};
    if(this.cacheStale_(next,records,"appointmentId"))next.status="STALE";
    st.put(next);
    result.eegCallsUpdated=true;
  };
  const maybeDone=()=>{
    if(!opdRead||!callsRead)return;
    if(isTodayBooking)applyToday(opdCache);
    if(isEEGCalls)applyCalls(callsCache);
  };
  if(isTodayBooking){
    const r1=st.get(opdKey);r1.onsuccess=()=>{opdCache=r1.result;opdRead=true;maybeDone()};r1.onerror=()=>no(r1.error);
  }
  if(isEEGCalls){
    const r3=st.get(callsKey);r3.onsuccess=()=>{callsCache=r3.result;callsRead=true;maybeDone()};r3.onerror=()=>no(r3.error);
  }
  t.oncomplete=()=>ok(result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error||new Error("IndexedDB booking cache synchronization aborted."));
 }))},

};
