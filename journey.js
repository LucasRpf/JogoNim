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
let sceneReady=false,growthTimer=0,lastRegion=0;

startButton.disabled=true;
statusText.textContent='Preparando os cinco mundos…';

const obstacleLayout=[];
for(let region=0;region<REGION_COUNT;region++){
  const base=region*REGION_W;
  obstacleLayout.push({x:base+342,y:418,w:148,h:37,type:'wide'});
  obstacleLayout.push({x:base+682,y:414,w:92,h:41,type:'round'});
}

const letterLayout=[
  ['B',190,348,0],['E',790,330,0],
  ['N',REGION_W+190,342,1],['J',REGION_W+790,326,1],
  ['A',REGION_W*2+190,345,2],['M',REGION_W*2+790,326,2],
  ['I',REGION_W*3+790,332,3],
  ['N',REGION_W*4+790,330,4]
];

function reset(){
  player={x:72,y:ground-ageHeights[0],w:28,h:ageHeights[0],vx:0,vy:0,onGround:true,facing:1,age:1};
  cameraX=0;frame=0;won=false;growthTimer=0;lastRegion=0;keys={};touchLeft=false;touchRight=false;touchJump=false;
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
  lastRegion=region;growthTimer=150;
}

function updateLetters(){
  document.getElementById('letters').innerHTML=items.map(it=>`<span class="letter ${it.got?'got':''}">${it.l}</span>`).join('');
}

function completeGame(){
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
  if((keys[' ']||keys.ArrowUp||keys.w||touchJump)&&p.onGround){p.vy=-10.8;p.onGround=false;}

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

  const region=currentRegion();growTo(region);
  cameraX=Math.max(0,Math.min(worldW-W,p.x-W*.35));

  for(const it of items)if(!it.got&&collide(p,{x:it.x-4,y:it.y-5,w:36,h:43})){
    it.got=true;updateLetters();
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

function draw(){
  rect(0,0,W,H,'#17352f');
  if(!window.worldArt)return;
  window.worldArt.draw(cameraX,currentRegion());
  ctx.save();ctx.translate(-Math.round(cameraX),0);
  window.worldArt.animate(currentRegion());
  items.forEach((it,i)=>{if(!it.got)drawLetter(it,i);});
  ctx.fillStyle='rgba(18,28,22,.24)';ctx.beginPath();ctx.ellipse(player.x+player.w/2,ground+2,20,4,0,0,Math.PI*2);ctx.fill();
  drawPlayer();ctx.restore();drawGrowthBanner();
}

function start(){
  if(!sceneReady)return;
  reset();running=true;
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
