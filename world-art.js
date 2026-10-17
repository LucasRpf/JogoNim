(()=>{
  const paths=[
    'assets/forest-entry.png',
    'assets/savana-conceito.png',
    'assets/praia-conceito.png',
    'assets/gelo-conceito.png',
    'assets/cidade-brasileira-conceito.png'
  ];
  const panels=paths.map(src=>{const image=new Image();image.src=src;return image;});
  const strips=[];

  function prepare(image,index){
    const strip=document.createElement('canvas');strip.width=1040;strip.height=H;
    const g=strip.getContext('2d');g.imageSmoothingEnabled=false;
    const scale=1040/image.naturalWidth;
    const offset=ground-image.naturalHeight*.78*scale;
    g.drawImage(image,0,offset,1040,image.naturalHeight*scale);
    if(index>0){
      g.globalCompositeOperation='destination-in';
      const fade=g.createLinearGradient(0,0,80,0);fade.addColorStop(0,'transparent');fade.addColorStop(1,'#fff');
      g.fillStyle=fade;g.fillRect(0,0,1040,H);
    }
    strips[index]=strip;
  }

  function box(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}

  function bird(x,y,t,index,color='#315e74'){
    ctx.save();ctx.translate(Math.round(x),Math.round(y));if(Math.cos(t*.5+index)<0)ctx.scale(-1,1);
    const flap=Math.round(Math.sin(t*11+index)*6);
    box(-9,-flap-3,9,3,color);box(0,-flap-3,9,3,color);box(-5,-2,12,6,'#e8bd70');box(6,-3,5,4,color);box(11,-1,4,2,'#efc56d');ctx.restore();
  }

  function butterfly(x,y,t,index,color){
    const wing=2+Math.round(Math.abs(Math.sin(t*9+index))*5);
    box(x-wing,y-3,wing,7,color);box(x+2,y-3,wing,7,'#f5d27b');box(x,y-1,2,6,'#40392f');
  }

  function crab(x,t,index){
    const px=x+Math.sin(t*.9+index)*24;
    box(px,438,15,7,'#da5b36');box(px+3,434,9,6,'#ef7245');box(px-4,433,5,4,'#da5b36');box(px+14,433,5,4,'#da5b36');box(px+4,431,2,3,'#1f302e');box(px+10,431,2,3,'#1f302e');
  }

  function snow(regionStart,t){
    for(let i=0;i<30;i++){const x=regionStart+(i*43+t*15)%REGION_W,y=40+(i*67+t*20)%360;box(x,y,2+i%2,2+i%2,'rgba(255,255,255,.72)');}
  }

  function fish(x,y,t,index){
    const lift=Math.max(0,Math.sin(t*1.7+index))*22;
    box(x,y-lift,16,8,'#7bd9d4');box(x-5,y-lift-3,6,14,'#4e9dbb');
    box(x+11,y-lift+2,2,2,'#263d51');
  }
  function penguin(x,y,t,index){
    const bob=Math.sin(t*2+index)*3;
    box(x,y+bob,20,32,'#28384e');box(x+4,y+6+bob,12,23,'#e6f5ee');
    box(x+4,y+5+bob,3,3,'#fff');box(x+14,y+5+bob,3,3,'#fff');
    box(x+8,y+11+bob,5,4,'#efb75d');
  }
  function leaves(base,t){
    for(let i=0;i<8;i++){
      const x=base+(i*117+Math.sin(t*.5+i)*26)%REGION_W;
      const y=(i*61+t*(12+i%3*4))%370+30;
      box(x,y,5,4,i%2?'#c6b95d':'#7db36e');
    }
  }

  function cityBird(x,y,t,index){bird(x+Math.sin(t*.6+index)*30,y+Math.sin(t*1.4+index)*8,t,index,'#5c6670');}

  window.worldArt={
    draw(camera){
      for(let i=0;i<strips.length;i++){
        const x=i*REGION_W-Math.round(camera);
        if(strips[i]&&x<W&&x+1040>0)ctx.drawImage(strips[i],x,0);
      }
    },
    animate(region){
      const t=performance.now()/1000,base=region*REGION_W;
      if(region===0){
        bird(base+270+Math.sin(t*.5)*60,185+Math.sin(t*1.6)*10,t,0);
        leaves(base,t);
        for(let i=0;i<5;i++)butterfly(base+120+i*150+Math.sin(t+i)*18,350+Math.cos(t*1.3+i)*22,t,i,i%2?'#c796dd':'#e89b42');
      }else if(region===1){
        bird(base+300+Math.sin(t*.35)*90,155+Math.sin(t)*12,t,1,'#272c30');
        bird(base+700+Math.sin(t*.45)*70,205+Math.cos(t)*12,t,2,'#7c3e28');
        bird(base+520+Math.sin(t*.35)*40,125,t,8,'#d7a653');
      }else if(region===2){
        bird(base+260+Math.sin(t*.5)*85,145+Math.sin(t*1.4)*12,t,3,'#edf3f1');
        bird(base+690+Math.sin(t*.4)*70,185+Math.cos(t*1.2)*10,t,4,'#edf3f1');
        crab(base+120,t,0);crab(base+850,t,2);
        fish(base+410,414,t,0);fish(base+600,423,t,2);
      }else if(region===3){
        snow(base,t);bird(base+500+Math.sin(t*.25)*130,150,t,5,'#f4f7f6');
        penguin(base+210,417,t,0);penguin(base+670,417,t,1);
      }else{
        cityBird(base+250,170,t,6);cityBird(base+650,210,t,7);
        cityBird(base+450,130,t,9);
      }
    }
  };

  Promise.all([...panels,...heroSprites].map(image=>image.decode())).then(()=>{
    panels.forEach(prepare);sceneReady=true;startButton.disabled=false;statusText.textContent='Os cinco mundos estão prontos';
  }).catch(error=>{
    console.error(error);statusText.textContent='Não foi possível carregar os cenários. Atualize a página.';
  });
})();

