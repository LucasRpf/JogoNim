// Música original sintetizada no navegador, sem arquivos externos.
(()=>{
  const toggle=document.getElementById('soundToggle');
  let context=null,enabled=true,playing=false,regionIndex=-1,beatTimer=null,beat=0;
  const melodies=[
    [392,440,523,440,392,330,349,392],
    [330,392,440,392,330,294,330,262],
    [392,494,587,494,440,392,330,392],
    [523,587,659,587,523,440,392,440],
    [440,523,587,659,587,523,494,523]
  ];
  function audio(){if(!context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;context=new C();}if(context.state==='suspended')context.resume().catch(()=>{});return context;}
  function tone(freq,duration=.13,volume=.045,type='sine',delay=0){
    if(!enabled)return;
    const ac=audio();if(!ac)return;
    const start=ac.currentTime+delay,osc=ac.createOscillator(),gain=ac.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,start);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(ac.destination);osc.start(start);osc.stop(start+duration+.02);
  }
  function loop(){
    if(!playing||!enabled)return;
    const notes=melodies[Math.max(0,regionIndex)];
    tone(notes[beat%notes.length],.19,.018,regionIndex===3?'sine':'triangle');
    if(beat%4===0)tone(notes[beat%notes.length]/2,.24,.012,'sine');
    beat++;
  }
  function stopLoop(){if(beatTimer!==null){clearInterval(beatTimer);beatTimer=null;}}
  function playLoop(){stopLoop();if(playing&&enabled){loop();beatTimer=setInterval(loop,320);}}
  function setEnabled(value){
    enabled=value;toggle.textContent=value?'🔊':'🔇';
    toggle.setAttribute('aria-label',value?'Desligar som':'Ligar som');
    toggle.setAttribute('aria-pressed',String(value));
    if(value){audio();playLoop();}else stopLoop();
  }
  toggle.addEventListener('click',()=>setEnabled(!enabled));
  window.gameAudio={
    start(){playing=true;regionIndex=0;beat=0;audio();playLoop();},
    region(i){if(i!==regionIndex){regionIndex=i;beat=0;playLoop();}},
    jump(){tone(440,.09,.045,'square');},
    letter(){tone(659,.12,.06,'sine');tone(880,.16,.05,'sine',.1);},
    grow(){tone(392,.12,.04,'triangle');tone(523,.16,.04,'triangle',.12);tone(659,.2,.04,'triangle',.26);},
    hurt(){tone(220,.2,.06,'sawtooth');tone(147,.28,.045,'triangle',.12);},
    victory(){playing=false;stopLoop();[523,659,784,1047,784,1047].forEach((n,i)=>tone(n,.27,.07,'triangle',i*.18));}
  };
})();
