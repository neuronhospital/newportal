document.addEventListener("DOMContentLoaded",()=>{
 const $=U.$;
 $("city").innerHTML=
   `<option value="all">All City Combined</option>`+
   NEURON_CONFIG.cities.map(x=>`<option value="${U.esc(x)}">${U.esc(x)}</option>`).join("");
 const defaultDailyCity=window.DailyCity?.get?.()||(
   window.Schedule&&typeof Schedule.cityAtNow==="function"
     ? Schedule.cityAtNow(NEURON_CONFIG.cities)
     : "Latur"
 );
 if(NEURON_CONFIG.cities.includes(defaultDailyCity)) $("city").value=defaultDailyCity;
 const q=U.parts(),cur=`${q.y}-${String(q.m).padStart(2,"0")}`;
 $("period").innerHTML=
   `<option value="today">Today</option>
    <option value="yesterday">Yesterday</option>
    <option value="daybefore">Day Before Yesterday</option>
    <option value="${cur}">${new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(Date.UTC(q.y,q.m-1,1)))}</option>
    <option value="${(()=>{const d=new Date(Date.UTC(q.y,q.m-2,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`})()}">${new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(Date.UTC(q.y,q.m-2,1)))}</option>
    <option value="${(()=>{const d=new Date(Date.UTC(q.y,q.m-3,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`})()}">${new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(Date.UTC(q.y,q.m-3,1)))}</option>
    <option value="${(()=>{const d=new Date(Date.UTC(q.y,q.m-4,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`})()}">${new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(Date.UTC(q.y,q.m-4,1)))}</option>
    <option value="last12">Last 12 Months</option>
    <option value="last5">Last 5 Years</option>
    <option value="currentyear">${q.y}</option>
    <option value="lastyear">${q.y-1}</option>
    <option value="${q.y-2}">${q.y-2}</option>
    <option value="${q.y-3}">${q.y-3}</option>
    <option value="${q.y-4}">${q.y-4}</option>
    <option value="${q.y-5}">${q.y-5}</option>`;

 function retrievalPeriodLabel(period){
   const q=U.parts();
   const base=new Date(Date.UTC(q.y,q.m-1,q.d));
   let offset=null, prefix="";
   if(period==="today"){offset=0;prefix="Today";}
   else if(period==="yesterday"){offset=1;prefix="Yesterday";}
   else if(period==="daybefore"){offset=2;prefix="Day before Yesterday";}
   if(offset===null)return null;
   const d=new Date(base);
   d.setUTCDate(d.getUTCDate()-offset);
   const dateText=new Intl.DateTimeFormat("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(d);
   return `${prefix} (${dateText})`;
 }

 function selectedDateForDailyPeriod_(period){
   const q=U.parts();
   const offset=period==="today"?0:period==="yesterday"?1:period==="daybefore"?2:null;
   if(offset===null)return null;
   const d=new Date(Date.UTC(q.y,q.m-1,q.d));
   d.setUTCDate(d.getUTCDate()-offset);
   return d;
 }

 function scheduledCitiesForDate_(date){
   if(!date||!window.Schedule||typeof Schedule.hours!=="function")return [];
   const y=date.getUTCFullYear();
   const m=date.getUTCMonth()+1;
   const d=date.getUTCDate();
   return NEURON_CONFIG.cities.filter(city=>Schedule.hours(city,y,m,d)!==null);
 }
 function dateKeyForDate_(date){
   if(!date)return "";
   return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;
 }
 function prepareScheduleAwareDailyTrend_(trendData, city){
   if(!trendData || !Array.isArray(trendData.daily) || !city || String(city).toLowerCase()==="all") return trendData;
   if(!window.Schedule || typeof Schedule.dates!=="function") return trendData;
   const q=U.parts();
   const todayKey=`${q.y}${String(q.m).padStart(2,"0")}${String(q.d).padStart(2,"0")}`;
   const counts=new Map();
   trendData.daily.forEach(item=>{
     const key=String(item.date||"");
     if(/^\d{8}$/.test(key)) counts.set(key,{date:key,opd:Number(item.opd)||0,eeg:Number(item.eeg)||0});
   });
   const scheduled=Schedule.dates(city,q.y,q.m)||[];
   const out=[];
   scheduled.forEach(ddmmyyyy=>{
     const s=String(ddmmyyyy||"");
     if(!/^\d{8}$/.test(s)) return;
     const key=s.slice(4,8)+s.slice(2,4)+s.slice(0,2);
     if(key>todayKey) return;
     const item=counts.get(key);
     out.push(item||{date:key,opd:0,eeg:0});
   });
   return Object.assign({},trendData,{daily:out});
 }

 function actualCityForDailyPeriod_(period){
   if(period==="today")return window.DailyCity?.get?.()||null;
   const date=selectedDateForDailyPeriod_(period);
   return window.DailyCity?.getHistory?.(dateKeyForDate_(date))||null;
 }
 function sourceCitiesForDailyPeriod_(period){
   const actual=actualCityForDailyPeriod_(period);
   if(actual&&NEURON_CONFIG.cities.includes(actual))return [actual];
   return scheduledCitiesForDate_(selectedDateForDailyPeriod_(period));
 }

 const HISTORY_KEY="neuron_statistics_history_access";
 const HISTORY_PASSWORD_HASH="114f4b4bbf1f4a3a58064199f0e9d241566f356756ee58e5d160d3937e6ac740";
 function hasHistoricalAccess(){return localStorage.getItem(HISTORY_KEY)==="1";}
 function focusHistoricalAccess(){
   const input=$("historyPassword");
   if(!input)return;
   input.focus({preventScroll:true});
   const scroll=()=>input.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});
   requestAnimationFrame(scroll);
   setTimeout(scroll,150);
   setTimeout(scroll,400);
 }
 const historyPasswordInput=$("historyPassword");
 if(window.visualViewport&&historyPasswordInput){
   window.visualViewport.addEventListener("resize",()=>{
     const gate=$("historyGate");
     if(gate&&!gate.hidden&&document.activeElement===historyPasswordInput) setTimeout(()=>historyPasswordInput.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"}),50);
   });
 }
 function clearResults(){
   $("results").innerHTML="";
   $("historyGate").hidden=true;
   $("historyPassword").value="";
   $("historyStatus").textContent="";
   if(window.NEURON_StatisticsTrends && typeof window.NEURON_StatisticsTrends.clear==="function") window.NEURON_StatisticsTrends.clear();
 }
 [$("city"),$("period")].forEach(el=>el.addEventListener("change",clearResults));


 let activeRetrieval=null;
 let navigationGuardActive=false;
 let navigationGuardState=null;
 let pendingNavigationHref=null;
 let pendingHistoryDirection=0;

 function setRetrievalStatus(message){
   $("retrievalStatus").textContent=message||"";
 }

 function setRetrievalControls(active){
   $("cancelRetrieval").hidden=!active;
   $("get").disabled=active;
   $("city").disabled=active;
   $("period").disabled=active;
 }

 async function cancelActiveRetrieval_(navigateAfter){
   const active=activeRetrieval;
   if(!active||active.cancelling)return false;
   active.cancelling=true;
   $("cancelRetrieval").disabled=true;
   setRetrievalStatus("Cancelling retrieval…");
   try{
     const r=await NeuronAPI.call("cancelStatisticsRetrieval",{requestId:active.requestId},10000);
     if(!r||!r.cancelled)throw Error("Cancellation was not confirmed by the server.");
     try{active.controller.abort();}catch(_){}
     setRetrievalStatus("Retrieval cancelled successfully.");
     if(navigateAfter){
       const href=pendingNavigationHref;
       const direction=pendingHistoryDirection;
       navigationGuardActive=false;
       navigationGuardState=null;
       pendingNavigationHref=null;
       pendingHistoryDirection=0;
       if(href){
         location.href=href;
       }else if(direction!==0){
         history.go(direction);
       }
     }
     return true;
   }catch(e){
     active.cancelling=false;
     $("cancelRetrieval").disabled=false;
     setRetrievalStatus(e.message||"Unable to cancel retrieval.");
     return false;
   }
 }

 function installNavigationGuard_(){
   if(navigationGuardActive)return;
   navigationGuardActive=true;
   navigationGuardState={neuronStatisticsGuard:true,token:Date.now()};
   history.pushState(navigationGuardState,"",location.href);
 }

 function showNavigationDialog_(){
   if(document.getElementById("statsNavigationDialog"))return;
   const wrap=document.createElement("div");
   wrap.id="statsNavigationDialog";
   wrap.innerHTML=`<div class="stats-nav-backdrop"></div><div class="stats-nav-dialog" role="dialog" aria-modal="true" aria-labelledby="stats-nav-title"><div id="stats-nav-title">Retrieval in progress</div><p>A Statistics retrieval is still running. Cancel it before leaving this page?</p><div class="stats-nav-actions"><button type="button" class="btn btn-secondary" data-stay>Stay on Page</button><button type="button" class="btn btn-primary" data-cancel-nav>Cancel Retrieval &amp; Navigate</button></div></div>`;
   document.body.appendChild(wrap);
   wrap.querySelector("[data-stay]").onclick=()=>{
     pendingNavigationHref=null;
     pendingHistoryDirection=0;
     wrap.remove();
   };
   wrap.querySelector("[data-cancel-nav]").onclick=async()=>{
     const btn=wrap.querySelector("[data-cancel-nav]");
     btn.disabled=true;
     const ok=await cancelActiveRetrieval_(true);
     if(ok)wrap.remove(); else btn.disabled=false;
   };
 }

 window.addEventListener("popstate",event=>{
   if(!activeRetrieval||activeRetrieval.cancelling)return;
   if(navigationGuardActive){
     pendingHistoryDirection=(event.state===navigationGuardState)?1:-1;
     history.pushState(navigationGuardState,"",location.href);
     showNavigationDialog_();
   }
 });

 document.addEventListener("click",e=>{
   const link=e.target.closest("a[href]");
   if(!link||!activeRetrieval||activeRetrieval.cancelling)return;
   const href=link.getAttribute("href")||"";
   if(!href||href.startsWith("#")||href.startsWith("tel:")||href.startsWith("mailto:"))return;
   if(new URL(link.href,location.href).origin!==location.origin)return;
   e.preventDefault();
   pendingNavigationHref=link.href;
   pendingHistoryDirection=0;
   showNavigationDialog_();
 });

 async function retrieveSelectedRecords(){
   const btn=$("get");
   const citySelect=$("city");
   const periodSelect=$("period");
   const old=btn.textContent;
   const selectedPeriod=periodSelect.value;
   const requestId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():"stats-"+Date.now()+"-"+Math.random().toString(36).slice(2);
   const controller=new AbortController();
   activeRetrieval={requestId:requestId,controller:controller,cancelling:false};
   installNavigationGuard_();
   setRetrievalControls(true);
   $("historyGate").hidden=true;
   btn.textContent="Retrieving Records…";
   setRetrievalStatus("");
   $("results").innerHTML=`<div class="status">${
     citySelect.value==="all"
       ? ((selectedPeriod==="today" || selectedPeriod==="yesterday" || selectedPeriod==="daybefore")
          ? "Determining city and retrieving records…"
          : "Retrieving records from all cities…")
       : "Retrieving records from Google Sheets…"
   }</div>`;
   try{
     const request={
       city:citySelect.value,
       period:selectedPeriod,
       showMode:"both",
       requestId:requestId
     };
     let sourceCities=null;
     if(citySelect.value==="all" && (selectedPeriod==="today" || selectedPeriod==="yesterday" || selectedPeriod==="daybefore")){
       sourceCities=sourceCitiesForDailyPeriod_(selectedPeriod);
       request.selectedCities=sourceCities;
     }
     const r=await NeuronAPI.call("retrieveRecords",request,120000,{signal:controller.signal});
     if(sourceCities!==null) r.statisticsSourceCities=sourceCities.slice();
     if(r&&r.cancelled){
       setRetrievalStatus("Retrieval cancelled successfully.");
       return;
     }
     // Any retrieval that includes daily trend data must prepare the current
     // month's daily view against the authoritative schedule. This lets broad
     // retrievals (Last 12 Months / Last 5 Years / Current Year) feed Current
     // Month without another retrieval.
     if(r && r.trendData && Array.isArray(r.trendData.daily) && citySelect.value!=="all") {
       r.trendData=prepareScheduleAwareDailyTrend_(r.trendData,citySelect.value);
     }
     const relativeLabel=retrievalPeriodLabel(selectedPeriod);
     if(relativeLabel) r.periodLabel=relativeLabel;
     render(r);
     if(window.NEURON_StatisticsTrends) window.NEURON_StatisticsTrends.consume(r);
   }catch(e){
     if(activeRetrieval&&activeRetrieval.requestId===requestId&&activeRetrieval.cancelling){
       return;
     }
     const msg=String(e.message||e);
     if(msg.indexOf("Network timeout")!==-1){
       setRetrievalStatus("Retrieval timed out. Cancelling the backend retrieval…");
       const ok=await cancelActiveRetrieval_(false);
       if(ok)$("results").innerHTML="";
       else $("results").innerHTML=`<div class="status">${U.esc(msg)}</div>`;
     }else if(msg==="Request cancelled."){
       setRetrievalStatus("Retrieval cancelled successfully.");
     }else{
       $("results").innerHTML=`<div class="status">${U.esc(msg)}</div>`;
     }
   }finally{
     if(activeRetrieval&&activeRetrieval.requestId===requestId){
       activeRetrieval=null;
       if(navigationGuardActive){
         history.replaceState(null,"",location.href);
       }
       navigationGuardActive=false;
       navigationGuardState=null;
       pendingNavigationHref=null;
       pendingHistoryDirection=0;
       setRetrievalControls(false);
       btn.textContent=old;
     }
   }
 }

 $("cancelRetrieval").onclick=()=>cancelActiveRetrieval_(false);

 let historicalVerifyPending=false;
 async function requestHistoricalAccess(){
   const input=$("historyPassword");
   const btn=$("historyUnlock");
   const status=$("historyStatus");
   btn.disabled=true;
   status.textContent="Verifying access…";
   try{
     const enteredHash=await sha256(input.value);
     if(enteredHash!==HISTORY_PASSWORD_HASH) throw Error("Incorrect historical statistics password.");
     localStorage.setItem(HISTORY_KEY,"1");
     input.value="";
     status.textContent="Historical access granted.";
     await retrieveSelectedRecords();
   }catch(e){
     status.textContent=e.message||"Unable to unlock historical statistics.";
   }finally{
     btn.disabled=false;
     historicalVerifyPending=false;
   }
 }

 $("historyPassword").addEventListener("input",()=>{
   const input=$("historyPassword");
   input.value=input.value.replace(/\D/g,"").slice(0,8);
   if(input.value.length===8 && !historicalVerifyPending){
     historicalVerifyPending=true;
     requestHistoricalAccess();
   }
 });
 $("historyPassword").addEventListener("focus",focusHistoricalAccess);
 $("get").onclick=async()=>{
   const selectedPeriod=$("period").value;
   if(selectedPeriod!=="today" && !hasHistoricalAccess()){
     $("results").innerHTML="";
     $("historyGate").hidden=false;
     $("historyStatus").textContent="";
     focusHistoricalAccess();
     return;
   }
   await retrieveSelectedRecords();
 };
 $("historyUnlock").onclick=requestHistoricalAccess;


 function money(n){return U.money(Number(n)||0)}
 function esc(v){return U.esc(v)}
 function render(r){
   const t=r.totals||{};
   const rows=r.rows||[];
   const hasDetail=!!r.hasDetail;
   const allCityDaily=(String(r.city||"").toLowerCase()==="all" && (r.period==="today" || r.period==="yesterday" || r.period==="daybefore"));
   const sourceCities=Array.isArray(r.statisticsSourceCities)
     ? r.statisticsSourceCities
     : (Array.isArray(r.statisticsScheduledCities)?r.statisticsScheduledCities:[]);
   const showDetail=hasDetail;
   const patientCount=Number(t.patientCount)||0;
   const freeOPD=Number(t.freeOPD)||0;
   const freeEEG=Number(t.freeEEG)||0;
   const totalRefundOPD=Number(t.opdRefund)||0;
   const totalRefundEEG=Number(t.eegRefund)||0;
   const totalRefund=Number(t.totalRefund)||(totalRefundOPD+totalRefundEEG);
   const totalCash=Number(t.totalCash)||(Number(t.opdCash)||0)+(Number(t.eegCash)||0);
   const totalOnline=Number(t.totalOnline)||(Number(t.opdOnline)||0)+(Number(t.eegOnline)||0);
   const totalCollection=Number(t.totalCollection)||(Number(t.opdPaid)||0)+(Number(t.eegPaid)||0);
   const netCash=Number(t.netCash)||(totalCash-totalRefund);
   const netOnline=Number(t.netOnline)||totalOnline;
   const netTotal=Number(t.netTotal)||(netCash+netOnline);
   let html=`<div class="report-head"><b>${esc(r.city)}</b> • ${esc(r.periodLabel||"")}</div>`;
   if(allCityDaily){
     html+=sourceCities.length
       ? `<div class="status" style="margin-top:8px">Data retrieved from: ${sourceCities.map(esc).join(" + ")}</div>`
       : `<div class="status" style="margin-top:8px">No scheduled visit for this date. No city data was retrieved.</div>`;
   }
   html+=`<div class="service-summary">
     <div class="service-card">
       <div class="service-card-title">OPD</div>
       <div class="service-card-body">
         <div class="service-metric"><span>Total</span><strong class="metric-total">${patientCount}</strong></div>
         <div class="service-divider"></div>
         <div class="service-metric"><span>Free</span><strong class="metric-free">${freeOPD}</strong></div>
       </div>
     </div>
     <div class="service-card">
       <div class="service-card-title">EEG</div>
       <div class="service-card-body">
         <div class="service-metric"><span>Total</span><strong class="metric-total">${Number(t.eegCount)||0}</strong></div>
         <div class="service-divider"></div>
         <div class="service-metric"><span>Free</span><strong class="metric-free">${freeEEG}</strong></div>
       </div>
     </div>
   </div>
   <div class="collection-card"><div class="collection-table-wrap"><table class="collection-table"><thead><tr><th></th><th>OPD</th><th>EEG</th><th>OPD+EEG</th><th>Net Total</th></tr></thead><tbody>
     <tr><th class="collection-label">Cash</th><td>${money(t.opdCash)}</td><td>${money(t.eegCash)}</td><td>${money(totalCash)}</td><td>${money(netCash)}</td></tr>
     <tr><th class="collection-label">Online</th><td>${money(t.opdOnline)}</td><td>${money(t.eegOnline)}</td><td>${money(totalOnline)}</td><td>${money(netOnline)}</td></tr>
     <tr><th class="collection-label">Refund</th><td>${money(totalRefundOPD)}</td><td>${money(totalRefundEEG)}</td><td>${money(totalRefund)}</td><td>${money(totalRefund)}</td></tr>
     <tr class="collection-total"><th class="collection-label">Total</th><td>${money(t.opdPaid)}</td><td>${money(t.eegPaid)}</td><td>${money(totalCollection)}</td><td>${money(netTotal)}</td></tr>
   </tbody></table></div></div>`;
   if(!patientCount){
     if(allCityDaily && sourceCities.length===0){
       $("results").innerHTML=html;
       return;
     }
     const city=esc(r.city||$("city").value);
     const dateLabel=esc(r.periodLabel||$("period").selectedOptions[0]?.textContent||$("period").value);
     $("results").innerHTML=`<div class="status">No Record Available for ${city}, ${dateLabel}, Patient / EEG.</div>`;
     return;
   }
   if(showDetail){
     html+=bothTable(rows,t,String(r.city||"").toLowerCase()==="all");
     html+=`<div class="download-row" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:nowrap">
       <button id="downloadCsv" class="btn btn-secondary">⬇ Download CSV</button>
       <button id="downloadMobile" class="btn btn-secondary">⬇ Mobile Number</button>
     </div>`;
   }
   $("results").innerHTML=html;
   if(showDetail){
     $("downloadCsv").onclick=()=>downloadCSV(r);
     $("downloadMobile").onclick=()=>downloadMobileNumbers(r);
   }
 }

 function selectedPeriodForPatientTable(period){
   const q=U.parts();
   const currentMonth=`${q.y}-${String(q.m).padStart(2,"0")}`;
   return period==="today" || period==="yesterday" || period==="daybefore" || period===currentMonth;
 }

 function bothTable(rows,t,isAllCity){
   let html=`<div class="table-wrap combined-table-wrap"><table id="reportTable" class="combined-report"><thead>
     <tr><th rowspan="2">Sr. No.</th><th rowspan="2">Patient Name</th>${isAllCity?'<th rowspan="2">City</th>':''}<th colspan="4">OPD Collection</th><th colspan="4">EEG Collection</th><th rowspan="2">Mobile Number</th></tr>
     <tr><th>Cash</th><th>Online</th><th>Refund</th><th>Net Total</th><th>Cash</th><th>Online</th><th>Refund</th><th>Net Total</th></tr>
   </thead><tbody>`;
   rows.forEach((x,i)=>{
     const opdRefund=Number(x.opdRefund)||0;
     const eegRefund=Number(x.eegRefund)||0;
     const opdNet=(Number(x.opdCashPaid)||0)+(Number(x.opdOnlinePaid)||0)-opdRefund;
     const eegNet=(Number(x.eegCashPaid)||0)+(Number(x.eegOnlinePaid)||0)-eegRefund;
     html+=`<tr><td>${i+1}</td><td>${esc(x.patientName)}</td>${isAllCity?`<td>${esc(x.city)}</td>`:""}<td>${paidOrDash(x.opdCashPaid)}</td><td>${paidOrDash(x.opdOnlinePaid)}</td><td>${paidOrDash(opdRefund)}</td><td>${money(opdNet)}</td><td>${x.eegCharges===null?"-":paidOrDash(x.eegCashPaid)}</td><td>${x.eegCharges===null?"-":paidOrDash(x.eegOnlinePaid)}</td><td>${x.eegCharges===null?"-":paidOrDash(eegRefund)}</td><td>${x.eegCharges===null?"-":money(eegNet)}</td><td>${esc(x.mobileNumber)}</td></tr>`;
   });
   const opdCash=Number(t.opdCash)||0;
   const opdOnline=Number(t.opdOnline)||0;
   const opdRefund=Number(t.opdRefund)||0;
   const eegCash=Number(t.eegCash)||0;
   const eegOnline=Number(t.eegOnline)||0;
   const eegRefund=Number(t.eegRefund)||0;
   html+=`</tbody><tfoot><tr class="total-row"><th colspan="${isAllCity?3:2}">Total</th><th>${money(opdCash)}</th><th>${money(opdOnline)}</th><th>${paidOrDash(opdRefund)}</th><th>${money(opdCash+opdOnline-opdRefund)}</th><th>${money(eegCash)}</th><th>${money(eegOnline)}</th><th>${paidOrDash(eegRefund)}</th><th>${money(eegCash+eegOnline-eegRefund)}</th><th>—</th></tr></tfoot></table></div>`;
   return html;
 }
 function paidOrDash(n){return Number(n)?money(n):"-";}

 function csvCell(v){
   const s=String(v==null?"":v);
   return `"${s.replace(/"/g,'""')}"`;
 }
 function downloadCSV(r){
   const rows=r.rows||[];
   const out=[];
   out.push([`${r.city} - ${r.periodLabel||r.period||""}`]);
   const isAllCity=String(r.city||"").toLowerCase()==="all";
   out.push(isAllCity
     ? ["Sr No.","Patient Name","City","OPD Cash","OPD Online","OPD Total","EEG Cash","EEG Online","EEG Total","Mobile Number"]
     : ["Sr No.","Patient Name","OPD Cash","OPD Online","OPD Total","EEG Cash","EEG Online","EEG Total","Mobile Number"]);
   rows.forEach((x,i)=>out.push(isAllCity
     ? [i+1,x.patientName,x.city,x.opdCashPaid,x.opdOnlinePaid,x.opdTotalPaid,x.eegCharges===null?"":x.eegCashPaid,x.eegCharges===null?"":x.eegOnlinePaid,x.eegCharges===null?"":x.eegTotalPaid,x.mobileNumber]
     : [i+1,x.patientName,x.opdCashPaid,x.opdOnlinePaid,x.opdTotalPaid,x.eegCharges===null?"":x.eegCashPaid,x.eegCharges===null?"":x.eegOnlinePaid,x.eegCharges===null?"":x.eegTotalPaid,x.mobileNumber]));
   const totalRow=["","TOTAL"];
   if(isAllCity)totalRow.push("");
   totalRow.push(
     rows.reduce((a,x)=>a+(Number(x.opdCashPaid)||0),0),
     rows.reduce((a,x)=>a+(Number(x.opdOnlinePaid)||0),0),
     rows.reduce((a,x)=>a+(Number(x.opdTotalPaid)||0),0),
     rows.reduce((a,x)=>a+(Number(x.eegCashPaid)||0),0),
     rows.reduce((a,x)=>a+(Number(x.eegOnlinePaid)||0),0),
     rows.reduce((a,x)=>a+(Number(x.eegTotalPaid)||0),0),"");
   out.push(totalRow);
   const csv="\uFEFF"+out.map(row=>row.map(csvCell).join(",")).join("\r\n");
   const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");
   const safeCity=String(r.city||"All").replace(/[^a-z0-9]+/gi,"_");
   const safePeriod=String(r.period||"report").replace(/[^a-z0-9-]+/gi,"_");
   a.href=url;a.download=`NEURON_${safeCity}_${safePeriod}_both.csv`;
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function downloadMobileNumbers(r){
   const rows=r.rows||[];
   const out=[["Mobile Number"]];
   rows.forEach(x=>out.push([x.mobileNumber]));
   const csv="\uFEFF"+out.map(row=>row.map(csvCell).join(",")).join("\r\n");
   const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");
   const safeCity=String(r.city||"All").replace(/[^a-z0-9]+/gi,"_");
   const safePeriod=String(r.period||"report").replace(/[^a-z0-9-]+/gi,"_");
   a.href=url;a.download=`NEURON_${safeCity}_${safePeriod}_both_Mobile_Numbers.csv`;
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

});

// v197.4: Statistics Performance Trends. The main Statistics retrieval is the
// only data fetch. Performance Trends selects only compact OPD/EEG summaries
// already present in the loaded response; changing trend period/metric never fetches.
(function initPerformanceTrends_(){
 const $=U.$;
 const section=$("performanceTrends"), body=$("performanceBody"), toggle=$("performanceToggle");
 const periodEl=$("trendPeriod"), metricEl=$("trendMetric"), chartEl=$("trendChart"), summaryEl=$("trendSummary"), statusEl=$("trendStatus"), rangeEl=$("trendRange");
 if(!section||!body||!toggle||!periodEl||!metricEl||!chartEl||!summaryEl||!statusEl||!rangeEl)return;
 let latestResponse=null, loadedStatisticsPeriod=null;
 const rootStyle=getComputedStyle(document.documentElement);
 const OPD=(rootStyle.getPropertyValue("--opd").trim()||"#3b82f6");
 const EEG=(rootStyle.getPropertyValue("--eeg").trim()||"#8b5cf6");
 const fmt=n=>Number.isInteger(n)?String(n):Number(n).toFixed(1).replace(/\.0$/,'');
 const esc=v=>U.esc(v);
 function setStatus(s){statusEl.textContent=s||"";}
 function monthLabel(key){
   const [y,m]=String(key).split("-").map(Number); if(!y||!m)return String(key);
   return new Intl.DateTimeFormat("en-IN",{month:"short",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(Date.UTC(y,m-1,1)));
 }
 function dateLabel(key){const s=String(key);return /^\d{8}$/.test(s)?`${s.slice(6,8)}/${s.slice(4,6)}`:s;}
 function yearLabel(y){return String(y)+(Number(y)===U.parts().y?" *":"");}
 function stats(vals){
   if(!vals.length)return null;
   const sum=vals.reduce((a,b)=>a+b,0);
   return {min:Math.min(...vals),mean:sum/vals.length,max:Math.max(...vals)};
 }
 function selectedKey_(){return metricEl.value==="eeg"?"eeg":"opd";}
 function selectedLabel_(){return selectedKey_()==="eeg"?"EEG":"OPD";}
 function niceScale_(values){
   const max=Math.max(0,...values.map(v=>Number(v)||0));
   if(max<=0)return {max:1,step:1};
   const raw=max/5;
   const pow=Math.pow(10,Math.floor(Math.log10(raw)));
   const n=raw/pow;
   const nice=n<=1?1:n<=2?2:n<=5?5:10;
   const step=nice*pow;
   return {max:Math.max(step,Math.ceil(max/step)*step),step:step};
 }
 function displayedPoints_(choice,td){
   const q=U.parts(),endMonth=q.y*12+(q.m-1);
   if(choice==="currentMonth"){
     if(!Array.isArray(td.daily))return {points:[],type:"daily",message:"Current Month trend data is not available in the loaded Statistics response."};
     const prefix=`${q.y}${String(q.m).padStart(2,"0")}`;
     return {points:td.daily.filter(p=>String(p.date||"").startsWith(prefix)),type:"daily"};
   }
   if(choice==="last6"||choice==="last12"){
     if(!Array.isArray(td.monthly))return {points:[],type:"month",message:"Monthly trend data is not available in the loaded Statistics response."};
     const count=choice==="last6"?6:12,start=endMonth-(count-1);
     return {points:td.monthly.filter(p=>{const a=String(p.month||"").split("-").map(Number);if(a.length!==2||!a[0]||!a[1])return false;const idx=a[0]*12+(a[1]-1);return idx>=start&&idx<=endMonth;}),type:"month"};
   }
   if(choice==="currentYear"||choice==="lastYear"||/^year:\d{4}$/.test(choice)||choice==="last5"){
     if(!Array.isArray(td.yearly))return {points:[],type:"year",message:"Yearly trend data is not available in the loaded Statistics response."};
     if(choice==="last5")return {points:td.yearly.slice().sort((a,b)=>Number(a.year)-Number(b.year)),type:"year"};
     const year=choice==="currentYear"?q.y:choice==="lastYear"?q.y-1:Number(String(choice).slice(5));
     return {points:td.yearly.filter(p=>Number(p.year)===year),type:"year"};
   }
   return {points:[],type:"year"};
 }
 function availableTrendOptions_(period,td){
   const q=U.parts();
   const opts=[];
   const add=(value,label)=>opts.push({value,label});
   if(Array.isArray(td.daily))add("currentMonth","Current Month");
   if(Array.isArray(td.monthly)){
     add("last6","Last 6 Months");
     add("last12","Last 12 Months");
   }
   if(Array.isArray(td.yearly)){
     add("currentYear",`Current Year (${q.y})`);
     add("lastYear",`Last Year (${q.y-1})`);
     for(let i=2;i<=5;i++)add(`year:${q.y-i}`,`${i} Years Ago (${q.y-i})`);
     add("last5","Last 5 Years");
   }
   // Narrow retrievals should expose only views contained by that retrieval.
   if(period==="last5")return opts;
   if(period==="last12")return opts.filter(x=>["currentMonth","last6","last12"].includes(x.value));
   if(period==="currentyear")return opts.filter(x=>["currentMonth","currentYear"].includes(x.value));
   if(period==="lastyear")return opts.filter(x=>x.value==="lastYear");
   if(/^\d{4}$/.test(period))return opts.filter(x=>x.value===`year:${period}`);
   const cur=`${q.y}-${String(q.m).padStart(2,"0")}`;
   return period===cur?opts.filter(x=>x.value==="currentMonth"):[];
 }
 function syncTrendOptions_(){
   if(!latestResponse||!latestResponse.trendData){periodEl.innerHTML="";return;}
   const opts=availableTrendOptions_(loadedStatisticsPeriod,latestResponse.trendData);
   const current=periodEl.value;
   periodEl.innerHTML=opts.map(o=>`<option value="${o.value}">${o.label}</option>`).join("");
   if(opts.some(o=>o.value===current))periodEl.value=current;
   else if(opts.length)periodEl.value=opts[0].value;
 }
 function lineChart_(points,metric){
   const key=metric==="eeg"?"eeg":"opd",label=key==="eeg"?"EEG":"OPD",color=key==="eeg"?EEG:OPD;
   const W=920,H=320,L=56,R=16,T=28,B=48,cw=W-L-R,ch=H-T-B;
   const vals=points.map(p=>Number(p[key])||0),scale=niceScale_(vals),max=scale.max;
   const n=points.length,x=i=>n<=1?L+cw/2:L+(i/(n-1))*cw,y=v=>T+ch-(v/max)*ch;
   let g="";
   for(let v=0;v<=max;v+=scale.step){const yy=y(v);g+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#e5e7eb" stroke-width="1"/><text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="10" fill="#667085">${fmt(v)}</text>`;}
   const every=Math.max(1,Math.ceil(n/8));
   points.forEach((p,i)=>{if(i%every===0||i===n-1)g+=`<text x="${x(i)}" y="${H-18}" text-anchor="middle" font-size="10" fill="#667085">${esc(dateLabel(p.date))}</text>`;});
   const d=points.map((p,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(Number(p[key])||0).toFixed(1)}`).join(" ");
   g+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
   points.forEach((p,i)=>g+=`<circle cx="${x(i)}" cy="${y(Number(p[key])||0)}" r="3" fill="#fff" stroke="${color}" stroke-width="2"/>`);
   return `<div class="trend-legend"><span class="trend-legend-item"><span class="trend-legend-dot" style="background:${color}"></span>${label}</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} current month daily performance trend">${g}</svg>`;
 }
 function barChart_(points,metric,type){
   const key=metric==="eeg"?"eeg":"opd",label=key==="eeg"?"EEG":"OPD",color=key==="eeg"?EEG:OPD;
   const W=920,H=320,L=52,R=14,T=28,B=54,cw=W-L-R,ch=H-T-B,vals=points.map(p=>Number(p[key])||0),scale=niceScale_(vals),max=scale.max,n=points.length,groupW=cw/Math.max(1,n),barW=Math.min(48,Math.max(8,groupW*.62)),x0=i=>L+i*groupW+groupW/2,y=v=>T+ch-(v/max)*ch;
   let g="";
   for(let v=0;v<=max;v+=scale.step){const yy=y(v);g+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#e5e7eb" stroke-width="1"/><text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="10" fill="#667085">${fmt(v)}</text>`;}
   const every=Math.max(1,Math.ceil(n/8));
   points.forEach((p,i)=>{const center=x0(i),labelText=type==="year"?yearLabel(p.year):monthLabel(p.month);if(i%every===0||i===n-1)g+=`<text x="${center}" y="${H-18}" text-anchor="middle" font-size="10" fill="#667085">${esc(labelText)}</text>`;const v=Number(p[key])||0;g+=`<rect x="${center-barW/2}" y="${y(v)}" width="${barW}" height="${Math.max(0,T+ch-y(v))}" rx="3" fill="${color}"/>`;});
   return `<div class="trend-legend"><span class="trend-legend-item"><span class="trend-legend-dot" style="background:${color}"></span>${label}</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} performance bar chart">${g}</svg>`;
 }
 function summary_(points,metric,type){
   const key=metric==="eeg"?"eeg":"opd",label=key==="eeg"?"EEG":"OPD",st=stats(points.map(p=>Number(p[key])||0));
   if(!st)return "";
   const total=points.reduce((a,p)=>a+(Number(p[key])||0),0),avg=points.length?total/points.length:0;
   return `<div class="trend-summary-card ${key}"><div class="trend-summary-title">${label}</div><div class="trend-summary-grid"><div><small>Total</small><strong>${fmt(total)}</strong></div><div><small>Average</small><strong>${fmt(avg)}</strong></div><div><small>Min</small><strong>${fmt(st.min)}</strong></div><div><small>Mean</small><strong>${fmt(st.mean)}</strong></div><div><small>Max</small><strong>${fmt(st.max)}</strong></div></div></div>`;
 }
 function currentMonthSummary_(points,metric){
   const key=metric==="eeg"?"eeg":"opd",label=key==="eeg"?"EEG":"OPD",available=points.length,total=points.reduce((a,p)=>a+(Number(p[key])||0),0),avg=available?total/available:0,st=stats(points.map(p=>Number(p[key])||0))||{min:0,mean:0,max:0};
   return `<div class="trend-summary-card ${key}"><div class="trend-summary-title">${label}</div><div class="trend-summary-grid"><div><small>Available days</small><strong>${available}</strong></div><div><small>Total</small><strong>${fmt(total)}</strong></div><div><small>Average / day</small><strong>${fmt(avg)}</strong></div><div><small>Min</small><strong>${fmt(st.min)}</strong></div><div><small>Mean</small><strong>${fmt(st.mean)}</strong></div><div><small>Max</small><strong>${fmt(st.max)}</strong></div></div></div>`;
 }
 function renderTrend_(){
   if(!latestResponse||!latestResponse.trendData){setStatus("Retrieve Statistics data first. Trends use the same retrieval data and make no separate graph request.");chartEl.innerHTML='<div class="trend-empty">No trend data is loaded yet.</div>';summaryEl.innerHTML="";rangeEl.textContent="";return;}
   const city=String($("city").value||"all");
   if(city.toLowerCase()==="all"){setStatus("Performance Trends require one selected city. Select a city in Statistics and retrieve the data again.");chartEl.innerHTML='<div class="trend-empty">Select a specific city to view schedule-aware performance trends.</div>';summaryEl.innerHTML="";rangeEl.textContent="";return;}
   syncTrendOptions_();
   const choice=periodEl.value,metric=selectedKey_(),td=latestResponse.trendData,res=displayedPoints_(choice,td);
   if(res.message)setStatus(res.message);else if(res.type==="daily")setStatus("Daily data includes only doctor-available dates; available zero-activity days are shown as zero.");else if(res.type==="month")setStatus("Monthly totals are actual recorded totals; months with no data are omitted.");else setStatus("Yearly totals are actual recorded totals; current year is partial through today and is marked with *.");
   if(!res.points.length){chartEl.innerHTML='<div class="trend-empty">No trend data available for this selection.</div>';summaryEl.innerHTML="";rangeEl.textContent="";return;}
   chartEl.innerHTML=res.type==="daily"?lineChart_(res.points,metric):barChart_(res.points,metric,res.type);
   summaryEl.innerHTML=res.type==="daily"?currentMonthSummary_(res.points,metric):summary_(res.points,metric,res.type);
   if(res.type==="daily"){
     const q=U.parts();rangeEl.textContent=`${new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric",timeZone:"Asia/Kolkata"}).format(new Date(Date.UTC(q.y,q.m-1,1)))} • ${esc(city)}`;
   }else if(res.type==="month")rangeEl.textContent=`${res.points.length} displayed month${res.points.length===1?"":"s"} • ${esc(city)}`;
   else rangeEl.textContent=`${res.points.length} displayed year${res.points.length===1?"":"s"} • ${esc(city)}`;
 }
 window.NEURON_StatisticsTrends={
   consume:function(r){latestResponse=r||null;loadedStatisticsPeriod=String($("period").value||"");syncTrendOptions_();section.hidden=false;section.classList.add("is-collapsed");toggle.setAttribute("aria-expanded","false");toggle.textContent="Show";renderTrend_();},
   clear:function(){latestResponse=null;loadedStatisticsPeriod=null;section.hidden=true;section.classList.add("is-collapsed");toggle.setAttribute("aria-expanded","false");toggle.textContent="Show";periodEl.innerHTML="";chartEl.innerHTML="";summaryEl.innerHTML="";rangeEl.textContent="";setStatus("");}
 };
 toggle.onclick=()=>{const collapsed=section.classList.toggle("is-collapsed");toggle.setAttribute("aria-expanded",String(!collapsed));toggle.textContent=collapsed?"Show":"Hide";if(!collapsed)renderTrend_();};
 periodEl.onchange=renderTrend_; metricEl.onchange=renderTrend_;
})();
