document.addEventListener("DOMContentLoaded",()=>{
  const $=U.$, cities=NEURON_CONFIG.cities;
  let type="Follow-up", verified=false, selected=null;
  let calendarYear=U.parts().y, calendarMonth=U.parts().m;

  // Show today's India-local date in the appointment field by default.
  // The field remains disabled until WhatsApp verification, and the calendar
  // remains collapsed until the user taps the date field.
  const setTodayDateDisplay=()=>{
    const p=U.parts();
    $("date").value=String(p.d).padStart(2,"0")+"-"+String(p.m).padStart(2,"0")+"-"+p.y;
  };

  const fillCities=()=>{
    $("city").innerHTML=cities.map(x=>`<option value="${x}">${x}</option>`).join("");
    $("next").innerHTML=cities.map(x=>`<option value="${x}">${x}</option>`).join("");
    $("city").value="Latur"; $("next").value="Latur";
  };

  const resetFields=(mode)=>{
    type=mode; verified=false; selected=null;
    $("follow").classList.toggle("active",mode==="Follow-up");
    $("new").classList.toggle("active",mode==="New");
    $("followFields").hidden=mode!=="Follow-up";
    $("newFields").hidden=mode!=="New";
    // In Follow-up mode, show only patient retrieval until a patient is selected.
    $("bookingFields").hidden=mode==="Follow-up";

    ["followWa","name","age","address","ref","wa"].forEach(id=>{$(id).value="";});
    $("date").value="";
    delete $("date").dataset.key;
    $("unit").value="years";
    $("city").value="Latur"; $("next").value="Latur";
    $("city").disabled=true; $("date").disabled=true; $("next").disabled=true; $("book").disabled=true;
    $("waStatus").textContent=""; $("waStatus").style.color="";
    $("followStatus").textContent=""; $("patients").innerHTML="";
    $("submitStatus").textContent="";
    $("confirmation").hidden=true; $("confirmation").innerHTML="";
    $("cal").hidden=true; $("cal").innerHTML="";
    $("payMode").value="Cash"; $("amount").value="500"; $("cash").value=""; $("online").value="";
    updatePaymentUI();
    calendarYear=U.parts().y; calendarMonth=U.parts().m;
  };

  const enableAfterWhatsApp=()=>{
    verified=true;
    $("city").disabled=false; $("date").disabled=false; $("next").disabled=false; $("book").disabled=false;
  };

  /*
   * IMPORTANT: Do not rewrite the input value on every keystroke.
   * Replacing el.value during input can interfere with Android/mobile
   * backspace behavior, especially when several words are present.
   *
   * While typing, the field is left untouched so spaces and Backspace
   * behave exactly like a normal input. Capitalization is applied when
   * the user leaves the field and again immediately before submission.
   */
  const titleTyping=(el)=>{
    el.value=U.titleTyping(el.value);
  };
  ["name","address","ref"].forEach(id=>{
    $(id).addEventListener("blur",e=>titleTyping(e.target));
  });

  const updatePaymentUI=()=>{
    const split=$("payMode").value==="Split";
    $("singleChargeField").hidden=split;
    $("splitField").hidden=!split;
    if(split){
      $("amount").value="";
      updateSplitTotal();
    }else{
      $("cash").value=""; $("online").value="";
      if(!$("amount").value)$("amount").value="500";
    }
  };
  const updateSplitTotal=()=>{
    const c=Math.max(0,Number($("cash").value)||0),o=Math.max(0,Number($("online").value)||0);
    $("splitTotal").textContent="Total: "+U.money(c+o);
    $("splitTotal").style.color=(c+o>2000)?"#b42318":"";
  };
  $("payMode").onchange=updatePaymentUI;
  $("cash").oninput=updateSplitTotal; $("online").oninput=updateSplitTotal;

  $("follow").onclick=async()=>{resetFields("Follow-up"); await setNextAvailableDate($("city").value); $("cal").hidden=true;};
  $("new").onclick=async()=>{resetFields("New"); await setNextAvailableDate($("city").value); $("cal").hidden=true;};

  $("wa").oninput=e=>e.target.value=U.phone(e.target.value);
  $("followWa").oninput=e=>e.target.value=U.phone(e.target.value);

  $("waBtn").onclick=()=>{
    const p=U.phone($("wa").value);
    if(!U.validPhone(p)){ $("waStatus").textContent="Enter a valid 10-digit number."; return; }
    window.open("https://wa.me/91"+p,"_blank");
    $("waStatus").textContent="✓ WhatsApp number confirmed";
    $("waStatus").style.color="#168a4a";
    enableAfterWhatsApp();
  };

  async function getCalendarDates(year,month,city){
    try{
      const r=await NeuronAPI.call("getAvailableDates",{city,year,month},12000);
      return r.dates||[];
    }catch(_){
      return Schedule.dates(city,year,month);
    }
  }

  async function renderCalendar(){
    const city=$("city").value;
    const today=U.parts();
    const dates=await getCalendarDates(calendarYear,calendarMonth,city);
    const first=new Date(Date.UTC(calendarYear,calendarMonth-1,1)).getUTCDay()||7;
    const last=new Date(Date.UTC(calendarYear,calendarMonth,0)).getUTCDate();
    const monthName=new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(Date.UTC(calendarYear,calendarMonth-1,1)));
    let h=`<div class="calendar-head"><button type="button" id="calPrev" class="calendar-nav" aria-label="Previous month">‹</button><strong>${monthName}</strong><button type="button" id="calNext" class="calendar-nav" aria-label="Next month">›</button></div>`;
    h+=`<div class="calendar-grid">`;
    ["M","T","W","T","F","S","S"].forEach(x=>h+=`<div class="calendar-weekday">${x}</div>`);
    for(let i=1;i<first;i++)h+="<span></span>";
    for(let d=1;d<=last;d++){
      const key=String(d).padStart(2,"0")+String(calendarMonth).padStart(2,"0")+calendarYear;
      const isPast=calendarYear<today.y || (calendarYear===today.y&&calendarMonth<today.m) || (calendarYear===today.y&&calendarMonth===today.m&&d<today.d);
      const isToday=calendarYear===today.y&&calendarMonth===today.m&&d===today.d;
      const isAvailable=dates.includes(key)&&!isPast;
      const isSelected=$("date").dataset.key===key;
      let cls=isSelected?"selected":isAvailable?"available":"unavailable";
      h+=`<button type="button" class="${cls}" ${isAvailable?`data-k="${key}"`:"disabled"}>${d}${isToday?'<small class="today-mark">Today</small>':""}</button>`;
    }
    h+=`</div><div class="legend">🟣 Available &nbsp; ⚫ Not Available &nbsp; 🟢 Selected</div>`;
    $("cal").innerHTML=h; $("cal").hidden=false;
    $("calPrev").onclick=async()=>{calendarMonth--;if(calendarMonth<1){calendarMonth=12;calendarYear--;}await renderCalendar();};
    $("calNext").onclick=async()=>{calendarMonth++;if(calendarMonth>12){calendarMonth=1;calendarYear++;}await renderCalendar();};
    $("cal").querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{
      $("date").value=U.date(b.dataset.k); $("date").dataset.key=b.dataset.k; $("cal").hidden=true;
    });
  }

  async function setFollowupDefaultDate(city){
    const today=U.parts();
    let y=today.y, m=today.m;
    // Search forward only for the first scheduled date that is today or later.
    // The calendar itself remains collapsed; this helper only sets the field.
    for(let step=0;step<13;step++){
      const dates=await getCalendarDates(y,m,city);
      const valid=(dates||[]).filter(k=>{
        const q=String(k).replace(/\\D/g,"");
        if(q.length!==8)return false;
        const d=Number(q.slice(0,2)), mm=Number(q.slice(2,4)), yy=Number(q.slice(4,8));
        return yy>today.y || (yy===today.y && (mm>today.m || (mm===today.m && d>=today.d)));
      }).sort();
      if(valid.length){
        $("date").value=U.date(valid[0]);
        $("date").dataset.key=valid[0];
        calendarYear=y; calendarMonth=m;
        $("cal").hidden=true;
        return;
      }
      m++;
      if(m>12){m=1;y++;}
    }
    $("date").value="";
    delete $("date").dataset.key;
    $("cal").hidden=true;
  }

  async function setNextAvailableDate(city){
    const today=U.parts();
    let y=today.y, m=today.m;
    for(let step=0;step<13;step++){
      const dates=await getCalendarDates(y,m,city);
      const valid=(dates||[]).map(k=>String(k).replace(/\\D/g,"")).filter(k=>{
        if(k.length!==8)return false;
        const d=Number(k.slice(0,2)), mm=Number(k.slice(2,4)), yy=Number(k.slice(4,8));
        return yy>today.y || (yy===today.y && (mm>today.m || (mm===today.m && d>=today.d)));
      }).sort();
      if(valid.length){
        $("date").value=U.date(valid[0]);
        $("date").dataset.key=valid[0];
        calendarYear=y; calendarMonth=m;
        return;
      }
      m++;
      if(m>12){m=1;y++;}
    }
    $("date").value="";
    delete $("date").dataset.key;
  }

  $("city").onchange=async()=>{
    $("next").value=$("city").value;
    delete $("date").dataset.key;
    const now=U.parts();calendarYear=now.y;calendarMonth=now.m;
    if(verified){
      await setNextAvailableDate($("city").value);
    }else{
      setTodayDateDisplay();
    }
    $("cal").hidden=true;
  };
  $("date").onclick=()=>renderCalendar();

  $("load").onclick=async()=>{
    const p=U.phone($("followWa").value);
    $("followStatus").textContent=""; $("patients").innerHTML="";
    if(!U.validPhone(p)){
      $("followStatus").textContent="Enter a valid 10-digit WhatsApp number.";
      $("followStatus").style.color="#b42318";
      return;
    }
    $("followStatus").textContent="Searching patient records…";
    $("followStatus").style.color="#7b1fa2";
    $("load").disabled=true;
    try{
      const r=await NeuronAPI.call("getPatientHistoryByWhatsApp",{whatsapp:p});
      $("patients").innerHTML="";
      r.patients.forEach((x)=>{
        const b=document.createElement("button"); b.type="button"; b.className="patient-option";
        b.innerHTML=`<b>${U.esc(x.name)}</b><small>${U.esc(x.age)} ${U.esc(x.ageUnit)} • ${U.esc(x.city)} • ${U.date(x.date)}</small>`;
        b.onclick=()=>{
          selected=x; document.querySelectorAll(".patient-option").forEach(z=>z.classList.remove("selected")); b.classList.add("selected");
          $("name").value=U.title(x.name); $("age").value=x.age; $("unit").value=x.ageUnit||"years"; $("address").value=U.title(x.address||""); $("ref").value=U.title(x.referredBy||"");
          $("city").value=x.city; $("next").value=x.nextFollowupCity||x.city;
          // Explicitly reveal the complete Follow-up editing/booking stage.
          // Use both hidden-property and attribute removal so the staged UI
          // cannot remain collapsed after patient selection.
          $("bookingFields").hidden=false;
          $("bookingFields").removeAttribute("hidden");
          $("newFields").hidden=false;
          $("newFields").removeAttribute("hidden");
          enableAfterWhatsApp();
          const now=U.parts();calendarYear=now.y;calendarMonth=now.m;
          // Follow-up date defaults to the first available visit date for
          // the selected visiting city. The calendar stays collapsed until
          // the receptionist clicks the date field.
          setFollowupDefaultDate(x.city);
        };
        $("patients").appendChild(b);
        if(r.patients.length===1)b.click();
      });
      if(!r.patients || !r.patients.length){
        $("followStatus").textContent="No patient found for this WhatsApp number.";
        $("followStatus").style.color="#b42318";
      }else{
        $("followStatus").textContent=`${r.patients.length} patient(s) found.`;
        $("followStatus").style.color="#168a4a";
      }
    }catch(e){
      $("followStatus").textContent="Unable to retrieve patient details: "+(e.message||"Network/server error.");
      $("followStatus").style.color="#b42318";
    }
    finally{$("load").disabled=false;}
  };

  $("book").onclick=async()=>{
    $("submitStatus").textContent="Submitting your OPD appointment…";
    $("submitStatus").style.color="#7b1fa2";
    $("book").disabled=true;

    const payMode=$("payMode").value;
    let c=0,o=0,total=0;
    if(payMode==="Cash"){total=Number($("amount").value)||0;c=total;}
    else if(payMode==="Online"){total=Number($("amount").value)||0;o=total;}
    else{c=Number($("cash").value)||0;o=Number($("online").value)||0;total=c+o;}

    if(total>2000){$("submitStatus").textContent="OPD total cannot exceed ₹2000.";$("submitStatus").style.color="#b42318";$("book").disabled=false;return;}
    if(total<0){$("submitStatus").textContent="Enter a valid OPD amount.";$("submitStatus").style.color="#b42318";$("book").disabled=false;return;}

    const id=U.uuid("opd");
    const payload={
      bookingRequestId:id,
      childName:U.title($("name").value),
      age:Number($("age").value),
      ageUnit:$("unit").value,
      address:U.title($("address").value),
      referredBy:U.title($("ref").value),
      // Follow-up uses the verified retrieval number; New uses its own WhatsApp field.
      whatsapp:U.phone(type==="Follow-up"?$("followWa").value:$("wa").value),
      city:$("city").value,
      appointmentDate:$("date").dataset.key,
      nextFollowupCity:$("next").value,
      patientType:type,
      opdCharges:total,
      opdPaymentMode:payMode,
      opdCashPaid:c,
      opdOnlinePaid:o
    };

    if(!payload.appointmentDate){$("submitStatus").textContent="Please select an available appointment date.";$("submitStatus").style.color="#b42318";$("book").disabled=false;return;}
    await IDB.put("tx",{id,type:"OPD_BOOKING",status:"pending",payload});

    try{
      const r=await NeuronAPI.call("bookAppointment",payload,25000);
      await IDB.put("tx",{id,type:"OPD_BOOKING",status:"complete",payload,result:r});
      $("submitStatus").textContent="✓ Appointment submitted successfully.";
      $("submitStatus").style.color="#168a4a";
      const confirmationHTML=`<div class="success"><div class="success-icon">✓</div><h2>OPD Appointment Confirmed</h2><div class="confirm-row"><span>Appointment ID</span><b>${U.esc(r.appointmentId)}</b></div><div class="confirm-row"><span>Patient</span><b>${U.esc(r.patientName)}</b></div><div class="confirm-row"><span>Age</span><b>${r.age} ${r.ageUnit}</b></div><div class="confirm-row"><span>Address</span><b>${U.esc(r.address||payload.address)}</b></div><div class="confirm-row"><span>Date of Booking</span><b>${U.date(r.date)}</b></div><div class="confirm-row"><span>OPD Charges</span><b>${U.money(r.opdCharges)}</b></div><div class="confirm-row"><span>Cash</span><b>${U.money(r.opdCashPaid)}</b></div><div class="confirm-row"><span>Online</span><b>${U.money(r.opdOnlinePaid)}</b></div><div class="confirm-row"><span>Next Follow-up City</span><b>${U.esc(r.nextFollowupCity||payload.nextFollowupCity)}</b></div></div>`;
      resetFields("Follow-up");
      // resetFields intentionally clears the booking form, so restore the
      // confirmation content AFTER the reset.
      $("confirmation").innerHTML=confirmationHTML;
      $("confirmation").hidden=false;
      $("submitStatus").textContent="✓ Appointment submitted successfully.";
      $("submitStatus").style.color="#168a4a";
    }catch(e){
      try{
        const s=await NeuronAPI.call("checkBookingRequest",{bookingRequestId:id,city:payload.city},10000);
        if(s.found){
          await IDB.put("tx",{id,type:"OPD_BOOKING",status:"complete",payload,result:s});
          const recoveredHTML=`<div class="success"><div class="success-icon">✓</div><h2>OPD Appointment Recovered</h2><p>Appointment ID: <b>${U.esc(s.appointmentId)}</b></p><p>Original booking was already recorded. No duplicate was created.</p></div>`;
          resetFields("Follow-up");
          $("confirmation").innerHTML=recoveredHTML;
          $("confirmation").hidden=false;
          return;
        }
      }catch(_){}
      await IDB.put("tx",{id,type:"OPD_BOOKING",status:"uncertain",payload});
      $("submitStatus").textContent="Booking status is uncertain. Do not submit another booking. Reopen with internet to recover the original request.";
      $("submitStatus").style.color="#b42318";
      alert("Booking status is uncertain. Do not book again.");
    }finally{
      if($("confirmation").hidden)$("book").disabled=false;
    }
  };

  fillCities();
  resetFields("Follow-up");
  setNextAvailableDate($("city").value);
});