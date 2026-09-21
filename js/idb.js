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
 open(){if(this.db)return this.db;return this.db=new Promise((ok,no)=>{const r=indexedDB.open("NEURON_V2",7);r.onupgradeneeded=e=>{const d=r.result;let fst;if(!d.objectStoreNames.contains("followupCache")){fst=d.createObjectStore("followupCache",{keyPath:"key"});}else{fst=e.transaction.objectStore("followupCache");}if(fst&&!fst.indexNames.contains("cityWhatsapp"))fst.createIndex("cityWhatsapp",["city","normalizedWhatsapp"],{unique:false});if(fst&&!fst.indexNames.contains("citySourceRow"))fst.createIndex("citySourceRow",["city","sourceRow"],{unique:false});if(fst&&!fst.indexNames.contains("cityDate"))fst.createIndex("cityDate",["city","date"],{unique:false});if(!d.objectStoreNames.contains("tx")){const st=d.createObjectStore("tx",{keyPath:"id"});st.createIndex("status","status");st.createIndex("type","type")}if(!d.objectStoreNames.contains("cache"))d.createObjectStore("cache",{keyPath:"key"});if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta",{keyPath:"key"});if(!d.objectStoreNames.contains("statisticsRetrieval")){const st=d.createObjectStore("statisticsRetrieval",{keyPath:"retrievalKey"});st.createIndex("status","status");st.createIndex("updatedAt","updatedAt")}};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
 put(s,v){return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction(s,"readwrite");t.objectStore(s).put({...v,updatedAt:Date.now()});t.oncomplete=ok;t.onerror=()=>no(t.error)}))},
 get(s,k){return this.open().then(d=>new Promise((ok,no)=>{const r=d.transaction(s).objectStore(s).get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
 delete(s,k){return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction(s,"readwrite");t.objectStore(s).delete(k);t.oncomplete=ok;t.onerror=()=>no(t.error)}))},
 replace(s,k,v){return this.open().then(d=>new Promise((ok,no)=>{let settled=false;const done=fn=>x=>{if(settled)return;settled=true;fn(x)};const t=d.transaction(s,"readwrite"),st=t.objectStore(s);t.oncomplete=done(ok);t.onerror=done(()=>no(t.error||new Error("IndexedDB replacement failed.")));t.onabort=done(()=>no(t.error||new Error("IndexedDB replacement aborted.")));st.delete(k);st.put({...v,key:k,updatedAt:Date.now()});}))},
 all(s){return this.open().then(d=>new Promise((ok,no)=>{const r=d.transaction(s).objectStore(s).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}))},
 pending(){return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction("tx"),idx=t.objectStore("tx").index("status");let pending=[],uncertain=[],done=0,settled=false;const finish=()=>{if(++done!==2||settled)return;settled=true;ok([...pending,...uncertain])};const fail=e=>{if(settled)return;settled=true;no(e)};const rp=idx.getAll("pending"),ru=idx.getAll("uncertain");rp.onsuccess=()=>{pending=rp.result||[];finish()};ru.onsuccess=()=>{uncertain=ru.result||[];finish()};rp.onerror=()=>fail(rp.error);ru.onerror=()=>fail(ru.error);t.onerror=()=>fail(t.error);t.onabort=()=>fail(t.error||new Error("Pending transaction lookup aborted."));}))},
  promotePendingToUncertain(id,now=Date.now()){return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction("tx","readwrite"),st=t.objectStore("tx");let result=null,settled=false;const r=st.get(id);r.onsuccess=()=>{const x=r.result;if(!x){result=null;return}if(x.status!=="pending"){result=x;return}result={...x,status:"uncertain",uncertainAt:now};st.put({...result,updatedAt:Date.now()})};r.onerror=()=>{if(!settled){settled=true;no(r.error)}};t.oncomplete=()=>{if(!settled){settled=true;ok(result)}};t.onerror=()=>{if(!settled){settled=true;no(t.error||new Error("Pending transaction promotion failed."))}};t.onabort=()=>{if(!settled){settled=true;no(t.error||new Error("Pending transaction promotion aborted."))}};}))},
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
 _legacyEEGCacheCleaned:false,
 _todayOPDCacheCleanupDate:"",
 _todayOPDRefreshes:{},
 _followupBackgroundChecks:{},
 async cleanupLegacyEEGCache_(){
  if(this._legacyEEGCacheCleaned)return;
  this._legacyEEGCacheCleaned=true;
  try{await this.deleteCacheByPrefixExcept("cache","EEG_TODAY|","__none__");}catch(_){ }
 },
 async cleanupOldTodayOPDCaches_(today){
  if(this._todayOPDCacheCleanupDate===today)return;
  try{await this.deleteCacheByPrefixExcept("cache","OPD_TODAY|",`OPD_TODAY|${today}|`);this._todayOPDCacheCleanupDate=today;}catch(_){ }
 },
 async getTodayOPDCache_(city,{forceRefresh=false}={}){
  const c=String(city||"").trim();
  const date=this.todayKey_();
  if(!c)throw Error("Today's OPD city is not selected.");
  await this.cleanupLegacyEEGCache_();
  await this.cleanupOldTodayOPDCaches_(date);
  const key=`OPD_TODAY|${date}|${c}`;
  let record=await this.get("cache",key).catch(()=>null);
  const ts=Number(record?.lastServerCheckAt||record?.lastServerRefreshAt||record?.lastCheckedAt||0);
  const stale=record ? (!ts || this.cacheStale_(record,record.patients,"appointmentId") || record.status==="CACHED_INCOMPLETE" || record.status==="STALE") : false;
  if(record && !forceRefresh && !stale)return record;
  if(this._todayOPDRefreshes[key])return this._todayOPDRefreshes[key];
  const request=(async()=>{
   try{
    const r=await window.NeuronAPI.call("getTodayOPDPatientList",{city:c},25000);
    if(!r||r.ok!==true)throw Error(r?.error||"Unable to retrieve today's OPD patient list.");
    const serverDate=/^\d{8}$/.test(String(r.date||""))?String(r.date):date;
    const serverCity=String(r.city||c).trim()||c;
    const patients=Array.isArray(r.patients)?r.patients:[];
    const now=Date.now();
    const serverKey=`OPD_TODAY|${serverDate}|${serverCity}`;
    const fresh={key:serverKey,type:"OPD_TODAY",date:serverDate,city:serverCity,patients,
      status:r.complete===false?"CACHED_INCOMPLETE":"REFRESHED",complete:r.complete===true,
      lastServerRefreshAt:now,lastServerCheckAt:now,cachedAt:now,
      lastSerial:Number(r.syncState?.serial)||null,lastRowNumber:Number(r.syncState?.rowNumber)||null};
    if(r.serialGapDetected===true||this.serialGap_(patients,"appointmentId"))fresh.status="STALE";
    await this.replace("cache",serverKey,fresh);
    return fresh;
   }catch(e){
    if(record)return record;
    throw e;
   }finally{
    delete this._todayOPDRefreshes[key];
   }
  })();
  this._todayOPDRefreshes[key]=request;
  return request;
 },
 async getTodayPatientsByWhatsApp_({city,whatsapp}={}){
  const c=String(city||"").trim();
  const phone=this.normalizeWhatsApp_(whatsapp);
  const date=this.todayKey_();
  if(!c||!/^[0-9]{10}$/.test(phone))return {source:"invalid",patients:[],cache:null};

  // IDB-first retrieval: read the complete OPD_TODAY cache record, then
  // apply the required context/WhatsApp filters locally. Do not contact the
  // server merely because a matching IDB patient is being searched.
  let cache=await this.get("cache",`OPD_TODAY|${date}|${c}`).catch(()=>null);
  let source="idb";
  if(!cache){
    cache=await this.getTodayOPDCache_(c,{forceRefresh:true});
    source="server";
  }

  const findPatients=record=>Array.isArray(record?.patients)?record.patients.filter(p=>{
    const sameContext=String(p?.city||c).trim()===c && String(p?.date||date).trim()===date;
    return sameContext && this.normalizeWhatsApp_(p?.whatsapp)===phone;
  }):[];
  let patients=findPatients(cache);

  // If the requested city + WhatsApp combination is absent from today's
  // local cache, perform the existing authoritative spreadsheet scan once,
  // repopulate OPD_TODAY, and retry the same local lookup. This handles
  // bookings created by another user/device after this browser's cache was
  // populated, without adding a server call to the normal IDB-hit path.
  if(cache&&patients.length===0){
    const refreshed=await this.getTodayOPDCache_(c,{forceRefresh:true});
    if(refreshed)cache=refreshed;
    source="server";
    patients=findPatients(cache);
  }

  const todayAppointmentFound=Array.isArray(cache?.patients)&&cache.patients.some(p=>String(p?.city||c).trim()===c&&String(p?.date||date).trim()===date);
  return {source,patients,cache,todayAppointmentFound};
 },
 followupVisitKey_(city,rowNumber){return `VISIT|${String(city||"").trim()}|${Number(rowNumber)}`;},
  followupMetaKey_(city){return `META|${String(city||"").trim()}`;},
  getFollowupMeta(city){return this.get("followupCache",this.followupMetaKey_(city));},
  getFollowupPatients_(city,whatsapp){
    const c=String(city||"").trim(),phone=this.normalizeWhatsApp_(whatsapp);if(!c||!/^[6-9]\d{9}$/.test(phone))return Promise.resolve([]);
    return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction("followupCache"),r=t.objectStore("followupCache").index("cityWhatsapp").getAll(IDBKeyRange.only([c,phone]));r.onsuccess=()=>ok((r.result||[]).filter(x=>x.type==="FOLLOWUP_VISIT"));r.onerror=()=>no(r.error);}));
  },
  followupBuildLockKey_(city){return `LOCK|${String(city||"").trim()}`;},
  async acquireFollowupBuildLock_(city,ttlMs=120000){
    const c=String(city||"").trim();if(!c)throw new Error("Follow-up city is required.");
    const d=await this.open(),key=this.followupBuildLockKey_(c),owner=`${Date.now()}-${Math.random().toString(36).slice(2)}`,now=Date.now();
    const acquired=await new Promise((ok,no)=>{let acquired=false;const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache"),r=st.get(key);r.onsuccess=()=>{const old=r.result;if(old&&Number(old.expiresAt)>now){acquired=false;return;}st.put({key,type:"FOLLOWUP_BUILD_LOCK",city:c,owner,expiresAt:now+ttlMs,updatedAt:now});acquired=true;};r.onerror=()=>no(r.error);t.oncomplete=()=>ok(acquired);t.onerror=()=>no(t.error||new Error("Follow-up build lock failed."));});
    return acquired?owner:null;
  },
  async renewFollowupBuildLock_(city,owner,ttlMs=120000){
    const c=String(city||"").trim();if(!c||!owner)return false;
    const d=await this.open(),key=this.followupBuildLockKey_(c),now=Date.now();
    return new Promise((ok,no)=>{let renewed=false;const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache"),r=st.get(key);r.onsuccess=()=>{if(r.result?.owner!==owner){renewed=false;return;}st.put({...r.result,expiresAt:now+ttlMs,updatedAt:now});renewed=true;};r.onerror=()=>no(r.error);t.oncomplete=()=>ok(renewed);t.onerror=()=>no(t.error||new Error("Follow-up build lock renewal failed."));t.onabort=()=>no(t.error||new Error("Follow-up build lock renewal aborted."));});
  },
  async releaseFollowupBuildLock_(city,owner){
    const c=String(city||"").trim();if(!c||!owner)return;
    const d=await this.open();
    await new Promise((ok,no)=>{const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache"),r=st.get(this.followupBuildLockKey_(c));r.onsuccess=()=>{if(r.result?.owner===owner)st.delete(this.followupBuildLockKey_(c));};r.onerror=()=>no(r.error);t.oncomplete=ok;t.onerror=()=>no(t.error||new Error("Follow-up build lock release failed."));});
  },
  async beginFollowupCityBuild(city){
    const c=String(city||"").trim();if(!c)throw new Error("Follow-up city is required.");
    await this.setFollowupMeta({city:c,type:"FOLLOWUP_META",status:"BUILDING",updatedAt:Date.now()});
    const d=await this.open();
    const keys=await new Promise((ok,no)=>{const t=d.transaction("followupCache"),idx=t.objectStore("followupCache").index("citySourceRow"),r=idx.getAllKeys(IDBKeyRange.bound([c,0],[c,Number.MAX_SAFE_INTEGER]));r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>no(r.error);});
    for(let i=0;i<keys.length;i+=500){
      const batch=keys.slice(i,i+500);
      await new Promise((ok,no)=>{const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache");batch.forEach(k=>st.delete(k));t.oncomplete=ok;t.onerror=()=>no(t.error||new Error("Unable to clear Follow-up cache build batch."));t.onabort=()=>no(t.error||new Error("Follow-up cache build clear aborted."));});
    }
  },
  putFollowupBuildBatch(city,records){
    const c=String(city||"").trim(),list=Array.isArray(records)?records:[];return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache");list.forEach(x=>{const row=Number(x?.sourceRow);if(!Number.isInteger(row)||row<2)return;st.put({...x,key:this.followupVisitKey_(c,row),type:"FOLLOWUP_VISIT",city:c,normalizedWhatsapp:this.normalizeWhatsApp_(x.whatsapp),sourceRow:row});});t.oncomplete=ok;t.onerror=()=>no(t.error||new Error("Follow-up cache batch write failed."));t.onabort=()=>no(t.error||new Error("Follow-up cache batch write aborted."));}));
  },
  countFollowupVisits_(city){
    const c=String(city||"").trim();if(!c)return Promise.resolve(0);
    return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction("followupCache"),idx=t.objectStore("followupCache").index("citySourceRow"),r=idx.getAllKeys(IDBKeyRange.bound([c,2],[c,Number.MAX_SAFE_INTEGER]));r.onsuccess=()=>ok((r.result||[]).length);r.onerror=()=>no(r.error);}));
  },
  setFollowupMeta(meta){const c=String(meta?.city||"").trim();return this.put("followupCache",{...meta,key:this.followupMetaKey_(c),type:"FOLLOWUP_META",city:c});},
  finishFollowupCityBuild(city,meta){const c=String(city||"").trim();return this.setFollowupMeta({...meta,city:c,status:"READY",lastUpdatedAt:Date.now()});},
  appendFollowupVisitAndMeta(visit,meta){
    const c=String(visit?.city||meta?.city||"").trim(),row=Number(visit?.sourceRow);if(!c||!Number.isInteger(row)||row<2)return Promise.resolve({updated:false});
    return this.open().then(d=>new Promise((ok,no)=>{const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache");st.put({...visit,key:this.followupVisitKey_(c,row),type:"FOLLOWUP_VISIT",city:c,normalizedWhatsapp:this.normalizeWhatsApp_(visit.whatsapp),sourceRow:row});if(meta)st.put({...meta,key:this.followupMetaKey_(c),type:"FOLLOWUP_META",city:c,status:"READY",updatedAt:Date.now()});t.oncomplete=()=>ok({updated:true});t.onerror=()=>no(t.error||new Error("Follow-up booking cache update failed."));t.onabort=()=>no(t.error||new Error("Follow-up booking cache update aborted."));}));
  },
  async pruneFollowupCity(city,boundaryDate,lastCleanupMonth){
    const c=String(city||"").trim(),boundary=String(boundaryDate||"");if(!c||!/^[0-9]{8}$/.test(boundary))return;
    const d=await this.open();
    const keys=await new Promise((ok,no)=>{const t=d.transaction("followupCache"),idx=t.objectStore("followupCache").index("cityDate"),r=idx.getAllKeys(IDBKeyRange.bound([c,"00000000"],[c,boundary],false,true));r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>no(r.error);});
    for(let i=0;i<keys.length;i+=250){
      const batch=keys.slice(i,i+250);
      await new Promise((ok,no)=>{const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache");batch.forEach(k=>st.delete(k));t.oncomplete=ok;t.onerror=()=>no(t.error||new Error("Follow-up cache cleanup batch failed."));t.onabort=()=>no(t.error||new Error("Follow-up cache cleanup batch aborted."));});
    }
    const m=await this.getFollowupMeta(c);if(m)await this.setFollowupMeta({...m,lastCleanupMonth,boundaryDate:boundary,status:"READY",lastUpdatedAt:Date.now()});
  },
  followupRecordFromBooking_(booking){
    const city=String(booking?.city||"").trim(),row=Number(booking?.rowNumber);if(!city||!Number.isInteger(row)||row<2)return null;
    return {city,sourceRow:row,date:String(booking.date||"").trim(),time:String(booking.time||"").trim(),name:String(booking.patientName||booking.name||""),age:booking.age,ageUnit:String(booking.ageUnit||""),address:String(booking.address||""),patientType:String(booking.patientType||""),whatsapp:String(booking.whatsapp||"")};
  },
  followupSyncLockKey_(city){return `SYNC|${String(city||"").trim()}`;},
  async releaseFollowupSyncLock_(city,owner){
    const c=String(city||"").trim();if(!c||!owner)return;
    const d=await this.open();
    await new Promise((ok,no)=>{const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache"),r=st.get(this.followupSyncLockKey_(c));r.onsuccess=()=>{if(r.result?.owner===owner)st.delete(this.followupSyncLockKey_(c));};r.onerror=()=>no(r.error);t.oncomplete=ok;t.onerror=()=>no(t.error||new Error("Follow-up synchronization lock release failed."));});
  },
  followupMetaValid_(meta,city){
    const c=String(city||"").trim();
    if(!meta||meta.status!=="READY"||String(meta.city||"").trim()!==c)return false;
    const known=Number(meta.highestKnownSourceRow),contiguous=Number(meta.highestContiguousSourceRow),count=Number(meta.recordCount);
    return Number.isInteger(known)&&known>=1&&Number.isInteger(contiguous)&&contiguous>=1&&Number.isInteger(count)&&count>=0&&contiguous<=known;
  },
  async buildFollowupCityCache_(city){
    const c=String(city||"").trim();if(!c)throw new Error("Follow-up city is required.");
    let owner=null,renewTimer=null,lockLost=false;
    try{
      const deadline=Date.now()+130000;
      while(Date.now()<deadline){
        const meta=await this.getFollowupMeta(c);
        if(this.followupMetaValid_(meta,c))return {mode:"ALREADY_READY",city:c,recordCount:Number(meta.recordCount)||0};
        owner=await this.acquireFollowupBuildLock_(c,120000);
        if(owner)break;
        await new Promise(resolve=>setTimeout(resolve,500));
      }
      if(!owner)throw new Error("Follow-up cache build is already in progress. Please try again.");
      const renew=async()=>{
        if(!owner)return false;
        return this.renewFollowupBuildLock_(c,owner,120000).catch(()=>false);
      };
      renewTimer=setInterval(()=>{void renew().then(ok=>{if(!ok)lockLost=true;}).catch(()=>{lockLost=true;});},30000);
      await this.beginFollowupCityBuild(c);
      try{
        const r=await window.NeuronAPI.call("getFollowupCityHistory",{city:c},100000);
        if(!r||r.ok!==true)throw new Error(r?.error||"Unable to build Follow-up history.");
        const records=Array.isArray(r.records)?r.records:[],BATCH=500;
        for(let i=0;i<records.length;i+=BATCH)await this.putFollowupBuildBatch(c,records.slice(i,i+BATCH));
        const written=await this.countFollowupVisits_(c);
        if(written!==records.length)throw new Error("Follow-up cache build verification failed.");
        if(lockLost || !(await this.renewFollowupBuildLock_(c,owner,120000)))throw new Error("Follow-up cache build lock was lost before commit.");
        const p=window.U?.parts?.()||{},safeMonth=p.y?`${p.y}-${String(p.m).padStart(2,"0")}`:"",now=Date.now();
        const meta={city:c,boundaryDate:String(r.boundaryDate||""),oldestDate:records[0]?.date||"",newestDate:records[records.length-1]?.date||"",recordCount:records.length,highestKnownSourceRow:Number(r.highestKnownSourceRow)||1,highestContiguousSourceRow:Number(r.highestContiguousSourceRow)||1,createdAt:now,lastFullBuildAt:now,lastServerCheckAt:now,lastCleanupMonth:safeMonth};
        await this.finishFollowupCityBuild(c,meta);
        return {mode:"FULL_BUILD",city:c,rowsLoaded:records.length,oldestDate:meta.oldestDate,newestDate:meta.newestDate,highestKnownSourceRow:meta.highestKnownSourceRow,highestContiguousSourceRow:meta.highestContiguousSourceRow};
      }catch(e){
        await this.setFollowupMeta({city:c,status:"BUILD_FAILED",lastUpdatedAt:Date.now()}).catch(()=>{});
        throw e;
      }
    }finally{
      if(renewTimer)clearInterval(renewTimer);
      if(owner)await this.releaseFollowupBuildLock_(c,owner).catch(()=>{});
    }
  },
  async syncFollowupCityCache_(city){
    const c=String(city||"").trim();if(!c)return {mode:"FAILED",error:"Follow-up city is required."};
    const lockKey=this.followupSyncLockKey_(c),d=await this.open(),owner=`${Date.now()}-${Math.random().toString(36).slice(2)}`,now=Date.now();
    const locked=await new Promise((ok,no)=>{let acquired=false;const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache"),r=st.get(lockKey);r.onsuccess=()=>{if(r.result&&Number(r.result.expiresAt)>now){acquired=false;return;}st.put({key:lockKey,type:"FOLLOWUP_SYNC_LOCK",city:c,owner,expiresAt:now+120000,updatedAt:now});acquired=true;};r.onerror=()=>no(r.error);t.oncomplete=()=>ok(acquired);t.onerror=()=>no(t.error||new Error("Follow-up synchronization lock failed."));});
    if(!locked)return {mode:"IN_PROGRESS",city:c};
    try{
      const meta=await this.getFollowupMeta(c);
      if(!this.followupMetaValid_(meta,c))return {mode:"FAILED",city:c,error:"Follow-up cache metadata is not valid for incremental synchronization."};
      const previousContiguous=Number(meta.highestContiguousSourceRow)||1;
      const previousKnown=Number(meta.highestKnownSourceRow)||1;
      const from=Math.max(2,previousContiguous+1);
      const r=await window.NeuronAPI.call("getFollowupCitySyncRange",{city:c,fromRow:from},100000);
      if(!r||r.ok!==true)throw new Error(r?.error||"Unable to synchronize Follow-up history.");
      const toRow=Number(r.toRow)||0;
      const spreadsheetLastRow=Math.max(toRow,Number(r.highestKnownSourceRow)||0);
      if(spreadsheetLastRow<from){
        const current=await this.getFollowupMeta(c);
        if(current&&current.status==="READY")await this.setFollowupMeta({...current,city:c,lastUpdatedAt:Date.now(),lastServerCheckAt:Date.now()});
        return {mode:"ALREADY_CURRENT",city:c,idbContiguousRow:previousContiguous,spreadsheetLastRow,rowsScanned:0};
      }
      const records=Array.isArray(r.records)?r.records:[];
      let inserted=0,updated=0;
      for(let i=0;i<records.length;i+=250){
        const batch=records.slice(i,i+250);
        const counts=await this.putFollowupSyncBatch_(c,batch);
        inserted+=counts.inserted;updated+=counts.updated;
      }
      const current=await this.getFollowupMeta(c);
      if(!current||current.status!=="READY")throw new Error("Follow-up cache metadata changed during synchronization.");
      const newContiguous=Math.max(Number(current.highestContiguousSourceRow)||0,toRow);
      const newKnown=Math.max(Number(current.highestKnownSourceRow)||0,spreadsheetLastRow);
      const nextCount=Math.max(0,Number(current.recordCount)||0)+inserted;
      await this.setFollowupMeta({...current,city:c,status:"READY",highestKnownSourceRow:newKnown,highestContiguousSourceRow:newContiguous,recordCount:nextCount,lastUpdatedAt:Date.now(),lastSyncAt:Date.now(),lastServerCheckAt:Date.now()});
      return {mode:"INCREMENTAL",city:c,fromRow:from,toRow,rowsReceived:records.length,rowsInserted:inserted,rowsUpdated:updated,previousContiguousRow:previousContiguous,newContiguousRow:newContiguous,spreadsheetLastRow:spreadsheetLastRow};
    }catch(e){
      const meta=await this.getFollowupMeta(c).catch(()=>null);
      return {mode:"FAILED",city:c,error:e?.message||String(e),previousContiguousRow:Number(meta?.highestContiguousSourceRow)||0};
    }finally{
      await this.releaseFollowupSyncLock_(c,owner).catch(()=>{});
    }
  },
  putFollowupSyncBatch_(city,records){
    const c=String(city||"").trim(),list=Array.isArray(records)?records:[];
    return this.open().then(d=>new Promise((ok,no)=>{
      const t=d.transaction("followupCache","readwrite"),st=t.objectStore("followupCache");
      let inserted=0,updated=0,remaining=list.length;
      if(!remaining){ok({inserted:0,updated:0});return;}
      list.forEach(x=>{
        const row=Number(x?.sourceRow);
        if(!Number.isInteger(row)||row<2){remaining--;return;}
        const key=this.followupVisitKey_(c,row),r=st.get(key);
        r.onsuccess=()=>{
          const visit={...x,key,type:"FOLLOWUP_VISIT",city:c,normalizedWhatsapp:this.normalizeWhatsApp_(x.whatsapp),sourceRow:row};
          if(r.result)updated++;else inserted++;
          st.put(visit);
          remaining--;
        };
        r.onerror=()=>no(r.error);
      });
      t.oncomplete=()=>ok({inserted,updated});
      t.onerror=()=>no(t.error||new Error("Follow-up synchronization batch failed."));
      t.onabort=()=>no(t.error||new Error("Follow-up synchronization batch aborted."));
    }));
  },
  async reconcileFollowupCityGaps_(city){
    return this.syncFollowupCityCache_(city);
  },
  scheduleFollowupBackgroundCheck_(city){
    const c=String(city||"").trim();if(!c)return;
    if(this._followupBackgroundChecks[c])return;
    const task=(async()=>{
      try{
        const meta=await this.getFollowupMeta(c);
        if(!this.followupMetaValid_(meta,c))return;
        const ts=Number(meta.lastServerCheckAt)||0;
        if(ts&&Date.now()-ts<=60*60*1000)return;
        await this.syncFollowupCityCache_(c);
      }catch(_){}
      finally{delete this._followupBackgroundChecks[c];}
    })();
    this._followupBackgroundChecks[c]=task;
  },

  async rebuildFollowupCityCache_(city){
    const c=String(city||"").trim();if(!c)return {mode:"FAILED",error:"Follow-up city is required."};
    const meta=await this.getFollowupMeta(c);
    if(!this.followupMetaValid_(meta,c)){
      try{return await this.buildFollowupCityCache_(c);}catch(e){return {mode:"FAILED",city:c,error:e?.message||String(e)};}
    }
    return this.syncFollowupCityCache_(c);
  },

  async getOrBuildFollowupPatients_(city,whatsapp){
    const c=String(city||"").trim(),phone=this.normalizeWhatsApp_(whatsapp);
    if(!c||!/^[6-9]\d{9}$/.test(phone))return [];
    let meta=await this.getFollowupMeta(c);
    if(!this.followupMetaValid_(meta,c)){
      const built=await this.buildFollowupCityCache_(c);
      if(built?.mode==="FAILED")throw new Error(built.error||"Unable to build Follow-up cache.");
    }
    let patients=await this.getFollowupPatients_(c,phone);
    const p=window.U?.parts?.()||{},today=p.y?`${p.y}${String(p.m).padStart(2,"0")}${String(p.d).padStart(2,"0")}`:"";
    patients=patients.filter(x=>String(x.date||"")!==today).sort((a,b)=>{const at=String(a.date||"")+String(a.time||"");const bt=String(b.date||"")+String(b.time||"");return bt.localeCompare(at)||(Number(b.sourceRow)||0)-(Number(a.sourceRow)||0);});
    const meta2=await this.getFollowupMeta(c),month=p.y?`${p.y}-${String(p.m).padStart(2,"0")}`:"";
    if(meta2&&meta2.status==="READY"&&month&&meta2.lastCleanupMonth!==month){
      const boundaryDate=new Date(Date.UTC(Number(p.y)-2,Number(p.m)-1,Number(p.d)||1));
      const boundary=`${boundaryDate.getUTCFullYear()}${String(boundaryDate.getUTCMonth()+1).padStart(2,"0")}${String(boundaryDate.getUTCDate()).padStart(2,"0")}`;
      void this.pruneFollowupCity(c,boundary,month).catch(()=>{});
    }
    if(meta2&&meta2.status==="READY"&&Number(meta2.highestKnownSourceRow)>Number(meta2.highestContiguousSourceRow||0)){
      void this.reconcileFollowupCityGaps_(c).catch(()=>{});
    }
    if(meta2&&meta2.status==="READY")this.scheduleFollowupBackgroundCheck_(c);
    return patients;
  },
  
  async patchTodayPatient_(data={}){
    const appointmentId=String(data.appointmentId||"").trim();
    const city=String(data.city||"").trim();
    const date=/^\d{8}$/.test(String(data.date||""))?String(data.date):this.todayKey_();
    if(!appointmentId||!city)return {updated:false,reason:"invalid"};
    const key=`OPD_TODAY|${date}|${city}`;
    let cache=await this.get("cache",key).catch(()=>null);
    let patients=Array.isArray(cache?.patients)?cache.patients.slice():[];
    let i=patients.findIndex(x=>String(x?.appointmentId||"").trim()===appointmentId);
    // A successful mutation must never be left without a master OPD_TODAY
    // record. If the cache is missing or the patient is missing, synchronize
    // the authoritative today's list first, then apply the mutation.
    if(!cache||!Array.isArray(cache.patients)||i<0){
      cache=await this.getTodayOPDCache_(city,{forceRefresh:true});
      if(!cache||cache.status==="STALE"||cache.complete!==true)return {updated:false,reason:"cache_sync_failed"};
      patients=Array.isArray(cache.patients)?cache.patients.slice():[];
      i=patients.findIndex(x=>String(x?.appointmentId||"").trim()===appointmentId);
      if(i<0)return {updated:false,reason:"patient_missing_after_sync"};
    }
    const patch=data.patch&&typeof data.patch==="object"?data.patch:{};
    const next={...patients[i]};
    Object.keys(patch).forEach(k=>{
      const v=patch[k];
      if(k==="opdRefund"||k==="eegRefund"){
        if(v!==undefined&&v!==null&&String(v)!=="") next[k]=v;
      }else if(v!==undefined&&v!==null){
        next[k]=v;
      }
    });
    patients[i]=next;
    const now=Date.now();
    const updated={...cache,patients,cacheUpdatedAt:now,lastServerCheckAt:cache.lastServerCheckAt||now};
    await this.replace("cache",key,updated);
    return {updated:true,patient:next};
  },
  async syncBookingCaches_(booking){
  const kind=String(booking?.kind||"").trim();
  const appointmentId=String(booking?.appointmentId||"").trim();
  const city=String(booking?.city||"").trim();
  const date=String(booking?.date||booking?.appointmentDate||"").trim();
  if(kind==="EEG_BOOKING"&&appointmentId&&city&&/^\d{8}$/.test(date)){
    const key=`OPD_TODAY|${date}|${city}`;
    const existing=await this.get("cache",key).catch(()=>null);
    const stale=!existing||!Array.isArray(existing.patients)||this.cacheStale_(existing,existing.patients,"appointmentId")||existing.status==="CACHED_INCOMPLETE"||existing.status==="STALE";
    if(stale){
      const refreshed=await this.getTodayOPDCache_(city,{forceRefresh:true});
      if(!refreshed||refreshed.status==="STALE"||refreshed.complete!==true)throw Error("Today's OPD cache could not be synchronized before EEG booking.");
    }
  }
  return this.open().then(d=>new Promise((ok,no)=>{
  const kind=String(booking?.kind||"").trim();
  const appointmentId=String(booking?.appointmentId||"").trim();
  const city=String(booking?.city||"").trim();
  const date=String(booking?.date||booking?.appointmentDate||"").trim();
  const isTodayBooking=(kind==="OPD_BOOKING"||kind==="EEG_BOOKING") && city && /^\d{8}$/.test(date) && appointmentId;
  const isEEGCalls=kind==="EEG_CALLS_BOOKING";
  if(!isTodayBooking&&!isEEGCalls){ok({todayUpdated:false,eegCallsUpdated:false});return;}
  const t=d.transaction(["cache","followupCache"],"readwrite"),st=t.objectStore("cache"),fst=t.objectStore("followupCache");
  const opdKey=isTodayBooking?`OPD_TODAY|${date}|${city}`:"";
  const callsKey="eegCallsRawCacheV1";
  let opdCache=null,callsCache=null;
  let opdRead=!isTodayBooking,callsRead=!isEEGCalls,followupRead=kind!=="OPD_BOOKING";
  const result={todayUpdated:false,eegCallsUpdated:false,followupUpdated:false};
  let followupMeta=null;
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
    if(!cache&&kind!=="OPD_BOOKING")return;
    const patients=Array.isArray(cache?.patients)?cache.patients.slice():[];
    const i=patients.findIndex(x=>String(x?.appointmentId||"").trim()===appointmentId);
    if(i>=0)patients[i]=makePatient(patients[i]);else patients.push(makePatient(null));
    sortPatients(patients);
    const now=Date.now();
    const bookingSerial=Number(booking.serial)||Number(String(appointmentId).match(/-(\d+)$/)?.[1])||null;
    const bookingRow=Number(booking.rowNumber)||null;
    const isFirstOPDBookingForNewTodayCache=
      !cache &&
      kind==="OPD_BOOKING" &&
      date===String(booking.date||booking.appointmentDate||"").trim() &&
      city===String(booking.city||"").trim() &&
      bookingSerial===1;
    const next=cache?{...cache,patients,cacheUpdatedAt:now}:
      {key:opdKey,type:"OPD_TODAY",date,city,patients,
       status:isFirstOPDBookingForNewTodayCache?"REFRESHED":"CACHED_INCOMPLETE",
       complete:isFirstOPDBookingForNewTodayCache,cacheUpdatedAt:now};
    if(kind==="OPD_BOOKING"&&bookingSerial&&bookingRow){
      const oldSerial=Number(next.lastSerial)||0,oldRow=Number(next.lastRowNumber)||1;
      if(bookingSerial>=oldSerial&&bookingRow>=oldRow){
        next.lastSerial=bookingSerial;
        next.lastRowNumber=bookingRow;
        next.lastServerCheckAt=now;
        next.lastServerRefreshAt=now;
      }
    }
    if(cache&&this.cacheStale_(next,patients,"appointmentId"))next.status="STALE";
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
  const applyFollowup=()=>{
    if(kind!=="OPD_BOOKING"||!followupMeta||followupMeta.status!=="READY")return;
    const row=Number(booking.rowNumber);if(!Number.isInteger(row)||row<2)return;
    const visit=this.followupRecordFromBooking_(booking);if(!visit)return;
    const oldKnown=Number(followupMeta.highestKnownSourceRow)||0,oldContiguous=Number(followupMeta.highestContiguousSourceRow)||0;
    const visitKey=this.followupVisitKey_(visit.city,row);
    const nextKnown=Math.max(oldKnown,row);
    const nextContiguous=row===oldContiguous+1?row:oldContiguous;
    const nextMeta={...followupMeta,highestKnownSourceRow:nextKnown,highestContiguousSourceRow:nextContiguous,lastUpdatedAt:Date.now()};
    const existing=fst.get(visitKey);
    existing.onsuccess=()=>{
      fst.put({...visit,key:visitKey,type:"FOLLOWUP_VISIT",city:visit.city,normalizedWhatsapp:this.normalizeWhatsApp_(visit.whatsapp),sourceRow:row});
      if(!existing.result)nextMeta.recordCount=Math.max(0,Number(followupMeta.recordCount)||0)+1;
      fst.put({...nextMeta,key:this.followupMetaKey_(visit.city),type:"FOLLOWUP_META",city:visit.city,status:"READY",updatedAt:Date.now()});
    };
    result.followupUpdated=true;
  };
  const maybeDone=()=>{
    if(!opdRead||!callsRead||!followupRead)return;
    if(isTodayBooking)applyToday(opdCache);
    if(isEEGCalls)applyCalls(callsCache);
    applyFollowup();
  };
  if(isTodayBooking){
    const r1=st.get(opdKey);r1.onsuccess=()=>{opdCache=r1.result;opdRead=true;maybeDone()};r1.onerror=()=>no(r1.error);
  }
  if(isEEGCalls){
    const r3=st.get(callsKey);r3.onsuccess=()=>{callsCache=r3.result;callsRead=true;maybeDone()};r3.onerror=()=>no(r3.error);
  }
  if(kind==="OPD_BOOKING"){
    const r4=fst.get(this.followupMetaKey_(city));r4.onsuccess=()=>{followupMeta=r4.result||null;followupRead=true;maybeDone()};r4.onerror=()=>no(r4.error);
  }
  if(kind!=="OPD_BOOKING")followupMeta=null;
  t.oncomplete=()=>ok(result);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error||new Error("IndexedDB booking cache synchronization aborted."));
 }))},

};
