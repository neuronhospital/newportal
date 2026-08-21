document.addEventListener("DOMContentLoaded",()=>{
  const isOPD=document.body.dataset.mode==="opd";
  let selected=null;
  let original=null;
  $("city").innerHTML=NEURON_CONFIG.cities.map(x=>`<option>${x}</option>`).join("");

  if(isOPD){
    const resetOPD=()=>{
      selected=null;
      original=null;
      $("patients").innerHTML="";
      $("edit").hidden=true;
      $("confirmation").hidden=true;
      $("confirmation").innerHTML="";
      $("opdUpdateProgress").hidden=true;
      $("opdUpdateProgress").textContent="";
    };
    $("load").onclick=async()=>{
      resetOPD();
      $("status").textContent="";
      try{
        const r=await NeuronAPI.call("getEEGPatientsByWhatsApp",{whatsapp:U.phone($("wa").value),city:$("city").value});
        $("patients").innerHTML="";
        r.patients.forEach((x,i)=>{
          const b=document.createElement("button");
          b.className="patient-option";
          b.innerHTML=`<b>${U.esc(x.name)}</b><small>${x.age} ${U.esc(x.ageUnit)} • ${U.date(x.date)}</small>`;
          b.onclick=()=>{
            selected=x;
            original={name:x.name||"",age:Number(x.age),ageUnit:x.ageUnit||"",address:x.address||"",referredBy:x.referredBy||"",whatsapp:x.whatsapp||"",charge:Number(x.opdCharges)||0,mode:x.opdPaymentMode||"Cash",cash:Number(x.opdCashPaid)||0,online:Number(x.opdOnlinePaid)||0};
            document.querySelectorAll(".patient-option").forEach(z=>z.classList.remove("selected"));
            b.classList.add("selected");
            $("edit").hidden=false;
            $("confirmation").hidden=true;
            $("confirmation").innerHTML="";
            $("name").value=x.name;
            $("age").value=x.age;
            $("unit").value=x.ageUnit;
            $("address").value=x.address;
            $("ref").value=x.referredBy||"";
            $("editWa").value=x.whatsapp;
            $("charge").value=x.opdCharges;
            $("mode").value=x.opdPaymentMode||"Cash";
            $("cash").value=x.opdCashPaid||0;
            $("online").value=x.opdOnlinePaid||0;
            $("mode").onchange();
          };
          $("patients").appendChild(b);
          if(r.patients.length===1)b.click();
        });
      }catch(e){
        $("status").textContent=e.message;
      }
    };
  }else{
    $("load").onclick=async()=>{try{const r=await NeuronAPI.call("getEEGPatientsByWhatsApp",{whatsapp:U.phone($("wa").value),city:$("city").value});$("patients").innerHTML="";r.patients.forEach((x,i)=>{const b=document.createElement("button");b.className="patient-option";b.innerHTML=`<b>${U.esc(x.name)}</b><small>${x.age} ${U.esc(x.ageUnit)} • ${U.date(x.date)}</small>`;b.onclick=()=>{selected=x;document.querySelectorAll(".patient-option").forEach(z=>z.classList.remove("selected"));b.classList.add("selected");$("edit").hidden=false;$("name").value=x.name;$("age").value=x.age;$("unit").value=x.ageUnit;$("address").value=x.address;$("ref").value=x.referredBy||"";if(isOPD){$("editWa").value=x.whatsapp;$("charge").value=x.opdCharges}else{$("charge").value=x.eegCharges||0}};$("patients").appendChild(b);if(r.patients.length===1)b.click()})}catch(e){$("status").textContent=e.message}};
  }

  $("mode").onchange=()=>{const split=$("mode").value==="Split"; $("cash").disabled=!split && $("mode").value!=="Cash"; $("online").disabled=!split && $("mode").value!=="Online";};
  $("mode").onchange();

  if(isOPD){
    $("save").onclick=async()=>{
      if(!selected)return;
      const id=U.uuid("upd"),m=$("mode").value;
      const c=m==="Cash"?Number($("charge").value)||0:m==="Online"?0:Number($("cash").value)||0;
      const o=m==="Online"?Number($("charge").value)||0:Number($("online").value)||0;
      const p={updateRequestId:id,appointmentId:selected.appointmentId,city:selected.city,whatsapp:selected.whatsapp,whatsappNew:U.phone($("editWa").value),name:U.title($("name").value),age:Number($("age").value),ageUnit:$("unit").value,address:U.title($("address").value),referredBy:U.title($("ref").value),opdCharges:c+o,opdPaymentMode:m,opdCashPaid:c,opdOnlinePaid:o};
      const changed=[];
      const add=(label,before,after)=>{if(String(before??"")!==String(after??""))changed.push({label,before:before??"",after:after??""});};
      add("Patient Name",original.name,p.name);
      add("Age",original.age,p.age);
      add("Age Unit",original.ageUnit,p.ageUnit);
      add("Address",original.address,p.address);
      add("Referred By Dr./Hospital",original.referredBy,p.referredBy);
      add("Correct WhatsApp Number",original.whatsapp,p.whatsappNew);
      add("OPD Charges",original.charge,p.opdCharges);
      add("Payment Mode",original.mode,p.opdPaymentMode);
      add("Cash",original.cash,p.opdCashPaid);
      add("Online",original.online,p.opdOnlinePaid);
      $("save").disabled=true;
      $("save").textContent="Updating OPD Details...";
      $("save").style.backgroundColor="#198754";
      $("opdUpdateProgress").hidden=false;
      $("opdUpdateProgress").textContent="Wait we are updating OPD details to system...";
      $("confirmation").hidden=true;
      $("confirmation").innerHTML="";
      await IDB.put("tx",{id,type:"OPD_UPDATE",status:"pending",payload:p});
      try{
        const r=await NeuronAPI.call("updateOPDDetails",p,25000);
        await IDB.put("tx",{id,type:"OPD_UPDATE",status:"complete",payload:p,result:r});
        const list=changed.length?changed.map(v=>`<li><b>${U.esc(v.label)}</b>: ${U.esc(String(v.before))} → <b>${U.esc(String(v.after))}</b></li>`).join(""):"<li>No values were changed.</li>";
        $("confirmation").hidden=false;
        $("confirmation").innerHTML=`<div class="success"><div class="success-icon">✓</div><h2>OPD Details Updated</h2><p>Appointment ID: <b>${U.esc(r.appointmentId)}</b></p><p><b>Changed and updated values:</b></p><ul>${list}</ul></div>`;
        $("opdUpdateProgress").hidden=true;
        $("opdUpdateProgress").textContent="";
        $("save").disabled=false;
        $("save").textContent="Update Details";
        $("save").style.backgroundColor="";
      }catch(e){
        await IDB.put("tx",{id,type:"OPD_UPDATE",status:"uncertain",payload:p});
        $("opdUpdateProgress").hidden=true;
        $("opdUpdateProgress").textContent="";
        $("save").disabled=false;
        $("save").textContent="Update Details";
        $("save").style.backgroundColor="";
        alert("Update status is uncertain. Do not repeat it until the original request is checked.");
      }
    };
  }else{
    $("save").onclick=async()=>{if(!selected)return;const id=U.uuid("upd"),m=$("mode").value,c=m==="Cash"?Number($("charge").value)||0:m==="Online"?0:Number($("cash").value)||0,o=m==="Online"?Number($("charge").value)||0:Number($("online").value)||0,p={updateRequestId:id,appointmentId:selected.appointmentId,city:selected.city,whatsapp:selected.whatsapp,whatsappNew:isOPD?U.phone($("editWa").value):selected.whatsapp,name:U.title($("name").value),age:Number($("age").value),ageUnit:$("unit").value,address:U.title($("address").value),referredBy:U.title($("ref").value)};if(isOPD){p.opdCharges=c+o;p.opdPaymentMode=m;p.opdCashPaid=c;p.opdOnlinePaid=o}else{p.eegCharges=c+o;p.eegPaymentMode=m;p.eegCashPaid=c;p.eegOnlinePaid=o}const action=isOPD?"updateOPDDetails":"updateEEGDetails";await IDB.put("tx",{id,type:isOPD?"OPD_UPDATE":"EEG_UPDATE",status:"pending",payload:p});try{const r=await NeuronAPI.call(action,p,25000);await IDB.put("tx",{id,type:isOPD?"OPD_UPDATE":"EEG_UPDATE",status:"complete",payload:p,result:r});$("confirmation").hidden=false;$("confirmation").innerHTML=`<div class="success"><div class="success-icon">✓</div><h2>Details Updated</h2><p>Appointment ID: <b>${U.esc(r.appointmentId)}</b></p><p>Updated values are now saved in the spreadsheet.</p></div>`}catch(e){await IDB.put("tx",{id,type:isOPD?"OPD_UPDATE":"EEG_UPDATE",status:"uncertain",payload:p});alert("Update status is uncertain. Do not repeat it until the original request is checked.")}};
  }
});
