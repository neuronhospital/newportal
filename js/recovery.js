(() => {
  const PREFILL_KEY="neuronRecoveryPrefillV1";
  let bar=null;
  let popup=null;
  let stateCache=[];

  const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const nameOf=x=>String(x?.payload?.childName||x?.payload?.patientName||"Patient").trim()||"Patient";
  const typeLabel=t=>t==="EEG_BOOKING"?"EEG Booking":t==="EEG_CALLS_BOOKING"?"EEG Calls Booking":t==="OPD_UPDATE"?"OPD Update":t==="EEG_UPDATE"?"EEG Update":t==="REFUND"?"Refund":"OPD Booking";
  const getState=id=>stateCache.find(x=>x.id===id)||null;

  function ensureBar(){
    if(bar&&document.body.contains(bar))return bar;
    bar=document.createElement("div");bar.id="neuronRecoveryBar";bar.className="neuron-recovery-bar";bar.hidden=true;
    const container=window.NeuronBackgroundStatus?.ensureContainer?.();
    if(container)container.appendChild(bar);
    else document.body.insertBefore(bar,document.body.firstChild);
    return bar;
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
    const mutation=x?.type==="OPD_UPDATE"||x?.type==="EEG_UPDATE"||x?.type==="REFUND";
    const a=Math.max(1,Math.min(3,Number(x.attempt)||1));
    switch(x.phase){
      case "waiting_network": return "Waiting for network connection…";
      case "retry_wait": return `Verification ${a} of 3 — Waiting to retry…`;
      case "retrying": return `Verification ${a} of 3 — Checking appointment…`;
      case "confirming": return `Verification ${a} of 3 — Appointment not found · Confirming in 2 sec…`;
      case "verifying": return mutation ? `Verification ${a} of 3 — Checking server status…` : `Verification ${a} of 3 — Checking appointment…`;
      case "final": return mutation ? "Verification 3 of 3 — Final server confirmation…" : "Verification 3 of 3 — Final confirmation…";
      default: return mutation ? "Recovering operation status…" : "Recovering appointment status…";
    }
  }

  function renderBar(){
    const states=Array.isArray(stateCache)?stateCache:[];
    const active=states.find(x=>x.status==="recovering")||states.find(x=>x.status==="pending")||states.find(x=>x.status==="recovered"||x.status==="failed");
    const b=ensureBar();
    if(!active){b.hidden=true;return}
    const label=typeLabel(active.type),name=nameOf(active);
    if(active.status==="pending"){
      b.className="neuron-recovery-bar is-working";
      if(active.type==="OPD_BOOKING"||active.type==="EEG_BOOKING"||active.type==="EEG_CALLS_BOOKING")
        b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">↻</span><span><b>${esc(label)}</b> — Booking still in progress<br>Patient Name: <b>${esc(name)}</b><br>The previous booking request is still pending. We’ll verify it automatically after the normal timeout.</span>`;
      else
        b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">↻</span><span><b>${esc(label)}</b> — Operation still in progress<br>Patient Name: <b>${esc(name)}</b><br>The previous operation is still pending. We’ll verify it automatically after the normal timeout.</span>`;
    }else if(active.status==="recovering"){
      b.className="neuron-recovery-bar is-working";
      const recoveryTitle=(active.type==="OPD_UPDATE"||active.type==="EEG_UPDATE"||active.type==="REFUND")?`Recovering ${label}`:`${label} Recovery in progress`;
      b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">↻</span><span><b>${esc(recoveryTitle)}</b><br>Patient Name: <b>${esc(name)}</b><br>${esc(recoveryPhaseText(active))}</span>`;
    }else if(active.status==="recovered"){
      b.className="neuron-recovery-bar is-success";
      const recoveredTitle=(active.type==="OPD_UPDATE"||active.type==="EEG_UPDATE"||active.type==="REFUND")?`${label} Recovered`:`${label} Recovered Successfully`;
      b.innerHTML=`<span class="neuron-recovery-icon" aria-hidden="true">✓</span><span class="neuron-recovery-content"><b>${esc(recoveredTitle)}</b><br>Patient Name: <b>${esc(name)}</b><br>Appointment ID: <b>${esc(active.result?.appointmentId||"")}</b><br><span class="neuron-recovery-actions"><button type="button" class="neuron-recovery-action-ok">OK</button><button type="button" class="neuron-recovery-details-btn">See Details</button></span></span>`;
      b.querySelector(".neuron-recovery-action-ok").onclick=()=>dismissState(active.id);
      b.querySelector(".neuron-recovery-details-btn").onclick=()=>showDetails(active);
    }else{
      b.className="neuron-recovery-bar is-failed";
      const failedTitle=(active.type==="OPD_UPDATE"||active.type==="EEG_UPDATE"||active.type==="REFUND")?`${label} Failed`:`${label} Recovery Failed`;
      b.innerHTML=active.type==="OPD_BOOKING"||active.type==="EEG_BOOKING"||active.type==="EEG_CALLS_BOOKING"
        ? `<span class="neuron-recovery-icon" aria-hidden="true">⚠</span><span class="neuron-recovery-content"><b>${esc(failedTitle)}</b><br>Patient Name: <b>${esc(name)}</b><br>Appointment ID: <b>${esc(active.result?.appointmentId||active.payload?.appointmentId||"")}</b><br><span class="neuron-recovery-actions"><button type="button" class="neuron-recovery-action-ok">OK</button><button type="button" class="neuron-recovery-book-again">Book Again</button></span></span>`
        : `<span class="neuron-recovery-icon" aria-hidden="true">⚠</span><span class="neuron-recovery-content"><b>${esc(failedTitle)}</b><br>Patient Name: <b>${esc(name)}</b><br>Appointment ID: <b>${esc(active.result?.appointmentId||active.payload?.appointmentId||"")}</b><br><span class="neuron-recovery-actions"><button type="button" class="neuron-recovery-action-ok">OK</button></span></span>`;
      b.querySelector(".neuron-recovery-action-ok").onclick=()=>dismissState(active.id);
      const again=b.querySelector(".neuron-recovery-book-again");
      if(again)again.onclick=()=>bookAgain(active);
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
    if(age!==undefined&&age!==null&&age!==""){const ageDisplay=ageUnit?`${age} ${ageUnit}`:String(age);rows.push(`<div class="neuron-recovery-detail-row"><span>Age</span><b>${esc(ageDisplay)}</b></div>`);}
    add("City","city");
    add("WhatsApp","whatsapp");
    const addPaid=(label,totalKey,cashKey,onlineKey)=>{let total=valueFor(totalKey);if(total==null||total===""){const cash=valueFor(cashKey),online=valueFor(onlineKey);if(cash!=null&&cash!==""||online!=null&&online!=="")total=(Number(cash)||0)+(Number(online)||0);}if(total!=null&&total!=="")rows.push(`<div class="neuron-recovery-detail-row"><span>${esc(label)}</span><b>₹${esc(total)}</b></div>`);};
    if(x.type==="OPD_BOOKING")addPaid("OPD Paid","opdTotalPaid","opdCashPaid","opdOnlinePaid");
    if(x.type==="EEG_BOOKING")addPaid("EEG Paid","eegTotalPaid","eegCashPaid","eegOnlinePaid");
    if(x.type==="OPD_UPDATE"){add("OPD Charges Paid","opdTotalPaid");add("Paid in Cash","opdCashPaid");add("Paid Online","opdOnlinePaid");}
    if(x.type==="EEG_UPDATE"){add("EEG Charges","eegCharges");add("Paid in Cash","eegCashPaid");add("Paid Online","eegOnlinePaid");}
    if(x.type==="REFUND"){const opdRefund=valueFor("opdRefund"),eegRefund=valueFor("eegRefund");let total=0;if(opdRefund!==undefined&&opdRefund!==null&&String(opdRefund)!==""){rows.push(`<div class="neuron-recovery-detail-row"><span>OPD Refund</span><b>₹${esc(opdRefund)}</b></div>`);total+=Number(opdRefund)||0;}if(eegRefund!==undefined&&eegRefund!==null&&String(eegRefund)!==""){rows.push(`<div class="neuron-recovery-detail-row"><span>EEG Refund</span><b>₹${esc(eegRefund)}</b></div>`);total+=Number(eegRefund)||0;}if(total>0)rows.push(`<div class="neuron-recovery-detail-row"><span>Total Refunded</span><b>₹${esc(total)}</b></div>`);}
    body.innerHTML=`<h3 id="neuronRecoveryDetailsTitle">${esc(label)} Recovered Successfully</h3><div class="neuron-recovery-detail-list">${rows.join("")}</div>`;
    m.hidden=false;requestAnimationFrame(()=>{body.scrollTop=0;m.querySelector(".neuron-recovery-ok")?.focus()});
  }

  function dismissState(id){
    stateCache=stateCache.filter(x=>x.id!==id);renderBar();
    void requestWorker("NEURON_RECOVERY_DISMISS").catch(()=>{});
  }
  function bookAgain(x){
    const prefill={type:x.type,payload:x.payload||{},failedRecoveryId:x.id,createdAt:Date.now()};
    try{localStorage.setItem(PREFILL_KEY,JSON.stringify(prefill))}catch(_){}
    dismissState(x.id);
    const target=x.type==="EEG_BOOKING"?"eeg_booking.html":x.type==="EEG_CALLS_BOOKING"?"eeg_calls_booking.html":"opd_booking.html";
    location.href=target;
  }

  async function requestWorker(type="NEURON_RECOVERY_RECONCILE"){
    try{
      if(!("serviceWorker" in navigator))return;
      const reg=await navigator.serviceWorker.ready;
      const c=navigator.serviceWorker.controller||reg.active||reg.waiting||reg.installing;
      if(c)c.postMessage({type});
    }catch(_){}
  }
  function handleState(state){stateCache=Array.isArray(state)?state:[];renderBar();}

  async function isPatientRecovering(criteria){
    const c=typeof criteria==="string"?{name:criteria}:criteria||{};
    const targetName=String(c.name||"").trim().replace(/\s+/g," ").toLowerCase();
    const targetPhone=String(c.whatsapp||"").replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");
    const targetCity=String(c.city||"").trim().toLowerCase(),targetDate=String(c.appointmentDate||"").trim(),targetType=String(c.type||"OPD_BOOKING").trim();
    const active=stateCache.some(x=>x.type===targetType&&x.status==="recovering"&&String(x.payload?.childName||x.payload?.patientName||"").trim().replace(/\s+/g," ").toLowerCase()===targetName);
    if(active)return true;
    const items=await window.IDB.pending().catch(()=>[]);
    return items.some(x=>{if(x.type!==targetType)return false;const p=x.payload||{};const sameName=String(p.childName||p.patientName||"").trim().replace(/\s+/g," ").toLowerCase()===targetName;const samePhone=!targetPhone||String(p.whatsapp||"").replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"")===targetPhone;const sameCity=!targetCity||String(p.city||"").trim().toLowerCase()===targetCity;const sameDate=!targetDate||String(p.appointmentDate||"").trim()===targetDate;return sameName&&samePhone&&sameCity&&sameDate});
  }

  window.NeuronRecovery={reconcilePendingBookings:()=>{void requestWorker();},isPatientRecovering};

  function start(){
    ensureBar();ensurePopup();renderBar();void requestWorker("NEURON_RECOVERY_CONNECT");
  }
  navigator.serviceWorker?.addEventListener("message",e=>{
    if(e.data?.type==="NEURON_RECOVERY_STATE")handleState(e.data.state);
    if(e.data?.type==="NEURON_RECOVERY_RESULT")window.dispatchEvent(new CustomEvent("neuron:recovery-result",{detail:e.data.detail||{}}));
  });
  navigator.serviceWorker?.addEventListener("controllerchange",()=>{void requestWorker("NEURON_RECOVERY_CONNECT");});
  document.addEventListener("DOMContentLoaded",start);
})();
