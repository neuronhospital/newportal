window.NeuronAPI={
 debugBuffer:[],
 debugFlushInProgress:false,
 debugLog:(step,data={})=>{
  try{
   NeuronAPI.debugBuffer.push({
    timestamp:new Date().toISOString(),
    step:String(step||"CLIENT_EVENT"),
    source:"client",
    ...data
   });
  }catch(_){}
 },
 flushDebugLog:async()=>{
  try{
   if(NeuronAPI.debugFlushInProgress)return;
   if(!NeuronAPI.debugBuffer.length)return;
   const u=NEURON_CONFIG.apiUrl;
   if(!u||u.includes("PASTE_YOUR"))return;
   NeuronAPI.debugFlushInProgress=true;
   const events=NeuronAPI.debugBuffer.splice(0,NeuronAPI.debugBuffer.length);
   const body=JSON.stringify({
    action:"debugLogBatch",
    events
   });
   await fetch(u,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body,
    keepalive:true,
    cache:"no-store"
   });
  }catch(_){}
  finally{
   NeuronAPI.debugFlushInProgress=false;
  }
 },
 call:async(action,data={},timeout=25000)=>{
  const u=NEURON_CONFIG.apiUrl;
  if(!u||u.includes("PASTE_YOUR"))throw Error("Configure the Apps Script /exec URL in js/config.js.");
  if(!navigator.onLine)throw Error("You are offline. The request is retained locally where supported.");

  const ms=Math.max(1000,Number(timeout)||25000);
  const requestId=String(data?.bookingRequestId||"");
  const clientStartedAt=Date.now();
  const log=(step,status="",details={})=>{
   try{
    NeuronAPI.debugLog(step,{
     requestId,
     startedAt:clientStartedAt,
     clientElapsedMs:Date.now()-clientStartedAt,
     city:data?.city||"",
     status,
     details:{action,timeoutMs:ms,...details}
    });
   }catch(_){}
  };

  const controller=new AbortController();
  let timeoutTimer=null;
  log("API_CALL_START","start");

  const run=async()=>{
   log("API_FETCH_START","start");
   const fetchStartedAt=Date.now();
   const r=await fetch(u,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify({action,...data}),
    signal:controller.signal,
    cache:"no-store"
   });
   log("API_FETCH_RESPONSE","received",{
    fetchElapsedMs:Date.now()-fetchStartedAt,
    httpStatus:r.status,
    redirected:r.redirected,
    responseUrl:r.url
   });
   log("API_RESPONSE_TEXT_START","start",{httpStatus:r.status});
   const text=await r.text();
   log("API_RESPONSE_TEXT_COMPLETE","success",{
    responseTextLength:text.length,
    textElapsedMs:Date.now()-fetchStartedAt
   });
   log("API_JSON_PARSE_START","start");
   let j;
   try{j=JSON.parse(text||"{}");}
   catch(_){
    log("API_JSON_PARSE_ERROR","error",{responseTextLength:text.length});
    throw Error("Server returned an invalid response.");
   }
   log("API_JSON_PARSE_COMPLETE","success",{ok:j?.ok,found:j?.found});
   if(!r.ok)throw Error(j.error||("Server request failed ("+r.status+")."));
   if(j.ok===false)throw Error(j.error||"Server request failed.");
   log("API_CALL_RETURN","success");
   return j;
  };

  const hardTimeout=new Promise((_,reject)=>{
   timeoutTimer=setTimeout(()=>{
    log("API_TIMEOUT","timeout",{timeoutMs:ms});
    try{controller.abort();}catch(_){}
    reject(Error("Network timeout. The request may still have been recorded."));
   },ms);
  });

  try{
   return await Promise.race([run(),hardTimeout]);
  }catch(e){
   log("API_CALL_ERROR","error",{
    name:e?.name||"",
    message:e?.message||String(e)
   });
   if(e&&e.name==="AbortError")
    throw Error("Network timeout. The request may still have been recorded.");
   throw e;
  }finally{
   if(timeoutTimer)clearTimeout(timeoutTimer);
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
