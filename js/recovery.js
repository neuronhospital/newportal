document.addEventListener("DOMContentLoaded",async()=>{
 const run=async()=>{
  if(!navigator.onLine)return;
  const items=await IDB.pending().catch(()=>[]);
  for(const x of items){
   try{
    let r=null;
    if(x.type==="OPD_BOOKING")r=await NeuronAPI.call("checkBookingRequest",{bookingRequestId:x.id,city:x.payload.city},10000);
    if(x.type==="EEG_BOOKING")r=await NeuronAPI.call("checkEEGBookingRequest",{eegBookingRequestId:x.id,city:x.payload.city},10000);
    if(x.type==="OPD_UPDATE"||x.type==="EEG_UPDATE"){
      const token=window.NeuronUpdateSession?.token()||"";
      if(!token)continue;
      r=await NeuronAPI.call("getUpdateStatus",{
        updateToken:token,
        appointmentId:x.payload.appointmentId,
        city:x.payload.city,
        whatsapp:x.payload.whatsapp,
        updateRequestId:x.id
      },10000);
    }
    if(r&&r.found)await IDB.put("tx",{...x,status:"complete",result:r,recoveredAt:Date.now()});
   }catch(_){
    // Keep unresolved transactions pending/uncertain. Never blindly resubmit.
   }
  }
 };
 window.addEventListener("neuron-update-session-ready",run);
 await run();
 window.addEventListener("online",run);
});
