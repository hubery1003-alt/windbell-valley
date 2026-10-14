const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#world'), ctx=canvas.getContext('2d',{alpha:false}), scene=$('#scene');
const WORLD={w:7200,h:2400};
const places=[
 {x:.085,name:'林间车站',sub:'下一班车，还要等一朵云的时间。'},
 {x:.235,name:'麦香面包房',sub:'刚出炉的香气，是午后的邀请。'},
 {x:.44,name:'风铃广场',sub:'树荫下，每一阵风都有回声。'},
 {x:.70,name:'溪上石桥',sub:'把心事交给溪水，把脚步留给石桥。'},
 {x:.925,name:'向日葵坡',sub:'花朝着太阳，你朝着喜欢的方向。'}
];
const road=[[0,.845],[.55,.845],[.585,.80],[.62,.722],[.665,.639],[.70,.637],[.736,.68],[.775,.755],[.815,.837],[1,.845]];
function roadY(x){const u=x/WORLD.w;for(let i=1;i<road.length;i++){if(u<=road[i][0]){const a=road[i-1],b=road[i];return(a[1]+(b[1]-a[1])*(u-a[0])/(b[0]-a[0]))*WORLD.h;}}return .845*WORLD.h;}
const player={x:WORLD.w*.44,offset:5,row:0,facing:1,moving:false,steps:0,phase:0};
const actors=[
 {id:'tea',name:'茶婆婆',row:1,x:WORLD.w*.418,home:WORLD.w*.418,range:190,offset:-22,speed:29,facing:1,phase:1.2,height:300,lines:['溪水烧的茶，要等风铃响过三声才好喝。来，坐一会儿，今天没有急事。','这棵树比我还大呢。每年初秋，我都给它挂一只新的风铃。','你走远了也别担心，风会记得回家的路。']},
 {id:'post',name:'邮差阿岚',row:2,x:WORLD.w*.28,home:WORLD.w*.32,range:1370,offset:20,speed:64,facing:1,phase:3,height:315,lines:['今天的信很轻，可能装着好消息。你要寄一阵风给谁吗？','我从林间车站一路走过来。面包房留了最松软的那一块给你。','听说向日葵坡上，每一朵花都在替远方的人挥手。']},
 {id:'cat',name:'麦粒',row:3,x:WORLD.w*.247,home:WORLD.w*.25,range:230,offset:36,speed:40,facing:-1,phase:5,height:163,lines:['喵——（它认真地闻了闻你的鞋子，决定允许你一起晒太阳。）','呼噜……（面包房的台阶，是它今天最重要的工作地点。）','喵？（一只蝴蝶经过，它的午后计划忽然忙了起来。）']},
 {id:'forest-cat',name:'麦粒的朋友 · 松果',row:3,x:WORLD.w*.89,home:WORLD.w*.90,range:330,offset:28,speed:32,facing:1,phase:9,height:155,lines:['喵。（它从花丛里探出头，又悄悄把尾巴藏了起来。）']}
];
let viewport={w:1,h:1,dpr:1},cam={x:player.x,y:1300,scale:.5}, zoom=1.55, overview=false, timeMode='day', clock=0,last=0, paused=false,tour=false,tourDir=1,target=null,ready=false,activePlace=-1,toastTimer,talkCount={};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,keys=new Set(),visited=new Set([2]);
try{JSON.parse(localStorage.getItem('windbell-visits')||'[]').forEach(x=>{if(Number.isInteger(x)&&x>=0&&x<5)visited.add(x);});}catch{}
const image=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`加载失败：${src}`));im.src=src;});
let background,sheet,frames=[],rowHeight=[];
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function resize(){const b=scene.getBoundingClientRect();viewport={w:b.width,h:b.height,dpr:Math.min(devicePixelRatio||1,2)};canvas.width=Math.round(b.width*viewport.dpr);canvas.height=Math.round(b.height*viewport.dpr);}
new ResizeObserver(resize).observe(scene);resize();
function extractFrames(){
 const ac=document.createElement('canvas');ac.width=sheet.width;ac.height=sheet.height;const at=ac.getContext('2d',{willReadFrequently:true});at.drawImage(sheet,0,0);const pixels=at.getImageData(0,0,ac.width,ac.height).data,cw=ac.width/4,ch=ac.height/4;
 for(let row=0;row<4;row++){frames[row]=[];rowHeight[row]=0;for(let col=0;col<4;col++){let xmin=cw,ymin=ch,xmax=0,ymax=0;for(let y=row===3?20:0;y<ch;y++)for(let x=0;x<cw;x++){const a=pixels[((row*ch+y)*ac.width+col*cw+x)*4+3];if(a>130){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}}
  const x0=Math.max(0,xmin-2),y0=Math.max(row===3?20:0,ymin-2),x1=Math.min(cw,xmax+3),y1=Math.min(ch,ymax+3);const f={x:col*cw+x0,y:row*ch+y0,w:x1-x0,h:y1-y0};frames[row].push(f);rowHeight[row]=Math.max(rowHeight[row],f.h);
 }}
}
function setTour(on){tour=on;target=null;$('#tour').setAttribute('aria-pressed',String(on));$('#tour .play-icon').textContent=on?'Ⅱ':'▷';$('#tour span:last-child').textContent=on?'停下来看看':'随风漫游';if(on){overview=false;$('#overview').setAttribute('aria-pressed','false');$('#dialogue').hidden=true;tourDir=player.x>WORLD.w*.9?-1:1;toast('让风带路吧。再次点击可停下。');}}
function setOverview(on){overview=on;$('#overview').setAttribute('aria-pressed',String(on));if(on){setTour(false);toast('整个溪谷，都在这里。点击小地图可以去那里走走。');}}
function travel(placeIndex){setTour(false);setOverview(false);target={x:places[placeIndex].x*WORLD.w,offset:0};canvas.focus({preventScroll:true});toast(`沿着村道，去${places[placeIndex].name}。`);}
$$('[data-place]').forEach(b=>b.addEventListener('click',()=>travel(Number(b.dataset.place))));
$('#tour').addEventListener('click',()=>setTour(!tour));$('#overview').addEventListener('click',()=>setOverview(!overview));
$('#zoom-in').addEventListener('click',()=>{setOverview(false);zoom=Math.min(2.4,zoom+.2);});$('#zoom-out').addEventListener('click',()=>{setOverview(false);zoom=Math.max(1,zoom-.2);});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await scene.requestFullscreen();}catch{toast('当前浏览器不支持全屏，仍可正常漫游。');}});
$$('[data-time]').forEach(b=>b.addEventListener('click',()=>{timeMode=b.dataset.time;$$('[data-time]').forEach(x=>{const selected=x===b;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected));});$('#time-label').textContent={day:'初秋 · 午后',dusk:'初秋 · 日落',night:'初秋 · 星夜'}[timeMode];$('.sun-icon').textContent={day:'☀',dusk:'◒',night:'☾'}[timeMode];bell(timeMode==='night'?740:990);}));
const guide=$('#guide');$('#help').addEventListener('click',()=>{keys.clear();guide.showModal();});$('.modal-close').addEventListener('click',()=>guide.close());guide.addEventListener('click',e=>{if(e.target===guide){const r=guide.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)guide.close();}});
function nearby(){let found=null,d=230;for(const a of actors){const dist=Math.abs(a.x-player.x);if(dist<d){d=dist;found=a;}}return found;}
function talk(actor){if(!actor)return;setTour(false);target=null;const count=talkCount[actor.id]||0;talkCount[actor.id]=count+1;$('#speaker').textContent=actor.name;$('#speech').textContent=actor.lines[count%actor.lines.length];$('#dialogue').hidden=false;$('#talk-hint').hidden=true;bell(880);}
function closeTalk(){$('#dialogue').hidden=true;canvas.focus({preventScroll:true});}$('#close-dialogue').addEventListener('click',closeTalk);$('#mobile-talk').addEventListener('click',()=>{const a=nearby();if(a)talk(a);else toast('走到茶婆婆、邮差或猫咪身边再打招呼。');});
$$('[data-person]').forEach(b=>b.addEventListener('click',()=>{const a=actors.find(x=>x.id===b.dataset.person);player.x=a.x-130;player.offset=0;setOverview(false);setTour(false);scene.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});talk(a);canvas.focus({preventScroll:true});}));
window.addEventListener('keydown',e=>{if(guide.open)return;if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s','e',' ','shift'].includes(k)){if(e.target!==canvas&&[' ','arrowup','arrowdown'].includes(k)&&e.target.tagName==='BUTTON')return;e.preventDefault();if(k==='e'&&!e.repeat){if(!$('#dialogue').hidden)closeTalk();else{const a=nearby();if(a)talk(a);else toast('靠近村民，再按 E 打个招呼。');}}else{keys.add(k);if(k!=='shift'){setTour(false);target=null;if(!$('#dialogue').hidden)closeTalk();if(overview)setOverview(false);}}}if(k==='escape'){setTour(false);$('#dialogue').hidden=true;}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
$$('[data-dir]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);setTour(false);target=null;keys.add(b.dataset.dir==='1'?'d':'a');if(overview)setOverview(false);});const stop=()=>{keys.delete('d');keys.delete('a');};b.addEventListener('pointerup',stop);b.addEventListener('pointercancel',stop);b.addEventListener('lostpointercapture',stop);});
function screenToWorld(x,y){return{x:(x-viewport.w/2)/cam.scale+cam.x,y:(y-viewport.h/2)/cam.scale+cam.y};}
canvas.addEventListener('click',e=>{if(!ready)return;canvas.focus({preventScroll:true});const r=canvas.getBoundingClientRect(),p=screenToWorld(e.clientX-r.left,e.clientY-r.top);const a=actors.find(a=>Math.abs(p.x-a.x)<140&&p.y>roadY(a.x)+a.offset-a.height&&p.y<roadY(a.x)+a.offset+35);if(a){if(Math.abs(a.x-player.x)>250){target={x:a.x-player.facing*140,offset:0,talk:a};setTour(false);target={x:a.x-player.facing*140,offset:0,talk:a};toast(`走过去和${a.name}聊聊。`);}else talk(a);return;}setTour(false);if(overview)setOverview(false);target={x:Math.max(80,Math.min(WORLD.w-80,p.x)),offset:Math.max(-45,Math.min(55,p.y-roadY(p.x)))};$('#dialogue').hidden=true;});
let audioContext,soundOn=false,soundPending=false;
async function setSound(on){
 if(soundPending)return;soundPending=true;const button=$('#sound');button.disabled=true;
 try{if(on){audioContext??=new(window.AudioContext||window.webkitAudioContext)();await audioContext.resume();$('#music').volume=.37;$('#creek').volume=.3;await Promise.all([$('#music').play(),$('#creek').play()]);soundOn=true;bell(880);toast('正在播放「风经过茶屋」 · 原创钢琴与笛声');}else{$('#music').pause();$('#creek').pause();soundOn=false;}
 }catch(error){$('#music').pause();$('#creek').pause();soundOn=false;toast('声音暂未打开，请再点一次试试。');console.warn('Audio playback:',error.message);}finally{button.disabled=false;soundPending=false;button.setAttribute('aria-pressed',String(soundOn));button.querySelector('span').textContent=soundOn?'溪谷的声音':'开启声音';}
}
$('#sound').addEventListener('click',()=>setSound(!soundOn));
function bell(frequency=1046){if(!soundOn||!audioContext||audioContext.state!=='running')return;for(const [ratio,amp]of[[1,.035],[2.76,.009],[5.4,.003]]){const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=frequency*ratio;g.gain.setValueAtTime(amp,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+2.8);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+3);}}
document.addEventListener('visibilitychange',()=>{paused=document.hidden;keys.clear();last=0;if(document.hidden){$('#music').pause();$('#creek').pause();}else if(soundOn){Promise.all([$('#music').play(),$('#creek').play()]).catch(()=>setSound(false));}});
function update(dt){clock+=dt;const speed=keys.has('shift')?520:290;let direction=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);let dy=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
 if(tour){direction=tourDir;if(player.x>WORLD.w-140)tourDir=-1;if(player.x<140)tourDir=1;}
 if(target){const delta=target.x-player.x;if(Math.abs(delta)<Math.max(3,speed*dt)){player.x=target.x;player.offset=target.offset;const pending=target.talk;target=null;if(pending)talk(pending);}else direction=Math.sign(delta);}
 player.moving=direction!==0;if(direction){player.facing=direction;const old=player.x;player.x=Math.max(75,Math.min(WORLD.w-75,player.x+direction*speed*dt));player.steps+=Math.abs(player.x-old);player.phase+=dt*(keys.has('shift')?11:7);}player.offset=Math.max(-42,Math.min(52,player.offset+dy*130*dt));
 for(const a of actors){const t=clock+a.phase;const phase=t%19;a.moving=phase<12;if(a.moving){a.x+=a.facing*a.speed*dt;if(a.x>a.home+a.range){a.x=a.home+a.range;a.facing=-1;}if(a.x<a.home-a.range){a.x=a.home-a.range;a.facing=1;}}}
 const desiredScale=overview?Math.min(viewport.w/WORLD.w,viewport.h/WORLD.h):viewport.h/WORLD.h*zoom;
 cam.scale+=(desiredScale-cam.scale)*Math.min(1,dt*6);
 const halfW=viewport.w/(2*cam.scale),halfH=viewport.h/(2*cam.scale);
 const desiredX=overview?WORLD.w/2:Math.max(halfW,Math.min(WORLD.w-halfW,player.x+player.facing*100));
 const desiredY=overview?WORLD.h/2:Math.max(halfH,Math.min(WORLD.h-halfH,roadY(player.x)+player.offset-WORLD.h*.20));
 cam.x+=(desiredX-cam.x)*Math.min(1,dt*4);cam.y+=(desiredY-cam.y)*Math.min(1,dt*4);
 let index=0,nearest=Infinity;places.forEach((p,i)=>{const d=Math.abs(player.x/WORLD.w-p.x);if(d<nearest){index=i;nearest=d;}});
 if(index!==activePlace){activePlace=index;$('#place').textContent=places[index].name;$('#place-sub').textContent=places[index].sub;$$('[data-place]').forEach((b,i)=>b.classList.toggle('current',i===index));}
 if(nearest<.055&&!visited.has(index)){visited.add(index);try{localStorage.setItem('windbell-visits',JSON.stringify([...visited]));}catch{}if(visited.size===5){toast('你已走遍溪谷的五处风景。风铃把这次散步记住了。');bell(1318);}}
 $('#discovery').textContent=`已走访 ${visited.size} / 5`;const stops=$$('[data-place]'),u=player.x/WORLD.w,center=i=>stops[i].offsetLeft+stops[i].offsetWidth/2;let marker=center(0);for(let i=1;i<places.length;i++){if(u>=places[i-1].x){const fraction=Math.max(0,Math.min(1,(u-places[i-1].x)/(places[i].x-places[i-1].x)));marker=center(i-1)+(center(i)-center(i-1))*fraction;}}$('#map-marker').style.left=`${marker}px`;
 const n=nearby();$('#talk-hint').hidden=!n||!$('#dialogue').hidden||overview;if(n)$('#talk-hint').textContent=`${n.name} · 按 E 聊天`;
 if(soundOn&&Math.floor(clock/8)!==Math.floor((clock-dt)/8))bell([880,1046,1318][Math.floor(clock/8)%3]);
}
const ease=(x,a,b)=>Math.max(a,Math.min(b,x));
function sprite(a){const frame=a.moving?Math.floor((a===player?a.phase:clock*6+a.phase))%4:1;const f=frames[a.row][frame],height=a===player?330:a.height,ratio=height/rowHeight[a.row],y=roadY(a.x)+a.offset;ctx.save();ctx.translate(a.x,y);ctx.fillStyle=timeMode==='day'?'#44532a2e':'#192c243b';ctx.beginPath();ctx.ellipse(3,6,height*.15,height*.026,0,0,Math.PI*2);ctx.fill();ctx.scale(a.facing||1,1);const bob=a.moving?Math.sin((a===player?a.phase:clock*6+a.phase)*Math.PI)*2:reduced?0:Math.sin(clock*1.8+a.phase)*1.4;ctx.drawImage(sheet,f.x,f.y,f.w,f.h,-f.w*ratio/2,-f.h*ratio+bob,f.w*ratio,f.h*ratio);ctx.restore();if(a===player&&!overview){ctx.save();ctx.fillStyle='#faf7e9ee';ctx.beginPath();ctx.arc(a.x,y-height-33,16,0,Math.PI*2);ctx.fill();ctx.fillStyle='#758667';ctx.beginPath();ctx.moveTo(a.x-6,y-height-36);ctx.lineTo(a.x+6,y-height-36);ctx.lineTo(a.x,y-height-28);ctx.fill();ctx.restore();}}
function particles(){if(reduced)return;
 for(let i=0;i<30;i++){const x=(i*431+clock*(12+i%3*6))%(WORLD.w+120)-60,y=650+(i*173)%1420+Math.sin(clock*.6+i*2)*30;ctx.globalAlpha=timeMode==='night'?.3+.5*Math.sin(clock*2+i)**2:.65;ctx.fillStyle=timeMode==='night'?'#e5f3a8':'#f8ecd0';ctx.beginPath();ctx.ellipse(x,y,timeMode==='night'?4:6,timeMode==='night'?4:2.5,clock*.4+i,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 // Chimney smoke drifts upwards; each puff has a finite lifetime.
 for(const [x,y]of[[WORLD.w*.265,WORLD.h*.36],[WORLD.w*.572,WORLD.h*.265]])for(let j=0;j<4;j++){const age=(clock*.26+j/4)%1;ctx.globalAlpha=(1-age)*.15;ctx.fillStyle='#f7f0dd';ctx.beginPath();ctx.ellipse(x+Math.sin(age*3+j)*19+age*50,y-age*200,14+age*45,20+age*38,age*.4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 for(let i=0;i<5;i++){const x=WORLD.w*(.18+i*.17)+Math.sin(clock*.5+i)*120,y=1900+Math.sin(clock*.9+i*2)*65;ctx.save();ctx.translate(x,y);const flap=Math.abs(Math.sin(clock*6+i));ctx.fillStyle=i%2?'#f7d995c7':'#ffffe5cc';ctx.beginPath();ctx.ellipse(-4,y%2,9*flap+1,4,-.4,0,Math.PI*2);ctx.ellipse(4,0,9*flap+1,4,.4,0,Math.PI*2);ctx.fill();ctx.restore();}
}
function wheel(){const x=WORLD.w*.794,y=WORLD.h*.544,r=WORLD.h*.086;ctx.save();ctx.translate(x,y);ctx.rotate(reduced?0:clock*.095);ctx.globalAlpha=.14;ctx.strokeStyle='#644b2d';ctx.lineWidth=5;for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.13,Math.sin(a)*r*.13);ctx.lineTo(Math.cos(a)*r*.96,Math.sin(a)*r*.96);ctx.stroke();}ctx.restore();}
function bridgeForeground(){
 // The near parapet is an original-art foreground plate, so walkers pass behind it.
 if(player.x<WORLD.w*.585||player.x>WORLD.w*.815)return;
 const edge=[[.582,.718],[.614,.656],[.65,.612],[.685,.597],[.72,.604],[.752,.64],[.788,.701],[.815,.759],[.815,.89],[.582,.89]];
 ctx.save();ctx.beginPath();edge.forEach(([x,y],i)=>i?ctx.lineTo(x*WORLD.w,y*WORLD.h):ctx.moveTo(x*WORLD.w,y*WORLD.h));ctx.closePath();ctx.clip();ctx.drawImage(background,0,0,WORLD.w,WORLD.h);ctx.restore();
}
function stream(){ctx.save();for(let i=0;i<32;i++){const phase=(clock*.15+i*.17)%1,y=(.47+phase*.5)*WORLD.h,x=WORLD.w*(.695+.018*Math.sin(phase*5)+i%4*.006);ctx.globalAlpha=Math.sin(phase*Math.PI)*.28;ctx.strokeStyle='#fafff1';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12+i%4*9,y+2);ctx.stroke();}ctx.restore();}
function chimes(){const positions=[[.379,.462],[.446,.405],[.501,.444]];for(const [x,y]of positions){ctx.save();ctx.translate(x*WORLD.w,y*WORLD.h);ctx.rotate(reduced?0:Math.sin(clock*1.6+x*10)*.12);ctx.strokeStyle='#eef7eac0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,40);ctx.stroke();ctx.fillStyle='#bdd8be77';ctx.beginPath();ctx.arc(0,45,12,Math.PI,0);ctx.lineTo(12,49);ctx.lineTo(-12,49);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ece2bace';ctx.fillRect(-4,59,8,22);ctx.restore();}}
function draw(){ctx.setTransform(viewport.dpr,0,0,viewport.dpr,0,0);ctx.fillStyle=timeMode==='night'?'#213f4b':'#c3d4b5';ctx.fillRect(0,0,viewport.w,viewport.h);ctx.save();ctx.translate(viewport.w/2,viewport.h/2);ctx.scale(cam.scale,cam.scale);ctx.translate(-cam.x,-cam.y);ctx.drawImage(background,0,0,WORLD.w,WORLD.h);wheel();stream();chimes();
 const drawActors=[player,...actors].sort((a,b)=>roadY(a.x)+a.offset-(roadY(b.x)+b.offset));drawActors.forEach(sprite);bridgeForeground();
 if(target&&!overview){ctx.strokeStyle='#f8f6de9a';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(target.x,roadY(target.x)+target.offset,23,9,0,0,Math.PI*2);ctx.stroke();}
 if(timeMode==='dusk'){ctx.fillStyle='#d779353d';ctx.fillRect(0,0,WORLD.w,WORLD.h);const grad=ctx.createLinearGradient(0,0,0,WORLD.h);grad.addColorStop(0,'#5d38684a');grad.addColorStop(1,'#f4b5550d');ctx.fillStyle=grad;ctx.fillRect(0,0,WORLD.w,WORLD.h);}if(timeMode==='night'){ctx.fillStyle='#11283fad';ctx.fillRect(0,0,WORLD.w,WORLD.h);ctx.save();ctx.globalCompositeOperation='screen';for(const[x,y]of[[.232,.575],[.373,.50],[.578,.512],[.766,.427]]){const g=ctx.createRadialGradient(x*WORLD.w,y*WORLD.h,0,x*WORLD.w,y*WORLD.h,150);g.addColorStop(0,'#ffc46e59');g.addColorStop(1,'#ffc46e00');ctx.fillStyle=g;ctx.fillRect(x*WORLD.w-150,y*WORLD.h-150,300,300);}ctx.restore();for(let i=0;i<70;i++){const x=((i*913+79)%7200),y=((i*173+50)%340);ctx.fillStyle=`rgba(255,248,214,${reduced?.6:.35+.3*Math.sin(clock*.8+i)**2})`;ctx.beginPath();ctx.arc(x,y,i%7===0?3:1.8,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fbf1d7e8';ctx.beginPath();ctx.arc(WORLD.w*.42,160,35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#354858';ctx.beginPath();ctx.arc(WORLD.w*.42+15,150,32,0,Math.PI*2);ctx.fill();}
 particles();ctx.restore();}
function loop(ts){const dt=last?Math.min(.04,(ts-last)/1000):.016;last=ts;if(ready&&!paused){update(dt);draw();}requestAnimationFrame(loop);}
try{[background,sheet]=await Promise.all([image('assets/valley-panorama.png'),image('assets/characters.png')]);extractFrames();ready=true;cam.scale=viewport.h/WORLD.h*zoom;cam.y=roadY(player.x)-WORLD.h*.20;$('#loading').classList.add('loaded');setTimeout(()=>$('#loading').hidden=true,600);requestAnimationFrame(loop);}catch(error){$('#loading strong').textContent='溪谷暂时没有醒来';$('#loading span').textContent='素材加载失败，请检查网络并刷新页面。';console.error(error);}
// Small read-only diagnostics for artwork and browser QA; no external calls.
window.windbell={getState:()=>({ready,world:WORLD,player:{x:player.x,y:roadY(player.x)+player.offset,moving:player.moving},camera:{...cam},place:activePlace,time:timeMode,tour,sound:soundOn,visited:[...visited],frames}),renderAt:t=>{clock=t;draw();}};
