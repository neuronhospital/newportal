(() => {
  const UI_KEY="neuronRecoveryStateV2";
  const PREFILL_KEY="neuronRecoveryPrefillV1";
  const VERIFICATION_TIMEOUTS=[5000,8000,12000];
  const NOT_FOUND_DELAY_MS=2500;
  let bar=null;
  let popup=null;
  let reconcilePromise=null;
  const activeWorkers=new Set();
  const onlineWaiters=new Set();
  const pendingTimers=new Map();

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

  function recoveryPhaseText(x){
    const a=Math.max(1,Math.min(3,Number(x.attempt)||1));
    switch(x.phase){
      case "waiting_network": return "Waiting for network connection…";
      case "retry_wait": return `Verification ${a} of 3 — Waiting to retry…`;
      case "retrying": return `Verification ${a} of 3 — Checking appointment…`;
      case "confirming": return `Verification ${a} of 3 — Appointment not found · Confirming in 2.5 sec…`;
      case "verifying": return `Verification ${a} of 3 — Checking appointment…`;
      case "final": return "Verification 3 of 3 — Final confirmation…";
      default: return "Recovering appointment status…";
    }
  }

  function renderBar(){
    const states=readState();
    const active=states.find(x=>x.status==="recovering")||states.find(x=>x.status==="pending")||states.find(x=>x.status==="recovered"||x.status==="failed");
    const b=ensureBar();
    if(!active){b.hidden=true;return}
    const label=typeLabel(active.type),name=nameOf(active);
    if(active.status==="pending"){
      b.className="neuron-recovery-bar is-working";
      b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">↻</span><span><b>${esc(label)}</b> — Booking still in progress<br>Patient Name: <b>${esc(name)}</b><br>The previous booking request is still pending. We’ll verify it automatically after the normal timeout.</span>`;
    }else if(active.status==="recovering"){
      b.className="neuron-recovery-bar is-working";
      b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">↻</span><span><b>${esc(label)}</b> Recovery in progress<br>Patient Name: <b>${esc(name)}</b><br>${esc(recoveryPhaseText(active))}</span>`;
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
    const patient=r.patient&&typeof r.patient==="object"?r.patient:{};
    const valueFor=key=>r[key]??patient[key]??x.payload?.[key];
    const rows=[];
    const add=(label,key,fallback="")=>{let v=valueFor(key);if(v==null||v==="")v=fallback;if(v!==""&&v!=null)rows.push(`<div class="neuron-recovery-detail-row"><span>${esc(label)}</span><b>${esc(v)}</b></div>`)};
    add("Appointment ID","appointmentId");
    add("Patient Name","patientName",patient.name||nameOf(x));
    const age=valueFor("age"),ageUnit=valueFor("ageUnit");
    if(age!==undefined&&age!==null&&age!==""){
      const ageDisplay=ageUnit?`${age} ${ageUnit}`:String(age);
      rows.push(`<div class="neuron-recovery-detail-row"><span>Age</span><b>${esc(ageDisplay)}</b></div>`);
    }
    add("City","city");
    add("WhatsApp","whatsapp");
    body.innerHTML=`<h3 id="neuronRecoveryDetailsTitle">${esc(label)} Recovered Successfully</h3><div class="neuron-recovery-detail-list">${rows.join("")}</div>`;
    m.hidden=false;requestAnimationFrame(()=>{body.scrollTop=0;m.querySelector(".neuron-recovery-ok")?.focus()});
  }

  function bookAgain(x){
    const prefill={type:x.type,payload:x.payload||{},failedRecoveryId:x.id,createdAt:Date.now()};
    try{localStorage.setItem(PREFILL_KEY,JSON.stringify(prefill))}catch(_){ }
    removeState(x.id);renderBar();
    const target=x.type==="EEG_BOOKING"?"eeg_booking.html":x.type==="EEG_CALLS_BOOKING"?"eeg_calls_booking.html":"opd_booking.html";
    location.href=target;
  }

  async function verifyOPDOnce(x,timeout){try{return await NeuronAPI.call("checkBookingRequest",{bookingRequestId:x.id,city:x.payload.city,appointmentDate:x.payload.appointmentDate||"",whatsapp:x.payload.whatsapp||"",childName:x.payload.childName||x.payload.patientName||""},timeout)}catch(_){return null}}
  async function verifyEEGOnce(x,timeout){try{return await NeuronAPI.call("checkEEGBookingRequest",{eegBookingRequestId:x.id,appointmentId:x.payload.appointmentId,rowNumber:x.payload.rowNumber,city:x.payload.city},timeout)}catch(_){return null}}
  async function verifyEEGCallsOnce(x,timeout){try{return await NeuronAPI.call("checkEEGCallsBookingRequest",{bookingRequestId:x.id},timeout)}catch(_){return null}}

  const normalizeName=v=>String(v==null?"":v).trim().replace(/\s+/g," ").toLowerCase();
  const normalizePhone=v=>String(v==null?"":v).replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");
  function matchesRecoveredBooking(x,r){
    if(!r||r.ok!==true||r.found!==true)return false;
    const p=r.patient&&typeof r.patient==="object"?r.patient:{};
    const payload=x.payload||{};
    const expectedName=normalizeName(payload.childName||payload.patientName);
    const returnedName=normalizeName(r.patientName||p.name);
    if(expectedName&&(!returnedName||expectedName!==returnedName))return false;
    const expectedCity=String(payload.city||"").trim().toLowerCase();
    const returnedCity=String(r.city||p.city||"").trim().toLowerCase();
    if(expectedCity&&returnedCity&&expectedCity!==returnedCity)return false;
    if(x.type==="EEG_BOOKING"){
      const expectedAppointmentId=String(payload.appointmentId||"").trim();
      const returnedAppointmentId=String(r.appointmentId||p.appointmentId||"").trim();
      if(expectedAppointmentId&&(!returnedAppointmentId||expectedAppointmentId!==returnedAppointmentId))return false;
    }
    if(x.type==="EEG_CALLS_BOOKING"){
      const expectedPhone=normalizePhone(payload.whatsapp),returnedPhone=normalizePhone(r.whatsapp||p.whatsapp);
      if(expectedPhone&&(!returnedPhone||expectedPhone!==returnedPhone))return false;
    }
    const expectedDate=String(payload.appointmentDate||"").trim();
    const returnedDate=String(r.date||p.date||"").trim();
    if(expectedDate&&returnedDate&&expectedDate!==returnedDate)return false;
    return true;
  }

  function waitForOnline(){
    if(navigator.onLine)return Promise.resolve();
    return new Promise(resolve=>{
      const fn=()=>{window.removeEventListener("online",fn);onlineWaiters.delete(fn);resolve()};
      onlineWaiters.add(fn);window.addEventListener("online",fn,{once:true});
    });
  }

  async function syncSuccessfulBookingToTodayCaches_(booking){
    return IDB.syncBookingCaches_(booking);
  }
  async function syncRecoveredBookingToTodayCaches_(recoveredBooking){
    return IDB.syncBookingCaches_(recoveredBooking);
  }
  window.syncSuccessfulBookingToTodayCaches_=syncSuccessfulBookingToTodayCaches_;
  window.syncRecoveredBookingToTodayCaches_=syncRecoveredBookingToTodayCaches_;

  async function completeRecovery(x,result){
    clearPendingTimer(x.id);
    const booking={
      kind:x.type,
      appointmentId:result.appointmentId||x.payload?.appointmentId||"",
      date:result.date||x.payload?.appointmentDate||"",
      time:result.time||x.payload?.time||"",
      patientName:result.patientName||result.patient?.name||x.payload?.childName||x.payload?.patientName||"",
      age:result.age??result.patient?.age??x.payload?.age,
      ageUnit:result.ageUnit||result.patient?.ageUnit||x.payload?.ageUnit||"",
      address:(result.address??result.patient?.address??x.payload?.address)||"",
      patientType:(result.patientType??result.patient?.patientType??x.payload?.patientType)||"",
      whatsapp:(result.whatsapp??result.patient?.whatsapp??x.payload?.whatsapp)||"",
      city:result.city||result.patient?.city||x.payload?.city||"",
      referredBy:(result.referredBy??result.patient?.referredBy??x.payload?.referredBy)||"",
      nextFollowupCity:(result.nextFollowupCity??result.patient?.nextFollowupCity??x.payload?.nextFollowupCity)||"",
      bookingRequestId:x.type==="OPD_BOOKING"?x.id:(result.bookingRequestId||result.patient?.bookingRequestId||x.payload?.bookingRequestId||""),
      opdCharges:result.opdCharges??result.patient?.opdCharges,
      opdCashPaid:result.opdCashPaid??result.patient?.opdCashPaid,
      opdOnlinePaid:result.opdOnlinePaid??result.patient?.opdOnlinePaid,
      opdTotalPaid:result.opdTotalPaid??result.patient?.opdTotalPaid,
      eegCharges:result.eegCharges??result.patient?.eegCharges,
      eegCashPaid:result.eegCashPaid??result.patient?.eegCashPaid,
      eegOnlinePaid:result.eegOnlinePaid??result.patient?.eegOnlinePaid,
      eegTotalPaid:result.eegTotalPaid??result.patient?.eegTotalPaid,
      eegBookingRequestId:x.type==="EEG_BOOKING"?x.id:(result.eegBookingRequestId||result.patient?.eegBookingRequestId||x.payload?.eegBookingRequestId||""),
      rowNumber:result.rowNumber??result.patient?.rowNumber??x.payload?.rowNumber,
      paymentReceived:result.paymentReceived??result.patient?.paymentReceived??x.payload?.paymentReceived,
      eegTechnician:result.eegTechnician??result.patient?.eegTechnician??x.payload?.eegTechnician
    };
    try{await IDB.put("tx",{...x,status:"complete",result,recoveredAt:Date.now()});}catch(_){ }
    try{await syncRecoveredBookingToTodayCaches_(booking);}catch(_){ }
    upsertState({id:x.id,type:x.type,status:"recovered",payload:x.payload||{},result,phase:"recovered",updatedAt:Date.now()});
    renderBar();
    window.dispatchEvent(new CustomEvent("neuron:recovery-result",{detail:{status:"recovered",type:x.type,patientName:nameOf(x),result,payload:x.payload,globalHandled:true}}));
  }

  async function failRecovery(x){
    clearPendingTimer(x.id);
    // Persist the recovery journal state so it is no longer considered
    // pending. No IDB application cache is written or refreshed.
    try{await IDB.put("tx",{...x,status:"failed",failedAt:Date.now(),failureReason:"Request not found after recovery verification"});}catch(_){ }
    upsertState({id:x.id,type:x.type,status:"failed",payload:x.payload||{},result:null,phase:"failed",updatedAt:Date.now()});
    renderBar();
    window.dispatchEvent(new CustomEvent("neuron:recovery-result",{detail:{status:"failed",type:x.type,patientName:nameOf(x),result:null,payload:x.payload,globalHandled:true}}));
  }

  async function runRecovery(x){
    if(!x?.id||activeWorkers.has(x.id))return;
    activeWorkers.add(x.id);
    try{
      let attempt=Math.max(1,Math.min(3,Number(getState(x.id)?.attempt)||1));
      while(attempt<=3){
        if(!navigator.onLine){
          upsertState({id:x.id,status:"recovering",attempt,phase:"waiting_network",updatedAt:Date.now()});
          renderBar();
          await waitForOnline();
          if(!getState(x.id)||getState(x.id).status!=="recovering")return;
          continue;
        }

        upsertState({id:x.id,status:"recovering",attempt,phase:attempt===3?"final":"verifying",updatedAt:Date.now()});
        renderBar();
        const verify=x.type==="OPD_BOOKING"?verifyOPDOnce:x.type==="EEG_BOOKING"?verifyEEGOnce:verifyEEGCallsOnce;
        const result=await verify(x,VERIFICATION_TIMEOUTS[attempt-1]);

        if(result?.ok===true&&result?.found===true){
          if(matchesRecoveredBooking(x,result)){
            await completeRecovery(x,result);
            return;
          }
          // A positive response that does not match the original request is
          // an unresolved verification result. Consume this attempt and move
          // to the next verification after the fixed 2.5 second gap.
          if(attempt===3){await failRecovery(x);return;}
          upsertState({id:x.id,status:"recovering",attempt,phase:"retry_wait",updatedAt:Date.now()});
          renderBar();
          await new Promise(resolve=>setTimeout(resolve,NOT_FOUND_DELAY_MS));
          if(!getState(x.id)||getState(x.id).status!=="recovering")return;
          attempt+=1;
          upsertState({id:x.id,status:"recovering",attempt,phase:"verifying",updatedAt:Date.now()});
          renderBar();
          continue;
        }

        if(result?.ok===true&&result?.found===false){
          if(attempt===3){await failRecovery(x);return;}
          upsertState({id:x.id,status:"recovering",attempt,phase:"confirming",updatedAt:Date.now()});
          renderBar();
          await new Promise(resolve=>setTimeout(resolve,NOT_FOUND_DELAY_MS));
          if(!getState(x.id)||getState(x.id).status!=="recovering")return;
          attempt+=1;
          upsertState({id:x.id,status:"recovering",attempt,phase:"verifying",updatedAt:Date.now()});
          renderBar();
          continue;
        }

        // The verification request failed, timed out, or returned an unusable
        // response. If the browser is now offline, do not consume the attempt:
        // wait for the online event and repeat this same verification attempt.
        // If the browser is online, this was a real failed verification attempt
        // and it must be consumed before advancing after the fixed 2.5s gap.
        if(!navigator.onLine){
          upsertState({id:x.id,status:"recovering",attempt,phase:"waiting_network",updatedAt:Date.now()});
          renderBar();
          await waitForOnline();
          continue;
        }
        if(attempt===3){await failRecovery(x);return;}
        upsertState({id:x.id,status:"recovering",attempt,phase:"retry_wait",updatedAt:Date.now()});
        renderBar();
        await new Promise(resolve=>setTimeout(resolve,NOT_FOUND_DELAY_MS));
        if(!getState(x.id)||getState(x.id).status!=="recovering")return;
        attempt+=1;
        upsertState({id:x.id,status:"recovering",attempt,phase:"verifying",updatedAt:Date.now()});
        renderBar();
        continue;
      }
    }finally{
      activeWorkers.delete(x.id);
      renderBar();
    }
  }

  function pendingTiming(x){
    const startedAt=Number(x?.startedAt)||Number(x?.updatedAt)||0;
    const timeoutMs=Number(x?.timeoutMs)||15000;
    return {startedAt,timeoutMs};
  }

  function clearPendingTimer(id){
    const t=pendingTimers.get(id);
    if(t){clearTimeout(t);pendingTimers.delete(id);}
  }

  function schedulePendingExpiry(x){
    if(!x?.id)return;
    clearPendingTimer(x.id);
    const {startedAt,timeoutMs}=pendingTiming(x);
    if(!startedAt||!Number.isFinite(timeoutMs)||timeoutMs<=0)return;
    const delay=Math.max(0,startedAt+timeoutMs-Date.now()+10);
    const timer=setTimeout(()=>{pendingTimers.delete(x.id);reconcilePendingBookings();},delay);
    pendingTimers.set(x.id,timer);
  }

  async function reconcilePendingBookings(){
    if(reconcilePromise)return reconcilePromise;
    if(!window.IDB?.pending)return;
    reconcilePromise=(async()=>{
      try{
        const all=(await window.IDB.pending().catch(()=>[])).filter(x=>x?.id);
        const uncertain=[];
        const livePending=[];
        const now=Date.now();
        for(const x of all){
          if(x.status==="uncertain"){
            uncertain.push(x);
            continue;
          }
          if(x.status!=="pending")continue;
          const {startedAt,timeoutMs}=pendingTiming(x);
          if(startedAt&&Number.isFinite(timeoutMs)&&timeoutMs>0&&now>=startedAt+timeoutMs){
            const promoted={...x,status:"uncertain",uncertainAt:now};
            try{await IDB.put("tx",promoted);uncertain.push(promoted);clearPendingTimer(x.id);}catch(_){
              livePending.push(x);
            }
          }else{
            livePending.push(x);
            upsertState({id:x.id,type:x.type,status:"pending",payload:x.payload||{},startedAt,timeoutMs,updatedAt:now});
            schedulePendingExpiry(x);
          }
        }

        const activeIds=new Set([...uncertain,...livePending].map(x=>x.id));
        readState().filter(x=>(x.status==="recovering"||x.status==="pending")&&!activeIds.has(x.id)&&!activeWorkers.has(x.id)).forEach(x=>{clearPendingTimer(x.id);removeState(x.id)});

        for(const x of uncertain){
          const existing=getState(x.id);
          upsertState({id:x.id,type:x.type,status:"recovering",payload:x.payload||{},result:existing?.result||null,attempt:existing?.attempt||1,phase:(!navigator.onLine?"waiting_network":existing?.phase||"retrying"),updatedAt:Date.now()});
          renderBar();
          // Start recovery in the background. Do not await the worker, so the
          // coordinator and normal website operations remain non-blocking.
          runRecovery(x);
        }
        if(!navigator.onLine&&uncertain.length){
          readState().filter(x=>x.status==="recovering").forEach(x=>upsertState({id:x.id,phase:"waiting_network",updatedAt:Date.now()}));
          renderBar();
        }else if(livePending.length&&!uncertain.length){
          renderBar();
        }
      }finally{
        reconcilePromise=null;
        renderBar();
      }
    })();
    return reconcilePromise;
  }

  async function isPatientRecovering(criteria){
    const c=typeof criteria==="string"?{name:criteria}:criteria||{};
    const targetName=normalizeName(c.name),targetPhone=normalizePhone(c.whatsapp),targetCity=String(c.city||"").trim().toLowerCase(),targetDate=String(c.appointmentDate||"").trim(),targetType=String(c.type||"OPD_BOOKING").trim();
    const states=readState();
    if(states.some(x=>x.type===targetType&&x.status==="recovering"&&normalizeName(x.payload?.childName||x.payload?.patientName)===targetName))return true;
    const items=await window.IDB.pending().catch(()=>[]);
    return items.some(x=>{if(x.type!==targetType)return false;const p=x.payload||{};const sameName=normalizeName(p.childName||p.patientName)===targetName;const samePhone=!targetPhone||normalizePhone(p.whatsapp)===targetPhone;const sameCity=!targetCity||String(p.city||"").trim().toLowerCase()===targetCity;const sameDate=!targetDate||String(p.appointmentDate||"").trim()===targetDate;return sameName&&samePhone&&sameCity&&sameDate});
  }

  window.NeuronRecovery={reconcilePendingBookings,isPatientRecovering};

  function start(){
    ensureBar();ensurePopup();renderBar();reconcilePendingBookings();
  }
  window.addEventListener("online",()=>{
    onlineWaiters.forEach(fn=>{try{fn()}catch(_){}});
    reconcilePendingBookings();
  });
  document.addEventListener("DOMContentLoaded",start);
})();
