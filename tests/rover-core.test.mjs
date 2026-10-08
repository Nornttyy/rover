import test from 'node:test';
import assert from 'node:assert/strict';
import {Expedition,STEP} from '../src/rover/core.js';
import {WORLD,ISLANDS,DRIVE,dist,newProfile,purchase,equip,cleanProfile,powerOf,MODULES} from '../src/rover/data.js';
import {UPGRADES,grantXP,rank,syncStats,pickupRadius,gunInterval} from '../src/rover/rogue.js';
const advance=(s,seconds,input={x:0,y:0},pick=true)=>{for(let i=0;i<Math.ceil(seconds/STEP)&&s.phase==='play';i++){if(pick&&s.rogue.offer.length)s.choose(s.rogue.offer[0]);s.step(STEP,input);}};
test('new prices charge the exact purchase boundary, never recharge existing gear or invalidate an older inventory',()=>{
  const p=newProfile(),cargo=MODULES.find(m=>m.id==='cargo');assert.equal(cargo.cost,180);assert.equal(Math.max(...MODULES.map(m=>m.cost)),850);
  p.bank=cargo.cost-1;assert.equal(purchase(p,'cargo'),false);assert.equal(p.bank,179);assert.deepEqual(p.owned,[]);
  p.bank=cargo.cost;assert.equal(purchase(p,'cargo'),true);assert.equal(p.bank,0);assert.equal(purchase(p,'cargo'),false);
  const old=cleanProfile({...newProfile(),bank:40,owned:['cargo','armor','rocket'],equipped:['cargo','armor','rocket']});assert.equal(old.bank,40);assert.deepEqual(old.owned,['cargo','armor','rocket']);assert.deepEqual(old.equipped,['cargo','armor','rocket']);assert.equal(purchase(old,'rocket'),false);assert.equal(old.bank,40);
});
function quiet(modules=[]){const s=new Expedition(modules);s.enemies=[];s.spawnClock=9999;s.rogue.nextBoss=9999;s.rogue.eliteClock=9999;s.caches.forEach(c=>c.open=true);s.convoy.freight.forEach(f=>f.grace=9999);return s;}
function enemy(s,x=100,y=0,kind='ram'){const e=s.spawn(kind,s.player.x+x,s.player.y+y);e.born=0;e.speed=0;e.fire=999;return e;}
function cards(s,levels){s.rogue.levels={...levels};syncStats(s);s.cooldowns.gun=999;}
test('balance: twelve unmodified-car runs choose offered cards and fight the timed boss with real driving',()=>{const priority=['rocket','arc','laser','repair','armor','blade','mine','shield','twin','rapid','magnet','power'];let survivors=0,bosses=0;for(let seed=1;seed<=12;seed++){const s=new Expedition([],seed);for(let i=0;i<14000&&s.phase==='play';i++){if(s.rogue.offer.length)s.choose([...s.rogue.offer].sort((a,b)=>(priority.indexOf(a)<0?99:priority.indexOf(a))-(priority.indexOf(b)<0?99:priority.indexOf(b)))[0]);const a=s.time*.65,target={x:3200+Math.sin(a)*150,y:3520+Math.cos(a)*150},d=dist(target,s.player);s.step(STEP,{x:(target.x-s.player.x)/d,y:(target.y-s.player.y)/d});if(s.player.boostCooldown===0&&s.enemies.some(e=>dist(e,s.player)<85))s.boost();assert.ok(s.enemies.length<=72&&s.bullets.length<=240);}survivors+=s.time>=232;bosses+=s.rogue.bosses>0;}assert.ok(survivors>=8,survivors+'/12 survive');assert.ok(bosses>=8,bosses+'/12 defeat boss');});

test('large irregular map: all pickups and garage reachable from the same road network',()=>{
  const s=new Expedition();assert.equal(WORLD.w,6144);assert.equal(WORLD.h,6144);assert.ok(ISLANDS.length>=20);assert.ok(ISLANDS.some(p=>p.length>4));assert.equal(s.caches.length,36);assert.equal(s.convoy.freight.length,44);
  const points=[...s.caches,...s.convoy.freight,WORLD.home,...s.enemies,s.player];for(const p of points)assert.equal(s.blocked(p.x,p.y,25),false,JSON.stringify(p));
  const size=48,cols=WORLD.w/size,cell=p=>Math.floor(p.y/size)*cols+Math.floor(p.x/size),seen=new Set([cell(WORLD.home)]),queue=[cell(WORLD.home)];
  for(let i=0;i<queue.length;i++){const k=queue[i],x=k%cols,y=Math.floor(k/cols);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*cols+nx;if(nx<0||ny<0||nx>=cols||ny>=cols||seen.has(n)||s.blocked((nx+.5)*size,(ny+.5)*size,29))continue;seen.add(n);queue.push(n);}}
  for(const p of points){const x=Math.floor(p.x/size),y=Math.floor(p.y/size);assert.ok([[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((y+dy)*cols+x+dx)),JSON.stringify(p));}
  assert.equal(s.blocked(WORLD.home.x,WORLD.home.y-210),true);assert.equal(s.blocked(WORLD.home.x,WORLD.home.y),false);
});
test('crates are drive-over, one-time pickups; no parking task or cargo-cap soft lock',()=>{const s=quiet(),c=s.caches[0];c.open=false;s.player.x=c.x;s.player.y=c.y;s.player.cargo=90;s.step();assert.equal(c.open,true);assert.equal(s.player.cargo,102);assert.equal(s.rogue.xp,6);s.step();assert.equal(s.player.cargo,102);assert.equal(s.rogue.xp,6);});
test('damage immunity, capped permanent repair and charged shields operate independently',()=>{
  const s=quiet(['repair']);s.hurtPlayer(40);s.hurtPlayer(40);assert.equal(s.player.hp,90);advance(s,4.8);assert.equal(s.player.hp,90);advance(s,35);assert.ok(s.player.hp>120);s.hurtPlayer(100);advance(s,100);assert.ok(s.player.repairUsed<=50);assert.ok(s.player.hp<90);
  const t=quiet();cards(t,{shield:2});t.rogue.shield=50;t.hurtPlayer(30);assert.equal(t.player.hp,130);assert.equal(t.rogue.shield,20);advance(t,5);assert.ok(t.rogue.shield>25);
});
test('short dash responds immediately, has single-activation impacts, and cannot cross garage roof',()=>{const a=quiet(),b=quiet();a.boost();assert.equal(a.boost(),false);advance(a,.6,{x:0,y:-1});advance(b,.6,{x:0,y:-1});assert.ok(b.player.y-a.player.y>70);advance(a,DRIVE.boostCooldown);assert.equal(a.boost(),true);a.player.x=WORLD.home.x;a.player.y=WORLD.home.y-120;advance(a,1,{x:0,y:-1});assert.ok(a.player.y>=WORLD.home.y-140);});
test('side cannon needs its right arc; flame attacks behind and drill needs frontal contact',()=>{
  function actor(modules,x,y){const s=quiet(modules);s.cooldowns.gun=999;return{s,e:enemy(s,x,y,'drone')};}
  const right=actor(['side'],140,0);advance(right.s,.1);assert.equal(right.s.shots,1);const left=actor(['side'],-140,0);advance(left.s,.1);assert.equal(left.s.shots,0);
  const behind=actor(['flame'],0,80);advance(behind.s,.1);assert.equal(behind.e.hp,35);const front=actor(['flame'],0,-80);advance(front.s,.1);assert.equal(front.e.hp,48);const drill=actor(['drill'],0,-55);advance(drill.s,.5);assert.ok(drill.e.hp<33);
});
test('charge locks warning direction; spitter and boss attacks remain telegraphed',()=>{
  const s=quiet();s.cooldowns.gun=999;const e=enemy(s,0,-200);e.fire=0;s.step();assert.equal(e.mode,'aim');const a=e.chargeA;s.player.x+=70;advance(s,.86);assert.equal(e.mode,'charge');assert.equal(e.chargeA,a);
  const r=quiet();r.cooldowns.gun=999;const spit=enemy(r,0,-190,'spitter');spit.fire=0;r.step();assert.equal(r.bullets.length,0);advance(r,.7);assert.ok(r.bullets.some(b=>b.enemy));
  const b=quiet();b.cooldowns.gun=999;const tank=enemy(b,0,-250,'boss');tank.fire=0;b.step();assert.equal(b.mortars.length,3);assert.ok(b.mortars.every(m=>m.clock>1));
});
test('26 capped card types offer unique choices; pending choice freezes time, effects and steering',()=>{
  assert.equal(UPGRADES.length,26);const a=quiet(),b=quiet();grantXP(a,8);grantXP(b,8);assert.deepEqual(a.rogue.offer,b.rogue.offer);assert.equal(new Set(a.rogue.offer).size,3);assert.equal(a.rogue.level,2);const raw=a.snapshot();advance(a,2,{x:1,y:0},false);assert.deepEqual(a.snapshot(),raw);assert.equal(a.choose('fake'),false);const id=a.rogue.offer[0];assert.equal(a.choose(id),true);assert.equal(rank(a,id),1);assert.equal(a.choose(id),false);advance(a,.1);assert.ok(a.time>0);
});
test('XP requires collection, queues levels and survives a choice-screen reload',()=>{
  const s=quiet(),e=enemy(s,220,0,'drone');s.hurtEnemy(e,100);assert.equal(s.rogue.xp,0);assert.equal(s.drops[0].kind,'xp');advance(s,1);assert.equal(s.rogue.xp,0);s.player.x=e.x;advance(s,.2);assert.equal(s.rogue.xp,4);
  grantXP(s,50);const r=Expedition.restore(s.snapshot());assert.ok(r);assert.deepEqual(r.rogue.offer,s.rogue.offer);const old=s.rogue.level;s.choose(s.rogue.offer[0]);assert.equal(s.rogue.level,old+1);assert.equal(s.rogue.offer.length,3);
});
test('reroll is once per run and introduces another option whenever cards remain',()=>{const s=quiet();grantXP(s,8);const old=s.rogue.offer;assert.ok(s.reroll());assert.ok(s.rogue.offer.some(id=>!old.includes(id)));assert.equal(s.reroll(),false);});
test('exhausted build gets repeatable emergency supply rather than exceeding card caps',()=>{const s=quiet();s.rogue.levels=Object.fromEntries(UPGRADES.filter(u=>u.id!=='supply').map(u=>[u.id,u.max]));grantXP(s,8);assert.deepEqual(s.rogue.offer,['supply']);s.player.hp=10;s.choose('supply');assert.ok(s.player.hp>10);});
test('multishot, piercing and ricochet modify real projectiles, not just displayed damage',()=>{const s=quiet();cards(s,{twin:2,pierce:1,bounce:1,rapid:2});s.cooldowns.gun=0;enemy(s,200,0);s.step();assert.equal(s.bullets.length,3);assert.ok(s.bullets.every(b=>b.pierce===1&&b.bounce===1));assert.ok(new Set(s.bullets.map(b=>b.vy)).size>1);assert.ok(gunInterval(s)<DRIVE.gunInterval);});
test('arc chains distinct enemies; laser pierces targets; frost and oil slow pursuit',()=>{
  const a=quiet();cards(a,{arc:1});const list=[enemy(a,90),enemy(a,160),enemy(a,230)];a.step();assert.ok(list.every(e=>e.hp===89));assert.equal(a.effects.find(f=>f.type==='arc').points.length,4);
  const l=quiet();cards(l,{laser:1});const front=enemy(l,90),back=enemy(l,200);l.step();assert.equal(front.hp,78);assert.equal(back.hp,78);assert.ok(l.effects.some(f=>f.type==='laser'));
  const f=quiet();cards(f,{frost:1,oil:1});const foe=enemy(f,100);f.step(STEP,{x:1,y:0});assert.ok(foe.slow>2);assert.ok(f.oil.length===1);assert.ok(f.effects.some(f=>f.type==='frost'));
});
test('distinct weapons: orbiting blade, moving mines, homing rocket, mortar and drone',()=>{
  const blade=quiet();cards(blade,{blade:1});const close=enemy(blade,90);blade.step();assert.equal(close.hp,93);
  const mine=quiet();cards(mine,{mine:1});mine.step(STEP,{x:1,y:0});assert.equal(mine.mines.length,1);const m=mine.mines[0],foe=enemy(mine,m.x-mine.player.x,m.y-mine.player.y);advance(mine,.5);assert.ok(foe.hp<115);assert.equal(mine.mines.length,0);
  const r=quiet();cards(r,{rocket:2,mortar:1,drone:1});enemy(r,250,70);r.step();assert.equal(r.bullets.filter(b=>b.kind==='rocket').length,2);assert.ok(r.bullets.some(b=>b.kind==='mortar'));assert.ok(r.bullets.some(b=>b.kind==='drone'));const shot=r.bullets.find(b=>b.kind==='rocket'),vx=shot.vx;r.enemies[0].y-=50;r.step();assert.notEqual(shot.vx,vx);
});
test('optional extraction takes 3.5 seconds; steering cancels; failure keeps 35%; result is once',()=>{
  const s=quiet();s.player.x=WORLD.home.x;s.player.y=WORLD.home.y;assert.equal(s.context(),null);s.player.cargo=100;assert.ok(s.startInteract());advance(s,1);assert.ok(s.extract>.9);s.step(STEP,{x:1,y:0});assert.equal(s.extract,0);assert.equal(s.interacting,false);assert.ok(s.startInteract());advance(s,3.6);assert.equal(s.phase,'won');assert.equal(s.result.reward,100);const raw=s.snapshot();s.finish(false);advance(s,2);assert.deepEqual(s.snapshot(),raw);
  const f=quiet();f.player.cargo=100;f.finish(false);assert.equal(f.result.reward,35);
});
test('no delivery objectives, fuel countdown or forced end; bosses arrive on survival clock',()=>{
  const s=quiet();assert.equal('depots' in s.convoy,false);assert.equal('fuel' in s,false);s.time=179.98;s.rogue.nextBoss=180;s.step(.04);assert.ok(s.enemies.some(e=>e.kind==='boss'));assert.equal(s.rogue.nextBoss,360);s.enemies=[];s.time=539.98;s.rogue.nextBoss=540;s.step(.04);assert.ok(s.enemies.some(e=>e.kind==='boss'));assert.equal(s.phase,'play');
});
test('snapshot resumes deterministic upgraded combat and rejects corrupted or forged state',()=>{
  const s=new Expedition(['laser','armor']);advance(s,12,{x:.1,y:1});const raw=s.snapshot(),r=Expedition.restore(raw);assert.ok(r);for(let i=0;i<600;i++){if(s.rogue.offer.length){const id=s.rogue.offer[0];s.choose(id);r.choose(id);}s.step(STEP,{x:.2,y:-1});r.step(STEP,{x:.2,y:-1});}assert.deepEqual(r.snapshot(),s.snapshot());assert.equal(typeof Expedition.restore({...raw,step:'bad'}).step,'function');
  for(const change of [v=>v.modules=['imaginary'],v=>v.enemies=[{kind:'unknown'}],v=>v.player.hp=999,v=>v.caches=[],v=>v.drops=null,v=>v.rogue.levels.fake=1,v=>v.cooldowns.mine=Infinity,v=>v.player.boostTime=NaN]){const bad=structuredClone(raw);change(bad);assert.equal(Expedition.restore(bad),null);}
});
test('12 permanent equipment choices preserve bank, power budget and old inventory',()=>{assert.equal(MODULES.length,12);const p=newProfile();assert.equal(purchase(p,'side'),false);p.bank=MODULES.reduce((n,m)=>n+m.cost,0);assert.ok(purchase(p,'side'));assert.ok(purchase(p,'flame'));assert.equal(powerOf(p.equipped),4);const bank=p.bank;assert.equal(purchase(p,'side'),false);assert.equal(p.bank,bank);purchase(p,'laser');assert.equal(equip(p,'laser'),false);equip(p,'flame');assert.equal(equip(p,'laser'),true);assert.deepEqual(cleanProfile({...p,owned:[...p.owned,'bad'],equipped:['side','flame','armor','bad']}).equipped,['side','flame']);const s=quiet(['cargo']);assert.equal(pickupRadius(s),200);});
test('idle car is not invincible; enemies, projectiles and effects remain bounded',()=>{const s=new Expedition();for(let i=0;i<18000&&s.phase==='play';i++){if(s.rogue.offer.length)s.choose(s.rogue.offer[0]);s.step();assert.ok(s.enemies.length<=72);assert.ok(s.bullets.length<=240);assert.ok(s.effects.length<=100);assert.ok(s.drops.length<=300);}assert.equal(s.phase,'lost');assert.ok(s.time<300);});
