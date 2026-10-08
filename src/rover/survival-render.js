import {RoverRenderer} from './render.js?v=12';
import {RoverTerrain,mapCrop} from './terrain.js?v=12';
import {EndlessTerrain} from './endless-terrain.js?v=12';
import {clamp,dist} from './data.js?v=12';
import {followCamera,STICK} from './feel.js?v=12';
import {gunInterval,rank,skill} from './rogue.js?v=12';
import {TOWN,ZOMBIES,SUPPLIES,FIELD_MODS,fieldPrice,houseFromId,houseCleared} from './survival-data.js?v=12';
const C={ink:'#25352f',white:'#f4f4e7',green:'#b6d5a2',orange:'#e5ac70',red:'#e18a7b',muted:'#a8b8ad'};
export const ACTOR_BOXES={hero:[28,20,415,415],walker:[490,43,399,392],runner:[920,12,315,446],spitter:[1285,28,474,426],brute:[17,445,487,406],bag:[537,485,343,364],meds:[901,496,393,323],parts:[1357,496,358,358]};
export class SurvivalRenderer extends RoverRenderer{
  constructor(canvas,images,createSurface){super(canvas,images,createSurface);this.terrain=new EndlessTerrain(images);this.camera={x:TOWN.home.x,y:TOWN.home.y};this.zone=null;}
  crop(id,tint=null){
    if(!id.startsWith('survival:'))return super.crop(id,tint);const key=id+(tint?':'+tint:''),old=this.sprites.get(key);if(old)return old;const b=ACTOR_BOXES[id.slice(9)],img=this.images.characters;if(!b||!img)return null;
    const [x,y,w,h]=b.map((v,i)=>v*(i%2===0?img.width/1774:img.height/887)),surface=this.createSurface(Math.ceil(w),Math.ceil(h)),c=surface?.getContext('2d');if(!c)return null;c.drawImage(img,x,y,w,h,0,0,surface.width,surface.height);if(tint){c.globalCompositeOperation='source-atop';c.fillStyle=tint;c.fillRect(0,0,surface.width,surface.height);c.globalCompositeOperation='source-over';}this.sprites.set(key,surface);return surface;
  }
  draw(g,dt=0){super.draw(g,dt);if(g.screen==='field-workshop')this.fieldWorkshop(g);}
  roomImage(c,bounds,layout){const image=this.images[layout.asset];c.save();if(layout.mirror){c.translate(layout.w,0);c.scale(-1,1);bounds={...bounds,x:layout.w-bounds.x-bounds.w};}const crop=mapCrop(bounds,image,layout);c.drawImage(image,...crop.source,...crop.target);c.restore();}
  roomThumbnail(c,layout,x,y,w){c.save();if(layout.mirror){c.translate(x+w,y);c.scale(-1,1);c.drawImage(this.images[layout.asset],0,0,w,w);}else c.drawImage(this.images[layout.asset],x,y,w,w);c.restore();}
  garage(g){super.garage(g);this.text('丧尸探索',24,78,12,C.muted);}
  world(g,dt){
    const s=g.run;if(!s)return;const p=s.actor,c=this.ctx,h=this.layout.h,world=s.bounds,indoor=s.zone!=='street',scene=s.zone+'@'+s.floor,changed=this.zone!==scene;
    followCamera(this.camera,p,dt,{snap:g.justStarted||changed,reduced:g.reducedMotion});this.zone=scene;
    const target=indoor?Math.max(.92,h/world.h):s.mode==='foot'?.92:.8;if(changed||g.justStarted||!Number.isFinite(this.camera.zoom))this.camera.zoom=target;else this.camera.zoom+=(target-this.camera.zoom)*(1-Math.exp(-dt*4));
    const z=this.camera.zoom,ay=68+(h-68)*.46;if(indoor){this.camera.x=clamp(this.camera.x,195/z,world.w-195/z);this.camera.y=clamp(this.camera.y,ay/z,world.h-(h-ay)/z);}
    const shake=g.reducedMotion?0:g.feel.kick;let ox=195-this.camera.x*z+Math.sin(g.feel.time*63)*shake*.5,oy=ay-this.camera.y*z+Math.cos(g.feel.time*59)*shake*.35;if(indoor){ox=clamp(ox,390-world.w*z,0);oy=clamp(oy,h-world.h*z,0);}const project=a=>({x:ox+a.x*z,y:oy+a.y*z});g.projection={ox,oy,z,height:h};
    const visible=(a,pad=90)=>{const q=project(a);return q.x>-pad&&q.x<390+pad&&q.y>-pad&&q.y<h+pad;};
    c.save();c.translate(ox,oy);c.scale(z,z);const bounds={x:-ox/z,y:-oy/z,w:390/z,h:h/z};
    if(indoor)this.roomImage(c,bounds,world);else this.terrain.draw(c,bounds);
    if(!indoor){
      for(const t of g.feel.tracks)if(visible(t)){c.save();c.translate(t.x,t.y);c.rotate(t.a);this.rr(-2,-t.length/2,4,t.length,1,`rgba(28,39,32,${t.life/t.total*.2})`);c.restore();}
      for(const a of g.feel.particles)if(visible(a)){const t=1-a.life/a.total;this.sprite('fx:'+a.kind,a.x,a.y,a.size*(1+t),a.size*(1+t),a.a,a.life/a.total*.35);}
      for(const house of s.doors)if(visible(house)){const empty=houseCleared(s,house.id);this.circle(house.x,house.y,23,'#34433688',empty?'#89948690':C.orange,1.5);this.icon('home',house.x,house.y,empty?C.muted:C.white,.7);if(dist(house,p)<190)this.text(house.name+(house.floors>1?' · '+house.floors+'层':''),house.x,house.y-34,12,C.white,'center');}
      for(const cache of s.caches)if(!cache.open&&visible(cache))this.sprite('survival:bag',cache.x,cache.y,29,33);
      const home=TOWN.home;if(visible(home)){this.circle(home.x,home.y,67,null,'#bbd6a060',2);if(dist(home,p)<155)this.text('撤离',home.x,home.y+72,11,C.green,'center');if(s.interacting&&s.target==='home'){c.beginPath();c.arc(home.x,home.y,70,-Math.PI/2,-Math.PI/2+s.extract/3.5*Math.PI*2);c.strokeStyle=C.green;c.lineWidth=5;c.stroke();}}
    }else{
      for(const node of s.rooms[s.roomKey].nodes){if(node.open){this.icon('check',node.x,node.y,'#627463',.8);continue;}this.circle(node.x,node.y,22,'#e4c58c20','#dcc59a',1.5);this.icon(node.kind==='meds'?'shield':'box',node.x,node.y,C.white,.7);if(dist(node,p)<95)this.text(SUPPLIES[node.kind].name,node.x,node.y-31,11,C.white,'center');if(s.interacting&&s.target===node.id){c.beginPath();c.arc(node.x,node.y,27,-Math.PI/2,-Math.PI/2+s.searchProgress/1.3*Math.PI*2);c.strokeStyle=C.green;c.lineWidth=4;c.stroke();}}
      if(s.floor===1){this.circle(world.door.x,world.door.y,24,'#8cb58c35',C.green,1.5);this.icon('go',world.door.x,world.door.y,C.green,.85);}
      const house=houseFromId(s.zone);for(const [point,active,label] of [[world.up,s.floor<house.floors,'上楼'],[world.down,s.floor>1,'下楼']])if(point&&visible(point)){this.circle(point.x,point.y,20,active?'#e0be8355':'#31433733',active?C.orange:C.muted,1.5);this.text(label,point.x,point.y,10,active?C.white:C.muted,'center');}
    }
    for(const d of s.drops)if(visible(d))this.sprite('survival:'+SUPPLIES[d.kind].sprite,d.x,d.y,20,21);
    for(const o of s.oil)if(visible(o))this.circle(o.x,o.y,35,'#33443d70');for(const m of s.mines)if(visible(m))this.sprite('equip:mine',m.x,m.y,28,24);
    const actors=s.enemies.filter(e=>visible(e)).map(e=>({y:e.y,type:'zombie',e}));if(!indoor)actors.push({y:s.player.y,type:'car'});if(s.mode==='foot')actors.push({y:s.hero.y,type:'hero'});actors.sort((a,b)=>a.y-b.y);
    for(const item of actors){if(item.type==='zombie')this.zombie(item.e,s.time,g.reducedMotion);else if(item.type==='hero')this.survivor(s.hero,s.time,g.reducedMotion);else{
      const mounts=[...new Set([...s.modules,...(rank(s,'armor')?['armor']:[]),...(rank(s,'rocket')?['rocket']:[])])],age=gunInterval(s)-s.cooldowns.gun,recoil=g.reducedMotion?0:age>=0&&age<.17?Math.sin(age/.17*Math.PI)*3.6:0;
      this.vehicle(s.player,mounts,1,s.turretA,{travel:s.mode==='vehicle'?g.feel.distance:0,lean:s.mode==='vehicle'&&!g.reducedMotion?g.feel.roll*.32:0,recoil,sideA:s.sideA,time:s.time,hit:s.player.invuln>.55?.6:0});
      if(s.mode==='foot'){this.rr(s.player.x-23,s.player.y+45,46,3,1.5,'#263d34');this.rr(s.player.x-23,s.player.y+45,46*s.player.hp/s.player.maxHp,3,1.5,C.green);}
    }}
    if(s.mode==='vehicle'){for(let i=0;i<skill(s,'blade');i++){const a=s.time*2.7+i*Math.PI*2/skill(s,'blade');this.sprite('equip:saw',p.x+Math.cos(a)*90,p.y+Math.sin(a)*90,40,40,s.time*10);}if(s.rogue.shield>0)this.sprite('fx:shield',p.x,p.y,88,99,p.a,.4);}
    for(const b of s.bullets)if(visible(b)){const a=Math.atan2(b.vx,-b.vy),speed=Math.hypot(b.vx,b.vy)||1;this.line(b.x-b.vx/speed*18,b.y-b.vy/speed*18,b.x,b.y,b.enemy?'#abc06f80':'#ecdba080',b.enemy?4:2);this.sprite(b.kind==='rocket'?'equip:rocket':b.enemy?'fx:aqua':'fx:gold',b.x,b.y,b.kind==='rocket'?13:b.enemy?10:7,b.kind==='rocket'?21:b.enemy?14:16,a);}
    for(const e of s.effects)if(visible(e,320))this.effect(e,g);for(const n of g.feel.numbers){const t=1-n.life/n.total;this.text('+'+n.value,n.x,n.y-32-t*22,13,C.green,'center');}
    c.restore();this.gradient(0,0,390,130,'#253b35ac','#253b3500');this.gradient(0,h-110,390,110,'#253b3500','#253b3590');this.hud(g);this.minimap(g);this.controls(g,s.context());
    if(s.zone==='street'&&s.mode==='foot'&&dist(s.hero,s.player)>170){const q=project(s.player);if(q.x<25||q.x>365||q.y<140||q.y>h-150)this.arrow(project(s.hero),q,true,h);}
    if(g.waypoint&&!indoor){const q=project(g.waypoint);if(q.x<25||q.x>365||q.y<140||q.y>h-150)this.arrow(project(p),q,false,h);}
    if(g.flash>0)this.gradient(0,0,390,95,`rgba(221,106,86,${g.flash*.25})`,'#df6b5600');
    if(g.transition>0&&!g.reducedMotion){c.fillStyle=`rgba(25,34,29,${clamp(g.transition/.28,0,1)})`;c.fillRect(0,0,390,h);}
  }
  actorSprite(id,x,y,w,h,a,alpha=1,tint=null){const c=this.ctx;c.save();c.translate(x,y);if(Math.sin(a)<-.15)c.scale(-1,1);this.sprite('survival:'+id,0,0,w,h,0,alpha,tint);c.restore();}
  survivor(p,time,reduced){const bob=reduced?0:Math.hypot(p.vx,p.vy)>15?Math.sin(time*12)*1.6:0;this.circle(p.x,p.y+6,15,'#1f2a3155');this.actorSprite('hero',p.x,p.y+bob,41,41,p.a);if(p.invuln>.5)this.actorSprite('hero',p.x,p.y+bob,41,41,p.a,.45,C.white);}
  zombie(e,time,reduced){const d=ZOMBIES[e.kind],big=e.kind==='brute',w=big?63:e.kind==='spitter'?45:37,h=big?70:48,born=e.born>0?clamp(1-e.born/.55,.1,1):1,bob=reduced?0:Math.sin(time*(e.kind==='runner'?11:6)+e.id)*1.2,squash=reduced?0:Math.sin(clamp(e.hit/.14,0,1)*Math.PI)*.08;
    if(e.mode==='aim'){const a=e.chargeA;this.line(e.x,e.y,e.x+Math.sin(a)*180,e.y-Math.cos(a)*180,'#c6d98788',2);}
    this.circle(e.x,e.y+5,e.r*.9,'#26332966');this.actorSprite(d.sprite,e.x+(reduced?0:e.kx),e.y+bob+(reduced?0:e.ky),w*(1+squash),h*(1-squash),e.a,born);
    if(e.hit>0)this.actorSprite(d.sprite,e.x,e.y+bob,w*(1+squash),h*(1-squash),e.a,e.hit/.14*.6,C.white);
    if(e.hp<e.maxHp){this.rr(e.x-16,e.y-e.r-16,32,3,1.5,'#34473c');this.rr(e.x-16,e.y-e.r-16,32*e.hp/e.maxHp,3,1.5,C.red);}
  }
  hud(g){
    const s=g.run,a=s.actor,time=Math.floor(s.time),hp=clamp(a.hp/a.maxHp,0,1);this.rr(14,14,317,48,11,'#263d35ee','#c6d2b82a');this.icon('shield',30,36,hp<.3?C.red:C.green,.72);this.text(s.mode==='vehicle'?'车辆':'步行',48,29,10,C.muted);this.text(Math.ceil(a.hp)+'/'+a.maxHp,137,29,12,C.white,'right',750);this.rr(48,43,90,5,2.5,'#687b63');this.rr(48,43,90*Math.max(hp,g.feel.hpEcho),5,2.5,C.orange);this.rr(48,43,90*hp,5,2.5,hp<.3?C.red:C.green);
    this.line(155,27,155,48,'#bbc5ab40',1);this.text(s.mode==='foot'?s.hero.ammo+' 发':'人 '+Math.ceil(s.hero.hp),180,36,12,C.white);this.text(Math.floor(time/60)+':'+String(time%60).padStart(2,'0'),293,36,16,C.white,'center');this.iconButton('pause','pause',342,16);
    const items=[['parts',s.player.cargo],['wire',s.supplies.wire],['food',s.supplies.food],['meds',s.supplies.meds]];items.forEach(([kind,n],i)=>{const x=28+i*74;this.sprite('survival:'+SUPPLIES[kind].sprite,x,83,17,19);this.text(n,x+14,83,12,C.white);});
    if(s.zone!=='street'){const house=houseFromId(s.zone);this.text(house.name+' · '+s.floor+'/'+house.floors+'层',20,117,14,C.white);}else this.text('街区 '+Math.floor(s.actor.x/TOWN.w)+','+Math.floor(s.actor.y/TOWN.h),20,117,11,C.muted);
  }
  minimap(g){
    const s=g.run,c=this.ctx,x=317,y=93,w=59,indoor=s.zone!=='street',world=s.bounds,tx=Math.floor(s.actor.x/TOWN.w),ty=Math.floor(s.actor.y/TOWN.h),ox=indoor?0:tx*TOWN.w,oy=indoor?0:ty*TOWN.h;
    this.rr(x-3,y-3,w+6,w+6,9,'#273d35dc','#c1c9b45a');c.save();c.beginPath();c.roundRect(x,y,w,w,6);c.clip();if(indoor)this.roomThumbnail(c,world,x,y,w);else this.terrain.drawRegion(c,x,y,w,tx,ty);
    const q=a=>({x:x+(a.x-ox)/world.w*w,y:y+(a.y-oy)/world.h*w});if(!indoor){for(const door of s.doors){const a=q(door);this.circle(a.x,a.y,1.5,houseCleared(s,door.id)?C.muted:C.orange);}const home=q(TOWN.home);this.circle(home.x,home.y,2.5,C.green);if(s.mode==='foot'){const car=q(s.player);this.circle(car.x,car.y,2.5,C.orange);}}else{for(const n of s.rooms[s.roomKey].nodes){const p=q(n);this.circle(p.x,p.y,1.6,n.open?C.muted:C.orange);}for(const stair of [world.up,world.down])if(stair){const p=q(stair);this.circle(p.x,p.y,2,C.green);}}
    const p=q(s.actor);this.line(p.x,p.y,p.x+Math.sin(s.actor.a)*5,p.y-Math.cos(s.actor.a)*5,C.white,1.5);this.circle(p.x,p.y,2,C.white);c.restore();this.register('map',x-5,y-5,w+10,w+10);
  }
  controls(g,context){
    const s=g.run,h=this.layout.h,c=this.ctx,joy=g.joy;if(joy){const b={x:clamp(joy.base.x,44,346),y:clamp(joy.base.y,142,h-48)};this.circle(b.x,b.y,STICK.radius,'#35473555','#eeecc388',1.5);this.circle(b.x+g.input.x*22,b.y+g.input.y*22,14,'#ced6bac9','#f4f4e799',1);}
    const enabled=!!context?.ready,active=s.interacting,cx=328,cy=h-82,r=enabled?37:31;this.circle(cx,cy+3,r,'#21332b');this.circle(cx,cy,r,active?'#4c6852':enabled?C.orange:'#3e5a49','#d5d7bd70',1);this.icon(active?'close':context?.kind==='enter'?'home':context?.kind==='search'?'box':['exit','up','down'].includes(context?.kind)?'go':context?.kind==='extract'?'home':'map',cx,cy-7,enabled?C.ink:C.white,.9);this.text(active?'取消':context?.name||'地图',cx,cy+16,11,enabled?C.ink:C.white,'center');this.register('action',cx-40,cy-40,80,80);
    const a=s.actor,bx=253,by=h-87,cd=a.boostCooldown;this.circle(bx,by,27,cd>0?'#3c5143d9':'#789d6dee','#d7dfc966',1);this.icon('go',bx,by-5,cd>0?C.muted:C.white,.85);this.text(cd>0?Math.ceil(cd)+'秒':s.mode==='vehicle'?'冲撞':'快跑',bx,by+12,9,C.white,'center');if(cd>0){c.beginPath();c.arc(bx,by,29,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-cd/(s.mode==='vehicle'?3.5:2.8)));c.strokeStyle=C.green;c.lineWidth=2;c.stroke();}this.register('boost',bx-29,by-29,58,58);
    if(s.zone==='street'){const near=s.mode==='vehicle'||dist(s.hero,s.player)<=80,vy=h-164;this.circle(332,vy,27,near?'#455f4fee':'#304936aa','#c8d4b455',1);this.icon('go',332,vy-5,near?C.white:C.muted,.8);this.text(s.mode==='vehicle'?'下车':'上车',332,vy+12,10,near?C.white:C.muted,'center');this.register('vehicle',303,vy-29,58,58);if(s.canModify()){const my=h-235;this.circle(332,my,25,'#455f4fee','#c8d4b455',1);this.icon('bolt',332,my-5,C.orange,.75);this.text('改装',332,my+12,9,C.white,'center');this.register('field-workshop',303,my-29,58,58);}}
  }
  chart(g){
    const c=this.ctx,h=this.layout.h,s=g.run,indoor=s.zone!=='street';this.buttons=[];c.fillStyle='#273b32f8';c.fillRect(0,0,390,h);this.text(indoor?'室内':'附近街区',24,43,23,C.white);this.iconButton('close-map','close',326,21);
    const size=Math.min(340,h-190),x=(390-size)/2,y=100,tx=Math.floor(s.actor.x/TOWN.w)-1,ty=Math.floor(s.actor.y/TOWN.h)-1,worldW=indoor?s.bounds.w:TOWN.w*3,worldX=indoor?0:tx*TOWN.w,worldY=indoor?0:ty*TOWN.h;
    this.chartRect={x,y,w:size,h:size,worldX,worldY,worldW,worldH:worldW};if(indoor)this.roomThumbnail(c,s.bounds,x,y,size);else for(let row=0;row<3;row++)for(let col=0;col<3;col++)this.terrain.drawRegion(c,x+col*size/3,y+row*size/3,size/3,tx+col,ty+row);
    const q=p=>({x:x+(p.x-worldX)/worldW*size,y:y+(p.y-worldY)/worldW*size});if(!indoor){this.register('chart',x,y,size,size);for(const house of s.doors){const p=q(house);this.circle(p.x,p.y,3,houseCleared(s,house.id)?C.muted:C.orange);if(dist(house,s.actor)<TOWN.w*.5)this.text(house.name,p.x,p.y+11,9,C.white,'center');}const car=q(s.player);if(car.x>=x&&car.x<=x+size&&car.y>=y&&car.y<=y+size)this.sprite('truck',car.x,car.y,13,16,s.player.a);const home=q(TOWN.home);if(home.x>=x&&home.x<=x+size&&home.y>=y&&home.y<=y+size)this.circle(home.x,home.y,5,C.green);this.button('return-guide','标记撤离点',85,y+size+30,220,43,C.green);}else{for(const n of s.rooms[s.roomKey].nodes){const p=q(n);this.circle(p.x,p.y,4,n.open?C.muted:C.orange);}for(const [stair,label] of [[s.bounds.up,'上楼'],[s.bounds.down,'下楼']])if(stair){const p=q(stair);this.circle(p.x,p.y,4,C.green);this.text(label,p.x,p.y+12,9,C.white,'center');}this.text(s.floor===1?'下方出口返回街区':'沿楼梯返回 1 层离开',195,y+size+37,12,C.muted,'center');}const p=q(s.actor);this.circle(p.x,p.y,4,C.white,'#1c322b',1);
  }
  fieldWorkshop(g){
    const c=this.ctx,h=this.layout.h,s=g.run;this.buttons=[];c.fillStyle='#24382feb';c.fillRect(0,0,390,h);this.text('现场改装',24,41,24,C.white);this.iconButton('close-field','close',326,20);
    this.sprite('survival:parts',32,83,20,20);this.text(s.player.cargo,49,83,13,C.white);this.text('电子元件 '+s.supplies.wire,139,83,12,C.muted);this.vehicle({x:195,y:Math.min(207,h*.32),a:0},[...new Set([...s.modules,...(rank(s,'rocket')?['rocket']:[]),...(rank(s,'armor')?['armor']:[])])],Math.min(1.65,(h-385)/85),0);
    const top=h-300;for(const [i,id,label] of [[0,'fire','火力'],[1,'body','底盘'],[2,'supply','补给']]){const x=24+i*117,on=(g.fieldTab||'fire')===id;this.rr(x,top,108,35,9,on?'#718b63':'#344f40');this.text(label,x+54,top+18,13,on?C.white:C.muted,'center');this.register('field-tab:'+id,x,top,108,35);}
    FIELD_MODS.filter(m=>m.group===(g.fieldTab||'fire')).forEach((m,i)=>{const y=top+57+i*76,n=rank(s,m.id),price=fieldPrice(s,m.id),max=n>=m.max,available=!max&&s.player.cargo>=price.parts&&['wire','meds','food'].every(k=>s.supplies[k]>=price[k])&&!(m.id==='patch'&&s.player.hp===s.player.maxHp||m.id==='heal'&&s.hero.hp===100||m.id==='ammo'&&s.hero.ammo>=999);this.sprite(m.sprite,45,y+15,35,39);this.text(m.name,73,y,15,C.white);this.text(m.detail,73,y+23,11,C.muted);const text=max?'已满级':price.meds?'药品 ×'+price.meds:price.food?'罐头 ×'+price.food:price.parts+' 零件'+(price.wire?' · '+price.wire+' 元件':'');this.text(text,73,y+43,10,available?C.orange:C.muted);this.circle(341,y+18,21,available?C.orange:'#53654b');this.text(max?'✓':'+',341,y+18,23,available?C.ink:C.muted,'center');if(available)this.register('field-buy:'+m.id,313,y-10,54,56);if(n&&m.max<999)this.text('Lv.'+n,288,y,10,C.green,'right');if(i<2)this.line(24,y+58,366,y+58,'#b2bea627',1);});
  }
  overlay(g){
    const c=this.ctx,h=this.layout.h,result=g.screen==='result',y=h/2-(result?190:161);this.buttons=[];c.fillStyle='#1d2e27ce';c.fillRect(0,0,390,h);
    this.rr(24,y+4,342,result?366:326,22,'#192c24');this.rr(24,y,342,result?366:326,22,'#344a3c','#b4c3a875');
    if(result){const r=g.run.result,age=g.reducedMotion?1:clamp(g.resultAge/.65,0,1);
      if(r.success)this.sprite('survival:parts',195,y+63,66,66);else this.vehicle({x:195,y:y+66,a:-.16},g.run.modules,.94,0);
      this.text(r.success?'撤离成功':r.reason,195,y+128,24,r.success?C.green:C.orange,'center',850);this.text('+'+Math.floor(r.reward*age),195,y+191,47,C.white,'center',850);this.text(r.success?'零件入库':'带回 35% 零件',195,y+229,12,C.muted,'center');
      this.line(61,y+257,329,y+257,'#b4c3a840',1);this.text('搜过 '+(r.visits||0)+' 栋 · 击破 '+r.kills,144,y+280,12,C.muted,'center');this.text(Math.floor(r.time/60)+':'+String(r.time%60).padStart(2,'0'),291,y+280,12,C.muted,'center');this.button('garage','返回车库',49,y+306,292,45,r.success?C.green:C.orange,C.ink);
    }else if(g.screen==='confirm'){this.text('结束探索？',195,y+49,25,C.white,'center',800);this.text('带回 35% 零件',195,y+96,13,C.muted,'center');this.button('cancel','继续探索',49,y+154,292,49,C.green,C.ink);this.button('abandon','结束探索',49,y+222,292,45,'#50654b',C.white);}
    else{this.text('已暂停',195,y+50,25,C.white,'center',800);this.button('resume','继续探索',49,y+116,292,49,C.green,C.ink);this.button('save-home','保存并回车库',49,y+183,292,45,'#50654b',C.white);this.button('finish','结束探索',49,y+244,292,40,'#3e5645',C.muted);}
  }
}
