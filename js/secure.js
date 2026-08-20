document.addEventListener("DOMContentLoaded",()=>{
 const g=$("gate"),p=$("portal"),KEY="neuron_secure_until";
 if(Number(localStorage.getItem(KEY)||0)>Date.now()){g.hidden=true;p.hidden=false;return}
 $("enter").onclick=()=>{
   try{
     if($("password").value!=="265044")throw Error("Incorrect password.");
     localStorage.setItem(KEY,String(Date.now()+NEURON_CONFIG.secureCacheHours*3600000));
     g.hidden=true;p.hidden=false;
   }catch(e){alert(e.message)}
 };
});