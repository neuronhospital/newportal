document.addEventListener("DOMContentLoaded",()=>{const isOPD=document.body.dataset.mode==="opd";let selected=null;$("city").innerHTML=NEURON_CONFIG.cities.map(x=>`<option>${x}</option>`).join("");$("load").onclick=async()=>{
 const btn=$("load"); const oldText=btn.textContent;
 btn.disabled=true; btn.textContent="Retrieving…";
 $("status").textContent="Retrieving patient information from the server…";
 $("status").style.color="#7b1fa2";
 try{const r=await NeuronAPI.call("getEEGPatientsByWhatsApp",{whatsapp:U.phone($("wa").value),city:$("city").value});$("patients").innerHTML="";r.patients.forEach((x,i)=>{const b=document.createElement("button");b.className="patient-option";b.innerHTML=`<b>${U.esc(x.name)}</b><small>${x.age} ${U.esc(x.ageUnit)} • ${U.date(x.date)}</small>`;b.onclick=()=>{selected=x;document.querySelectorAll(".patient-option").forEach(z=>z.classList.remove("selected"));b.classList.add("selected");$("edit").hidden=false;$("name").value=x.name;$("age").value=x.age;$("unit").value=x.ageUnit;$("address").value=x.address||"";$("ref").value=x.referredBy||"";if(isOPD){$("editWa").value=x.whatsapp;$("charge").value=x.opdCharges||0;$("mode").value=x.opdPaymentMode||((Number(x.opdCashPaid)>0&&Number(x.opdOnlinePaid)>0)?"Split":Number(x.opdOnlinePaid)>0?"Online":"Cash");$("cash").value=x.opdCashPaid||0;$("online").value=x.opdOnlinePaid||0}else{$("charge").value=x.eegCharges||0} $("mode").dispatchEvent(new Event("change"));};$("patients").appendChild(b);if(r.patients.length===1)b.click()})}catch(e){$("status").textContent=e.message;$("status").style.color="#b42318";}
 finally{btn.disabled=false;btn.textContent=oldText;}
};$("mode").onchange=()=>{
 const split=$("mode").value==="Split";
 $("cash").parentElement.parentElement.hidden=!split;
 $("online").parentElement.parentElement.hidden=!split;
 $("cash").disabled=!split;
 $("online").disabled=!split;
 let total=document.getElementById("splitUpdateTotal");
 if(split){
   if(!total){
     total=document.createElement("div");
     total.id="splitUpdateTotal";
     total.className="payment-total";
     $("online").parentElement.parentElement.insertAdjacentElement("afterend",total);
   }
   total.textContent=`Total Paid: ₹${(Number($("cash").value)||0)+(Number($("online").value)||0)}`;
   total.hidden=false;
 }else if(total){
   total.hidden=true;
 }
};
 $("mode").onchange();
 ["cash","online"].forEach(id=>$(id).addEventListener("input",()=>{
   if($("mode").value==="Split"){
     const total=document.getElementById("splitUpdateTotal");
     if(total)total.textContent=`Total Paid: ₹${(Number($("cash").value)||0)+(Number($("online").value)||0)}`;
   }
 }));
 $("save").onclick=async()=>{if(!selected)return;const id=U.uuid("upd"),m=$("mode").value,c=m==="Cash"?Number($("charge").value)||0:m==="Online"?0:Number($("cash").value)||0,o=m==="Online"?Number($("charge").value)||0:Number($("online").value)||0,p={updateRequestId:id,appointmentId:selected.appointmentId,city:selected.city,whatsapp:selected.whatsapp,whatsappNew:isOPD?U.phone($("editWa").value):selected.whatsapp,name:U.title($("name").value),age:Number($("age").value),ageUnit:$("unit").value,address:U.title($("address").value),referredBy:U.title($("ref").value)};if(isOPD){p.opdCharges=c+o;p.opdPaymentMode=m;p.opdCashPaid=c;p.opdOnlinePaid=o}else{p.eegCharges=c+o;p.eegPaymentMode=m;p.eegCashPaid=c;p.eegOnlinePaid=o}const action=isOPD?"updateOPDDetails":"updateEEGDetails";
if(isOPD && !/^[6-9]\d{9}$/.test(U.phone($("editWa").value))){
  $("status").textContent="Enter a valid 10-digit WhatsApp Number.";
  $("status").style.color="#b42318";
  return;
}
$("confirmation").hidden=true;
$("confirmation").innerHTML="";
await IDB.put("tx",{id,type:isOPD?"OPD_UPDATE":"EEG_UPDATE",status:"pending",payload:p});try{
 const r=await NeuronAPI.call(action,p,25000);
 await IDB.put("tx",{id,type:isOPD?"OPD_UPDATE":"EEG_UPDATE",status:"complete",payload:p,result:r});
 const before=r.before||{},after=r.after||{};
 const labels=isOPD
   ? [["name","Patient Name"],["age","Age"],["address","Address"],["whatsapp","WhatsApp Number"],["referredBy","Referred By"],["nextFollowupCity","Next Follow-up City"],["opdCharges","OPD Charges"],["opdPaymentMode","Payment Mode"],["opdCashPaid","Cash"],["opdOnlinePaid","Online"]]
   : [["name","Patient Name"],["age","Age"],["address","Address"],["referredBy","Referred By"],["eegCharges","EEG Charges"],["eegPaymentMode","Payment Mode"],["eegCashPaid","Cash"],["eegOnlinePaid","Online"]];
 const fmt=v=>v==null||v===""?"—":String(v);
 const changes=labels.filter(([k])=>String(before[k]??"")!==String(after[k]??""));
 let changeHtml=changes.length
   ? changes.map(([k,label])=>`<p><b>${U.esc(label)}:</b> ${U.esc(fmt(before[k]))} → <b>${U.esc(fmt(after[k]))}</b></p>`).join("")
   : "<p>No field values changed.</p>";
 $("confirmation").hidden=false;
 $("confirmation").innerHTML=`<div class="success"><div class="success-icon">✓</div><h2>Details Updated</h2><p>Appointment ID: <b>${U.esc(r.appointmentId)}</b></p><div class="updated-values">${changeHtml}</div></div>`;
}catch(e){
 const msg=String(e&&e.message||"");
 if(isOPD && /invalid whatsapp|valid 10-digit whatsapp/i.test(msg)){
   $("status").textContent="Enter a valid 10-digit WhatsApp Number.";
   $("status").style.color="#b42318";
   return;
 }
 await IDB.put("tx",{id,type:isOPD?"OPD_UPDATE":"EEG_UPDATE",status:"uncertain",payload:p});
 alert("Update status is uncertain. Do not repeat it until the original request is checked.");
}}});