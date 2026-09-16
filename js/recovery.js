(() => {
  const UI_KEY="neuronRecoveryStateV2";
  const PREFILL_KEY="neuronRecoveryPrefillV1";
  let reconcileRunning=false;
  let bar=null;
  let popup=null;

  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const nameOf=x=>String(x?.payload?.childName||x?.payload?.patientName||"Patient").trim()||"Patient";
  const typeLabel=t=>t==="EEG_BOOKING"?"EEG Booking":t==="EEG_CALLS_BOOKING"?"EEG Calls Booking":"OPD Booking";
  const readState=()=>{try{const x=JSON.parse(localStorage.getItem(UI_KEY)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}};
  const writeState=a=>{try{localStorage.setItem(UI_KEY,JSON.stringify(a))}catch(_){} };
  const upsertState=x=>{const a=readState();const i=a.findIndex(r=>r.id===x.id);if(i>=0)a[i]={...a[i],...x};else a.push(x);writeState(a);return x};
  const removeState=id=>writeState(readState().filter(x=>x.id!==id));
  const getState=id=>readState().find(x=>x.id===id)||null;

  function ensureBar(){
    if(bar&&document.body.contains(bar))return bar;
    bar=document.createElement("div");bar.id="neuronRecoveryBar";bar.className="neuron-recovery-bar";bar.hidden=true;
    document.body.insertBefore(bar,document.body.firstChild);return bar;
  }
  function ensurePopup(){
    if(popup&&document.body.contains(popup))return popup;
    popup=document.createElement("div");popup.id="neuronRecoveryDetails";popup.className="neuron-recovery-modal";popup.hidden=true;
    popup.innerHTML='<div class="neuron-recovery-backdrop"></div><div class="neuron-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="neuronRecoveryDetailsTitle"><div class="neuron-recovery-dialog-body"></div><div class="neuron-recovery-dialog-actions"><button type="button" class="neuron-recovery-ok">OK</button></div></div>';
    document.body.appendChild(popup);
    popup.querySelector(".neuron-recovery-backdrop").onclick=closeDetails;
    popup.querySelector(".neuron-recovery-ok").onclick=closeDetails;
    return popup;
  }
  function closeDetails(){if(popup)popup.hidden=true}

  function renderBar(){
    const states=readState();
    const active=states.find(x=>x.status==="recovering")||states.find(x=>x.status==="recovered"||x.status==="failed");
    const b=ensureBar();
    if(!active){b.hidden=true;return}
    const label=typeLabel(active.type),name=nameOf(active);
    if(active.status==="recovering"){
      b.className="neuron-recovery-bar is-working";
      b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">↻</span><span><b>${esc(label)}</b> Recovery in progress<br>Patient Name: <b>${esc(name)}</b><br>The system is recovering the appointment status…</span>`;
    }else if(active.status==="recovered"){
      b.className="neuron-recovery-bar is-success";
      b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">✓</span><span class="neuron-recovery-content"><b>${esc(label)} Recovered Successfully</b><br>Patient Name: <b>${esc(name)}</b><br>Appointment ID: <b>${esc(active.result?.appointmentId||"")}</b><br><span class="neuron-recovery-actions"><button type="button" class="neuron-recovery-action-ok">OK</button><button type="button" class="neuron-recovery-details-btn">See Details</button></span></span>`;
      b.querySelector(".neuron-recovery-action-ok").onclick=()=>{removeState(active.id);renderBar()};
      b.querySelector(".neuron-recovery-details-btn").onclick=()=>showDetails(active);
    }else{
      b.className="neuron-recovery-bar is-failed";
      b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">⚠</span><span class="neuron-recovery-content"><b>${esc(label)} Recovery Failed</b><br>Patient Name: <b>${esc(name)}</b><br>Appointment ID: <b>${esc(active.result?.appointmentId||active.payload?.appointmentId||"")}</b><br><span class="neuron-recovery-actions"><button type="button" class="neuron-recovery-action-ok">OK</button><button type="button" class="neuron-recovery-book-again">Book Again</button></span></span>`;
      b.querySelector(".neuron-recovery-action-ok").onclick=()=>{removeState(active.id);renderBar()};
      b.querySelector(".neuron-recovery-book-again").onclick=()=>bookAgain(active);
    }
    b.hidden=false;
  }

  function showDetails(x){
    const m=ensurePopup(),body=m.querySelector(".neuron-recovery-dialog-body"),label=typeLabel(x.type),r=x.result||{};
    const fields=[];
    const patient=r.patient&&typeof r.patient==="object"?r.patient:{};
    const valueFor=key=>r[key]??patient[key]??x.payload?.[key];
    const add=(label,key,fallback="")=>{let v=valueFor(key);if(v==null||v==="")v=fallback;if(v!==""&&v!=null)fields.push(`<div class="neuron-recovery-detail-row"><span>${esc(label)}</span><b>${esc(v)}</b></div>`)};
    add("Appointment ID","appointmentId");
    add("Patient Name","patientName",patient.name||nameOf(x));
    add("Age","age");add("Age Unit","ageUnit");add("City","city");add("Address","address");add("WhatsApp","whatsapp");add("Referred By","referredBy");add("EEG Technician","eegTechnician");add("Patient Type","patientType");add("OPD Charges","opdCharges");add("OPD Cash Paid","opdCashPaid");add("OPD Online Paid","opdOnlinePaid");add("OPD Total Paid","opdTotalPaid");add("EEG Charges","eegCharges");add("EEG Cash Paid","eegCashPaid");add("EEG Online Paid","eegOnlinePaid");add("EEG Total Paid","eegTotalPaid");add("Payment Received","paymentReceived");add("Date","date");add("Next Follow-up City","nextFollowupCity");
    body.innerHTML=`<h3 id="neuronRecoveryDetailsTitle">${esc(label)} Recovered Successfully</h3><div class="neuron-recovery-detail-list">${fields.join("")}</div>`;
    m.hidden=false;requestAnimationFrame(()=>m.querySelector(".neuron-recovery-ok")?.focus());
  }

  function bookAgain(x){
    const prefill={type:x.type,payload:x.payload||{},failedRecoveryId:x.id,createdAt:Date.now()};
    try{localStorage.setItem(PREFILL_KEY,JSON.stringify(prefill))}catch(_){ }
    removeState(x.id);renderBar();
    const target=x.type==="EEG_BOOKING"?"eeg_booking.html":x.type==="EEG_CALLS_BOOKING"?"eeg_calls_booking.html":"opd_booking.html";
    location.href=target;
  }

  async function verifyOPDOnce(x){try{return await NeuronAPI.call("checkBookingRequest",{bookingRequestId:x.id,city:x.payload.city,appointmentDate:x.payload.appointmentDate||"",whatsapp:x.payload.whatsapp||"",childName:x.payload.childName||""},5000)}catch(_){return null}}
  async function verifyEEGOnce(x){try{return await NeuronAPI.call("checkEEGBookingRequest",{eegBookingRequestId:x.id,appointmentId:x.payload.appointmentId,rowNumber:x.payload.rowNumber,city:x.payload.city},5000)}catch(_){return null}}
  async function verifyEEGCallsOnce(x){try{return await NeuronAPI.call("checkEEGCallsBookingRequest",{bookingRequestId:x.id},5000)}catch(_){return null}}
  async function verifyTransaction(x){
    const verify=x.type==="OPD_BOOKING"?verifyOPDOnce:x.type==="EEG_BOOKING"?verifyEEGOnce:verifyEEGCallsOnce;
    const first=await verify(x);if(first?.found)return{result:first,definitiveNotFound:false};
    if(!(first?.ok===true&&first?.found===false))return{result:null,definitiveNotFound:false};
    await new Promise(r=>setTimeout(r,1500));const second=await verify(x);
    if(second?.found)return{result:second,definitiveNotFound:false};
    return{result:null,definitiveNotFound:second?.ok===true&&second?.found===false};
  }

  async function reconcilePendingBookings(){
    if(!navigator.onLine||reconcileRunning||!window.IDB?.pending)return;
    reconcileRunning=true;
    try{
      const items=await window.IDB.pending().catch(()=>[]);
      const pendingIds=new Set(items.map(x=>x?.id).filter(Boolean));
      readState().filter(x=>x.status==="recovering"&&!pendingIds.has(x.id)).forEach(x=>removeState(x.id));
      for(const x of items){
        if(!x?.id)continue;
        const existing=getState(x.id);
        upsertState({id:x.id,type:x.type,status:"recovering",payload:x.payload||{},result:existing?.result||null,updatedAt:Date.now()});
        renderBar();
        const checked=await verifyTransaction(x);
        if(checked.result?.found){
          try{await IDB.put("tx",{...x,status:"complete",result:checked.result,recoveredAt:Date.now()})}catch(_){ }
          upsertState({id:x.id,type:x.type,status:"recovered",payload:x.payload||{},result:checked.result,updatedAt:Date.now()});
          renderBar();
          window.dispatchEvent(new CustomEvent("neuron:recovery-result",{detail:{status:"recovered",type:x.type,patientName:nameOf(x),result:checked.result,payload:x.payload,globalHandled:true}}));
        }else if(checked.definitiveNotFound){
          try{await IDB.put("tx",{...x,status:"failed",failedAt:Date.now(),failureReason:"Request not found after recovery verification"})}catch(_){ }
          upsertState({id:x.id,type:x.type,status:"failed",payload:x.payload||{},result:null,updatedAt:Date.now()});
          renderBar();
          window.dispatchEvent(new CustomEvent("neuron:recovery-result",{detail:{status:"failed",type:x.type,patientName:nameOf(x),result:null,payload:x.payload,globalHandled:true}}));
        }
      }
    }finally{reconcileRunning=false;renderBar()}
  }

  async function isPatientRecovering(criteria){
    const c=typeof criteria==="string"?{name:criteria}:criteria||{};
    const targetName=String(c.name||"").trim().replace(/\s+/g," ").toLowerCase();
    const normPhone=v=>String(v||"").replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");
    const targetPhone=normPhone(c.whatsapp),targetCity=String(c.city||"").trim().toLowerCase(),targetDate=String(c.appointmentDate||"").trim(),targetType=String(c.type||"OPD_BOOKING").trim();
    const states=readState();if(states.some(x=>x.type===targetType&&x.status==="recovering"&&String(x.payload?.childName||x.payload?.patientName||"").trim().replace(/\s+/g," ").toLowerCase()===targetName))return true;
    const items=await window.IDB.pending().catch(()=>[]);
    return items.some(x=>{if(x.type!==targetType)return false;const p=x.payload||{};const sameName=String(p.childName||p.patientName||"").trim().replace(/\s+/g," ").toLowerCase()===targetName;const samePhone=!targetPhone||normPhone(p.whatsapp)===targetPhone;const sameCity=!targetCity||String(p.city||"").trim().toLowerCase()===targetCity;const sameDate=!targetDate||String(p.appointmentDate||"").trim()===targetDate;return sameName&&samePhone&&sameCity&&sameDate});
  }

  window.NeuronRecovery={reconcilePendingBookings,isPatientRecovering};
  function start(){ensureBar();ensurePopup();renderBar();if(navigator.onLine)reconcilePendingBookings()}
  window.addEventListener("online",()=>reconcilePendingBookings());
  document.addEventListener("DOMContentLoaded",start);
})();
