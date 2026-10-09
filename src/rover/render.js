import {WORLD,DRIVE,TRAILER_NAMES,MODULES,MODULE_BY_ID,powerOf,statsFor,clamp,dist} from './data.js?v=14';
import {region,fxRegion,convoyRegion,equipmentRegion} from './assets.js?v=14';
import {UPGRADE_BY_ID,rank,skill,gunInterval,boostCooldown} from './rogue.js?v=14';
import {RoverTerrain} from './terrain.js?v=14';
import {STICK} from './feel.js?v=14';
import {frameWorld,minimapView,impactFan} from './presentation.js?v=14';
const C={ink:'#142d41',white:'#f2fcff',teal:'#57e4c5',orange:'#ff914e',muted:'#9bb8c8',red:'#ff687a'};
const FONT='"PingFang SC","Microsoft YaHei",system-ui,sans-serif';
const ENEMY_SIZE={drone:[45,43],spitter:[49,46],ram:[43,53],boss:[144,125],raider:[45,53]};
export class RoverRenderer{
  constructor(canvas,images,createSurface){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.images=images;this.createSurface=createSurface;
    this.sprites=new Map();this.buttons=[];this.camera={x:WORLD.home.x,y:WORLD.home.y};
    this.terrain=new RoverTerrain(images,createSurface);
    this.layout={width:390,height:780,scale:1,ox:0,oy:0,h:780};this.dpr=1;this.activePress=null;
  }
  resize(width,height,dpr=1){
    const scale=width/390;this.layout={width,height,scale,ox:0,oy:0,h:height/scale};this.dpr=Math.min(dpr,2);
    const w=Math.round(width*this.dpr),h=Math.round(height*this.dpr);if(this.canvas.width!==w)this.canvas.width=w;if(this.canvas.height!==h)this.canvas.height=h;
  }
  point(x,y){return{x:x/this.layout.scale,y:y/this.layout.scale};}
  crop(id,tint=null){
    const key=id+(tint?':'+tint:'');let surface=this.sprites.get(key);if(surface)return surface;
    const fx=id.startsWith('fx:'),convoy=id.startsWith('convoy:'),equipment=id.startsWith('equip:'),image=fx?this.images.effects:convoy?this.images.convoy:equipment?this.images.equipment:this.images.atlas,box=fx?fxRegion(image,id.slice(3)):convoy?convoyRegion(image,id.slice(7)):equipment?equipmentRegion(image,id.slice(6)):region(image,id);
    if(!box||!image?.width)return null;
    surface=this.createSurface(Math.ceil(box[2]),Math.ceil(box[3]));if(!surface)return null;
    const ctx=surface.getContext('2d');if(!ctx)return null;ctx.drawImage(image,...box,0,0,surface.width,surface.height);
    if(tint){ctx.globalCompositeOperation='source-atop';ctx.fillStyle=tint;ctx.fillRect(0,0,surface.width,surface.height);ctx.globalCompositeOperation='source-over';}
    this.sprites.set(key,surface);return surface;
  }
  sprite(id,x,y,w,h=w,a=0,alpha=1,tint=null){
    const image=this.crop(id,tint);if(!image)return;const c=this.ctx;c.save();c.globalAlpha=clamp(alpha,0,1);c.translate(x,y);c.rotate(a);c.drawImage(image,-w/2,-h/2,w,h);c.restore();
  }
  rr(x,y,w,h,r=12,fill=C.ink,stroke=null){
    const c=this.ctx;c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}
  }
  circle(x,y,r,fill,stroke=null,width=2){const c=this.ctx;c.beginPath();c.arc(x,y,Math.max(0,r),0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  line(x1,y1,x2,y2,color,width=2){const c=this.ctx;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();}
  text(value,x,y,size=14,color=C.white,align='left',weight=650){const c=this.ctx;c.font=`${weight} ${size}px ${FONT}`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(String(value),x,y);}
  wrap(text,x,y,width,size=14,color=C.muted,lineHeight=24){const c=this.ctx;c.font=`500 ${size}px ${FONT}`;let line='';for(const char of text){if(c.measureText(line+char).width>width){this.text(line,x,y,size,color,'left',500);y+=lineHeight;line='';}line+=char;}if(line)this.text(line,x,y,size,color,'left',500);}
  register(id,x,y,w,h){this.buttons.push({id,x,y,w,h});}
  gradient(x,y,w,h,from,to){const c=this.ctx,g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,from);g.addColorStop(1,to);c.fillStyle=g;c.fillRect(x,y,w,h);}
  icon(name,x,y,color=C.white,size=1){
    const c=this.ctx;c.save();c.translate(x,y);c.scale(size,size);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=2;c.lineCap='round';c.lineJoin='round';c.beginPath();
    if(name==='pause'){c.roundRect(-6,-7,4,14,1);c.roundRect(2,-7,4,14,1);c.fill();}
    else if(name==='close'){this.line(-5,-5,5,5,color);this.line(-5,5,5,-5,color);}
    else if(name==='bolt'){c.moveTo(2,-10);c.lineTo(-6,1);c.lineTo(0,1);c.lineTo(-2,10);c.lineTo(6,-1);c.lineTo(0,-1);c.closePath();c.fill();}
    else if(name==='shield'){c.moveTo(0,-9);c.lineTo(8,-5);c.lineTo(7,4);c.quadraticCurveTo(5,8,0,10);c.quadraticCurveTo(-5,8,-7,4);c.lineTo(-8,-5);c.closePath();c.stroke();}
    else if(name==='box'){c.roundRect(-8,-7,16,14,2);c.moveTo(-8,-2);c.lineTo(8,-2);c.moveTo(-2,-7);c.lineTo(-2,-2);c.lineTo(2,-2);c.lineTo(2,-7);c.stroke();}
    else if(name==='go'){c.moveTo(-6,-5);c.lineTo(2,0);c.lineTo(-6,5);c.moveTo(1,-5);c.lineTo(9,0);c.lineTo(1,5);c.stroke();}
    else if(name==='sound'||name==='mute'){c.moveTo(-8,-3);c.lineTo(-3,-3);c.lineTo(2,-7);c.lineTo(2,7);c.lineTo(-3,3);c.lineTo(-8,3);c.closePath();c.fill();if(name==='sound'){c.beginPath();c.arc(2,0,7,-.8,.8);c.stroke();}else{this.line(6,-4,12,4,color,1.5);this.line(6,4,12,-4,color,1.5);}}
    else if(name==='home'){c.moveTo(-9,-1);c.lineTo(0,-9);c.lineTo(9,-1);c.moveTo(-6,-2);c.lineTo(-6,8);c.lineTo(6,8);c.lineTo(6,-2);c.stroke();}
    else if(name==='map'){c.moveTo(-10,-6);c.lineTo(-3,-9);c.lineTo(3,-6);c.lineTo(10,-9);c.lineTo(10,6);c.lineTo(3,9);c.lineTo(-3,6);c.lineTo(-10,9);c.closePath();c.moveTo(-3,-9);c.lineTo(-3,6);c.moveTo(3,-6);c.lineTo(3,9);c.stroke();}
    else if(name==='check'){c.moveTo(-5,0);c.lineTo(-1,4);c.lineTo(6,-5);c.stroke();}
    c.restore();
  }
  iconButton(id,icon,x,y,active=true){this.circle(x+21,y+21,21,'#163b50e8','#52728380',1);this.icon(icon,x+21,y+21,active?C.white:C.muted);this.register(id,x-6,y-6,54,54);}
  button(id,label,x,y,w,h,fill=C.orange,color=C.ink,disabled=false){
    const pressed=this.activePress===id&&!disabled?3:0;this.rr(x,y+4,w,h,14,'#071d2e');this.rr(x,y+pressed,w,h,14,disabled?'#365363':fill);
    this.line(x+16,y+pressed+3,x+w-16,y+pressed+3,disabled?'#557382':'#ffffff45',2);
    this.text(label,x+w/2,y+h/2+pressed,16,disabled?C.muted:color,'center',750);if(!disabled)this.register(id,x,y,w,h);
  }
  vehicle(p,modules,scale=1,turret=p.a,options={}){
    const c=this.ctx;c.save();c.translate(p.x,p.y);c.rotate(p.a);c.scale(scale,scale);
    c.save();c.globalAlpha=.3;c.fillStyle='#082a3c';c.beginPath();c.ellipse(3,7,34,36,0,0,Math.PI*2);c.fill();c.restore();
    const lean=options.lean||0;c.rotate(lean);this.sprite('truck',0,0,63,75);
    if(options.travel){for(const side of [-1,1])for(const axle of [-1,1]){c.save();c.beginPath();c.roundRect(side*26-4,axle*20-9,8,17,3);c.clip();for(let i=-2;i<3;i++){const y=axle*20+((options.travel*.65)%6)+i*6;this.line(side*26-3,y,side*26+3,y,'#7693ad60',1.5);}c.restore();}}
    if(modules.includes('cargo'))this.sprite('cargo',0,23,24,20);
    if(modules.includes('armor'))this.sprite('armor',-27,-3,27,17,Math.PI/2);
    if(modules.includes('repair')){this.sprite('repair',-18,18,15,20);if(options.repairing)this.sprite('fx:glint',-18,17,13,13,0,.65+.2*Math.sin(options.time*7));}
    if(modules.includes('drill'))this.sprite('drill',0,-39,34,31,options.travel>0?Math.sin(options.travel)*.025:0);
    if(modules.includes('flame'))this.sprite('flame',0,39,24,32,Math.PI);
    if(modules.includes('side')){const a=(options.sideA??p.a+Math.PI/2)-p.a,recoil=options.sideRecoil||0;this.sprite('side',26-Math.sin(a)*recoil,3+Math.cos(a)*recoil,20,32,a);}
    modules.filter(id=>MODULE_BY_ID[id]?.sprite.startsWith('equip:')).forEach((id,i)=>this.sprite(MODULE_BY_ID[id].sprite,i%2?-21:21,i<2?-7:19,24,31,0));
    const a=turret-p.a,recoil=options.recoil||0;this.sprite('gun',-Math.sin(a)*recoil,4+Math.cos(a)*recoil,22,37,a);
    if(options.hit>0)this.sprite('truck',0,0,63,75,0,options.hit*.35,'#fff7df');c.restore();
  }
  draw(g,dt=0){
    const c=this.ctx,{width,height,scale}=this.layout;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle=C.ink;c.fillRect(0,0,width,height);c.scale(scale,scale);this.buttons=[];this.activePress=g.pressed?.button;
    if(!g.loaded){this.loading(g);return;}
    if(g.screen==='garage')this.garage(g);
    else if(g.screen==='workshop')this.workshop(g);
    else if(g.screen==='module')this.moduleSheet(g);
    else this.world(g,dt);
    if(g.screen==='map')this.chart(g);
    if(g.screen==='upgrade')this.upgrade(g);
    if(['pause','confirm','result'].includes(g.screen))this.overlay(g);
    if(g.toast?.time>0){const y=g.screen==='garage'?this.layout.h-104:115;this.rr(67,y-17,256,34,10,'#183e51ee');this.text(g.toast.text,195,y,12,C.white,'center');}
  }
  loading(g){const h=this.layout.h;this.text('移动基地',195,h*.39,32,C.white,'center',850);this.rr(81,h*.54,228,6,3,'#2a4c60');this.rr(81,h*.54,Math.max(6,228*g.progress),6,3,C.orange);this.text(`${Math.round(g.progress*100)}%`,195,h*.54+29,12,C.muted,'center');}
  garage(g){
    const c=this.ctx,h=this.layout.h,p=g.profile,stats=statsFor(p.equipped),image=this.images.base;
    const sceneH=h-170,ratio=Math.min(390/image.width,sceneH/image.height),w=image.width*ratio,ih=image.height*ratio,x=(390-w)/2,y=89+(sceneH-ih)/2;
    this.gradient(0,0,390,h,'#15394a','#203e4d');c.drawImage(image,x,y,w,ih);
    this.menuHeader(g,'移动基地',true);
    const spot=(u,v)=>({x:x+w*u,y:y+ih*v}),car=spot(.5,.56),spring=g.reducedMotion?1:1+Math.sin((1-g.bounce)*Math.PI*4)*g.bounce*.045;
    this.vehicle({...car,a:0},p.equipped,.65*Math.min(1,w/390)*spring,0,{time:g.uiTime});
    for(const [id,label,u] of [['workshop','改装工坊',.23],['arsenal','装备库',.77]]){
      const q=spot(u,.39),pulse=g.reducedMotion?0:Math.sin(g.uiTime*2)*2;
      this.rr(q.x-47,q.y-14+pulse,94,29,9,'#16394dea','#73999590');this.text(label,q.x,q.y+1+pulse,12,C.white,'center',750);
      this.register(id,x+w*(u-.20),y+ih*.16,w*.40,ih*.30);
    }
    this.gradient(0,h-156,390,156,'#17384a00','#112e43');
    const statY=h-112;this.icon('bolt',37,statY,C.teal,.7);this.text(powerOf(p.equipped)+'/4',61,statY,14);this.icon('shield',156,statY,C.teal,.7);this.text(stats.hp,179,statY,14);this.icon('go',282,statY,C.teal,.7);this.text(Math.floor(p.bestTime/60)+':'+String(p.bestTime%60).padStart(2,'0'),316,statY,13);
    this.button('start',p.run?'继续生存':'出发',26,h-77,338,53);this.icon('go',337,h-50,C.ink,.85);
  }
  menuHeader(g,title,sound=false){
    this.gradient(0,0,390,120,'#102f48ed','#102f4800');
    this.text(title,sound?22:73,43,sound?27:23,C.white,'left',850);
    this.rr(276,27,96,34,10,'#14364c');this.sprite('scrap',294,44,22,20);this.text(g.profile.bank,337,44,16,C.white,'center',800);
    if(sound)this.iconButton('sound',g.profile.sound?'sound':'mute',329,72,g.profile.sound);
    else this.iconButton(g.screen==='module'?'close':'garage','close',15,22);
  }
  workshopBackdrop(){
    const h=this.layout.h,image=this.images.garage,ratio=Math.max(390/image.width,h/image.height);
    this.ctx.drawImage(image,(390-image.width*ratio)/2,(h-image.height*ratio)/2,image.width*ratio,image.height*ratio);
  }
  workshop(g){
    const c=this.ctx,h=this.layout.h,p=g.profile,compact=h<650,statY=h-(compact?272:310),heroY=(112+statY-50)/2,heroScale=Math.min(2.3,(statY-130)/85);
    this.workshopBackdrop();this.menuHeader(g,'改装工坊');
    this.vehicle({x:195,y:heroY,a:0},p.equipped,heroScale,0,{time:g.uiTime});
    this.gradient(0,statY-38,390,60,'#112f4400','#112f44f5');this.rr(0,statY+21,390,h-statY-21,0,'#112f44f5');
    this.icon('bolt',30,statY,C.teal,.7);this.text(powerOf(p.equipped)+'/4',53,statY,13);this.text(g.gearPage?'进阶装备':'基础装备',133,statY,15);
    this.text((g.gearPage+1)+'/2',300,statY,12,C.muted,'center');this.text('‹',266,statY,22,C.white,'center');this.text('›',339,statY,22,C.white,'center');this.register('gear-prev',243,statY-18,43,36);this.register('gear-next',318,statY-18,43,36);
    for(let i=0;i<6;i++){
      const m=MODULES[g.gearPage*6+i],x=77+(i%3)*118,y=statY+57+Math.floor(i/3)*(compact?86:102),owned=p.owned.includes(m.id),on=p.equipped.includes(m.id),pressed=this.activePress==='module:'+m.id;
      this.circle(x,y+7,29,on?'#4fdbc52d':'#6b8ca014',on?'#51d6bd66':null,1);c.save();c.fillStyle='#081d3199';c.beginPath();c.ellipse(x,y+20,23,5,0,0,Math.PI*2);c.fill();c.restore();
      this.sprite(m.sprite,x,y+(pressed?2:0),m.id==='armor'?49:41,m.id==='armor'?32:45);this.text(m.name,x,y+(compact?32:38),12,C.white,'center',650);this.text(owned?(on?'已装配':'已拥有'):m.cost+' 零件',x,y+(compact?48:56),10,on?C.teal:C.muted,'center',550);
      if(on){this.circle(x+25,y-19,8,C.teal);this.icon('check',x+25,y-19,C.ink,.7);}this.register('module:'+m.id,x-48,y-27,96,compact?80:95);
    }
    this.text(p.run?'返回基地后继续探索':'购入后永久保留',195,h-34,11,C.muted,'center',500);
  }
  moduleSheet(g){
    const h=this.layout.h,p=g.profile,m=MODULE_BY_ID[g.selected],y=h-310,heroY=(104+y-40)/2,preview=p.equipped.includes(m.id)?p.equipped:[...p.equipped,m.id];
    this.workshopBackdrop();this.menuHeader(g,'装备详情');this.vehicle({x:195,y:heroY,a:0},preview,Math.min(2.5,(y-125)/80),0,{time:g.uiTime});
    this.gradient(0,y-42,390,52,'#153b5000','#153b50');this.rr(0,y,390,310,0,'#153b50');
    this.sprite(m.sprite,58,y+66,55,m.id==='armor'?38:57);this.text(m.name,105,y+47,21,C.white,'left',800);this.icon('bolt',111,y+77,C.teal,.65);this.text(m.power,129,y+78,12,C.teal);
    this.text(m.brief,30,y+120,13);this.wrap(m.detail,30,y+155,326,13,C.muted,23);
    const owned=p.owned.includes(m.id),on=p.equipped.includes(m.id),can=owned?(on||powerOf([...p.equipped,m.id])<=4):p.bank>=m.cost;
    const label=p.run?'探索中无法改装':owned?(on?'卸下装备':can?'装上车辆':'电力不足'):can?'购入 · '+m.cost+' 零件':'还差 '+(m.cost-p.bank)+' 零件';
    this.button('equip',label,31,h-79,328,48,owned?C.teal:C.orange,C.ink,!can||!!p.run);
  }
  world(g,dt){
    const c=this.ctx,s=g.run,p=s.player,f=g.feel,h=this.layout.h,framing=frameWorld(this.camera,p,h,s.convoy.trailers.length,dt,{snap:g.justStarted,reduced:g.reducedMotion}),z=framing.z;
    const kick=g.reducedMotion?0:f.kick,ox=framing.ox+Math.sin(f.time*63)*kick*.6,oy=framing.oy+Math.cos(f.time*59)*kick*.4;
    const project=a=>({x:ox+a.x*z,y:oy+a.y*z});g.projection={ox,oy,z,height:h};const visible=(a,pad=90)=>{const v=project(a);return v.x>-pad&&v.x<390+pad&&v.y>-pad&&v.y<h+pad;};
    c.save();c.translate(ox,oy);c.scale(z,z);this.terrain.draw(c,{x:-ox/z,y:-oy/z,w:390/z,h:h/z},this.dpr*this.layout.scale*z);
    for(const o of s.oil)if(visible(o)){c.save();c.globalAlpha=.42;this.circle(o.x,o.y,39,'#254f5c');this.circle(o.x+24,o.y+6,28,'#254f5c');this.circle(o.x-22,o.y+4,25,'#254f5c');this.line(o.x-15,o.y-16,o.x+12,o.y-20,'#87b7bb',3);c.restore();}
    for(const t of f.tracks)if(visible(t)){c.save();c.translate(t.x,t.y);c.rotate(t.a);this.rr(-2,-t.length/2,4,t.length,1,`rgba(24,44,61,${t.life/t.total*.22})`);c.restore();}
    for(const a of f.particles)if(visible(a)){const t=1-a.life/a.total;this.sprite('fx:'+a.kind,a.x,a.y,a.size*(1+t),a.size*(1+t),a.a,a.life/a.total*.36);}
    if(visible(WORLD.home,240))this.extraction(g);
    for(const t of [...s.convoy.freight,...s.convoy.loose])if(!t.claimed&&visible(t)){
      this.trailer(t,s.time,.95);if(dist(t,p)<110&&g.screen==='play'){const q=project(t);this.register('freight:'+t.id,q.x-30,q.y-32,60,64);}
      if(!t.fuse&&dist(t,p)<180)this.text(TRAILER_NAMES[t.kind],t.x,t.y+44,10,C.white,'center',500);if(t.fuse)this.circle(t.x,t.y,34,null,C.red,2);
    }
    for(const cache of s.caches)if(!cache.open&&visible(cache)){this.sprite('closed',cache.x,cache.y,42,45);if(dist(cache,p)<110)this.sprite('fx:glint',cache.x,cache.y,46,46,0,.35);}
    for(const d of s.drops)if(visible(d)){const lift=g.reducedMotion?0:Math.sin(s.time*4+d.id)*1.3;if(d.kind==='xp'){this.sprite('fx:glint',d.x,d.y,21,21,0,.25);this.sprite('scrap',d.x,d.y+lift,13,13,0,1,'#71e8d5');}else this.sprite('fx:pickup',d.x,d.y+lift,22,22);}
    for(const m of s.mines)if(visible(m)){this.sprite('equip:mine',m.x,m.y,30,27);this.circle(m.x,m.y,22,null,m.arm>0?'#ffbd6860':'#ff945a99',1);}
    for(const m of s.mortars){const progress=1-m.clock/m.total;this.circle(m.x,m.y,m.r,'#ff687a20','#ff7587',2);this.circle(m.x,m.y,Math.max(2,m.r*progress),'#ff697a18');this.line(m.x-7,m.y,m.x+7,m.y,'#ff9caa',2);this.line(m.x,m.y-7,m.x,m.y+7,'#ff9caa',2);}
    for(const e of s.enemies)if(visible(e))this.enemy(e,s.time,g.reducedMotion);
    for(const b of s.bullets)if(visible(b)){
      const a=Math.atan2(b.vx,-b.vy),speed=Math.hypot(b.vx,b.vy)||1,length=b.enemy?13:b.kind==='rocket'?22:16,color=b.enemy?'#ff778a':b.kind==='rocket'?'#ffb668':['side','drone'].includes(b.kind)?'#72ece4':'#ffdf8a';
      this.line(b.x-b.vx/speed*length,b.y-b.vy/speed*length,b.x,b.y,color+'60',b.enemy?4:2);
      if(b.kind==='rocket')this.sprite('equip:rocket',b.x,b.y,13,21,a);else if(b.kind==='mortar')this.sprite('fx:plasma',b.x,b.y,16,19,a);else this.sprite(b.enemy?'fx:plasma':['side','drone'].includes(b.kind)?'fx:aqua':'fx:gold',b.x,b.y,b.enemy?12:8,b.enemy?22:19,a);
    }
    for(let i=0;i<skill(s,'blade');i++){const a=s.time*2.7+i*Math.PI*2/skill(s,'blade'),x=p.x+Math.cos(a)*90,y=p.y+Math.sin(a)*90;this.sprite('equip:saw',x,y,40,40,s.time*10);}
    for(let i=0;i<rank(s,'drone');i++){const a=s.time*.9+i*Math.PI*2/rank(s,'drone');this.sprite('equip:drone',p.x+Math.cos(a)*120,p.y+Math.sin(a)*120,34,34,a+Math.PI/2);}
    let front=p;for(const t of s.convoy.trailers){this.line(front.x-Math.sin(front.a)*28,front.y+Math.cos(front.a)*28,t.x+Math.sin(t.a)*25,t.y-Math.cos(t.a)*25,'#112d41',5);this.trailer(t,s.time);front=t;}
    if(p.boostTime>0)this.sprite('fx:boost',p.x-Math.sin(p.a)*48,p.y+Math.cos(p.a)*48,21,48,p.a,Math.min(1,p.boostTime*4));
    if(s.rogue.shield>0)this.sprite('fx:shield',p.x,p.y,88,99,p.a,.3+s.rogue.shield/(rank(s,'shield')*25)*.25);
    const gunAge=gunInterval(s)-s.cooldowns.gun,sideAge=.65-s.cooldowns.side,recoil=g.reducedMotion?0:gunAge>=0&&gunAge<.17?Math.sin(gunAge/.17*Math.PI)*3.6:0,sideRecoil=g.reducedMotion?0:sideAge>=0&&sideAge<.17?Math.sin(sideAge/.17*Math.PI)*2.4:0;
    this.vehicle(p,s.modules,1,s.turretA,{lean:g.reducedMotion?0:f.roll*.32,travel:g.reducedMotion?0:f.distance,recoil,sideRecoil,sideA:s.sideA,time:s.time,repairing:rank(s,'repair')>0,hit:p.invuln>.55?(p.invuln-.55)/.15:0});
    for(const effect of s.effects)if(visible(effect,360))this.effect(effect,g);
    for(const n of f.numbers){const progress=1-n.life/n.total;this.text('+'+n.value,n.x,n.y-33-progress*24,15,C.teal,'center',850);}
    c.restore();this.gradient(0,0,390,114,'#17374e58','#17374e00');this.gradient(0,h-100,390,100,'#102a3c00','#102a3c90');
    this.hud(g);this.minimap(g);
    for(const item of f.collect){const t=1-item.life/item.total,start=project(item),ease=1-Math.pow(1-t,3);this.sprite('fx:pickup',start.x+(164-start.x)*ease,start.y+(35-start.y)*ease-Math.sin(t*Math.PI)*38,15*(1-t*.5),15*(1-t*.5),0,Math.min(1,item.life*5));}
    const destination=g.waypoint||(g.returnGuide?WORLD.home:null);if(destination){const q=project(destination);if(q.x<26||q.x>364||q.y<116||q.y>h-154)this.arrow(project(p),q,g.returnGuide,h);}
    this.controls(g,s.context());
    if(s.kills===0&&s.time<5)this.text('拖动驾驶 · 自动开火',195,h-201,11,'#edfaffc9','center',550);
    if(g.flash>0){this.gradient(0,0,390,90,`rgba(255,87,104,${g.flash*.23})`,'#ff576800');this.gradient(0,h-90,390,90,'#ff576800',`rgba(255,87,104,${g.flash*.23})`);}
  }
  extraction(g){
    const home=WORLD.home,s=g.run,c=this.ctx,active=s.interacting&&s.target==='home',near=dist(s.player,home)<home.r,progress=active?clamp(s.extract/3.5,0,1):0;
    // The roof and apron are baked into the generated map; only interaction feedback overlays it.
    if(near){this.rr(home.x-72,home.y+104,144,30,8,'#14394ee6');this.text(active?(Math.max(1,Math.ceil(3.5-s.extract))+' 秒 · 撤离'):s.context()?.kind==='extract'?'停车撤离':'回收车库',home.x,home.y+119,12,C.white,'center');}
    if(active){this.circle(home.x,home.y,88,null,'#5ee5c760',2);c.beginPath();c.arc(home.x,home.y,88,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);c.strokeStyle=C.teal;c.lineWidth=5;c.stroke();this.sprite('fx:glint',home.x,home.y-4,92,92,0,.2+progress*.35);}
  }
  trailer(t,time,alpha=1){
    this.circle(t.x,t.y+8,22,'#102c4350');this.sprite('convoy:'+t.kind,t.x,t.y,44,58,t.a,alpha);
    if(t.hit>0)this.sprite('convoy:'+t.kind,t.x,t.y,44,58,t.a,t.hit*4,C.white);
    if(t.hp<t.maxHp){this.rr(t.x-17,t.y+34,34,3,1.5,'#233e52');this.rr(t.x-17,t.y+34,34*t.hp/t.maxHp,3,1.5,t.hp<40?C.red:C.teal);}
  }
  enemy(e,time,reduced){
    const c=this.ctx,[width,height]=ENEMY_SIZE[e.kind],aim=e.mode==='aim',charge=e.mode==='charge',direction=e.a+(['spitter','raider'].includes(e.kind)?0:Math.PI),walk=e.mode==='walk'&&e.kind!=='boss',bounce=reduced?0:walk?Math.sin(time*8+e.id)*1.1:aim?Math.sin(time*24)*.6:0;
    c.save();c.fillStyle='#102d435c';c.beginPath();c.ellipse(e.x+3,e.y+8,e.r*1.2,e.r*.9,0,0,Math.PI*2);c.fill();c.restore();
    if(aim){const length=e.kind==='ram'?235:300;c.save();c.translate(e.x,e.y);c.rotate(e.chargeA);c.beginPath();c.moveTo(-8,-20);c.lineTo(-15,-length);c.lineTo(15,-length);c.lineTo(8,-20);c.closePath();c.fillStyle=e.kind==='ram'?'#ff945633':'#c3a4ff29';c.fill();this.line(0,-24,0,-length,e.kind==='ram'?'#ffd29a99':'#cebaff99',1);c.restore();}
    if(charge)this.sprite('fx:dust',e.x-Math.sin(e.a)*34,e.y+Math.cos(e.a)*34,32,32,e.a,.35);
    const spawn=e.born>0?clamp(1-e.born/(e.kind==='boss'?2:1),.05,1):1,scale=e.born>0?.75+.25*spawn:1,w=width*(charge?1.06:1),h=height*(aim?.96:charge?1.09:1);
    if(e.elite)this.circle(e.x,e.y,e.r+9,null,'#ffd07a',2);const sprite=e.kind==='raider'?'convoy:raider':e.kind,x=e.x+(reduced?0:e.kx||0),y=e.y+bounce+(reduced?0:e.ky||0),squash=reduced?0:Math.sin(clamp(e.hit/.14,0,1)*Math.PI)*.09;
    this.sprite(sprite,x,y,w*scale*(1+squash),h*scale*(1-squash),direction,e.born>0?.2+spawn*.8:1);
    if(e.hit>0)this.sprite(sprite,x,y,w*scale*(1+squash),h*scale*(1-squash),direction,clamp(e.hit/.14,0,1)*.7,C.white);
    if(e.slow>0)this.sprite(sprite,x,y,w,h,direction,.3,'#8cdef1');
    if(e.born>0)this.circle(e.x,e.y,e.r+18*(1-spawn),null,'#ffcf8960',2);
    if(e.hp<e.maxHp&&e.kind!=='boss'){this.rr(e.x-17,e.y-e.r-14,34,3,1.5,'#173c50');this.rr(e.x-17,e.y-e.r-14,Math.max(1,34*e.hp/e.maxHp),3,1.5,C.red);}
  }
  effect(f,g){
    const t=1-f.life/f.total,fade=Math.max(0,1-t),c=this.ctx;c.save();
    if(f.type==='muzzle'){const width=f.enemy?17:20,color=f.enemy?'#ff8fa3':'#ffe6a1';this.circle(f.x,f.y,8*fade,color+'50');this.sprite('fx:muzzle',f.x+Math.sin(f.a)*5,f.y-Math.cos(f.a)*5,width,width*1.2,f.a,fade);}
    else if(f.type==='hit'||f.type==='spark'){
      const fan=impactFan(f),color=f.critical?'#ffcb72':'#fff0bd';
      this.circle(f.x,f.y,3+fade*4,color);this.sprite('fx:sparks',f.x,f.y,19+t*14,17+t*11,fan.angle,fade*.7);
      if(!g.reducedMotion)for(let i=0;i<fan.count;i++){const a=fan.angle+i*Math.PI*2/fan.count,dx=Math.cos(a),dy=Math.sin(a);this.line(f.x+dx*fan.radius,f.y+dy*fan.radius,f.x+dx*(fan.radius+fan.length),f.y+dy*(fan.radius+fan.length),color+Math.round(fade*220).toString(16).padStart(2,'0'),f.critical?2.5:1.8);}
      if(f.critical)this.text(f.value,f.x,f.y-26-t*18,16,'#ffe19b','center',850);
    }
    else if(['arc','laser'].includes(f.type)){const points=f.points;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];this.line(a.x,a.y,b.x,b.y,'#56e6d740',f.type==='laser'?12:8);this.line(a.x,a.y,b.x,b.y,'#8aeee8',f.type==='laser'?4:2);this.line(a.x,a.y,b.x,b.y,'#ecfffd',1);}}
    else if(['frost','nova'].includes(f.type)){const size=(f.radius||170)*2*(.65+t*.4);this.sprite('fx:ring',f.x,f.y,size,size,0,fade*.7,f.type==='frost'?'#a7eaff':'#5defce');}
    else if(f.type==='pop'||f.type==='blast'){
      const size=f.big?112:f.type==='blast'?69:45;
      if(f.kind&&t<.3){const dimensions=ENEMY_SIZE[f.kind];this.sprite(f.kind==='raider'?'convoy:raider':f.kind,f.x,f.y,dimensions[0]*(1-t*.7),dimensions[1]*(1-t*.7),f.a+(['spitter','raider'].includes(f.kind)?0:Math.PI)+t*.25,(1-t*3.2)*.6);}
      this.sprite('fx:explosion',f.x,f.y,size*(.6+Math.sin(Math.min(1,t*2)*Math.PI/2)*.55),size*(.6+Math.sin(Math.min(1,t*2)*Math.PI/2)*.55),(f.id%4)*Math.PI/2,fade);
      if(t<.3)this.circle(f.x,f.y,size*.17*(1-t/.3),'#fff1be',null);
      if(t>.15)this.sprite('fx:ring',f.x,f.y,size*(.8+t),size*(.8+t),0,fade*.45);
    }else if(f.type==='flame'){
      const a=f.a;for(const offset of [-.26,0,.26]){const angle=a+offset;this.sprite('fx:fire',f.x+Math.sin(angle)*72,f.y-Math.cos(angle)*72,offset===0?37:26,104,angle,.55*fade);}
    }else if(f.type==='loot')this.sprite('fx:glint',f.x,f.y,42+15*t,42+15*t,t*.1,fade);
    c.restore();
  }
  hud(g){
    const s=g.run,p=s.player,r=s.rogue,time=Math.floor(s.time),hp=clamp(p.hp/p.maxHp,0,1),pulse=g.reducedMotion?0:g.lootPulse;
    this.rr(14,14,317,44,11,'#102f43ed','#76949e45');this.line(27,16,318,16,'#eafcff18',1);
    this.icon('shield',30,33,hp<.3?C.red:C.teal,.72);this.text(Math.ceil(p.hp)+'/'+p.maxHp,119,29,12,C.white,'right',800);
    this.rr(46,42,74,5,2.5,'#486271');this.rr(46,42,74*Math.max(hp,g.feel.hpEcho),5,2.5,C.orange);this.rr(46,42,74*hp,5,2.5,hp<.3?C.red:C.teal);
    this.line(139,26,139,47,'#7ca0ad40',1);this.sprite('scrap',164,35,21+pulse*3,20+pulse*3);this.text(p.cargo,181,35,17,pulse>.2?'#ffe0a4':C.white,'left',850);
    this.line(239,26,239,47,'#7ca0ad40',1);this.text(`${Math.floor(time/60)}:${String(time%60).padStart(2,'0')}`,285,35,17,C.white,'center',800);this.iconButton('pause','pause',342,15);
    this.text('Lv.'+r.level,15,71,11,C.white);this.rr(56,68,244,4,2,'#103044c9');this.rr(56,68,244*clamp(r.xp/r.next,0,1),4,2,C.teal);
    for(let i=0;i<4;i++){this.rr(315+i*16,67,11,7,2,i<s.convoy.trailers.length?C.orange:'#1d4158b0');if(i<3)this.line(326+i*16,70,330+i*16,70,'#bdd8e880',1);}
    const boss=s.enemies.find(e=>e.kind==='boss');if(boss&&boss.born<=0){this.rr(14,90,282,24,7,'#193b51e0');this.text('重装守卫',25,102,11,C.white);this.rr(114,100,165,4,2,'#4f6a78');this.rr(114,100,165*clamp(boss.hp/boss.maxHp,0,1),4,2,C.red);}
  }
  minimap(g){
    const s=g.run,p=s.player,x=317,y=91,w=59,h=59,c=this.ctx;this.rr(x-3,y-3,w+6,h+6,10,'#143249d9','#7697a354');c.save();c.beginPath();c.roundRect(x,y,w,h,7);c.clip();c.globalAlpha=.8;this.terrain.drawOverview(c,x,y,w,h);c.restore();
    const point=a=>({x:x+a.x/WORLD.w*w,y:y+a.y/WORLD.h*h}),home=point(WORLD.home);this.circle(home.x,home.y,3,C.teal);
    const view=minimapView(g.projection),v=point(view);this.rr(v.x,v.y,view.w/WORLD.w*w,view.h/WORLD.h*h,1,'#efffff12','#efffff80');
    for(const e of s.enemies)if(e.kind==='boss'){const a=point(e);this.circle(a.x,a.y,3,C.red);}
    const q=point(p);this.line(q.x,q.y,q.x+Math.sin(p.a)*5,q.y-Math.cos(p.a)*5,C.white,1.5);this.circle(q.x,q.y,2,C.white,'#132a3c',.6);this.register('map',x-5,y-5,w+10,h+10);
  }
  arrow(from,to,home,h){const a=Math.atan2(to.y-from.y,to.x-from.x),x=clamp(from.x+Math.cos(a)*145,30,360),y=clamp(from.y+Math.sin(a)*180,135,h-183),c=this.ctx;c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(9,0);c.lineTo(-6,-6);c.lineTo(-4,0);c.lineTo(-6,6);c.closePath();c.fillStyle=home?C.teal:C.orange;c.fill();c.restore();if(home)this.icon('home',x,y+20,C.teal,.65);}
  controls(g,context){
    const h=this.layout.h,joy=g.joy,base=joy?{x:clamp(joy.base.x,44,346),y:clamp(joy.base.y,142,h-48)}:{x:78,y:h-80},c=this.ctx;
    if(joy){this.circle(base.x,base.y,STICK.radius,'#142f4550','#eafaff66',1.5);const knob={x:base.x+g.input.x*22,y:base.y+g.input.y*22};this.circle(knob.x,knob.y+2,14,'#0c283a50');this.circle(knob.x,knob.y,14,'#a9cedec9','#eaffff99',1);}
    const cx=326,cy=h-83,active=g.run.interacting,extract=context?.kind==='extract',available=!!context&&context.ready!==false,r=available||active?41:31,fill=active?'#255164':extract?C.teal:available?C.orange:'#244c61',press=this.activePress==='action'?2:0;
    this.circle(cx,cy+4,r,'#0a2538');this.circle(cx,cy+press,r,fill,available?'#f2fcff66':'#628ea17a',1);
    if(context?.kind==='loot'&&!active)this.sprite('closed',cx,cy-7+press,27,29);else if(['freight','delivery'].includes(context?.kind)&&!active)this.sprite('convoy:cargo',cx,cy-7+press,24,29);else this.icon(active?'close':available?'home':'map',cx,cy-8+press,available?C.ink:C.white,1);
    this.text(active?'取消':context?.name||'路线',cx,cy+18+press,12,available?C.ink:C.white,'center',800);this.register('action',cx-41,cy-41,82,82);
    if(active&&context){c.beginPath();c.arc(cx,cy,r+3,-Math.PI/2,-Math.PI/2+Math.PI*2*context.progress/context.duration);c.strokeStyle=C.teal;c.lineWidth=3;c.stroke();}
    const bx=332,by=h-173,cd=g.run.player.boostCooldown;this.circle(bx,by+3,28,'#0b273b');this.circle(bx,by,28,cd>0?'#214759d9':'#226276ed','#97dccc60',1);this.icon('go',bx,by-4,cd>0?C.muted:C.white,.9);this.text(cd>0?Math.ceil(cd)+'秒':'冲撞',bx,by+13,9,cd>0?C.muted:C.white,'center',650);
    if(cd>0){c.beginPath();c.arc(bx,by,30,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-cd/boostCooldown(g.run)));c.strokeStyle=C.teal;c.lineWidth=2;c.stroke();}this.register('boost',bx-31,by-31,62,62);
    if(g.run.convoy.trailers.length){this.circle(332,h-245,25,'#23495fdd','#66889b');this.icon('close',332,h-250,C.white,.8);this.text('脱钩',332,h-231,9,C.white,'center');this.register('detach',303,h-274,58,58);}
  }
  chart(g){
    const c=this.ctx,h=this.layout.h;this.buttons=[];c.fillStyle='#102a40f2';c.fillRect(0,0,390,h);this.text('城区',24,43,23,C.white,'left',800);this.iconButton('close-map','close',326,21);
    const size=Math.min(340,h-185),x=(390-size)/2,y=100;this.chartRect={x,y,w:size,h:size};this.terrain.drawOverview(c,x,y,size,size);this.register('chart',x,y,size,size);
    const point=p=>({x:x+p.x/WORLD.w*size,y:y+p.y/WORLD.h*size}),s=g.run;
    for(const f of [...s.convoy.freight,...s.convoy.loose])if(!f.claimed&&!f.fuse){const q=point(f);this.circle(q.x,q.y,3,f.kind==='bomb'?C.red:f.kind==='repair'?C.teal:C.orange);}
    const home=point(WORLD.home);this.icon('home',home.x,home.y,C.teal,.8);this.text('撤离',home.x,home.y+16,10,C.white,'center');const p=point(s.player);this.circle(p.x,p.y,5,C.white,C.ink,1);
    if(g.waypoint){const q=point(g.waypoint);this.circle(q.x,q.y,10,null,C.orange,2);}
    this.button('return-guide','标记撤离点',85,y+size+30,220,43,C.teal);
  }
  upgrade(g){
    const c=this.ctx,h=this.layout.h,r=g.run.rogue;this.buttons=[];c.fillStyle='#102a40e8';c.fillRect(0,0,390,h);
    const cardH=Math.min(132,(h-210)/3),gap=11,y=Math.max(112,(h-(cardH*3+gap*2+98))/2);this.text('改装',28,y-51,27,C.white,'left',850);this.text('Lv.'+r.level,356,y-48,17,C.teal,'right');
    for(let i=0;i<r.offer.length;i++){const u=UPGRADE_BY_ID[r.offer[i]],top=y+i*(cardH+gap),level=rank(g.run,u.id),color=['防护','成长','补给'].includes(u.group)?C.teal:C.orange,press=this.activePress==='pick:'+u.id?3:0;
      this.rr(24,top+5,342,cardH,17,'#061d2f');this.rr(24,top+press,342,cardH,17,'#20465b','#6a91a570');this.rr(24,top+press,5,cardH,2,color);this.sprite(u.sprite,80,top+cardH*.49+press,62,66);this.text(u.name,130,top+31+press,20,C.white,'left',800);this.text(level?'Lv.'+level+' → '+(level+1):'新装备',337,top+31+press,10,color,'right');this.wrap(u.detail,130,top+65+press,210,12,C.muted,20);this.text(u.group,130,top+cardH-18+press,10,color,'left',550);this.register('pick:'+u.id,24,top,342,cardH);
    }
    if(r.rerolls>0)this.button('reroll','重抽 · '+r.rerolls,102,y+(cardH+gap)*3+12,186,41,'#33586c',C.white);
  }
  overlay(g){
    const c=this.ctx,h=this.layout.h;this.buttons=[];c.fillStyle='#0a2434c9';c.fillRect(0,0,390,h);const result=g.screen==='result',y=h/2-(result?190:161);
    this.rr(24,y+4,342,result?366:326,22,'#091f30');this.rr(24,y,342,result?366:326,22,'#1e475b','#62899a');
    if(result){const r=g.run.result,age=g.reducedMotion?1:clamp(g.resultAge/.65,0,1),size=1+Math.sin(age*Math.PI)*.1;
      if(r.success){this.circle(195,y+63,44,'#58e4c512');this.sprite('fx:pickup',195,y+63,66*size,66*size);if(age<1)this.sprite('fx:glint',195,y+63,93,93,0,(1-age)*.7);}
      else this.vehicle({x:195,y:y+66,a:-.16},g.run.modules,.94,0);
      this.text(r.success?'撤离成功':r.reason,195,y+128,24,r.success?C.teal:C.orange,'center',850);this.text('+'+Math.floor(r.reward*age),195,y+191,47,C.white,'center',850);this.text(r.success?'零件入库':'救援带回 35%',195,y+229,12,C.muted,'center',500);
      this.line(61,y+257,329,y+257,'#6b8d9e42',1);this.text(`Lv.${r.level} · 击破 ${r.kills}`,131,y+280,12,C.muted,'center');this.text(`${Math.floor(r.time/60)}:${String(r.time%60).padStart(2,'0')}`,291,y+280,12,C.muted,'center');this.button('garage','返回车库',49,y+306,292,45,r.success?C.teal:C.orange);
    }else if(g.screen==='confirm'){this.text('结束生存？',195,y+49,25,C.white,'center',800);this.text('零件带回 35%',195,y+96,13,C.muted,'center');this.button('cancel','继续驾驶',49,y+154,292,49,C.teal);this.button('abandon','结束生存',49,y+222,292,45,'#355f72',C.white);}
    else{this.text('已暂停',195,y+50,25,C.white,'center',800);this.button('resume','继续驾驶',49,y+116,292,49,C.teal);this.button('save-home','保存并回车库',49,y+183,292,45,'#355f72',C.white);this.button('finish','结束探索',49,y+244,292,40,'#284c60',C.muted);}
  }
}
