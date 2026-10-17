const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

const W=960,H=540,REGION_W=960,REGION_COUNT=5,worldW=REGION_W*REGION_COUNT,ground=455;
const letters='BENJAMIN'.split('');
const regionNames=['Floresta','Savana','Praia','Mundo de Gelo','Cidade Brasileira'];
const ageHeights=[70,76,82,88,94];
const spritePaths=[1,2,3,4,5].map(age=>`assets/benjamim-${age}${age===1?'ano':'anos'}-sprites.png`);
const heroSprites=spritePaths.map(src=>{const image=new Image();image.src=src;return image;});
const statusText=document.getElementById('statusText'),startButton=document.getElementById('startBtn');

let keys={},running=false,won=false,frame=0,cameraX=0,player,items,obstacles;
// Estado dedicado aos controles de toque, independente do teclado físico.
let touchLeft=false,touchRight=false,touchJump=false;
let sceneReady=false,growthTimer=0,lastRegion=0,retryRegion=0,retryPending=false,invulnerable=0;
let celebrationStart=0;

startButton.disabled=true;
statusText.textContent='Preparando os cinco mundos…';

const obstacleLayout=[];
for(let region=0;region<REGION_COUNT;region++){
  const base=region*REGION_W;
  obstacleLayout.push({x:base+342,y:418,w:148,h:37,type:'wide'});
  obstacleLayout.push({x:base+682,y:414,w:92,h:41,type:'round'});
}

// Obstáculos fatais grandes, com silhuetas e cores diferentes por mundo.
const hazardLayout=Array.from({length:REGION_COUNT},(_,region)=>[
  {x:region*REGION_W+535,y:ground-52,w:57,h:52,region,kind:['thorns','cactus','crab','ice','car'][region]},
  {x:region*REGION_W+845,y:ground-50,w:58,h:50,region,kind:['thorns','cactus','crab','ice','car'][region],phase:1.8}
]).flat();
const hazards=hazardLayout.map(h=>({...h}));

const letterLayout=[
  ['B',190,348,0],['E',790,330,0],
  ['N',REGION_W+190,342,1],['J',REGION_W+790,326,1],
  ['A',REGION_W*2+190,345,2],['M',REGION_W*2+790,326,2],
  ['I',REGION_W*3+790,332,3],
  ['N',REGION_W*4+790,330,4]
];

function reset(){
  player={x:72,y:ground-ageHeights[0],w:28,h:ageHeights[0],vx:0,vy:0,onGround:true,facing:1,age:1};
  cameraX=0;frame=0;won=false;growthTimer=0;lastRegion=0;retryRegion=0;retryPending=false;invulnerable=0;keys={};touchLeft=false;touchRight=false;touchJump=false;
  obstacles=obstacleLayout.map(o=>({...o}));
  items=letterLayout.map(([l,x,y,region])=>({l,x,y,region,got:false}));
  updateLetters();
}

function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function collide(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

function currentRegion(){return Math.min(REGION_COUNT-1,Math.floor(player.x/REGION_W));}

function growTo(region){
  if(region===lastRegion)return;
  const oldBottom=player.y+player.h;
  player.age=region+1;player.h=ageHeights[region];player.y=oldBottom-player.h;
  lastRegion=region;growthTimer=150;window.gameAudio?.grow();
}

function updateLetters(){
  document.getElementById('letters').innerHTML=items.map(it=>`<span class="letter ${it.got?'got':''}">${it.l}</span>`).join('');
}

function respawnInRegion(region){
  // Mantém as letras dos mundos anteriores, mas permite recolher as deste mundo.
  items.forEach(it=>{if(it.region===region)it.got=false;});
  updateLetters();
  player.x=region*REGION_W+55;
  player.h=ageHeights[region];player.y=ground-player.h;
  player.age=region+1;player.vx=0;player.vy=0;player.onGround=true;
  lastRegion=region;growthTimer=0;cameraX=Math.max(0,Math.min(worldW-W,player.x-W*.35));
  keys={};touchLeft=false;touchRight=false;touchJump=false;
  document.querySelectorAll('.touch-btn').forEach(button=>button.classList.remove('pressed'));
  invulnerable=60;
}

function loseLife(region){
  if(!running||invulnerable>0)return;
  running=false;retryPending=true;retryRegion=region;
  const overlay=document.getElementById('overlay');
  overlay.querySelector('.eyebrow').textContent='TENTE MAIS UMA VEZ';
  overlay.querySelector('h1').innerHTML='OPS, BENJAMIN!<br><span>Não desista!</span>';
  overlay.querySelector('.intro').textContent=`Você continua em ${regionNames[region]}. As letras dos mundos anteriores estão salvas!`;
  startButton.innerHTML='TENTAR NOVAMENTE <span>↻</span>';
  overlay.classList.add('visible');
}

function completeGame(){
  celebrationStart=performance.now();window.gameAudio?.victory();
  won=true;running=false;
  const overlay=document.getElementById('overlay');
  overlay.querySelector('.eyebrow').textContent='JORNADA COMPLETA';
  overlay.querySelector('h1').innerHTML='Feliz aniversário<br><span>Benjamin - 6 anos -</span>';
  overlay.querySelector('.intro').innerHTML='Você reuniu todas as letras!<br>Que sua nova aventura seja incrível!';
  startButton.innerHTML='JOGAR DE NOVO <span>→</span>';
  overlay.classList.add('visible');
}

function step(){
  if(!running)return;
  frame++;const p=player;
  p.vx=((keys.ArrowRight||keys.d||touchRight)?3.75:0)-((keys.ArrowLeft||keys.a||touchLeft)?3.75:0);
  if(p.vx)p.facing=Math.sign(p.vx);
  if((keys[' ']||keys.ArrowUp||keys.w||touchJump)&&p.onGround){p.vy=-10.8;p.onGround=false;window.gameAudio?.jump();}

  p.x+=p.vx;
  for(const o of obstacles)if(collide(p,o))p.x=p.vx>0?o.x-p.w:p.vx<0?o.x+o.w:p.x;
  p.x=Math.max(4,Math.min(worldW-p.w-4,p.x));

  const oldY=p.y;
  p.vy=Math.min(p.vy+.46,12);p.y+=p.vy;p.onGround=false;
  for(const o of obstacles)if(collide(p,o)){
    if(p.vy>=0&&oldY+p.h<=o.y+2){p.y=o.y-p.h;p.vy=0;p.onGround=true;}
    else if(p.vy<0&&oldY>=o.y+o.h){p.y=o.y+o.h;p.vy=0;}
  }
  if(p.y+p.h>=ground){p.y=ground-p.h;p.vy=0;p.onGround=true;}
  if(p.y<0){p.y=0;p.vy=0;}

  const region=currentRegion();growTo(region);window.gameAudio?.region(region);
  if(invulnerable>0)invulnerable--;
  for(const h of hazards){
    if(h.region!==region)continue;
    const sway=h.kind==='crab'?Math.sin(frame*.045+(h.phase||0))*23:
               h.kind==='car'?Math.sin(frame*.06+(h.phase||0))*27:0;
    const hitbox={x:h.x+sway+8,y:h.y+7,w:h.w-16,h:h.h-7};
    if(collide(p,hitbox)){window.gameAudio?.hurt();loseLife(region);return;}
  }
  cameraX=Math.max(0,Math.min(worldW-W,p.x-W*.35));

  for(const it of items)if(!it.got&&collide(p,{x:it.x-4,y:it.y-5,w:36,h:43})){
    it.got=true;updateLetters();window.gameAudio?.letter();
    if(items.every(item=>item.got))completeGame();
  }
  if(growthTimer>0)growthTimer--;
  const collected=items.filter(it=>it.got).length;
  statusText.textContent=`${regionNames[region]} · ${player.age} ${player.age===1?'ano':'anos'} · ${collected}/8 letras`;
}

function frameIndex(){
  if(growthTimer>95)return 6;
  if(!player.onGround)return player.vy<0?3:4;
  if(Math.abs(player.vx)>.2)return 1+Math.floor(frame/8)%2;
  return 0;
}

function drawPlayer(){
  const sprite=heroSprites[player.age-1];
  if(!sprite.complete||!sprite.naturalWidth)return;
  const index=frameIndex(),col=index%4,row=Math.floor(index/4);
  const sw=sprite.naturalWidth/4,sh=sprite.naturalHeight/2;
  const height=player.h+14,width=height*(sw/sh);
  ctx.save();ctx.translate(Math.round(player.x+player.w/2),Math.round(player.y+player.h));ctx.scale(player.facing,1);
  ctx.drawImage(sprite,col*sw,row*sh,sw,sh,-width/2,-height,width,height);ctx.restore();
}

function drawLetter(it,index){
  const y=it.y+Math.sin(performance.now()/250+index)*4;
  const x=it.x-4;
  ctx.fillStyle='rgba(255,222,108,.2)';ctx.beginPath();ctx.arc(x+18,y+19,31,0,Math.PI*2);ctx.fill();
  rect(x-3,y-5,42,47,'#4e3827');
  rect(x,y-2,36,41,'#f0ba55');
  rect(x+3,y+1,30,5,'#ffeaa5');
  ctx.font='bold 29px monospace';ctx.textAlign='center';ctx.fillStyle='#493526';
  ctx.fillText(it.l,x+18,y+30);
}

function drawGrowthBanner(){
  if(growthTimer<=0)return;
  const opacity=Math.min(1,growthTimer/25,(150-growthTimer)/20);
  ctx.save();ctx.globalAlpha=Math.max(0,opacity);
  rect(W/2-128,38,256,58,'rgba(29,35,34,.82)');
  ctx.strokeStyle='#f3c868';ctx.lineWidth=3;ctx.strokeRect(W/2-128,38,256,58);
  ctx.fillStyle='#fff0c8';ctx.textAlign='center';ctx.font='bold 16px monospace';ctx.fillText(`${player.age} ANOS`,W/2,62);
  ctx.fillStyle='#aee0c0';ctx.font='11px monospace';ctx.fillText(regionNames[player.age-1].toUpperCase(),W/2,82);ctx.restore();
}

function drawHazard(h){
  const sway=h.kind==='crab'?Math.sin(frame*.045+(h.phase||0))*23:
             h.kind==='car'?Math.sin(frame*.06+(h.phase||0))*27:0;
  const x=Math.round(h.x+sway),y=h.y;
  ctx.save();
  // Contorno escuro reforça a leitura dos perigos mesmo em telas pequenas.
  if(h.kind==='thorns'||h.kind==='ice'){
    const icy=h.kind==='ice';
    rect(x,y+32,h.w,20,icy?'#34577e':'#563b42');
    for(let i=0;i<3;i++){
      const bx=x+i*19;
      ctx.fillStyle=icy?'#b8f6ff':'#ed7a6d';
      ctx.strokeStyle='#28384c';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(bx,y+36);ctx.lineTo(bx+10,y-3+(i%2)*7);ctx.lineTo(bx+20,y+36);ctx.closePath();ctx.fill();ctx.stroke();
    }
  }else if(h.kind==='cactus'){
    rect(x+19,y+3,23,49,'#244d3b');rect(x+23,y+7,15,43,'#60c978');
    rect(x+4,y+16,20,12,'#244d3b');rect(x+8,y+12,12,14,'#60c978');
    rect(x+37,y+22,19,12,'#244d3b');rect(x+41,y+16,11,15,'#60c978');
    for(let i=0;i<4;i++)rect(x+26+(i%2)*7,y+11+i*10,3,4,'#e8ef9e');
  }else if(h.kind==='crab'){
    rect(x+8,y+20,43,27,'#773e49');rect(x+12,y+16,35,27,'#ed775c');
    rect(x+15,y+8,9,13,'#773e49');rect(x+35,y+8,9,13,'#773e49');
    rect(x+18,y+11,4,5,'#fff8dd');rect(x+37,y+11,4,5,'#fff8dd');
    rect(x,y+21,13,15,'#ed775c');rect(x+46,y+21,12,15,'#ed775c');
    rect(x+4,y+44,12,6,'#773e49');rect(x+43,y+44,12,6,'#773e49');
  }else if(h.kind==='car'){
    rect(x+2,y+19,54,25,'#333650');rect(x+6,y+14,46,26,'#f3a653');
    rect(x+16,y+4,29,16,'#333650');rect(x+20,y+7,21,12,'#b6e6e3');
    rect(x+10,y+38,13,13,'#24203a');rect(x+38,y+38,13,13,'#24203a');
    rect(x+13,y+41,7,7,'#c7c4a7');rect(x+41,y+41,7,7,'#c7c4a7');
  }
  ctx.restore();
}

function drawCelebration(){
  if(!won)return;
  const t=(performance.now()-celebrationStart)/1000;
  ctx.save();
  for(let i=0;i<65;i++){
    const x=(i*173+Math.sin(t*1.4+i)*18)%W;
    const y=((i*97+t*(38+i%4*13))%(H+40))-20;
    rect(x,y,5+i%3,8+i%4,['#ffda6c','#e77e9d','#86dcca','#b9a3ed'][i%4]);
  }
  for(let i=0;i<6;i++){
    const x=85+i*155+Math.sin(t+i)*12,y=105+Math.cos(t*.9+i)*14;
    ctx.fillStyle=['#f09a9e','#f5c76c','#8ddac5'][i%3];
    ctx.beginPath();ctx.ellipse(x,y,17,23,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#fff0cb';ctx.beginPath();ctx.moveTo(x,y+23);ctx.lineTo(x-4,y+68);ctx.stroke();
  }
  rect(410,385,140,50,'#ef9faf');rect(402,378,156,13,'#fff0d7');
  rect(429,350,102,28,'#e9c28c');rect(424,343,112,10,'#fff0d7');
  rect(476,315,9,28,'#8cd9cb');
  ctx.fillStyle='#ffce69';ctx.beginPath();ctx.ellipse(480,309+Math.sin(t*8)*2,5,9,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#51354e';ctx.textAlign='center';ctx.font='bold 26px monospace';ctx.fillText('6',480,374);
  ctx.restore();
}

function draw(){
  rect(0,0,W,H,'#17352f');
  if(!window.worldArt)return;
  window.worldArt.draw(cameraX,currentRegion());
  ctx.save();ctx.translate(-Math.round(cameraX),0);
  window.worldArt.animate(currentRegion());
  items.forEach((it,i)=>{if(!it.got)drawLetter(it,i);});
  hazards.forEach(drawHazard);
  ctx.fillStyle='rgba(18,28,22,.24)';ctx.beginPath();ctx.ellipse(player.x+player.w/2,ground+2,20,4,0,0,Math.PI*2);ctx.fill();
  if(invulnerable===0||Math.floor(frame/5)%2===0)drawPlayer();ctx.restore();drawGrowthBanner();drawCelebration();
}

function start(){
  if(!sceneReady)return;
  if(retryPending){respawnInRegion(retryRegion);retryPending=false;}
  else reset();
  running=true;window.gameAudio?.start();
  const overlay=document.getElementById('overlay');
  overlay.classList.remove('visible');
}

window.addEventListener('keydown',event=>{
  const key=event.key.length===1?event.key.toLowerCase():event.key;keys[key]=true;
  if(key==='r'&&!event.repeat)start();
  if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))event.preventDefault();
});
window.addEventListener('keyup',event=>{keys[event.key.length===1?event.key.toLowerCase():event.key]=false;});
window.addEventListener('blur',()=>{keys={};touchLeft=false;touchRight=false;touchJump=false;document.querySelectorAll('.touch-btn').forEach(button=>button.classList.remove('pressed'));});

// Controles por toque: mantêm o movimento ativo enquanto o dedo estiver pressionando.
const touchButtons=document.querySelectorAll('.touch-btn');
function setTouchButton(button, pressed){
  const key=button.dataset.key;
  if(key==='ArrowLeft')touchLeft=pressed;
  else if(key==='ArrowRight')touchRight=pressed;
  else if(key===' ')touchJump=pressed;
  button.classList.toggle('pressed',pressed);
}
touchButtons.forEach(button=>{
  button.addEventListener('pointerdown',event=>{
    event.preventDefault();
    if(!running)return;
    if(button.setPointerCapture)button.setPointerCapture(event.pointerId);
    setTouchButton(button,true);
  });
  // Liberar no window também evita que o botão fique preso se o dedo sair dele.
  const release=()=>setTouchButton(button,false);
  button.addEventListener('pointerup',release);
  button.addEventListener('pointercancel',release);
  button.addEventListener('lostpointercapture',release);
  window.addEventListener('pointerup',release);
  window.addEventListener('pointercancel',release);
  button.addEventListener('contextmenu',event=>event.preventDefault());
  // Fallback para navegadores móveis que não disparem Pointer Events corretamente.
  button.addEventListener('touchstart',event=>{
    event.preventDefault();
    if(running)setTouchButton(button,true);
  },{passive:false});
  button.addEventListener('touchend',event=>{
    event.preventDefault();release();
  },{passive:false});
  button.addEventListener('touchcancel',release);
});

startButton.onclick=start;reset();

let previous=0,accumulator=0;
function tick(now){
  accumulator+=Math.min(50,now-(previous||now));previous=now;
  while(accumulator>=1000/60){step();accumulator-=1000/60;}
  draw();requestAnimationFrame(tick);
}
requestAnimationFrame(tick);



// Mede a área visível do navegador (sem a barra de endereço) para centralizar
// o canvas e manter os controles inteiros dentro da tela em modo paisagem.
function updateVisibleGameHeight(){
  const height=window.visualViewport?window.visualViewport.height:window.innerHeight;
  document.documentElement.style.setProperty('--visible-game-height',Math.round(height)+'px');
}
updateVisibleGameHeight();
window.addEventListener('resize',updateVisibleGameHeight);
window.addEventListener('orientationchange',updateVisibleGameHeight);
if(window.visualViewport)window.visualViewport.addEventListener('resize',updateVisibleGameHeight);
