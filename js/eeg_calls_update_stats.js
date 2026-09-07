const EEG_CALLS_UPDATE_ACCESS_KEY="neuron_eeg_calls_update_access";
const EEG_CALLS_UPDATE_PASSWORD_HASH="7931486c46d8a4d07e683f1dfa62296fe5ffe494746c59b02a5540a1f1423390";
let eegCallsUpdateState={months:[],selected:null,busy:false,previousLoaded:false};

async function eegCallsUpdateSha256_(message){
  const data=new TextEncoder().encode(message);
  const hash=await crypto.subtle.digest("SHA-256",data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function eegCallsUpdateShow_(id,visible){const el=document.getElementById(id);if(el)el.hidden=!visible;}
function eegCallsUpdateEsc_(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
function eegCallsUpdateMoney_(n){return "₹"+(Number(n)||0).toLocaleString("en-IN");}
function eegCallsUpdateAge_(p){return p.ageText||((p.age!==""?p.age+" ":"")+String(p.ageUnit||""));}
function eegCallsUpdatePatientHtml_(p,editable){
  const age=eegCallsUpdateEsc_(eegCallsUpdateAge_(p));
  const details=`<strong>${eegCallsUpdateEsc_(p.patientName)}</strong><small>(${age} • ${eegCallsUpdateEsc_(p.address)} • ${eegCallsUpdateEsc_(p.whatsapp)} • ${eegCallsUpdateMoney_(p.paymentReceived)} • ${eegCallsUpdateEsc_(p.referredBy)})</small>`;
  if(editable) return `<button type="button" class="eeg-call-patient" data-row="${Number(p.rowNumber)||0}">${details}</button>`;
  return `<div class="eeg-call-patient" aria-label="${eegCallsUpdateEsc_(p.patientName)}">${details}</div>`;
}
function eegCallsUpdateRender_(r){
  const root=document.getElementById("monthlyStats");
  const months=Array.isArray(r.months)?r.months:[];
  eegCallsUpdateState.months=months;
  if(!months.length){root.innerHTML=`<div class="card eeg-calls-error">Unable to prepare EEG Calls details.</div>`;return;}
  let html="";
  months.forEach((m,i)=>{
    html+=`<section class="card month-card"><h2 class="month-heading">${eegCallsUpdateEsc_(m.label)} : <span class="month-summary">{ Total Calls = ${Number(m.totalCalls)||0}, Collection = ${eegCallsUpdateMoney_(m.collection)} }</span></h2>`;
    const shouldShowPatients=i<2 || eegCallsUpdateState.previousLoaded;
    if(shouldShowPatients){
      if(m.patients&&m.patients.length){
        html+=`<div class="patient-list">${m.patients.map(p=>eegCallsUpdatePatientHtml_(p,!!m.editable)).join("")}</div>`;
      }else{
        html+=`<div class="month-empty">No records available for this month.</div>`;
      }
    }
    html+=`</section>`;
  });
  root.innerHTML=html;
}
function eegCallsUpdateShowHistoryError_(message){
  const box=document.getElementById("historyError");
  if(!box)return;
  box.textContent=message; box.hidden=false;
}
function eegCallsUpdateClearHistoryError_(){const box=document.getElementById("historyError");if(box){box.textContent="";box.hidden=true;}}
async function eegCallsUpdateLoadPreviousCalls_(){
  const btn=document.getElementById("loadPreviousCalls");
  if(eegCallsUpdateState.previousLoaded||!btn)return;
  btn.disabled=true; btn.textContent="Loading Previous Calls...";
  eegCallsUpdateClearHistoryError_();
  try{
    const r=await NeuronAPI.call("getEEGCallsPreviousCalls",{},25000);
    if(!r||r.ok===false||!Array.isArray(r.months))throw Error("The previous EEG Calls response was incomplete or invalid.");
    const byKey=new Map(r.months.map(m=>[m.key,m]));
    eegCallsUpdateState.months=eegCallsUpdateState.months.map((m,i)=>{
      if(i<2)return m;
      const loaded=byKey.get(m.key);
      return loaded?{...m,...loaded,editable:false}:m;
    });
    eegCallsUpdateState.previousLoaded=true;
    eegCallsUpdateRender_({months:eegCallsUpdateState.months});
    btn.textContent="Previous Calls Loaded";
  }catch(e){
    eegCallsUpdateShowHistoryError_(e.message||"Unable to load previous EEG Calls. Please try again.");
    btn.disabled=false; btn.textContent="Load Previous Calls";
  }
}
function eegCallsUpdateDownloadCsv_(){
  eegCallsUpdateClearHistoryError_();
  try{
    const current=eegCallsUpdateState.months[0];
    if(!current)throw Error("Current-month EEG Calls data is unavailable.");
    const patients=Array.isArray(current.patients)?current.patients:[];
    const rows=["Mobile Number",...patients.map(p=>String(p.whatsapp||"").replace(/\D/g,""))].filter((v,i)=>i===0||v);
    if(rows.length===1)throw Error("No current-month patient mobile numbers are available to download.");
    const csv=rows.map(v=>`"${v.replace(/"/g,'""')}"`).join("\r\n")+"\r\n";
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    const now=new Date();
    const yyyy=now.getFullYear(),mm=String(now.getMonth()+1).padStart(2,"0");
    a.href=url; a.download=`EEG-Calls-${yyyy}-${mm}-Mobile-Numbers.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }catch(e){eegCallsUpdateShowHistoryError_(e.message||"Unable to download current-month EEG Calls details.");}
}
function eegCallsUpdateRenderEdit_(p){
  eegCallsUpdateState.selected=p;
  document.getElementById("selectedPatientName").textContent=p.patientName||"";
  document.getElementById("editName").value=p.patientName||"";
  document.getElementById("editAge").value=p.age??"";
  document.getElementById("editAgeUnit").value=p.ageUnit||"years";
  document.getElementById("editAddress").value=p.address||"";
  document.getElementById("editWhatsapp").value=p.whatsapp||"";
  document.getElementById("editReferredBy").value=p.referredBy||"";
  document.getElementById("editTechnician").value=p.eegTechnician||"";
  document.getElementById("editPayment").value=Number(p.paymentReceived)||0;
  eegCallsUpdateSetBusy_(false);
  eegCallsUpdateShow_("edit",true);
  eegCallsUpdateShow_("confirmation",false);
  document.getElementById("edit").scrollIntoView({behavior:"smooth",block:"start"});
}
function eegCallsUpdateSetBusy_(busy){
  eegCallsUpdateState.busy=busy;
  const edit=document.getElementById("edit");
  if(edit)edit.querySelectorAll("input,select,button").forEach(el=>el.disabled=busy);
  const save=document.getElementById("updateDetails");
  if(save){save.textContent=busy?"Updating EEG Details...":"Update Details";save.classList.toggle("update-busy",busy);}
  const status=document.getElementById("updateWait");
  if(status)status.hidden=!busy;
}
function eegCallsUpdateClearForm_(){
  ["editName","editAge","editAddress","editWhatsapp","editReferredBy","editTechnician","editPayment"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";});
  document.getElementById("editAgeUnit").value="years";
  document.getElementById("selectedPatientName").textContent="";
  eegCallsUpdateState.selected=null;
  eegCallsUpdateShow_("edit",false);
}
function eegCallsUpdateChangedFields_(before,after){
  const fields=[
    ["Patient Name",before.patientName,after.patientName],
    ["Age",`${before.age} ${before.ageUnit}`.trim(),`${after.age} ${after.ageUnit}`.trim()],
    ["Address",before.address,after.address],
    ["WhatsApp Number",before.whatsapp,after.whatsapp],
    ["Referred By Dr / Hospital",before.referredBy,after.referredBy],
    ["EEG Technician",before.eegTechnician,after.eegTechnician],
    ["Payment Received",eegCallsUpdateMoney_(before.paymentReceived),eegCallsUpdateMoney_(after.paymentReceived)]
  ];
  return fields.filter(f=>String(f[1]??"")!==String(f[2]??""));
}
function eegCallsUpdateShowConfirmation_(r){
  const changed=eegCallsUpdateChangedFields_(r.before||{},r.after||{});
  const box=document.getElementById("confirmation");
  box.innerHTML=`<div class="success"><div class="success-icon">✓</div><h2>EEG Details Updated Successfully</h2><p><b>Patient Name : ${eegCallsUpdateEsc_(r.after?.patientName||"")}</b></p><p><b>Changed Fields</b></p>${changed.length?`<ul class="changed-list">${changed.map(f=>`<li><b>${eegCallsUpdateEsc_(f[0])}</b>: ${eegCallsUpdateEsc_(String(f[1]??""))} → <b>${eegCallsUpdateEsc_(String(f[2]??""))}</b></li>`).join("")}</ul>`:`<p>No values were changed.</p>`}</div>`;
  eegCallsUpdateShow_("confirmation",true);
  setTimeout(()=>box.scrollIntoView({behavior:"smooth",block:"center"}),80);
}
async function eegCallsUpdateSubmit_(){
  const p=eegCallsUpdateState.selected;if(!p||eegCallsUpdateState.busy)return;
  const name=document.getElementById("editName").value.trim();
  const age=Number(document.getElementById("editAge").value);
  const ageUnit=document.getElementById("editAgeUnit").value;
  const address=document.getElementById("editAddress").value.trim();
  const whatsapp=document.getElementById("editWhatsapp").value.replace(/\D/g,"").slice(0,10);
  const referredBy=document.getElementById("editReferredBy").value.trim();
  const technician=document.getElementById("editTechnician").value.trim();
  const payment=Number(document.getElementById("editPayment").value);
  if(!name)return eegCallsUpdateError_("Please enter the patient's name.");
  if(!Number.isFinite(age)||age<=0)return eegCallsUpdateError_("Please enter a valid age.");
  if(!["years","months","days"].includes(ageUnit))return eegCallsUpdateError_("Please select a valid age unit.");
  if(!address)return eegCallsUpdateError_("Please enter the patient's address.");
  if(!/^[6-9]\d{9}$/.test(whatsapp))return eegCallsUpdateError_("Enter a valid 10-digit WhatsApp number.");
  if(!referredBy)return eegCallsUpdateError_("Please enter Referred By Dr / Hospital.");
  if(!technician)return eegCallsUpdateError_("Please enter the EEG Technician.");
  if(!Number.isFinite(payment)||payment<0)return eegCallsUpdateError_("Enter a valid Payment Received amount.");
  eegCallsUpdateSetBusy_(true);
  document.getElementById("updateError").hidden=true;
  try{
    const r=await NeuronAPI.call("updateEEGCallsPatientDetails",{rowNumber:p.rowNumber,appointmentId:p.appointmentId,patientName:name,age,ageUnit,address,whatsapp,referredBy,eegTechnician:technician,paymentReceived:payment},25000);
    if(!r||r.ok===false||!r.before||!r.after)throw Error("The EEG Calls update response was incomplete or invalid.");
    const m=eegCallsUpdateState.months.find(x=>Array.isArray(x.patients)&&x.patients.some(y=>Number(y.rowNumber)===Number(p.rowNumber)));
    if(m){
      const idx=m.patients.findIndex(y=>Number(y.rowNumber)===Number(p.rowNumber));
      if(idx>=0){m.patients[idx]={...m.patients[idx],...r.after,ageText:`${r.after.age} ${r.after.ageUnit}`,whatsapp:r.after.whatsapp,paymentReceived:r.after.paymentReceived};
        m.collection=(m.patients.reduce((t,x)=>t+(Number(x.paymentReceived)||0),0));
        m.totalCalls=m.patients.length;
      }
    }
    eegCallsUpdateRender_({months:eegCallsUpdateState.months});
    eegCallsUpdateClearForm_();
    eegCallsUpdateShowConfirmation_(r);
  }catch(e){
    eegCallsUpdateError_(e.message||"Unable to update EEG details. Please try again.");
    eegCallsUpdateSetBusy_(false);
  }
}
function eegCallsUpdateError_(message){
  const box=document.getElementById("updateError");if(!box)return;box.textContent=message;box.hidden=false;box.scrollIntoView({behavior:"smooth",block:"center"});
}
async function eegCallsUpdateLoad_(){
  eegCallsUpdateShow_("loading",true);eegCallsUpdateShow_("error",false);eegCallsUpdateShow_("portal",false);eegCallsUpdateShow_("edit",false);eegCallsUpdateShow_("confirmation",false);
  try{
    const r=await NeuronAPI.call("getEEGCallsUpdateStats",{},25000);
    if(!r||r.ok===false||!Array.isArray(r.months))throw Error("The EEG Calls data response was incomplete or invalid.");
    eegCallsUpdateRender_(r);eegCallsUpdateShow_("portal",true);
  }catch(e){
    const box=document.getElementById("error");
    box.innerHTML=`Unable to Load EEG Calls Details<br><span style="font-weight:600">${eegCallsUpdateEsc_(e.message||"Unexpected error. Please try again.")}</span><br><button id="retryEEGCalls" class="btn btn-secondary" type="button" style="margin-top:10px">Retry</button>`;
    eegCallsUpdateShow_("error",true);const retry=document.getElementById("retryEEGCalls");if(retry)retry.onclick=eegCallsUpdateLoad_;
  }finally{eegCallsUpdateShow_("loading",false);}
}

document.addEventListener("DOMContentLoaded",()=>{
  const gate=document.getElementById("gate"),password=document.getElementById("password"),enter=document.getElementById("enter");
  const showPortal=()=>{eegCallsUpdateShow_("gate",false);eegCallsUpdateLoad_();};
  if(localStorage.getItem(EEG_CALLS_UPDATE_ACCESS_KEY)==="1"){showPortal();}
  password.addEventListener("input",()=>{password.value=password.value.replace(/\D/g,"").slice(0,6);});
  enter.onclick=async()=>{
    enter.disabled=true;enter.textContent="Verifying…";
    try{
      if(!/^\d{6}$/.test(password.value))throw Error("Enter the 6-digit password.");
      const h=await eegCallsUpdateSha256_(password.value);
      if(h!==EEG_CALLS_UPDATE_PASSWORD_HASH)throw Error("Incorrect password.");
      localStorage.setItem(EEG_CALLS_UPDATE_ACCESS_KEY,"1");showPortal();
    }catch(e){
      const old=document.getElementById("secureError");if(old)old.remove();
      const err=document.createElement("div");err.id="secureError";err.className="eeg-calls-error";err.style.marginTop="10px";err.textContent=e.message||"Unable to access portal.";gate.appendChild(err);password.focus();
    }finally{enter.disabled=false;enter.textContent="Access Portal";}
  };
  document.getElementById("monthlyStats").addEventListener("click",e=>{const b=e.target.closest(".eeg-call-patient");if(!b)return;const row=Number(b.dataset.row);const patient=eegCallsUpdateState.months.flatMap(m=>Array.isArray(m.patients)?m.patients:[]).find(p=>Number(p.rowNumber)===row);if(patient)eegCallsUpdateRenderEdit_(patient);});
  document.getElementById("updateDetails").onclick=eegCallsUpdateSubmit_;
  document.getElementById("loadPreviousCalls").onclick=eegCallsUpdateLoadPreviousCalls_;
  document.getElementById("downloadDetails").onclick=eegCallsUpdateDownloadCsv_;
  document.getElementById("editWhatsapp").addEventListener("input",e=>{e.target.value=e.target.value.replace(/\D/g,"").slice(0,10);});
  password.focus();
});
