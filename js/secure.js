document.addEventListener("DOMContentLoaded",()=>{
 const g=$("gate"),p=$("portal");
 const isUpdate=document.body.dataset.mode==="opd"||document.body.dataset.mode==="eeg";
 const KEY=isUpdate?"neuron_update_until":"neuron_secure_until";
 const TOKEN=isUpdate?"neuron_update_token":"neuron_retrieval_token";
 const LOGIN_ACTION=isUpdate?"updateLogin":"retrievalLogin";
 const showPortal=()=>{g.hidden=true;p.hidden=false;};
 window.NeuronUpdateSession={token:()=>localStorage.getItem("neuron_update_token")||"",clear:()=>{localStorage.removeItem("neuron_update_token");localStorage.removeItem("neuron_update_until");}};

 if(Number(localStorage.getItem(KEY)||0)>Date.now() && localStorage.getItem(TOKEN)){
   showPortal();
   if(isUpdate)window.dispatchEvent(new Event("neuron-update-session-ready"));
   return;
 }

 $("enter").onclick=async()=>{
   const btn=$("enter"); btn.disabled=true; btn.textContent="Verifying…";
   try{
     const r=await NeuronAPI.call(LOGIN_ACTION,{password:$("password").value},15000);
     if(!r||!r.token)throw Error("Unable to create secure session.");
     localStorage.setItem(TOKEN,r.token);
     const ttl=Number(r.expiresInSeconds)||900;
     localStorage.setItem(KEY,String(Date.now()+ttl*1000));
     $("password").value="";
     showPortal();
     if(isUpdate)window.dispatchEvent(new Event("neuron-update-session-ready"));
   }catch(e){
     alert(e.message||"Unable to access this portal.");
   }finally{
     btn.disabled=false; btn.textContent="Access Portal";
   }
 };
});
