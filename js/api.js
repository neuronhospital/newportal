window.NeuronAPI={
 call:async(action,data={},timeout=25000,options={})=>{
  const u=NEURON_CONFIG.apiUrl;
  if(!u||u.includes("PASTE_YOUR"))throw Error("Configure the Apps Script /exec URL in js/config.js.");
  if(!navigator.onLine)throw Error("You are offline. The request is retained locally where supported.");

  const ms=Math.max(1000,Number(timeout)||25000);
  const controller=new AbortController();
  const externalSignal=options&&options.signal;
  let externalAborted=false;
  let externalAbortHandler=null;
  let timeoutTimer=null;
  if(externalSignal){
    externalAbortHandler=()=>{externalAborted=true;try{controller.abort();}catch(_) {}};
    if(externalSignal.aborted) externalAbortHandler();
    else externalSignal.addEventListener("abort",externalAbortHandler,{once:true});
  }

  const run=async()=>{
    const r=await fetch(u,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action,...data}),
      signal:controller.signal,
      cache:"no-store"
    });

    const text=await r.text();
    let j;
    try{j=JSON.parse(text||"{}");}
    catch(_){throw Error("Server returned an invalid response.");}

    if(!r.ok)throw Error(j.error||("Server request failed ("+r.status+")."));
    if(j.ok===false)throw Error(j.error||"Server request failed.");
    return j;
  };

  const hardTimeout=new Promise((_,reject)=>{
    timeoutTimer=setTimeout(()=>{
      try{controller.abort();}catch(_){}
      reject(Error("Network timeout. The request may still have been recorded."));
    },ms);
  });

  try{
    return await Promise.race([run(),hardTimeout]);
  }catch(e){
    if(e&&e.name==="AbortError")
      throw externalAborted ? Error("Request cancelled.") : Error("Network timeout. The request may still have been recorded.");
    if(e&&e.name==="TypeError")
      throw Error("Could not reach the NEURON server. Please check the internet connection and try again.");
    throw e;
  }finally{
    if(timeoutTimer)clearTimeout(timeoutTimer);
    if(externalSignal&&externalAbortHandler)externalSignal.removeEventListener("abort",externalAbortHandler);
  }
 },
 verifyBooking:async(id,city,retries=2)=>{
  const action="checkBookingRequest";
  const key="bookingRequestId";
  for(let i=0;i<retries;i++){
   try{
    const r=await NeuronAPI.call(action,{[key]:id,city},5000);
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
,
 verifyUpdate:async(payload,retries=2)=>{
  for(let i=0;i<retries;i++){
   try{
    const r=await NeuronAPI.call("checkUpdateStatus",payload,5000);
    if(r&&r.found)return r;
   }catch(_){}
   if(i<retries-1)await new Promise(resolve=>setTimeout(resolve,2000));
  }
  return null;
 }
};
