(() => {
  let recoveringPatientNames = new Set();
  let bar = null;
  let reconcileRunning = false;

  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[m]));
  const nameOf = x => String(x?.payload?.childName || x?.payload?.patientName || "Patient").trim() || "Patient";
  const normalizedName = v => String(v || "").trim().replace(/\s+/g," ").toLowerCase();
  const normalizedPhone = v => String(v || "").replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");

  function ensureBar(){
    if(bar && document.body.contains(bar)) return bar;
    bar=document.createElement("div");
    bar.id="neuronRecoveryBar";
    bar.className="neuron-recovery-bar";
    bar.hidden=true;
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  function showWorking(x){
    const b=ensureBar();
    const name=nameOf(x);
    const type=x.type==="EEG_BOOKING"?"EEG appointment":"appointment";
    b.className="neuron-recovery-bar is-working";
    b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">↻</span><span><b>${esc(name)}</b> has a pending ${type}. The system is recovering the appointment status…</span>`;
    b.hidden=false;
  }

  function showResult(kind,x,result){
    const b=ensureBar();
    const name=nameOf(x);
    if(kind==="recovered"){
      b.className="neuron-recovery-bar is-success";
      b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">✓</span><span><b>Appointment recovered successfully</b><br>Patient Name: <b>${esc(name)}</b><br>Appointment ID: <b>${esc(result?.appointmentId || "")}</b></span>`;
    }else{
      b.className="neuron-recovery-bar is-failed";
      b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">✕</span><span><b>Appointment failed for ${esc(name)}</b><br>You can book the appointment again.</span>`;
    }
    b.hidden=false;
    setTimeout(()=>{ if(b) b.hidden=true; }, kind==="recovered" ? 9000 : 12000);
  }

  async function verifyOPDOnce(x){
    try{
      return await NeuronAPI.call("checkBookingRequest",{
        bookingRequestId:x.id,
        city:x.payload.city,
        appointmentDate:x.payload.appointmentDate||"",
        whatsapp:x.payload.whatsapp||"",
        childName:x.payload.childName||""
      },5000);
    }catch(_){return null;}
  }

  async function verifyEEGOnce(x){
    try{
      return await NeuronAPI.call("checkEEGBookingRequest",{
        eegBookingRequestId:x.id,
        appointmentId:x.payload.appointmentId,
        rowNumber:x.payload.rowNumber,
        city:x.payload.city
      },5000);
    }catch(_){return null;}
  }

  async function verifyTransaction(x){
    const first=x.type==="OPD_BOOKING"?await verifyOPDOnce(x):await verifyEEGOnce(x);
    if(first?.found)return {result:first,definitiveNotFound:false};
    if(!(first?.ok===true && first?.found===false))return {result:null,definitiveNotFound:false};
    await new Promise(resolve=>setTimeout(resolve,1500));
    const second=x.type==="OPD_BOOKING"?await verifyOPDOnce(x):await verifyEEGOnce(x);
    if(second?.found)return {result:second,definitiveNotFound:false};
    return {result:null,definitiveNotFound:second?.ok===true && second?.found===false};
  }

  async function reconcilePendingBookings(){
    if(!navigator.onLine || reconcileRunning || !window.IDB?.pending)return;
    reconcileRunning=true;
    try{
      const items=await window.IDB.pending().catch(()=>[]);
      if(!items.length){recoveringPatientNames=new Set();return;}

      for(const x of items){
      if(!x || !x.id)continue;
      const name=nameOf(x);
      recoveringPatientNames.add(normalizedName(name));
      showWorking(x);
      const checked=await verifyTransaction(x);

      if(checked.result?.found){
        try{await IDB.put("tx",{...x,status:"complete",result:checked.result,recoveredAt:Date.now()});}catch(_){}
        recoveringPatientNames.delete(normalizedName(name));
        showResult("recovered",x,checked.result);
        window.dispatchEvent(new CustomEvent("neuron:recovery-result",{detail:{status:"recovered",type:x.type,patientName:name,result:checked.result,payload:x.payload}}));
      }else if(checked.definitiveNotFound){
        try{await IDB.put("tx",{...x,status:"failed",failedAt:Date.now(),failureReason:"Request not found after recovery verification"});}catch(_){}
        recoveringPatientNames.delete(normalizedName(name));
        showResult("failed",x,null);
        window.dispatchEvent(new CustomEvent("neuron:recovery-result",{detail:{status:"failed",type:x.type,patientName:name,result:null,payload:x.payload}}));
      }
        // If verification was inconclusive because of network/server errors,
        // leave the transaction pending/uncertain and keep the patient blocked.
      }
    } finally {
      reconcileRunning=false;
    }
  }

  // Used by the OPD booking page immediately before a new submission. This
  // makes the same-patient rule robust even if recovery is still starting.
  async function isPatientRecovering(criteria){
    const c=typeof criteria==="string"?{name:criteria}:criteria||{};
    const targetName=normalizedName(c.name);
    const targetPhone=normalizedPhone(c.whatsapp);
    const targetCity=String(c.city||"").trim().toLowerCase();
    const targetDate=String(c.appointmentDate||"").trim();
    if(recoveringPatientNames.has(targetName) && !targetPhone && !targetCity)return true;
    const items=await window.IDB.pending().catch(()=>[]);
    return items.some(x=>{
      if(x.type!=="OPD_BOOKING")return false;
      const p=x.payload||{};
      const sameName=normalizedName(p.childName)===targetName;
      const samePhone=!targetPhone || normalizedPhone(p.whatsapp)===targetPhone;
      const sameCity=!targetCity || String(p.city||"").trim().toLowerCase()===targetCity;
      const sameDate=!targetDate || String(p.appointmentDate||"").trim()===targetDate;
      return sameName && samePhone && sameCity && sameDate;
    });
  }

  window.NeuronRecovery={
    reconcilePendingBookings,
    isPatientRecovering
  };

  function start(){
    ensureBar();
    if(navigator.onLine)reconcilePendingBookings();
  }

  window.addEventListener("online",()=>{reconcilePendingBookings();});
  document.addEventListener("DOMContentLoaded",start);
})();
