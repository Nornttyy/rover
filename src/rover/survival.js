import {Expedition,STEP} from './core.js?v=12';
import {DRIVE,statsFor,clamp,dist,angleTo,angleDelta} from './data.js?v=12';
import {newRogue,rank,skill,damageScale,gunInterval,boostCooldown,pickupRadius,syncStats,rogueWeapons,firePrimary} from './rogue.js?v=12';
import {driveMotion} from './drive.js?v=12';
import {TOWN,ZOMBIES,FIELD_BY_ID,fieldPrice,streetBlocked,roomBlocked,roomLayout,validMods,survivalRoute,districtDoors,houseFromId,floorInfo} from './survival-data.js?v=12';

export class SurvivalRun{
  constructor(modules=[],seed=9031){
    this.survivalVersion=1;this.version=4;this.modules=[...modules];this.seed=seed>>>0;this.phase='play';this.result=null;this.time=0;this.mode='vehicle';this.zone='street';this.floor=1;
    const stats=statsFor(modules);this.player={x:TOWN.home.x,y:TOWN.home.y+100,a:0,vx:0,vy:0,r:23,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,capacity:999999,cargo:0,invuln:0,lastHit:-9,repairUsed:0,boostTime:0,boostCooldown:0};
    this.hero={x:this.player.x+48,y:this.player.y,a:0,vx:0,vy:0,r:12,hp:100,maxHp:100,speed:154,invuln:0,boostTime:0,boostCooldown:0,ammo:90};
    this.supplies={wire:0,food:0,meds:0};this.rogue=newRogue();this.convoy={trailers:[],loose:[],freight:[],peak:0,boostId:0};this.rooms={};this.street=null;this.visits=0;
    this.enemies=[];this.bullets=[];this.effects=[];this.drops=[];this.mines=[];this.oil=[];this.mortars=[];this.caches=[];this.events=[];this.id=0;this.fxId=0;this.kills=0;this.shots=0;this.damageTaken=0;this.secured=0;this.turretA=0;this.sideA=Math.PI/2;this.cooldowns={gun:.35,pistol:.2,side:0,flame:0};this.spawnClock=5;this.spawnIndex=0;this.interacting=false;this.target=null;this.extract=0;this.searchProgress=0;
    this.doors=districtDoors(this.player);this.districtKey='0,0';this.caches=[{id:0,x:TOWN.home.x+100,y:TOWN.home.y+160,value:14,open:false}];
    for(let i=0;i<5;i++)this.spawnNear(i===4?'runner':'walker',this.player,280,420);
  }
  get actor(){return this.mode==='vehicle'?this.player:this.hero;}
  get roomKey(){return this.zone+'@'+this.floor;}
  get bounds(){return this.zone==='street'?TOWN:roomLayout(houseFromId(this.zone),this.floor);}
  random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/4294967296;}
  emit(type,x=this.actor.x,y=this.actor.y,value=0){this.events.push({type,x,y,value});if(this.events.length>40)this.events.shift();}
  effect(type,x,y,life=.3,extra={}){this.effects.push({id:++this.fxId,type,x,y,life,total:life,...extra});if(this.effects.length>100)this.effects.shift();}
  blocked(x,y,r=16){return this.zone==='street'?streetBlocked(x,y,r):roomBlocked(x,y,r,this.bounds);}
  move(actor,dx,dy){if(!this.blocked(actor.x+dx,actor.y,actor.r))actor.x+=dx;if(!this.blocked(actor.x,actor.y+dy,actor.r))actor.y+=dy;}
  sight(a,b){const n=Math.ceil(dist(a,b)/16);for(let i=1;i<n;i++)if(this.blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,2))return false;return true;}
  nearestFrom(source,range){return this.enemies.filter(e=>e.hp>0&&e.born<=0&&dist(source,e)-e.r<range&&this.sight(source,e)).sort((a,b)=>dist(a,source)-dist(b,source))[0]||null;}
  nearest(range){return this.nearestFrom(this.actor,range);}
  spawn(kind,x,y){const d=ZOMBIES[kind],scale=1+Math.min(2,this.time/720),e={id:++this.id,kind,x,y,a:0,r:d.r,hp:d.hp*scale,maxHp:d.hp*scale,speed:d.speed,born:.55,fire:1.8,mode:'walk',clock:0,hit:0,chargeA:0,kx:0,ky:0,slow:0,oiled:0,rammed:-1};this.enemies.push(e);return e;}
  spawnNear(kind,center,min=290,max=430){if(this.enemies.length>=64)return;for(let i=0;i<35;i++){const a=this.random()*Math.PI*2,d=min+this.random()*(max-min),p={x:center.x+Math.sin(a)*d,y:center.y+Math.cos(a)*d};if(!this.blocked(p.x,p.y,ZOMBIES[kind].r+3))return this.spawn(kind,p.x,p.y);}}
  hurtEnemy(e,damage){if(e.hp<=0)return;e.hp-=damage;e.hit=.14;const a=angleTo(this.actor,e);e.kx=Math.sin(a)*3;e.ky=-Math.cos(a)*3;this.effect('hit',e.x,e.y,.17,{value:Math.round(damage)});this.emit('impact',e.x,e.y);if(e.hp<=0){this.kills++;this.effect('pop',e.x,e.y,.46,{big:e.kind==='brute'});this.emit('kill',e.x,e.y);this.drop(e.x,e.y,ZOMBIES[e.kind].loot,'parts');}}
  hurt(actor,damage){if(actor.invuln>0||actor.hp<=0)return;actor.hp=Math.max(0,actor.hp-damage);actor.invuln=.7;actor.lastHit=this.time;this.damageTaken+=damage;this.emit('hurt',actor.x,actor.y,damage);if(actor===this.hero)this.cancelInteract();if(actor.hp<=0)this.finish(false,actor===this.hero?'未能返回':'车辆损毁');}
  hurtPlayer(damage){this.hurt(this.actor,damage);}
  drop(x,y,value,kind='parts'){const old=this.drops.find(d=>d.kind===kind&&dist(d,{x,y})<30);if(old){old.value+=value;old.life=180;return;}if(this.drops.length>=180)return;this.drops.push({id:++this.id,x,y,value,kind,life:180});}
  addCargo(value){const n=clamp(value,0,999999-this.player.cargo);this.player.cargo+=n;if(n)this.emit('loot',this.actor.x,this.actor.y,n);return n;}
  grant(kind,value){if(kind==='parts')this.addCargo(value);else if(kind==='ammo')this.hero.ammo=Math.min(999,this.hero.ammo+value);else if(Object.hasOwn(this.supplies,kind))this.supplies[kind]=Math.min(999,this.supplies[kind]+value);}
  toggleVehicle(){
    if(this.phase!=='play'||this.zone!=='street')return false;this.cancelInteract();
    if(this.mode==='foot'){if(dist(this.hero,this.player)>80)return false;this.mode='vehicle';this.hero.vx=this.hero.vy=0;this.emit('tap');return true;}
    for(const offset of [Math.PI/2,-Math.PI/2,Math.PI,0,Math.PI/4,-Math.PI/4]){const a=this.player.a+offset,x=this.player.x+Math.sin(a)*49,y=this.player.y-Math.cos(a)*49;if(!streetBlocked(x,y,15)){this.mode='foot';Object.assign(this.hero,{x,y,a:this.player.a,vx:0,vy:0});this.player.vx=this.player.vy=0;this.player.boostTime=0;this.emit('tap');return true;}}return false;
  }
  context(){
    const a=this.actor;if(this.zone!=='street'){
      const house=houseFromId(this.zone),room=this.bounds;if(room.up&&this.floor<house.floors&&dist(a,room.up)<room.up.r)return{kind:'up',name:'上楼',duration:0,progress:0,ready:true};
      if(room.down&&this.floor>1&&dist(a,room.down)<room.down.r)return{kind:'down',name:'下楼',duration:0,progress:0,ready:true};
      if(this.floor===1&&dist(a,room.door)<room.door.r)return{kind:'exit',name:'离开',duration:0,progress:0,ready:true};
      const node=this.rooms[this.roomKey]?.nodes.filter(n=>!n.open&&dist(n,a)<65).sort((x,y)=>dist(x,a)-dist(y,a))[0];
      return node?{kind:'search',id:node.id,name:'搜刮',duration:1.3,progress:this.searchProgress,ready:true}:null;
    }
    if(this.mode==='vehicle')return dist(a,TOWN.home)<TOWN.home.r?{kind:'extract',name:'撤离',duration:3.5,progress:this.extract,ready:this.player.cargo>0||this.visits>0}:null;
    const door=this.doors.filter(h=>dist(h,a)<65).sort((x,y)=>dist(x,a)-dist(y,a))[0];return door?{kind:'enter',id:door.id,name:'进屋',duration:0,progress:0,ready:true}:null;
  }
  startInteract(){const c=this.context();if(!c||!c.ready)return false;if(c.kind==='enter')return this.enter(c.id);if(c.kind==='exit')return this.leave();if(c.kind==='up'||c.kind==='down')return this.changeFloor(this.floor+(c.kind==='up'?1:-1));this.interacting=true;this.target=c.kind==='extract'?'home':c.id;return true;}
  cancelInteract(){this.interacting=false;this.target=null;this.extract=0;this.searchProgress=0;}
  enter(id){
    const house=houseFromId(id);if(this.zone!=='street'||this.mode!=='foot'||!house||dist(this.hero,house)>65)return false;
    this.cancelInteract();this.street={enemies:this.enemies,bullets:this.bullets,drops:this.drops,spawnClock:this.spawnClock,hero:{x:this.hero.x,y:this.hero.y,a:this.hero.a}};this.enemies=[];this.bullets=[];this.drops=[];this.effects=[];this.mines=[];this.oil=[];this.mortars=[];this.zone=id;
    this.floor=1;Object.assign(this.hero,this.bounds.entry,{vx:0,vy:0,a:0,invuln:1.2});if(!this.rooms[this.roomKey])this.visits++;this.loadFloor(house);
    this.emit('enter');return true;
  }
  loadFloor(house){
    const key=this.roomKey;if(this.rooms[key]){this.enemies=this.rooms[key].enemies||[];this.drops=this.rooms[key].drops||[];return;}
    const value=Math.ceil((house.type==='small'?20:28)*(1+(this.floor-1)*.22)),resource=house.kind;
    const layout=this.bounds,kinds=[resource,'ammo',resource==='wire'?'parts':'wire','meds','food','ammo'];
    this.rooms[key]={nodes:layout.nodes.map((p,i)=>{const kind=kinds[i];return{id:'cache-'+i,...p,kind,value:kind==='parts'?value:kind==='ammo'?35+this.floor*4:kind==='wire'?2+Math.floor(this.floor/3):2,open:false};}),enemies:null,drops:[]};
    this.enemies=[];this.drops=[];const count=Math.min(12,house.danger+layout.nodes.length+Math.floor((this.floor-1)/2));for(let i=0;i<count;i++){const kind=this.floor>3&&i===count-1?'brute':this.floor>2&&i===count-2?'spitter':i%3===2?'runner':'walker',p=layout.spawnPoints[i%layout.spawnPoints.length],offset=Math.floor(i/layout.spawnPoints.length)*45;let q={x:p.x,y:p.y+offset};if(this.blocked(q.x,q.y,ZOMBIES[kind].r))q=layout.entry;const e=this.spawn(kind,q.x,q.y);e.hp*=1+(this.floor-1)*.12;e.maxHp=e.hp;}
  }
  changeFloor(next){
    const c=this.context(),house=houseFromId(this.zone);if(this.zone==='street'||!house||next<1||next>house.floors||next===this.floor||next!==this.floor+(c?.kind==='up'?1:c?.kind==='down'?-1:0))return false;
    this.cancelInteract();this.rooms[this.roomKey].enemies=this.enemies;this.rooms[this.roomKey].drops=this.drops;const up=next>this.floor;this.floor=next;this.loadFloor(house);this.bullets=[];this.effects=[];Object.assign(this.hero,up?this.bounds.upArrival:this.bounds.downArrival,{vx:0,vy:0,a:0,invuln:1.2});this.emit('enter');return true;
  }
  leave(){if(this.zone==='street'||this.floor!==1||dist(this.hero,this.bounds.door)>this.bounds.door.r)return false;this.cancelInteract();this.rooms[this.roomKey].enemies=this.enemies;this.rooms[this.roomKey].drops=this.drops;const old=this.street;this.zone='street';this.floor=1;this.enemies=old.enemies;this.bullets=old.bullets;this.drops=old.drops;this.spawnClock=old.spawnClock;Object.assign(this.hero,old.hero,{vx:0,vy:0,invuln:1.2});this.street=null;this.effects=[];this.mines=[];this.oil=[];this.mortars=[];this.emit('exit');return true;}
  canModify(){return this.phase==='play'&&this.zone==='street'&&Math.hypot(this.player.vx,this.player.vy)<12&&(this.mode==='vehicle'||dist(this.hero,this.player)<90);}
  modify(id){
    const m=FIELD_BY_ID[id],price=fieldPrice(this,id);if(!m||!price||!this.canModify()||(this.rogue.levels[id]||0)>=m.max||this.player.cargo<price.parts||Object.entries(price).some(([k,n])=>k!=='parts'&&this.supplies[k]<n))return false;
    if(id==='patch'&&this.player.hp>=this.player.maxHp||id==='heal'&&this.hero.hp>=this.hero.maxHp||id==='ammo'&&this.hero.ammo>=999)return false;
    this.player.cargo-=price.parts;for(const k of ['wire','meds','food'])this.supplies[k]-=price[k];
    if(id==='patch')this.player.hp=Math.min(this.player.maxHp,this.player.hp+45);else if(id==='heal')this.hero.hp=Math.min(100,this.hero.hp+45);else if(id==='ammo')this.hero.ammo=Math.min(999,this.hero.ammo+45);else{this.rogue.levels[id]=(this.rogue.levels[id]||0)+1;syncStats(this);if(id==='armor')this.player.hp=Math.min(this.player.maxHp,this.player.hp+25);}
    this.emit('upgrade');return true;
  }
  choose(){return false;}reroll(){return false;}detach(){return false;}
  boost(){const a=this.actor;if(this.phase!=='play'||a.boostCooldown>0||this.interacting)return false;a.boostTime=this.mode==='vehicle'?.65:.38;a.boostCooldown=this.mode==='vehicle'?boostCooldown(this):2.8;a.invuln=Math.max(a.invuln,this.mode==='vehicle'?.5:.18);this.convoy.boostId++;this.emit('boost');return true;}
  shoot(source,a,damage,speed=470,kind='bullet',enemy=false){
    const muzzle=kind==='pistol'?20:enemy?20:24,side=kind==='side',localX=side?26:0,localY=side?3:4,body=source.a||0,x=source.x+Math.cos(body)*localX-Math.sin(body)*localY+Math.sin(a)*muzzle,y=source.y+Math.sin(body)*localX+Math.cos(body)*localY-Math.cos(a)*muzzle;
    this.bullets.push({x,y,px:x,py:y,vx:Math.sin(a)*speed,vy:-Math.cos(a)*speed,life:enemy?2.3:1.1,damage,r:enemy?7:4,kind,enemy,hitIds:[],pierce:0,bounce:0});this.shots+=enemy?0:1;this.effect('muzzle',x,y,.09,{a,kind,enemy});
  }
  step(dt=STEP,input={x:0,y:0}){
    if(this.phase!=='play')return;dt=clamp(dt,0,.04);this.time+=dt;const a=this.actor,p=this.player,moving=Math.hypot(input.x||0,input.y||0)>.02;
    for(const actor of [p,this.hero])for(const key of ['invuln','boostTime','boostCooldown'])actor[key]=Math.max(0,actor[key]-dt);
    if(moving)this.cancelInteract();const speed=(this.mode==='vehicle'?p.speed:this.hero.speed)*(a.boostTime>0?(this.mode==='vehicle'?1.85:1.55):1),before={x:a.x,y:a.y},motion=driveMotion(a,input,dt,speed);this.move(a,motion.x,motion.y);if(a.x===before.x)a.vx=0;if(a.y===before.y)a.vy=0;
    if(this.mode==='vehicle')Object.assign(this.hero,{x:p.x,y:p.y,a:p.a});
    if(this.interacting){const c=this.context();if(!c||c.kind==='extract'&&this.target!=='home'||c.kind==='search'&&this.target!==c.id)this.cancelInteract();else if(c.kind==='extract'){this.extract+=dt;if(this.extract>=3.5)this.finish(true);}else if(c.kind==='search'){this.searchProgress+=dt;if(this.searchProgress>=c.duration){const node=this.rooms[this.roomKey].nodes.find(n=>n.id===c.id);node.open=true;this.grant(node.kind,node.value);this.effect('loot',node.x,node.y,.5);this.emit('loot',node.x,node.y,node.value);this.cancelInteract();}}}
    if(this.phase!=='play')return;
    if(this.zone==='street'){const key=Math.floor(a.x/TOWN.w)+','+Math.floor(a.y/TOWN.h);if(key!==this.districtKey){this.doors=districtDoors(a);this.districtKey=key;}this.spawnClock-=dt;if(this.spawnClock<=0){const pattern=this.time<45?['walker','walker','runner']:['walker','runner','spitter','walker','runner'];for(let i=0;i<Math.min(5,2+Math.floor(this.time/100));i++)this.spawnNear(pattern[this.spawnIndex++%pattern.length],a);this.spawnClock=Math.max(2.5,6-this.time/240);}if(this.time>=this.rogue.nextBoss){this.spawnNear('brute',a,320,450);this.rogue.nextBoss+=150;}}
    for(const key of Object.keys(this.cooldowns))this.cooldowns[key]-=dt;
    const target=this.nearest(this.mode==='vehicle'?270:245);
    if(this.mode==='vehicle'){
      if(target){this.turretA=angleTo(p,target);if(this.cooldowns.gun<=0)firePrimary(this,target);}rogueWeapons(this,dt);
      if(this.modules.includes('side')){const e=this.enemies.find(e=>e.born<=0&&dist(e,p)<245&&Math.abs(angleDelta(p.a+Math.PI/2,angleTo(p,e)))<.7);this.sideA=e?angleTo(p,e):p.a+Math.PI/2;if(e&&this.cooldowns.side<=0){this.shoot(p,this.sideA,20,490,'side');this.cooldowns.side=.65;}}
      if(this.modules.includes('drill'))for(const e of this.enemies)if(e.born<=0&&dist(p,e)<p.r+e.r+25&&Math.abs(angleDelta(p.a,angleTo(p,e)))<.85)this.hurtEnemy(e,35*dt);
      if(this.modules.includes('flame')&&this.cooldowns.flame<=0){const es=this.enemies.filter(e=>e.born<=0&&dist(p,e)-e.r<125&&Math.abs(angleDelta(p.a+Math.PI,angleTo(p,e)))<.8);if(es.length){es.forEach(e=>this.hurtEnemy(e,13));this.effect('flame',p.x,p.y,.24,{a:p.a+Math.PI});this.cooldowns.flame=.22;}}
      if(this.modules.includes('repair')&&this.time-p.lastHit>5&&p.repairUsed<50){const n=Math.min(dt,50-p.repairUsed,p.maxHp-p.hp);p.hp+=n;p.repairUsed+=n;}
      if(p.boostTime>0)for(const e of this.enemies)if(e.born<=0&&e.rammed!==this.convoy.boostId&&dist(e,p)<e.r+p.r+12&&Math.abs(angleDelta(p.a,angleTo(p,e)))<1.05){e.rammed=this.convoy.boostId;this.hurtEnemy(e,60);this.emit('ram',e.x,e.y);}
    }else{
      if(target&&this.hero.ammo>0&&this.cooldowns.pistol<=0){this.hero.a=angleTo(this.hero,target);this.shoot(this.hero,this.hero.a,19,410,'pistol');this.hero.ammo--;this.cooldowns.pistol=.48;this.emit('shot');}
      // The mounted main gun stays on guard while its driver scavenges nearby.
      // It uses the parked car's position, never the pedestrian's target/aim.
      if(this.zone==='street'){const guard=this.nearestFrom(p,270);if(guard){this.turretA=angleTo(p,guard);if(this.cooldowns.gun<=0)firePrimary(this,guard);}}
    }
    for(const e of this.enemies){
      e.hit=Math.max(0,e.hit-dt);e.kx*=Math.exp(-dt*22);e.ky*=Math.exp(-dt*22);e.slow=Math.max(0,e.slow-dt);e.oiled=Math.max(0,e.oiled-dt);if(e.hp<=0)continue;if(e.born>0){e.born-=dt;continue;}
      const prey=this.mode==='foot'&&this.zone==='street'&&dist(p,e)<dist(a,e)*.8?p:a,d=dist(prey,e),direction=angleTo(e,prey);e.a+=angleDelta(e.a,direction)*(1-Math.exp(-dt*7));e.fire-=dt;let walk=true,speed=e.speed*(e.slow>0?.55:e.oiled>0?.6:1);
      if(e.kind==='spitter'&&d<280&&this.sight(e,prey)){walk=d>210;if(e.mode==='walk'&&e.fire<=0){e.mode='aim';e.clock=.75;e.chargeA=direction;e.fire=3.3;}if(e.mode==='aim'){walk=false;e.clock-=dt;if(e.clock<=0){this.shoot(e,e.chargeA,10,155,'acid',true);e.mode='walk';}}}else if(e.mode==='aim')e.mode='walk';
      if(walk&&d>e.r+prey.r-3){const route=survivalRoute(this,e,prey),angle=angleTo(e,route);this.move(e,Math.sin(angle)*speed*dt,-Math.cos(angle)*speed*dt);}if(d<e.r+prey.r)this.hurt(prey,ZOMBIES[e.kind].damage);
    }
    for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const x=this.enemies[i],y=this.enemies[j],d=dist(x,y),n=(x.r+y.r)*.75;if(d>.01&&d<n){const push=(n-d)*.04;this.move(x,(x.x-y.x)/d*push,(x.y-y.y)/d*push);this.move(y,-(x.x-y.x)/d*push,-(x.y-y.y)/d*push);}}
    for(const b of this.bullets){
      if(b.kind==='rocket'){const e=this.enemies.filter(e=>e.hp>0&&e.born<=0).sort((a,c)=>dist(a,b)-dist(c,b))[0];if(e){const a=angleTo(b,e),v=Math.hypot(b.vx,b.vy),t=1-Math.exp(-dt*8);b.vx+=(Math.sin(a)*v-b.vx)*t;b.vy+=(-Math.cos(a)*v-b.vy)*t;}}
      b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(this.blocked(b.x,b.y,2)){b.life=0;if(b.kind==='rocket')this.blast(b);continue;}
      if(b.enemy){for(const victim of this.mode==='foot'&&this.zone==='street'?[a,p]:[a])if(dist(b,victim)<b.r+victim.r){this.hurt(victim,b.damage);b.life=0;break;}}
      else for(const e of this.enemies){if(e.hp<=0||e.born>0||b.hitIds.includes(e.id)||dist(b,e)>b.r+e.r)continue;if(b.kind==='rocket'){this.blast(b);b.life=0;break;}this.hurtEnemy(e,b.damage);b.hitIds.push(e.id);if(b.pierce>0){b.pierce--;break;}b.life=0;break;}
    }
    if(this.zone==='street')for(const c of this.caches)if(!c.open&&dist(a,c)<43){c.open=true;this.addCargo(c.value);this.supplies.wire++;this.effect('loot',c.x,c.y,.5);}
    for(const d of this.drops){d.life-=dt;const distance=dist(d,a),radius=this.mode==='vehicle'?pickupRadius(this):65;if(distance<radius){const n=Math.min(distance,280*dt);d.x+=(a.x-d.x)/(distance||1)*n;d.y+=(a.y-d.y)/(distance||1)*n;if(distance<23){this.grant(d.kind,d.value);d.value=0;}}}
    for(const f of this.effects)f.life-=dt;this.effects=this.effects.filter(f=>f.life>0);this.bullets=this.bullets.filter(b=>b.life>0).slice(-220);this.enemies=this.enemies.filter(e=>e.hp>0&&(this.zone!=='street'||dist(e,a)<1150||this.mode==='foot'&&dist(e,p)<600));this.drops=this.drops.filter(d=>d.value>0&&d.life>0&&(this.zone!=='street'||dist(d,a)<1700));
  }
  blast(b){for(const e of this.enemies)if(e.born<=0&&dist(e,b)<105+e.r)this.hurtEnemy(e,b.damage);this.effect('blast',b.x,b.y,.4);this.emit('kill',b.x,b.y);}
  finish(success,reason=success?'撤离成功':'结束探索'){if(this.phase!=='play')return;this.phase=success?'won':'lost';this.cancelInteract();this.result={success,reason,reward:success?this.player.cargo:Math.floor(this.player.cargo*.35),cargo:this.player.cargo,kills:this.kills,time:Math.round(this.time),bosses:0,level:1+Object.values(this.rogue.levels).reduce((a,b)=>a+b,0),peak:0,visits:this.visits,food:this.supplies.food,meds:this.supplies.meds};this.emit(success?'win':'lose');}
  snapshot(){const raw=JSON.parse(JSON.stringify({...this,events:[],effects:[]}));if(this.zone!=='street'){raw.rooms[this.roomKey].enemies=raw.enemies;raw.rooms[this.roomKey].drops=raw.drops;}return raw;}
  static restore(raw){
    if(!raw)return null;
    if(raw.survivalVersion!==1){const old=Expedition.restore(raw);if(!old)return null;const s=new SurvivalRun(old.modules,old.seed);s.player.cargo=old.player.cargo;s.player.hp=Math.min(s.player.maxHp,old.player.hp);return s;}
    try{raw=structuredClone(raw);}catch{return null;}
    const numeric=(v,keys)=>v&&keys.every(k=>Number.isFinite(v[k])&&Math.abs(v[k])<1e8),actor=v=>numeric(v,['x','y','a','vx','vy','r','hp','maxHp','speed','invuln','boostTime','boostCooldown'])&&v.hp>0&&v.hp<=v.maxHp;
    if(raw.phase!=='play'||!validMods(raw.modules)||!['vehicle','foot'].includes(raw.mode)||raw.zone!=='street'&&!houseFromId(raw.zone)||raw.zone!=='street'&&raw.mode!=='foot'||!actor(raw.player)||!actor(raw.hero)||raw.player.r!==23||raw.hero.r!==12||raw.hero.maxHp!==100||!numeric(raw.player,['cargo','capacity','lastHit','repairUsed'])||raw.player.cargo<0||raw.player.cargo>999999||!Number.isInteger(raw.hero.ammo)||raw.hero.ammo<0||raw.hero.ammo>999||!numeric(raw,['time','id','fxId','kills','shots','spawnClock','spawnIndex','damageTaken','turretA','sideA','visits'])||!Number.isInteger(raw.seed)||raw.seed<0||raw.seed>4294967295||raw.time<0||raw.time>86400||!numeric(raw.supplies,['wire','food','meds'])||Object.values(raw.supplies).some(n=>!Number.isInteger(n)||n<0||n>999)||!raw.rogue?.levels||typeof raw.rogue.levels!=='object'||!Array.isArray(raw.rogue.offer)||raw.rogue.offer.length||raw.rogue.level!==1||raw.rogue.xp!==0||raw.rogue.next!==8||!Number.isFinite(raw.rogue.nextBoss)||raw.rogue.shield!==0)return null;
    for(const [id,n] of Object.entries(raw.rogue.levels))if(!FIELD_BY_ID[id]||!Number.isInteger(n)||n<1||n>FIELD_BY_ID[id].max||FIELD_BY_ID[id].max>=999)return null;
    const es=arr=>Array.isArray(arr)&&arr.length<=64&&arr.every(e=>ZOMBIES[e.kind]&&numeric(e,['id','x','y','a','r','hp','maxHp','speed','born','fire','clock','hit','chargeA','kx','ky','slow','oiled'])&&e.r===ZOMBIES[e.kind].r&&e.hp>0&&e.hp<=e.maxHp&&['walk','aim'].includes(e.mode));
    const ds=arr=>Array.isArray(arr)&&arr.length<=180&&arr.every(d=>['parts','wire','food','meds','ammo'].includes(d.kind)&&numeric(d,['id','x','y','value','life'])&&d.value>0);
    const bs=arr=>Array.isArray(arr)&&arr.length<=220&&arr.every(b=>numeric(b,['x','y','px','py','vx','vy','life','damage','r','pierce','bounce'])&&b.damage>=0&&Array.isArray(b.hitIds)&&b.hitIds.length<=8);
    if(!es(raw.enemies)||!bs(raw.bullets)||!ds(raw.drops)||!raw.cooldowns||Object.values(raw.cooldowns).some(v=>!Number.isFinite(v))||!raw.rooms||Array.isArray(raw.rooms))return null;
    if(!Number.isInteger(raw.floor)||raw.floor<1||raw.zone==='street'&&raw.floor!==1||raw.zone!=='street'&&raw.floor>houseFromId(raw.zone).floors)return null;
    for(const [id,room] of Object.entries(raw.rooms)){const f=floorInfo(id),layout=f&&roomLayout(f.house,f.floor);if(!f||!Array.isArray(room.nodes)||room.nodes.length!==layout.nodes.length||room.nodes.some((n,i)=>n.id!=='cache-'+i||!numeric(n,['x','y','value'])||n.x!==layout.nodes[i].x||n.y!==layout.nodes[i].y||!['parts','wire','food','meds','ammo'].includes(n.kind)||typeof n.open!=='boolean')||room.enemies!==null&&!es(room.enemies)||!ds(room.drops||[]))return null;}
    if(raw.zone!=='street'&&(!raw.rooms[raw.zone+'@'+raw.floor]||!raw.street||!es(raw.street.enemies)||!bs(raw.street.bullets)||!ds(raw.street.drops)||!numeric(raw.street.hero,['x','y','a'])||!Number.isFinite(raw.street.spawnClock)))return null;
    if(!Array.isArray(raw.caches)||raw.caches.length!==1||raw.caches[0].id!==0||typeof raw.caches[0].open!=='boolean')return null;
    const s=new SurvivalRun(raw.modules,raw.seed);for(const key of Object.keys(s))if(Object.hasOwn(raw,key)&&!['doors','effects','events','convoy'].includes(key))s[key]=raw[key];
    const stats=statsFor(s.modules),max=stats.hp+(s.rogue.levels.armor||0)*25;if(s.player.maxHp!==max||s.player.hp>max)return null;syncStats(s);s.player.capacity=999999;s.effects=[];s.events=[];s.cancelInteract();
    if(streetBlocked(s.player.x,s.player.y,s.player.r)||s.mode==='foot'&&s.blocked(s.hero.x,s.hero.y,s.hero.r))return null;s.doors=districtDoors(s.zone==='street'?s.actor:s.player);return s;
  }
}
