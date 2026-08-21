window.$=window.U?.$||((id)=>document.getElementById(id));
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
document.addEventListener("DOMContentLoaded",()=>{
 const p=document.body.dataset.title||"Portal",h=document.getElementById("header"),f=document.getElementById("footer");
 if(h)h.innerHTML=`<header class="site-header"><div class="container header-inner"><a class="brand" href="index.html"><div class="brand-mark">N</div><div><div class="brand-title">NEURON Hospital</div><div class="brand-sub">Latur • Pediatric Neurology & Epilepsy</div></div></a><a class="header-home" href="index.html">Home</a></div></header>`;
 document.title=p+" | NEURON Hospital";

 // Numeric keypad for numeric security and WhatsApp inputs where present.
 ["password","wa","followWa","editWa"].forEach(id=>{
   const el=document.getElementById(id);
   if(el)el.setAttribute("inputmode","numeric");
 });

 // Give immediate visual feedback that a button click was received.
 document.addEventListener("click",e=>{
   const b=e.target.closest("button");
   if(!b||b.disabled)return;
   b.classList.remove("button-clicked");
   void b.offsetWidth;
   b.classList.add("button-clicked");
   setTimeout(()=>b.classList.remove("button-clicked"),700);
 });

 if(f)f.innerHTML=`<footer class="footer"><div class="container"><div class="footer-nav"><a href="index.html">Home</a><a href="opd_booking.html">OPD Booking</a><a href="eeg_booking.html">EEG Booking</a><a href="opd_update.html">Update OPD</a><a href="eeg_update.html">Update EEG</a><a href="statistics.html">Statistics</a></div><div class="footer-contact"><b>NEURON Hospital, Latur</b><br>Near Patil Plaza, Ausa Road, Latur</div><div class="version">21-08-2026-03:00:00-HTML78-v16-CODE78-v4</div></div></footer>`;
});