import test from 'node:test';
import assert from 'node:assert/strict';
import {SurvivalRun} from '../src/rover/survival.js';
import {TOWN,HORDE,RIG_MODS,fieldPrice,districtDoors,streetBlocked} from '../src/rover/survival-data.js';

function quiet(){const s=new SurvivalRun();s.enemies=[];s.spawnClock=99999;return s;}
function tick(s,seconds){for(let i=0;i<Math.ceil(seconds*60);i++)s.step(1/60);}
function startWave(s){s.horde.clock=s.horde.nextAt-.01;s.time=Math.max(s.time,s.horde.clock);tick(s,.02);}
function clearWave(s){for(let i=0;i<200&&s.horde.phase==='active';i++){for(const e of s.enemies)s.hurtEnemy(e,999999);s.time+=.04;s.tickHorde(.04);}}

test('home is no longer an extraction target and does not end survival',()=>{
  const s=quiet();Object.assign(s.player,{x:TOWN.home.x,y:TOWN.home.y});s.player.cargo=100;s.visits=1;
  assert.equal(s.context(),null);assert.equal(s.startInteract(),false);tick(s,5);assert.equal(s.phase,'play');assert.equal(s.result,null);
});
test('waves warn, spawn in batches, grow and clear only after actual kills',()=>{
  const s=quiet();s.horde.clock=HORDE.first-HORDE.warning-.02;s.time=s.horde.clock;tick(s,.04);
  assert.equal(s.horde.phase,'warning');assert.equal(s.horde.index,0);assert.equal(s.enemies.length,0);assert.equal(s.events.filter(e=>e.type==='horde-warning').length,1);
  startWave(s);assert.equal(s.horde.phase,'active');assert.equal(s.horde.index,1);assert.equal(s.horde.total,13);assert.ok(s.enemies.length<=3);assert.equal(s.secured,0);
  clearWave(s);assert.equal(s.horde.cleared,1);assert.equal(s.horde.phase,'calm');assert.equal(s.secured,16);assert.equal(s.supplies.wire,1);assert.equal(s.supplies.food,1);assert.ok(s.drops.some(d=>d.kind==='blueprint'));assert.equal(s.phase,'play');
  const reward=s.secured;tick(s,.1);assert.equal(s.secured,reward);startWave(s);assert.equal(s.horde.index,2);assert.equal(s.horde.total,16);
});
test('later waves include ranged enemies and a large zombie every third wave',()=>{
  const s=quiet();s.horde.index=s.horde.cleared=2;startWave(s);const kinds=new Set();
  for(let i=0;i<600&&s.horde.phase==='active';i++){for(const e of s.enemies){kinds.add(e.kind);s.hurtEnemy(e,999999);}s.time+=.04;s.tickHorde(.04);}
  assert.deepEqual([...kinds].sort(),['brute','runner','spitter','walker']);assert.equal(s.horde.cleared,3);
});
test('large zombies warn for a second, charge on a locked heading, respect walls and survive save reload',()=>{
  const s=quiet();s.player.y=720;const e=s.spawn('brute',s.player.x-220,s.player.y);e.born=0;e.fire=0;tick(s,.02);assert.equal(e.mode,'aim');const x=e.x,heading=e.chargeA;tick(s,.4);assert.equal(e.x,x);assert.equal(e.mode,'aim');s.player.x+=70;tick(s,.7);assert.equal(e.mode,'charge');assert.equal(e.chargeA,heading);assert.ok(e.x>x);assert.ok(SurvivalRun.restore(s.snapshot()));tick(s,1);assert.equal(e.mode,'walk');assert.equal(streetBlocked(e.x,e.y,e.r),false);
});
test('fleeing cannot delete horde enemies or falsely award a cleared wave',()=>{
  const s=quiet();startWave(s);const e=s.enemies[0];e.x+=TOWN.w*6;s.player.invuln=999;s.hero.invuln=999;tick(s,.04);
  assert.ok(s.enemies.some(z=>z.id===e.id));assert.ok(Math.hypot(e.x-s.actor.x,e.y-s.actor.y)<1000);assert.equal(streetBlocked(e.x,e.y,e.r),false);assert.equal(s.horde.cleared,0);
});
test('the active wave and parked street resume unchanged after an indoor search',()=>{
  const s=quiet();startWave(s);const h=districtDoors(s.player).find(h=>h.type==='small');s.mode='foot';Object.assign(s.hero,{x:h.x,y:h.y});const clock=s.horde.clock;assert.ok(s.enter(h.id));s.enemies=[];tick(s,3);
  assert.equal(s.horde.clock,clock);const r=SurvivalRun.restore(s.snapshot());assert.ok(r);assert.deepEqual(r.horde,s.horde);assert.equal(r.street.enemies[0].horde,1);Object.assign(r.hero,r.bounds.door);assert.ok(r.leave());tick(r,.04);assert.ok(r.horde.clock>clock);
});
test('schematics are physical pickups, random without duplicates, and do not grant free devices',()=>{
  const s=quiet();for(let i=0;i<6;i++)s.salvageBlueprint(s.player.x+i*50,s.player.y);assert.equal(s.drops.length,6);assert.equal(new Set(s.drops.map(d=>d.mod)).size,6);assert.equal(s.salvageBlueprint(0,0),null);assert.deepEqual(s.blueprints,[]);
  const item=s.drops[0];s.grant(item.kind,item.value,item.mod);s.grant(item.kind,item.value,item.mod);assert.equal(s.blueprints.length,1);assert.deepEqual(s.rogue.levels,{});assert.deepEqual(s.rogue.offer,[]);
  assert.ok(SurvivalRun.restore(s.snapshot()));
});
test('each first searched floor yields one schematic, never on every node or on reentry',()=>{
  const s=quiet(),h=districtDoors(s.player).find(h=>h.type==='large');s.mode='foot';Object.assign(s.hero,h);assert.ok(s.enter(h.id));s.enemies=[];
  for(const node of s.rooms[s.roomKey].nodes.slice(0,2)){Object.assign(s.hero,node,{vx:0,vy:0});assert.ok(s.startInteract());tick(s,1.4);}
  const count=s.blueprints.length+s.drops.filter(d=>d.kind==='blueprint').length;assert.equal(count,1);assert.equal(s.rooms[s.roomKey].schematic,true);assert.ok(SurvivalRun.restore(s.snapshot()));
});
test('devices require schematics and parts, cap ranks, survive reload and have real attack behavior',()=>{
  for(const mod of RIG_MODS){const s=quiet();s.player.cargo=1000;s.supplies.wire=50;assert.equal(s.modify(mod.id),false);s.grant('blueprint',1,mod.id);const price=fieldPrice(s,mod.id);assert.ok(s.modify(mod.id));assert.equal(s.player.cargo,1000-price.parts);assert.equal(s.supplies.wire,50-price.wire);assert.equal(s.rogue.levels[mod.id],1);assert.ok(SurvivalRun.restore(s.snapshot()));assert.ok(s.modify(mod.id));assert.ok(s.modify(mod.id));assert.equal(s.modify(mod.id),false);}
  for(const id of ['arc','laser','frost','blade']){const s=quiet();s.player.y=720;s.blueprints=[id];s.player.cargo=100;s.supplies.wire=5;s.modify(id);const e=s.spawn('brute',s.player.x+90,s.player.y);e.born=0;const hp=e.hp;tick(s,.02);assert.ok(e.hp<hp,id);}
  const s=quiet();s.player.y=720;s.blueprints=['drone','mine'];s.player.cargo=300;s.supplies.wire=10;s.modify('drone');s.modify('mine');const e=s.spawn('brute',s.player.x,s.player.y+100);e.born=0;tick(s,.02);assert.ok(s.bullets.some(b=>b.kind==='drone'));for(let i=0;i<20;i++)s.step(1/60,{x:0,y:1});assert.ok(s.mines.length);
});
test('new near-range devices cannot hit a zombie hidden behind a painted building',()=>{
  for(const id of ['arc','frost','blade']){const s=quiet();s.blueprints=[id];s.player.cargo=100;s.supplies.wire=10;assert.ok(s.modify(id));const e=s.spawn('walker',s.player.x+90,s.player.y);e.born=0;const hp=e.hp;assert.equal(s.sight(s.player,e),false);tick(s,.02);assert.equal(e.hp,hp,id);}
});
test('old live saves preserve resources, rooms and equipment without an overdue wave ambush',()=>{
  const s=quiet();s.player.cargo=74;s.hero.ammo=47;s.time=1200;const raw=s.snapshot();delete raw.survivalRules;delete raw.horde;delete raw.blueprints;
  const r=SurvivalRun.restore(raw);assert.ok(r);assert.equal(r.player.cargo,74);assert.equal(r.hero.ammo,47);assert.equal(r.time,1200);assert.equal(r.horde.nextAt-r.horde.clock,90);assert.equal(r.phase,'play');
});
test('corrupt horde and schematic state is rejected, valid active state is deterministic after reload',()=>{
  const s=quiet();startWave(s);const raw=s.snapshot(),r=SurvivalRun.restore(raw);assert.ok(r);s.events=[];tick(s,.3);tick(r,.3);assert.deepEqual(r.snapshot(),s.snapshot());
  for(const change of [r=>r.blueprints=['missing'],r=>r.blueprints=['blade','blade'],r=>r.horde.remaining=49,r=>r.horde.phase='won',r=>r.horde.cleared=12,r=>r.secured=-1]){const bad=structuredClone(raw);change(bad);assert.equal(SurvivalRun.restore(bad),null);}
});
test('death/manual end settles secured wave rewards plus salvaged parts once; there is no extraction win',()=>{
  const s=quiet();s.player.cargo=100;s.secured=36;s.horde.index=s.horde.cleared=2;s.finish(true);assert.equal(s.phase,'lost');assert.equal(s.result.success,false);assert.equal(s.result.reward,71);assert.equal(s.result.waves,2);assert.equal(s.result.secured,36);s.finish(false);assert.equal(s.result.reward,71);
});
