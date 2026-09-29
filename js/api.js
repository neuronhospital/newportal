window.NeuronAPI={
 call:async(action,data={},timeout=25000)=>{
  const u=NEURON_CONFIG.apiUrl;
  if(!u||u.includes("PASTE_YOUR"))throw Error("Configure the Apps Script /exec URL in js/config.js.");
  if(!navigator.onLine)throw Error("You are offline. The request is retained locally where supported.");

  const ms=Math.max(1000,Number(timeout)||25000);
  const controller=new AbortController();
  let timeoutTimer=null;

  const run=async()=>{
    const bookDebug=action==="bookAppointment"?window.__NEURON_BOOK_DEBUG:null;
    const bookDebugLog=(eventName)=>{
      if(!bookDebug)return;
      console.log(
        "[NEURON BOOK]",
        eventName,
        "t="+(Date.now()-bookDebug.startedAt)+"ms",
        "requestId="+bookDebug.requestId
      );
    };
    bookDebugLog("API_FETCH_START");
    const r=await fetch(u,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action,...data}),
      signal:controller.signal,
      cache:"no-store"
    });

    bookDebugLog("API_FETCH_RESPONSE");
    bookDebugLog("API_RESPONSE_TEXT_START");
    const text=await r.text();
    bookDebugLog("API_RESPONSE_TEXT_COMPLETE");
    let j;
    bookDebugLog("API_JSON_PARSE_START");
    try{j=JSON.parse(text||"{}");}
    catch(_){throw Error("Server returned an invalid response.");}
    bookDebugLog("API_JSON_PARSE_COMPLETE");

    if(!r.ok)throw Error(j.error||("Server request failed ("+r.status+")."));
    if(j.ok===false)throw Error(j.error||"Server request failed.");
    bookDebugLog("API_CALL_RETURN");
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
