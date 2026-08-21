document.addEventListener("DOMContentLoaded",()=>{
const isOPD=document.body.dataset.mode==="opd";
let selected=null;
let original=null;
let opdPaymentMode="Cash";
$("city").innerHTML=NEURON_CONFIG.cities.map(x=>`<option>${x}</option>`).join("");

function setLoadState(loading){
  const b=$("load");
  b.disabled=loading;
  b.textContent=loading?"Loading...":"Load";
  b.classList.toggle("btn-primary",loading);
  b.classList.toggle("btn-secondary",!loading);
}
function setUpdateState(updating){
  const b=$("save");
  b.disabled=updating;
  b.textContent=updating?"Updating OPD Details...":"Update Details";
  b.classList.toggle("btn-success",updating);
}
function money(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function paymentModeFromPatient(x){
  const c=money(x.opdCashPaid),o=money(x.opdOnlinePaid);
  if(c>0&&o>0)return "Split";
  if(o>0)return "Online";
  return "Cash";
}
function updateSplitTotal(){
  if(!isOPD||opdPaymentMode!=="Split")return;
  const total=money($("opdSplitCash").value)+money($("opdSplitOnline").value);
  $("opdSplitTotal").textContent=`Total Sum of charges: ₹${total}`;
}
function renderOPDPayment(x){
  if(!isOPD)return;
  opdPaymentMode=paymentModeFromPatient(x);
  const c=money(x.opdCashPaid),o=money(x.opdOnlinePaid);
  $("opdPaymentSection").hidden=false;
  $("opdSinglePayment").hidden=opdPaymentMode==="Split";
  $("opdSplitPayment").hidden=opdPaymentMode!=="Split";
  $("opdSplitTotal").hidden=opdPaymentMode!=="Split";
  if(opdPaymentMode==="Cash"){
    $("opdPaymentTitle").textContent="OPD Charges Paid in Cash";
    $("opdPaidAmount").value=c||money(x.opdCharges);
  }else if(opdPaymentMode==="Online"){
    $("opdPaymentTitle").textContent="OPD Charges Paid in Online";
    $("opdPaidAmount").value=o||money(x.opdCharges);
  }else{
    $("opdPaymentTitle").textContent="OPD Charges Paid in Split";
    $("opdSplitCash").value=c;
    $("opdSplitOnline").value=o;
    updateSplitTotal();
  }
}
function clearOPDState(){
  if(!isOPD)return;
  selected=null;original=null;opdPaymentMode="Cash";
  $("patients").innerHTML="";
  $("edit").hidden=true;
  $("confirmation").hidden=true;
  $("confirmation").innerHTML="";
  $("status").textContent="";
  $("opdPaymentSection").hidden=true;
  $("opdSplitPayment").hidden=true;
  $("opdSplitTotal").hidden=true;
}
function showChangedValues(before,after){
  const fields=[
    ["Patient Name","name"],["Age","age"],["Age Unit","ageUnit"],["Address","address"],["Referred By Dr./Hospital","referredBy"],["Correct WhatsApp Number","whatsapp"],["OPD Charges Paid in Cash","opdCashPaid"],["OPD Charges Paid Online","opdOnlinePaid"],["OPD Total Paid","opdTotalPaid"]
  ];
  const changed=fields.filter(([_,k])=>String(before?.[k]??"")!==String(after?.[k]??""));
  const rows=changed.length?changed.map(([label,k])=>`<div class="confirm-row"><span>${U.esc(label)}</span><b>${U.esc(String(before?.[k]??"—"))} → ${U.esc(String(after?.[k]??"—"))}</b></div>`).join(""):"<p>No values were changed.</p>";
  $("confirmation").hidden=false;
  $("confirmation").innerHTML=`<div class="success"><div class="success-icon">✓</div><h2>Details Updated</h2><p>Appointment ID: <b>${U.esc(after?.appointmentId||"")}</b></p><h3>Changed and Updated Values</h3>${rows}</div>`;
}

$("load").onclick=async()=>{
  if(isOPD)clearOPDState();
  setLoadState(true);
  if(isOPD)$("status").textContent="Wait we are retriveing Today's OPD details from system...";
  try{
    const r=await NeuronAPI.call("getEEGPatientsByWhatsApp",{whatsapp:U.phone($("wa").value),city:$("city").value});
    $("patients").innerHTML="";
    r.patients.forEach((x)=>{
      const b=document.createElement("button");
      b.className="patient-option";
      b.innerHTML=`<b>${U.esc(x.name)}</b><small>${x.age} ${U.esc(x.ageUnit)} • ${U.date(x.date)}</small>`;
      b.onclick=()=>{
        selected=x;original={...x};
        document.querySelectorAll(".patient-option").forEach(z=>z.classList.remove("selected"));
        b.classList.add("selected");
        $("confirmation").hidden=true;
        $("confirmation").innerHTML="";
        $("edit").hidden=false;
        $("name").value=x.name||"";
        $("age").value=x.age??"";
        $("unit").value=x.ageUnit||"years";
        $("address").value=x.address||"";
        $("ref").value=x.referredBy||"";
        if(isOPD){$("editWa").value=x.whatsapp||"";renderOPDPayment(x)}
        else $("charge").value=x.eegCharges||0;
      };
      $("patients").appendChild(b);
      if(r.patients.length===1)b.click();
    });
    $("status").textContent="";
  }catch(e){$("status").textContent=e.message}
  finally{setLoadState(false)}
};

if(isOPD){
  $("opdSplitCash").addEventListener("input",updateSplitTotal);
  $("opdSplitOnline").addEventListener("input",updateSplitTotal);
}

$("save").onclick=async()=>{
  if(!selected)return;
  const id=U.uuid("upd");
  let m,c,o,total;
  if(isOPD){
    if(opdPaymentMode==="Cash"){m="Cash";c=money($("opdPaidAmount").value);o=0}
    else if(opdPaymentMode==="Online"){m="Online";c=0;o=money($("opdPaidAmount").value)}
    else {m="Split";c=money($("opdSplitCash").value);o=money($("opdSplitOnline").value)}
    total=c+o;
    if(total<=0){alert("Enter the OPD payment amount.");return;}
  }else{m="Cash";c=Number($("charge").value)||0;o=0;total=c}
  const p={updateRequestId:id,appointmentId:selected.appointmentId,city:selected.city,whatsapp:selected.whatsapp,whatsappNew:isOPD?U.phone($("editWa").value):selected.whatsapp,name:U.title($("name").value),age:Number($("age").value),ageUnit:$("unit").value,address:U.title($("address").value),referredBy:U.title($("ref").value)};
  if(isOPD){p.opdCharges=total;p.opdPaymentMode=m;p.opdCashPaid=c;p.opdOnlinePaid=o}else{p.eegCharges=total;p.eegPaymentMode=m;p.eegCashPaid=c;p.eegOnlinePaid=o}
  const action=isOPD?"updateOPDDetails":"updateEEGDetails";
  await IDB.put("tx",{id,type:isOPD?"OPD_UPDATE":"EEG_UPDATE",status:"pending",payload:p});
  if(isOPD){$("status").textContent="Wait we are updating OPD details to system...";setUpdateState(true)}
  try{
    const r=await NeuronAPI.call(action,p,25000);
    await IDB.put("tx",{id,type:isOPD?"OPD_UPDATE":"EEG_UPDATE",status:"complete",payload:p,result:r});
    if(isOPD){showChangedValues(r.before,r.after);original={...r.after};selected={...r.after};}
    else{$("confirmation").hidden=false;$("confirmation").innerHTML=`<div class="success"><div class="success-icon">✓</div><h2>Details Updated</h2><p>Appointment ID: <b>${U.esc(r.appointmentId)}</b></p><p>Updated values are now saved in the spreadsheet.</p></div>`}
  }catch(e){
    await IDB.put("tx",{id,type:isOPD?"OPD_UPDATE":"EEG_UPDATE",status:"uncertain",payload:p});
    alert("Update status is uncertain. Do not repeat it until the original request is checked.");
  }finally{if(isOPD){setUpdateState(false);$("status").textContent=""}}
};
});
