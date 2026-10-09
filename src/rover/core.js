import {WORLD,MAP_REVISION,LEGACY_WORLD,LEGACY2_WORLD,LEGACY_CACHES,LEGACY2_CACHES,DRIVE,ENEMIES,CACHES,terrainBlocked,MODULE_BY_ID,powerOf,clamp,dist,angleTo,angleDelta,statsFor} from './data.js?v=13';
import {newConvoy,attach,detach,logisticsContext,logisticsStep,ramImpacts,convoyTarget,hitTarget,hurtTrailer,cleanConvoy} from './logistics.js?v=13';
import {navigationTarget,roadPoint} from './navigation.js?v=13';
import {newRogue,rank,skill,damageScale,boostCooldown,pickupRadius,syncStats,grantXP,choose,reroll,rogueWeapons,firePrimary,cleanRogue} from './rogue.js?v=13';
import {driveMotion} from './drive.js?v=13';
export const STEP=1/60;
export class Expedition{
  constructor(modules=[],seed=9031){
    this.version=3;this.mapRevision=MAP_REVISION;this.modules=[...modules];this.seed=seed>>>0;this.time=0;this.phase='play';this.result=null;this.rogue=newRogue();this.convoy=newConvoy();this.secured=0;
    const stats=statsFor(modules);this.player={x:WORLD.home.x,y:WORLD.home.y+170,a:0,vx:0,vy:0,r:23,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,capacity:stats.capacity,cargo:0,invuln:0,lastHit:-9,repairUsed:0,boostTime:0,boostCooldown:0};
    this.enemies=[];this.bullets=[];this.effects=[];this.drops=[];this.mortars=[];this.mines=[];this.oil=[];this.events=[];this.caches=CACHES.map(c=>({...c,...roadPoint(this,c),open:false,progress:0}));
    for(const f of this.convoy.freight)Object.assign(f,roadPoint(this,f));
    this.shots=0;this.kills=0;this.damageTaken=0;this.cooldowns={gun:.35,side:0,flame:0};this.spawnClock=3;this.spawnIndex=0;this.id=0;this.fxId=0;this.extract=0;this.interacting=false;this.target=null;this.turretA=0;this.sideA=Math.PI/2;
    for(let i=0;i<6;i++)this.spawnNear(i===5?'spitter':'drone',this.player,310,420);
  }
  random(){this.seed=(Math.imul(1664525,this.seed)+1013904223)>>>0;return this.seed/4294967296;}
  emit(type,x=this.player.x,y=this.player.y,value=0){this.events.push({type,x,y,value});if(this.events.length>40)this.events.shift();}
  effect(type,x,y,life=.3,extra={}){this.effects.push({id:++this.fxId,type,x,y,life,total:life,...extra});if(this.effects.length>100)this.effects.shift();}
  spawn(kind,x,y,elite=false){
    const d=ENEMIES[kind],scale=1+this.time/360;
    const e={id:++this.id,kind,x,y,a:0,r:d.r,hp:d.hp*scale*(elite?2.5:1),maxHp:d.hp*scale*(elite?2.5:1),speed:d.speed*Math.min(1.9,1+this.time/1200)*(elite?1.15:1),elite,born:1,fire:1.8+this.random(),mode:'walk',clock:0,hit:0,chargeA:0,kx:0,ky:0,slow:0,oiled:0};this.enemies.push(e);return e;
  }
  spawnNear(kind,center,min=350,max=480,elite=false){
    if(this.enemies.length>=72)return;for(let i=0;i<40;i++){const a=this.random()*Math.PI*2,d=min+this.random()*(max-min),x=clamp(center.x+Math.sin(a)*d,60,WORLD.w-60),y=clamp(center.y+Math.cos(a)*d,60,WORLD.h-60);if(dist({x,y},center)<min*.8||this.blocked(x,y,ENEMIES[kind].r+4))continue;return this.spawn(kind,x,y,elite);}
  }
  blocked(x,y,r=23){return terrainBlocked(x,y,r);}
  move(e,dx,dy){if(!this.blocked(e.x+dx,e.y,e.r))e.x+=dx;if(!this.blocked(e.x,e.y+dy,e.r))e.y+=dy;}
  nearest(range,angle=null,arc=Math.PI){let target=null,best=range;for(const e of this.enemies){if(e.hp<=0||e.born>0)continue;const d=dist(this.player,e)-e.r;if(d>best||angle!==null&&Math.abs(angleDelta(angle,angleTo(this.player,e)))>arc)continue;best=d;target=e;}return target;}
  hurtEnemy(e,damage){
    if(e.hp<=0)return;const crit=rank(this,'critical')&&this.random()<rank(this,'critical')*.05;if(crit)damage*=2.2;e.hp-=damage;e.hit=.14;
    const a=angleTo(this.player,e);e.kx=Math.sin(a)*3;e.ky=-Math.cos(a)*3;this.effect('hit',e.x,e.y,.16,{critical:!!crit,value:Math.round(damage)});this.emit('impact',e.x,e.y,crit?2:1);
    if(e.hp<=0){this.kills++;this.effect('pop',e.x,e.y,.46,{big:e.kind==='boss'||e.elite,kind:e.kind,a:e.a});this.emit('kill',e.x,e.y,e.elite?2:1);this.player.hp=Math.min(this.player.maxHp,this.player.hp+rank(this,'siphon')*.6);
      this.drop(e.x,e.y,e.kind==='boss'?40:e.elite?18:e.kind==='drone'?4:6,'xp');
      if(e.kind==='boss'){this.rogue.bosses++;this.drop(e.x,e.y,35,'scrap');this.emit('boss');}
      else if(e.elite||this.kills%3===0)this.drop(e.x,e.y,e.elite?12:3,'scrap');
    }
  }
  hurtPlayer(damage){
    const p=this.player;if(p.invuln>0||this.phase!=='play')return;p.lastHit=this.time;p.invuln=.7;
    const absorbed=Math.min(this.rogue.shield,damage);this.rogue.shield-=absorbed;damage-=absorbed;p.hp=Math.max(0,p.hp-damage);this.damageTaken+=damage;this.emit('hurt',p.x,p.y,damage);
    if(rank(this,'thorns'))for(const e of this.enemies)if(dist(p,e)<100+e.r)this.hurtEnemy(e,18*rank(this,'thorns')*damageScale(this));
    if(p.hp<=0)this.finish(false,'车辆损毁');
  }
  drop(x,y,value,kind='scrap'){
    const nearby=this.drops.find(d=>d.kind===kind&&dist(d,{x,y})<45);if(nearby){nearby.value+=value;nearby.life=180;return;}
    if(this.drops.length>=300){const oldest=this.drops.find(d=>d.kind===kind);if(oldest){oldest.value+=value;return;}}
    this.drops.push({id:++this.id,x,y,value,kind,life:180});
  }
  addCargo(value){const n=Math.max(0,Math.min(value,999999-this.player.cargo));this.player.cargo+=n;if(n)this.emit('loot',this.player.x,this.player.y,n);return n;}
  choose(id){return choose(this,id);}
  reroll(){return reroll(this);}
  detach(){return this.phase==='play'&&detach(this);}
  context(){
    if(dist(this.player,WORLD.home)<WORLD.home.r&&(this.player.cargo>0||this.secured>0||this.rogue.level>1))return{kind:'extract',name:'撤离',duration:3.5,progress:this.extract,ready:true};
    return logisticsContext(this);
  }
  startInteract(){const c=this.context();if(!c||c.ready===false)return false;this.interacting=true;this.target=c.kind==='extract'?'home':'freight:'+c.id;return true;}
  boost(){
    const p=this.player;if(this.phase!=='play'||p.boostCooldown>0||this.rogue.offer.length)return false;p.boostTime=DRIVE.boostTime;p.boostCooldown=boostCooldown(this);p.invuln=Math.max(p.invuln,DRIVE.boostTime);this.convoy.boostId++;this.cancelInteract();this.emit('boost');
    if(rank(this,'nova')){const r=130+rank(this,'nova')*12;for(const e of this.enemies)if(dist(p,e)<r+e.r)this.hurtEnemy(e,(35+rank(this,'nova')*12)*damageScale(this));this.effect('nova',p.x,p.y,.35,{radius:r});this.emit('ram');}return true;
  }
  cancelInteract(){this.interacting=false;this.target=null;this.extract=0;for(const f of [...this.convoy.freight,...this.convoy.loose])f.progress=0;}
  finish(success,reason=success?'撤离成功':'结束生存'){
    if(this.phase!=='play')return;this.phase=success?'won':'lost';this.interacting=false;
    const reward=this.secured+(success?this.player.cargo:Math.floor(this.player.cargo*.35));
    this.result={success,reason,reward,cargo:this.player.cargo,kills:this.kills,time:Math.round(this.time),boss:this.rogue.bosses>0,bosses:this.rogue.bosses,level:this.rogue.level,peak:this.convoy.peak};this.emit(success?'win':'lose');
  }
  shoot(source,a,damage,speed=470,kind='bullet',enemy=false){
    const side=kind==='side',localX=side?26:0,localY=side?3:kind==='trailer'?-7:4,body=source.a||0;
    const origin={x:source.x+(enemy?0:Math.cos(body)*localX-Math.sin(body)*localY),y:source.y+(enemy?0:Math.sin(body)*localX+Math.cos(body)*localY)},muzzle=enemy?25:20,x=origin.x+Math.sin(a)*muzzle,y=origin.y-Math.cos(a)*muzzle;
    this.bullets.push({x,y,px:x,py:y,vx:Math.sin(a)*speed,vy:-Math.cos(a)*speed,life:enemy?2.2:1.05,damage,r:enemy?7:4,kind,enemy,hitIds:[],pierce:0,bounce:0});this.shots+=enemy?0:1;this.effect('muzzle',x,y,.09,{a,kind,enemy});
  }
  spawnWave(){
    const count=Math.min(6,2+Math.floor(this.time/90)),pattern=this.time<45?['drone','drone','raider']:['drone','raider','spitter','drone','ram','raider'];
    for(let i=0;i<count;i++)this.spawnNear(pattern[this.spawnIndex++%pattern.length],this.player);
  }
  step(dt=STEP,input={x:0,y:0}){
    if(this.phase!=='play'||this.rogue.offer.length)return;dt=clamp(dt,0,.04);this.time+=dt;const p=this.player;
    p.invuln=Math.max(0,p.invuln-dt);p.boostTime=Math.max(0,p.boostTime-dt);p.boostCooldown=Math.max(0,p.boostCooldown-dt);const magnitude=Math.min(1,Math.hypot(input.x||0,input.y||0)),moving=magnitude>.02;
    if(moving)this.cancelInteract();const speed=p.speed*(p.boostTime>0?DRIVE.boostMultiplier:1)*(1-this.convoy.trailers.length*.035),motion=driveMotion(p,input,dt,speed),before={x:p.x,y:p.y};this.move(p,motion.x,motion.y);
    // A blocked wheel does not accumulate a hidden push into the wall.
    if(Math.abs(motion.x)>1e-8&&p.x===before.x)p.vx=0;if(Math.abs(motion.y)>1e-8&&p.y===before.y)p.vy=0;
    if(this.modules.includes('repair')&&this.time-p.lastHit>5&&p.repairUsed<50&&p.hp<p.maxHp){const v=Math.min(dt,50-p.repairUsed,p.maxHp-p.hp);p.hp+=v;p.repairUsed+=v;}
    if(this.interacting){const c=this.context(),target=c?.kind==='extract'?'home':'freight:'+c?.id;if(!c||target!==this.target)this.cancelInteract();else if(!moving){if(c.kind==='extract'){this.extract+=dt;if(this.extract>=c.duration)this.finish(true);}else{const f=[...this.convoy.freight,...this.convoy.loose].find(f=>!f.claimed&&f.id===c.id);f.progress=(f.progress||0)+dt;if(f.progress>=c.duration){attach(this,f);this.cancelInteract();}}}}
    if(this.phase!=='play')return;logisticsStep(this,dt);ramImpacts(this);
    this.spawnClock-=dt;if(this.spawnClock<=0){this.spawnWave();this.spawnClock=Math.max(1.25,3.8-this.time/300);}
    this.rogue.eliteClock-=dt;if(this.rogue.eliteClock<=0){this.spawnNear(this.time%150<75?'ram':'raider',p,450,550,true);this.rogue.eliteClock=75;}
    if(this.time>=this.rogue.nextBoss){if(!this.enemies.some(e=>e.kind==='boss')){const boss=this.spawnNear('boss',p,430,560);if(boss){boss.born=2;this.emit('boss-start');}}this.rogue.nextBoss+=180;}
    for(const key of Object.keys(this.cooldowns))this.cooldowns[key]-=dt;
    const target=this.nearest(270+rank(this,'longshot')*45);if(target){this.turretA=angleTo(p,target);if(this.cooldowns.gun<=0)firePrimary(this,target);}
    if(this.modules.includes('side')){const e=this.nearest(245,p.a+Math.PI/2,.7);this.sideA=e?angleTo(p,e):p.a+Math.PI/2;if(e&&this.cooldowns.side<=0){this.shoot(p,this.sideA,20*damageScale(this),490,'side');this.cooldowns.side=.65;this.emit('cannon');}}
    if(this.modules.includes('drill'))for(const e of this.enemies)if(e.born<=0&&dist(p,e)<p.r+e.r+25&&Math.abs(angleDelta(p.a,angleTo(p,e)))<.85)this.hurtEnemy(e,35*dt*damageScale(this));
    if(this.modules.includes('flame')&&this.cooldowns.flame<=0){const targets=this.enemies.filter(e=>e.born<=0&&dist(p,e)-e.r<125&&Math.abs(angleDelta(p.a+Math.PI,angleTo(p,e)))<.8);if(targets.length){for(const e of targets)this.hurtEnemy(e,13*damageScale(this));this.effect('flame',p.x,p.y,.24,{a:p.a+Math.PI});this.emit('flame');this.cooldowns.flame=.22;}}
    rogueWeapons(this,dt);
    for(const e of this.enemies){
      e.hit=Math.max(0,e.hit-dt);e.kx*=Math.exp(-dt*22);e.ky*=Math.exp(-dt*22);e.slow=Math.max(0,e.slow-dt);e.oiled=Math.max(0,e.oiled-dt);
      if(e.hp<=0)continue;if(e.born>0){e.born-=dt;continue;}
      const prey=convoyTarget(this,e),d=dist(prey,e),a=angleTo(e,prey);e.a+=angleDelta(e.a,e.mode==='charge'?e.chargeA:a)*(1-Math.exp(-dt*6));e.fire-=dt;let speed=e.speed*(e.slow>0?.55:e.oiled>0?.6:1),walk=true;
      if(e.kind==='spitter'){if(d<170)speed=-speed*.8;else if(d<245)walk=false;if(d<330&&e.fire<=0&&e.mode!=='aim'){e.mode='aim';e.clock=.65;e.fire=2.8;e.chargeA=a;}if(e.mode==='aim'){walk=false;e.clock-=dt;if(e.clock<=0){this.shoot(e,e.chargeA,10,190,'acid',true);e.mode='walk';}}}
      if(e.kind==='ram'){if(e.mode==='walk'&&e.fire<=0&&d<330){e.mode='aim';e.clock=.85;e.chargeA=a;e.fire=4.5;}if(e.mode==='aim'){walk=false;e.clock-=dt;if(e.clock<=0){e.mode='charge';e.clock=.8;}}else if(e.mode==='charge'){e.clock-=dt;this.move(e,Math.sin(e.chargeA)*270*dt,-Math.cos(e.chargeA)*270*dt);walk=false;if(e.clock<=0){e.mode='rest';e.clock=1;}}else if(e.mode==='rest'){walk=false;e.clock-=dt;if(e.clock<=0)e.mode='walk';}}
      if(e.kind==='boss'&&e.fire<=0){e.fire=3.5;for(let i=0;i<3;i++){const a=i*Math.PI*2/3;this.mortars.push({x:clamp(p.x+Math.sin(a)*65,80,WORLD.w-80),y:clamp(p.y+Math.cos(a)*65,80,WORLD.h-80),clock:1.3,total:1.3,r:42});}}
      if(walk&&d>e.r+prey.r-3){const route=speed>0?navigationTarget(this,e,prey):prey,a=angleTo(e,route);this.move(e,Math.sin(a)*speed*dt,-Math.cos(a)*speed*dt);}
      if(d<e.r+prey.r-2)hitTarget(this,prey,ENEMIES[e.kind].damage);
    }
    for(let i=0;i<this.enemies.length;i++)for(let j=i+1;j<this.enemies.length;j++){const a=this.enemies[i],b=this.enemies[j],d=dist(a,b),min=(a.r+b.r)*.8;if(d>0&&d<min){const n=(min-d)*.035;this.move(a,(a.x-b.x)/d*n,(a.y-b.y)/d*n);this.move(b,-(a.x-b.x)/d*n,-(a.y-b.y)/d*n);}}
    for(const b of this.bullets){
      if(b.kind==='rocket'){const e=this.enemies.filter(e=>e.hp>0&&e.born<=0).sort((a,c)=>dist(a,b)-dist(c,b))[0];if(e){const a=angleTo(b,e),v=Math.hypot(b.vx,b.vy),t=1-Math.exp(-dt*8);b.vx+=(Math.sin(a)*v-b.vx)*t;b.vy+=(-Math.cos(a)*v-b.vy)*t;}}
      b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
      if(this.blocked(b.x,b.y,2)){b.life=0;if(b.kind==='rocket')this.blast(b);continue;}
      if(b.kind==='mortar'&&b.life<=0){this.blast(b);continue;}
      if(b.enemy){for(const t of [p,...this.convoy.trailers])if(dist(b,t)<t.r+b.r){hitTarget(this,t,b.damage);b.life=0;break;}}
      else for(const e of this.enemies){if(e.hp<=0||e.born>0||b.hitIds.includes(e.id)||dist(b,e)>=e.r+b.r)continue;if(['rocket','mortar'].includes(b.kind)){this.blast(b);b.life=0;break;}this.hurtEnemy(e,b.damage);b.hitIds.push(e.id);
        if(b.pierce>0){b.pierce--;break;}const next=b.bounce>0?this.enemies.filter(t=>t.hp>0&&t.born<=0&&!b.hitIds.includes(t.id)&&dist(e,t)<180).sort((a,c)=>dist(a,e)-dist(c,e))[0]:null;
        if(next){b.bounce--;const a=angleTo(b,next),speed=Math.hypot(b.vx,b.vy);b.vx=Math.sin(a)*speed;b.vy=-Math.cos(a)*speed;b.life=Math.min(1.2,b.life+.25);}else b.life=0;break;
      }
    }
    for(const m of this.mortars){m.clock-=dt;if(m.clock<=0){if(dist(m,p)<m.r+p.r)this.hurtPlayer(18);for(const t of [...this.convoy.trailers])if(dist(m,t)<m.r+t.r)hurtTrailer(this,t,18);this.effect('blast',m.x,m.y,.4);}}
    for(const c of this.caches)if(!c.open&&dist(p,c)<48){c.open=true;this.addCargo(c.value);grantXP(this,6);this.effect('loot',c.x,c.y,.5);}
    for(const d of this.drops){d.life-=dt;const distance=dist(d,p);if(distance<pickupRadius(this)){const n=Math.min(distance,(d.kind==='xp'?370:260)*dt);d.x+=(p.x-d.x)/(distance||1)*n;d.y+=(p.y-d.y)/(distance||1)*n;if(distance<27){if(d.kind==='xp')grantXP(this,d.value);else this.addCargo(d.value);d.value=0;}}}
    for(const fx of this.effects)fx.life-=dt;
    this.effects=this.effects.filter(f=>f.life>0);this.mortars=this.mortars.filter(m=>m.clock>0);this.bullets=this.bullets.filter(b=>b.life>0).slice(-240);this.enemies=this.enemies.filter(e=>e.hp>0);this.drops=this.drops.filter(d=>d.value>0&&d.life>0);
  }
  blast(b){for(const e of this.enemies)if(e.born<=0&&dist(e,b)<105+e.r)this.hurtEnemy(e,b.damage);this.effect('blast',b.x,b.y,.4);this.emit('kill',b.x,b.y,2);}
  snapshot(){return JSON.parse(JSON.stringify({...this,events:[],effects:[]}));}
  static restore(raw){
    // Restoration must not share live actor/cooldown objects with the serialized input.
    try{raw=structuredClone(raw);}catch{return null;}
    if(!raw||![1,2,3].includes(raw.version)||raw.phase!=='play'||!raw.player||!Number.isFinite(raw.time)||raw.time<0||raw.time>86400||!Array.isArray(raw.modules)||raw.modules.some(id=>!MODULE_BY_ID[id])||new Set(raw.modules).size!==raw.modules.length||powerOf(raw.modules)>4)return null;
    const finite=(v,keys)=>v&&keys.every(k=>Number.isFinite(v[k]));
    if(Object.hasOwn(raw,'fxId')&&(!Number.isSafeInteger(raw.fxId)||raw.fxId<0)||Object.hasOwn(raw,'sideA')&&!Number.isFinite(raw.sideA))return null;
    if(!finite(raw.player,['x','y','a','vx','vy','hp','maxHp','speed','cargo','capacity','r','lastHit','invuln','repairUsed'])||raw.player.hp<=0||raw.player.cargo<0||raw.player.cargo>999999)return null;
    if(!Array.isArray(raw.enemies)||raw.enemies.length>80||!raw.enemies.every(e=>ENEMIES[e.kind]&&finite(e,['id','x','y','a','r','hp','maxHp','speed','born','fire','clock','hit','chargeA'])&&['walk','aim','charge','rest'].includes(e.mode))||!Array.isArray(raw.bullets)||raw.bullets.length>300||!raw.bullets.every(b=>finite(b,['x','y','px','py','vx','vy','life','damage','r'])&&b.damage>=0)||!Array.isArray(raw.caches)||!Array.isArray(raw.drops)||raw.drops.length>300||!Array.isArray(raw.mortars)||raw.mortars.length>20||!finite(raw,['seed','id','spawnClock','spawnIndex','shots','kills','damageTaken','turretA'])||!finite(raw.cooldowns,['gun','side','flame']))return null;
    if(raw.mapRevision!==undefined&&(!Number.isSafeInteger(raw.mapRevision)||raw.mapRevision<1||raw.mapRevision>MAP_REVISION))return null;
    const fresh=new Expedition(raw.modules,raw.seed),legacy=raw.version<3;
    if(legacy){
      const bases=raw.version===1?LEGACY_CACHES:LEGACY2_CACHES,bounds=raw.version===1?LEGACY_WORLD:LEGACY2_WORLD;
      if(raw.caches.length!==bases.length||raw.player.x<0||raw.player.x>bounds.w||raw.player.y<0||raw.player.y>bounds.h||!raw.caches.every((c,i)=>c.id===i&&c.x===bases[i].x&&c.y===bases[i].y&&finite(c,['value','progress'])))return null;
      fresh.time=raw.time;fresh.player.hp=Math.min(fresh.player.maxHp,raw.player.hp);fresh.player.cargo=raw.player.cargo;fresh.kills=raw.kills;fresh.shots=raw.shots;fresh.damageTaken=raw.damageTaken;fresh.secured=Math.max(0,Math.min(999999,raw.convoy?.secured||0));
      fresh.rogue.bosses=raw.convoy?.bosses||Number(raw.bossKilled)||0;fresh.rogue.nextBoss=(Math.floor(raw.time/180)+1)*180;
      const used=new Set();for(const old of [...(raw.convoy?.trailers||[]),...(raw.convoy?.loose||[]),...(raw.convoy?.depots||[]).flatMap(d=>d.pending||[])]){
        const f=fresh.convoy.freight.find(f=>f.kind===old.kind&&!used.has(f.id));if(!f)continue;used.add(f.id);f.hp=Number.isFinite(old.hp)?clamp(old.hp,1,100):100;attach(fresh,f);if(fresh.convoy.trailers.length>=4)break;
      }return fresh;
    }
    const rogue=cleanRogue(raw.rogue),convoy=cleanConvoy(raw.convoy);if(!rogue||!convoy||raw.caches.length!==CACHES.length||!raw.caches.every((c,i)=>c.id===i&&finite(c,['x','y','value','progress'])&&c.x===fresh.caches[i].x&&c.y===fresh.caches[i].y)||!raw.drops.every(d=>['xp','scrap'].includes(d.kind)&&finite(d,['id','x','y','value','life'])&&d.value>0)||!raw.mortars.every(m=>finite(m,['x','y','clock','total','r']))||!Array.isArray(raw.mines)||raw.mines.length>24||!raw.mines.every(m=>finite(m,['x','y','life','arm']))||!Array.isArray(raw.oil)||raw.oil.length>22||!raw.oil.every(o=>finite(o,['x','y','life'])))return null;
    for(const key of Object.keys(fresh))if(Object.hasOwn(raw,key)&&!['rogue','convoy','version','mapRevision'].includes(key))fresh[key]=raw[key];fresh.rogue=rogue;fresh.convoy=convoy;
    fresh.player={boostTime:0,boostCooldown:0,...fresh.player};if(!finite(fresh.player,['boostTime','boostCooldown'])||fresh.player.boostTime<0||fresh.player.boostCooldown<0||Object.values(fresh.cooldowns).some(v=>!Number.isFinite(v)))return null;
    const savedSpeed=raw.player.speed,savedMax=raw.player.maxHp;syncStats(fresh);if(Math.abs(savedSpeed-fresh.player.speed)>.001||savedMax!==fresh.player.maxHp||raw.player.hp>fresh.player.maxHp||raw.player.x<23||raw.player.x>WORLD.w-23||raw.player.y<23||raw.player.y>WORLD.h-23||raw.player.r!==23||!Number.isFinite(raw.secured)||raw.secured<0)return null;
    for(const b of fresh.bullets){if(!Array.isArray(b.hitIds)||b.hitIds.length>20||!Number.isSafeInteger(b.pierce)||b.pierce<0||b.pierce>4||!Number.isSafeInteger(b.bounce)||b.bounce<0||b.bounce>4)return null;}
    if(raw.mapRevision!==MAP_REVISION){
      // Preserve an active v8 run. Only actors covered by the newly painted roof move to a safe road.
      for(const actor of [fresh.player,...fresh.enemies,...fresh.convoy.trailers,...fresh.convoy.loose,...fresh.convoy.freight])if(fresh.blocked(actor.x,actor.y,actor.r)){
        Object.assign(actor,roadPoint(fresh,actor));if(actor===fresh.player){actor.vx=actor.vy=0;}
      }
    }
    fresh.events=[];fresh.effects=[];fresh.result=null;fresh.cancelInteract();return fresh;
  }
}
