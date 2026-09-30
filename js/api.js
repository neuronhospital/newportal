const API_TIMEOUT_MS=25000;
window.NeuronAPI={
 dispatchFCM:async(eventId)=>{
  const id=String(eventId||"").trim();
  if(!id)return null;
  try{return await NeuronAPI.call("dispatchFCMEvent",{eventId:id},10000)}catch(_){return null}
 },
 call:async(action,data={},timeout=API_TIMEOUT_MS,debugTrace=null)=>{
  const apiMark=(step,event)=>{
    try{if(debugTrace&&typeof debugTrace.mark==="function")debugTrace.mark(step,event);}catch(_){}
  };
  apiMark("A0","NeuronAPI.call entered");
  const u=NEURON_CONFIG.apiUrl;
  apiMark("A0.1","API URL read");
  if(!u||u.includes("PASTE_YOUR"))throw Error("Configure the Apps Script /exec URL in js/config.js.");
  apiMark("A0.2","API URL validated");
  if(!navigator.onLine)throw Error("You are offline. The request is retained locally where supported.");
  apiMark("A0.3","Browser online state verified");

  const ms=Math.max(1000,Number(timeout)||API_TIMEOUT_MS);
  const controller=new AbortController();
  let timeoutTimer=null;
  apiMark("A0.4","Timeout and AbortController prepared");

  const run=async()=>{
    apiMark("A1","Transport run started");
    const requestBody=JSON.stringify({action,...data});
    apiMark("A1.1","Request body serialized");
    apiMark("A1.2","fetch() invocation started");
    const fetchPromise=fetch(u,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:requestBody,
      signal:controller.signal,
      cache:"no-store"
    });
    apiMark("A1.3","fetch() promise returned");
    const fetchPromiseReturnedAt=performance.now();
    const r=await fetchPromise;
    const responseObjectReceivedAt=performance.now();
    apiMark("A2","HTTP Response object received");
    try{
      const entries=performance.getEntriesByType("resource")||[];
      const apiEntries=entries.filter(e=>{
        try{return String(e.name||"").includes("script.google.com") || String(e.name||"").includes("googleusercontent.com") || String(e.name||"")===String(u);}catch(_){return false;}
      });
      const e=apiEntries.length?apiEntries[apiEntries.length-1]:null;
      const nav=performance.getEntriesByType("navigation")[0]||null;
      const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;
      const resourceSummary={
        exactUrlEntryCount:(performance.getEntriesByName(u,"resource")||[]).length,
        matchingEntryCount:apiEntries.length,
        lastMatchingEntry:e?{name:e.name,startTime:e.startTime,fetchStart:e.fetchStart,domainLookupStart:e.domainLookupStart,domainLookupEnd:e.domainLookupEnd,connectStart:e.connectStart,connectEnd:e.connectEnd,secureConnectionStart:e.secureConnectionStart,requestStart:e.requestStart,responseStart:e.responseStart,responseEnd:e.responseEnd,duration:e.duration,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,decodedBodySize:e.decodedBodySize}:null,
        recentResourceNames:entries.slice(-12).map(x=>String(x.name||"")),
        navigation:nav?{type:nav.type,startTime:nav.startTime}:null,
        connection:connection?{effectiveType:connection.effectiveType,rtt:connection.rtt,downlink:connection.downlink,saveData:connection.saveData}:null,
        visibilityState:document.visibilityState,
        online:navigator.onLine,
        fetchPromiseReturnedAt,
        responseObjectReceivedAt,
        fetchToResponseMs:Math.max(0,responseObjectReceivedAt-fetchPromiseReturnedAt),
        responseUrl:String(r.url||""),
        redirected:!!r.redirected,
        responseType:String(r.type||""),
        responseStatus:Number(r.status)||0,
        responseOk:!!r.ok,
        contentType:String(r.headers?.get("content-type")||""),
        contentLength:String(r.headers?.get("content-length")||"")
      };
      apiMark("A2.10","Transport boundary diagnostics: "+JSON.stringify(resourceSummary));
    }catch(e){
      apiMark("A2.10","Transport boundary diagnostics failed: "+String(e?.message||e||"Unknown error"));
    }
    apiMark("A2.11","Response metadata captured");
    apiMark("A2.1","HTTP status available: "+String(r.status));
    apiMark("A2.2","Response.ok available: "+String(!!r.ok));
    apiMark("A2.3","Response body text read started");
    const text=await r.text();
    apiMark("A2.4","Response body text read completed");
    apiMark("A2.5","JSON parsing started");
    let j;
    try{j=JSON.parse(text||"{}");}
    catch(_){throw Error("Server returned an invalid response.");}
    apiMark("A2.6","JSON parsing completed");
    apiMark("A2.7","API response validation started");
    if(!r.ok)throw Error(j.error||("Server request failed ("+r.status+")."));
    if(j.ok===false)throw Error(j.error||"Server request failed.");
    apiMark("A2.8","API response validation completed");
    apiMark("A2.9","Transport run resolved");
    return j;
  };

  apiMark("A3","Hard timeout Promise setup started");
  const hardTimeout=new Promise((_,reject)=>{
    timeoutTimer=setTimeout(()=>{
      apiMark("A3.1","Hard timeout fired; AbortController abort requested");
      try{controller.abort();}catch(_){}
      reject(Error("Network timeout. The request may still have been recorded."));
    },ms);
  });
  apiMark("A3.2","Hard timeout Promise setup completed");

  try{
    apiMark("A4","Promise.race started");
    const result=await Promise.race([run(),hardTimeout]);
    apiMark("A4.1","Promise.race resolved with API result");
    return result;
  }catch(e){
    apiMark("A4.2","Promise.race rejected: "+String(e?.message||e||"Unknown error"));
    if(e&&e.name==="AbortError")
      throw Error("Network timeout. The request may still have been recorded.");
    throw e;
  }finally{
    apiMark("A4.3","NeuronAPI.call finally entered");
    if(timeoutTimer)clearTimeout(timeoutTimer);
    apiMark("A4.4","NeuronAPI.call finally completed");
  }
 },
 verifyBooking:async(id,city,retries=2,bookingData={})=>{
  const action="checkBookingRequest";
  const key="bookingRequestId";
  for(let i=0;i<retries;i++){
   try{
    const r=await NeuronAPI.call(action,{[key]:id,city,appointmentDate:bookingData.appointmentDate||"",whatsapp:bookingData.whatsapp||"",childName:bookingData.childName||""},5000);
    if(r&&r.found)return r;
   }catch(_){}
   if(i<retries-1)await new Promise(resolve=>setTimeout(resolve,2000));
  }
  return null;
 },
 verifyEEGCallsBooking:async(requestId,retries=2)=>{
  const action="checkEEGCallsBookingRequest";
  const key="bookingRequestId";
  for(let i=0;i<retries;i++){
   try{
    const r=await NeuronAPI.call(action,{[key]:requestId},5000);
    if(r&&r.found)return r;
   }catch(_){}
   if(i<retries-1)await new Promise(resolve=>setTimeout(resolve,2000));
  }
  return null;
 }
};
