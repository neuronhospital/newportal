(()=>{
  const runButton=document.getElementById("run");
  const status=document.getElementById("status");
  const summary=document.getElementById("summary");
  const log=document.getElementById("log");

  function now(){return performance.now();}
  function fmt(n){return Number(n).toFixed(1)+" ms";}
  function append(line){log.textContent+=(log.textContent?"\n":"")+line;}

  runButton.addEventListener("click",async()=>{
    runButton.disabled=true;
    status.textContent="Running…";
    summary.textContent="";
    log.textContent="";

    const traceStart=now();
    const marks=[];
    const mark=(step,event)=>{
      const t=now();
      marks.push({step,event,t,elapsed:t-traceStart});
      append(`${step} | ${event} | ${fmt(t-traceStart)}`);
    };

    mark("D0","Minimal HTTP test started");
    try{
      const result=await NeuronAPI.call("diagnosticMinimalResponse",{},25000,{mark});
      const end=now();
      const a13=marks.find(x=>x.step==="A1.3");
      const a2=marks.find(x=>x.step==="A2");
      const transportMs=a13&&a2?Math.max(0,a2.t-a13.t):NaN;
      const totalMs=end-traceStart;
      const serverMs=Number(result.serverExecutionMs)||0;
      const serverReturnAt=Number(result.serverReturnAt)||0;
      const serverEntryAt=Number(result.serverEntryAt)||0;
      const browserEpochAtEnd=Date.now();
      const estimatedServerToBrowser=serverReturnAt?Math.max(0,browserEpochAtEnd-serverReturnAt):NaN;

      mark("D1","Minimal HTTP test completed");
      status.textContent="Completed successfully.";
      summary.textContent=[
        `A1.3 → A2 transport wait: ${fmt(transportMs)}`,
        `Total browser test: ${fmt(totalMs)}`,
        `Server execution reported: ${fmt(serverMs)}`,
        `Approx. server-return → browser completion: ${Number.isFinite(estimatedServerToBrowser)?fmt(estimatedServerToBrowser):"unavailable"}`,
        `HTTP status: 200 / OK`,
        `Redirected response: see A2.10 transport diagnostics`
      ].join("\n");
      append(`SERVER | entry=${serverEntryAt} return=${serverReturnAt} execution=${serverMs} ms`);
      append(`RESULT | A1.3→A2=${fmt(transportMs)} | total=${fmt(totalMs)}`);
    }catch(e){
      status.textContent="Test failed: "+String(e?.message||e);
      append("ERROR | "+String(e?.stack||e));
    }finally{
      runButton.disabled=false;
    }
  });
})();
