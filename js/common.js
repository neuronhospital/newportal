window.$=window.U?.$||((id)=>document.getElementById(id));
if("serviceWorker"in navigator)window.addEventListener("load",()=>{const v=encodeURIComponent(window.NEURON_CONFIG.appVersion);navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!sessionStorage.getItem("neuron-sw-reloaded-"+v)){sessionStorage.setItem("neuron-sw-reloaded-"+v,"1");location.reload();}});navigator.serviceWorker.register("./service-worker.js?v="+v).catch(()=>{});});
const neuronLoading={
 els:new Set(),tick:0,timer:null,
 add(el){
  if(!el||el.children.length!==0)return;
  const t=el.textContent||"",last=el.dataset.neuronLoadingLast;
  if(last===t)return;
  if(/\bLoading\b/i.test(t)){
   el.dataset.neuronLoadingBase=t;
   el.dataset.neuronLoadingLast=t;
   this.els.add(el);
  }else{
   delete el.dataset.neuronLoadingBase;
   delete el.dataset.neuronLoadingLast;
   this.els.delete(el);
  }
 },
 scan(root=document.body){
  if(root.nodeType===1)this.add(root);
  if(root.querySelectorAll)root.querySelectorAll("*").forEach(el=>this.add(el));
 },
 start(){
  this.scan();
  new MutationObserver(mutations=>mutations.forEach(m=>{
   if(m.type==="characterData")this.add(m.target.parentElement);
   else m.addedNodes.forEach(n=>{if(n.nodeType===1)this.scan(n);});
  })).observe(document.body,{subtree:true,childList:true,characterData:true});
  this.timer=setInterval(()=>{
   this.tick=(this.tick+1)%5;
   this.els.forEach(el=>{
    if(!el.isConnected){this.els.delete(el);return;}
    const base=el.dataset.neuronLoadingBase,last=el.dataset.neuronLoadingLast,current=el.textContent||"";
    if(!base||current!==last){this.add(el);return;}
    el.dataset.neuronLoadingLast=base.replace(/\bLoading(?:\.{1,})?/i,m=>m.replace(/\.{1,}$/,"")+".".repeat(this.tick));
    el.textContent=el.dataset.neuronLoadingLast;
   });
  },500);
 }
};
document.addEventListener("DOMContentLoaded",()=>{
 neuronLoading.start();
 const p=document.body.dataset.title||"Portal",h=document.getElementById("header"),f=document.getElementById("footer");
 if(h)h.innerHTML=`<header class="site-header"><div class="container header-inner"><a class="brand" href="index.html"><img class="brand-logo" src="assets/neuron_logo.svg" alt="NEURON Hospital Logo"><div><div class="brand-title">NEURON HOSPITAL LATUR</div><div class="brand-sub">Pediatric Neurology & Epilepsy Center</div></div></a><a class="header-home" href="index.html"><img src="assets/icons/home.svg" alt="Home"></a></div></header>`;
 document.title=p+" | NEURON Hospital";
 if(f)f.innerHTML=`<footer class="footer"><div class="container"><div class="footer-nav">
<a href="index.html"><img class="nav-icon" src="assets/icons/home.svg" alt="">Home</a>
<a href="opd_booking.html"><img class="nav-icon" src="assets/icons/opd-booking.svg" alt="">OPD Booking</a>
<a href="eeg_booking.html"><img class="nav-icon" src="assets/icons/eeg-booking.svg" alt="">EEG Booking</a>
<a href="opd_update.html"><img class="nav-icon" src="assets/icons/opd-update.svg" alt="">Update OPD</a>
<a href="eeg_update.html"><img class="nav-icon" src="assets/icons/eeg-update.svg" alt="">Update EEG</a>
<a href="statistics.html"><img class="nav-icon" src="assets/icons/statistics.svg" alt="">Statistics</a>
</div><div class="footer-contact"><b>NEURON Hospital, Latur</b><br>Near Patil Plaza, Infront of Ashwini Hospital<br>Ausa Road, Latur. Phone : <b><a href="tel:02382242581">02382 242581</a></b><br></div></div></footer>`;
});