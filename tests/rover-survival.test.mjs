import test from 'node:test';
import assert from 'node:assert/strict';
import {SurvivalRun} from '../src/rover/survival.js';
import {Expedition} from '../src/rover/core.js';
import {RoverGame} from '../src/rover/game.js';
import {SAVE_KEY,newProfile,dist} from '../src/rover/data.js';
import {districtDoors,houseFromId,roomLayout,roomBlocked,streetBlocked,survivalRoute,fieldPrice,TOWN,ROOM_SIZES,LEGACY_ROOM_SIZES} from '../src/rover/survival-data.js';
import {gunInterval} from '../src/rover/rogue.js';
import {EndlessTerrain} from '../src/rover/endless-terrain.js';
const house=(type)=>districtDoors({x:0,y:0},3).find(h=>h.type===type);
function indoors(type='small',floor=1){const s=new SurvivalRun(),h=house(type);s.enemies=[];s.mode='foot';Object.assign(s.hero,{x:h.x,y:h.y});assert.ok(s.enter(h.id));while(s.floor<floor){Object.assign(s.hero,{x:s.bounds.up.x,y:s.bounds.up.y});assert.ok(s.changeFloor(s.floor+1));}return s;}
function tick(s,seconds,input={x:0,y:0}){for(let i=0;i<Math.ceil(seconds*60);i++)s.step(1/60,input);}
function quiet(s){s.enemies=[];s.spawnClock=99999;s.rogue.nextBoss=99999;return s;}
test('infinite districts have deterministic entrances, all four house types and no world boundary',()=>{
  const types=new Set();for(const p of [{x:0,y:0},{x:-90000,y:80000},{x:100000,y:-90000}]){const list=districtDoors(p);assert.equal(list.length,36);for(const h of list){types.add(h.type);assert.deepEqual(h,houseFromId(h.id));assert.equal(streetBlocked(h.x,h.y,23),false);if(h.type==='villa')assert.ok(h.floors>=2&&h.floors<=3);if(h.type==='tower')assert.ok(h.floors>=5&&h.floors<=8);}assert.equal(streetBlocked((Math.floor(p.x/TOWN.w)+.5)*TOWN.w,(Math.floor(p.y/TOWN.w)+.5)*TOWN.w,0),false);}
  assert.equal(types.size,4);const s=quiet(new SurvivalRun());Object.assign(s.player,{x:-TOWN.w*30,y:TOWN.w*40+700});tick(s,1,{x:-1,y:0});assert.ok(s.player.x<-TOWN.w*30);assert.equal(s.doors.length,36);
});
test('interiors keep furniture-sized proportions; all floors, loot and stair entrances are reachable',()=>{
  const sizes={small:768,large:1024,villa:1152,tower:1152};const assets=new Set();
  for(const type of Object.keys(sizes)){const h=house(type);for(let floor=1;floor<=h.floors;floor++){
    const layout=roomLayout(h,floor);assets.add(layout.asset);assert.equal(layout.w,sizes[type]);const s=indoors(type,floor);
    const points=[...layout.nodes,layout.door,...(layout.up?[layout.up,layout.down]:[])];
    for(const p of points){assert.equal(roomBlocked(p.x,p.y,12,layout),false,type+' '+floor);const actor={...layout.entry,r:12};for(let i=0;i<9000&&dist(actor,p)>22;i++){const q=survivalRoute(s,actor,p),d=dist(actor,q);if(d)s.move(actor,(q.x-actor.x)/d*3,(q.y-actor.y)/d*3);}assert.ok(dist(actor,p)<=22,'reachable '+type+' floor '+floor+' '+JSON.stringify(p));}
  }}assert.equal(assets.size,5);
});
function legacySnapshot(s){
  const raw=s.snapshot(),scale=list=>Array.isArray(list)?list.map(p=>({...p,x:p.x*factor,y:p.y*factor})):list,factors={};let factor;
  for(const [key,room] of Object.entries(raw.rooms)){const type=houseFromId(key.split('@')[0]).type;factor=LEGACY_ROOM_SIZES[type]/ROOM_SIZES[type];factors[key]=factor;room.nodes=scale(room.nodes);room.enemies=scale(room.enemies);room.drops=scale(room.drops);}
  if(raw.zone!=='street'){factor=factors[raw.zone+'@'+raw.floor];Object.assign(raw.hero,{x:raw.hero.x*factor,y:raw.hero.y*factor});raw.enemies=scale(raw.enemies);raw.drops=scale(raw.drops);}
  delete raw.interiorVersion;return raw;
}
test('the previous enlarged-floor save migrates loot, floors, supplies and actor positions without a reset',()=>{
  const s=quiet(indoors('tower',3)),room=s.rooms[s.roomKey];room.nodes[2].open=true;s.player.cargo=73;s.supplies={wire:4,food:2,meds:1};s.hero.ammo=37;s.hero.hp=64;s.drop(s.hero.x+50,s.hero.y,3,'food');const enemy=s.spawn('walker',s.bounds.w*.5,s.bounds.h*.5);enemy.hp=23;enemy.born=0;
  const old=legacySnapshot(s),copy=structuredClone(old),r=SurvivalRun.restore(old);assert.ok(r);assert.equal(r.interiorVersion,2);assert.equal(r.floor,3);assert.equal(r.zone,s.zone);assert.equal(r.player.cargo,73);assert.deepEqual(r.supplies,s.supplies);assert.equal(r.hero.hp,64);assert.equal(r.hero.ammo,37);assert.equal(r.rooms[r.roomKey].nodes[2].open,true);assert.equal(r.enemies[0].hp,23);assert.equal(r.drops[0].kind,'food');assert.ok(dist(r.hero,s.hero)<.001);assert.deepEqual(old,copy);assert.ok(SurvivalRun.restore(r.snapshot()));
  copy.rooms[r.roomKey].nodes[0].x+=50;assert.equal(SurvivalRun.restore(copy),null);
});
test('scale migration on the street leaves street actors alone and still preserves previously searched floors',()=>{
  const s=quiet(indoors('villa'));s.rooms[s.roomKey].nodes[1].open=true;Object.assign(s.hero,{x:s.bounds.door.x,y:s.bounds.door.y});assert.ok(s.leave());const car={...s.player},hero={...s.hero},r=SurvivalRun.restore(legacySnapshot(s));assert.ok(r);assert.deepEqual(r.player,car);assert.deepEqual(r.hero,hero);assert.equal(r.rooms[Object.keys(r.rooms)[0]].nodes[1].open,true);
});
test('old doorway-edge saves are moved clear of the resized wall, not discarded',()=>{
  const s=quiet(indoors('villa')),raw=legacySnapshot(s),oldSize=LEGACY_ROOM_SIZES.villa;Object.assign(raw.hero,{x:oldSize*.433,y:oldSize*.9});const r=SurvivalRun.restore(raw);assert.ok(r);assert.equal(roomBlocked(r.hero.x,r.hero.y,12,r.bounds),false);assert.equal(r.zone,s.zone);
  raw.hero.x=NaN;assert.equal(SurvivalRun.restore(raw),null);
});
test('entering needs an on-foot player at the actual doorway; parked vehicle remains outside',()=>{
  const s=new SurvivalRun(),h=house('villa'),car={...s.player};assert.equal(s.enter(h.id),false);assert.ok(s.toggleVehicle());assert.equal(s.enter(h.id),false);Object.assign(s.hero,{x:h.x,y:h.y});assert.ok(s.enter(h.id));assert.equal(s.mode,'foot');assert.deepEqual(s.player,car);assert.ok(s.enemies.length>=6);assert.equal(s.toggleVehicle(),false);
  assert.equal(s.leave(),false);Object.assign(s.hero,{x:s.bounds.door.x,y:s.bounds.door.y});assert.ok(s.leave());assert.equal(s.zone,'street');assert.equal(s.visits,1);assert.equal(s.enter(h.id),true);assert.equal(s.visits,1);
});
test('stairs are physical, cannot skip floors, and the first floor exit is the only street exit',()=>{
  const s=indoors('tower'),h=houseFromId(s.zone);assert.equal(s.changeFloor(2),false);const first=s.enemies;Object.assign(s.hero,{x:s.bounds.up.x,y:s.bounds.up.y});assert.equal(s.changeFloor(3),false);assert.ok(s.startInteract());assert.equal(s.floor,2);assert.notEqual(s.enemies,first);Object.assign(s.hero,{x:s.bounds.door.x,y:s.bounds.door.y});assert.equal(s.leave(),false);
  Object.assign(s.hero,{x:s.bounds.down.x,y:s.bounds.down.y});assert.ok(s.startInteract());assert.equal(s.floor,1);assert.equal(s.enemies,first);assert.ok(h.floors>=5);
});
test('scavenging takes time, cancels on movement or damage, and does not duplicate after reentry/reload',()=>{
  const s=quiet(indoors()),n=s.rooms[s.roomKey].nodes[1];Object.assign(s.hero,n);assert.ok(s.startInteract());tick(s,.5);assert.equal(n.open,false);tick(s,.02,{x:1,y:0});assert.equal(s.interacting,false);Object.assign(s.hero,n,{vx:0,vy:0});assert.ok(s.startInteract());s.hero.invuln=0;s.hurt(s.hero,1);assert.equal(s.interacting,false);s.startInteract();tick(s,1.4);assert.equal(n.open,true);const ammo=s.hero.ammo;
  const restored=SurvivalRun.restore(s.snapshot());assert.ok(restored);assert.equal(restored.rooms[s.roomKey].nodes[1].open,true);assert.equal(restored.startInteract(),false);assert.equal(restored.hero.ammo,ammo);
});
test('upper floors save their independent loot, survivors and drops, including 32-bit random seeds',()=>{
  const h=house('tower'),s=quiet(indoors('tower',h.floors));const room=s.rooms[s.roomKey];room.nodes[0].open=true;s.drop(s.hero.x+100,s.hero.y,3,'meds');s.seed=4294967295;s.enemies[0]={...s.spawn('runner',s.bounds.w*.5,s.bounds.h*.4),born:0};s.enemies=s.enemies.slice(-1);const saved=s.snapshot(),r=SurvivalRun.restore(saved);assert.ok(r);assert.equal(r.floor,h.floors);assert.equal(r.rooms[r.roomKey].nodes[0].open,true);assert.equal(r.drops[0].kind,'meds');assert.equal(r.enemies[0].kind,'runner');assert.equal(r.seed,4294967295);
  const malformed=structuredClone(saved);malformed.floor=h.floors+1;assert.equal(SurvivalRun.restore(malformed),null);malformed.floor=h.floors;malformed.rooms[r.roomKey].nodes[0].x+=50;assert.equal(SurvivalRun.restore(malformed),null);
});
test('zombies target the parked car, while pistol ammo is limited and not wasted through room walls',()=>{
  const s=quiet(new SurvivalRun());s.toggleVehicle();s.hero.x+=240;const hp=s.player.hp,e=s.spawn('walker',s.player.x,s.player.y+20);e.born=0;tick(s,.04);assert.ok(s.player.hp<hp);assert.equal(s.hero.hp,100);
  const r=quiet(indoors('large')),w=r.bounds.w;Object.assign(r.hero,{x:w*.37,y:w*.20,ammo:5});const z=r.spawn('walker',w*.46,w*.20);z.born=0;r.cooldowns.pistol=-1;tick(r,.04);assert.equal(r.hero.ammo,5);assert.equal(r.bullets.length,0);
  Object.assign(z,{x:r.hero.x-65,y:r.hero.y});assert.ok(r.sight(r.hero,z));tick(r,.04);assert.equal(r.hero.ammo,4);r.hero.ammo=0;tick(r,1);assert.equal(r.hero.ammo,0);
});
test('parked main gun guards the car from its own muzzle without using pedestrian ammo or aim',()=>{
  const s=quiet(new SurvivalRun());s.toggleVehicle();Object.assign(s.hero,{x:s.player.x,y:s.player.y+500});const e=s.spawn('walker',s.player.x,s.player.y-100);e.born=0;s.cooldowns.gun=-1;const ammo=s.hero.ammo;tick(s,.02);
  assert.equal(s.hero.ammo,ammo);assert.ok(s.bullets.length);assert.ok(s.bullets.every(b=>dist(b,s.player)<70));assert.ok(Math.abs(s.turretA)<.01);
});
test('local modifications charge resources, affect real weapons, cap ranks, and never grant cards',()=>{
  const s=quiet(new SurvivalRun());s.player.cargo=500;s.supplies.wire=40;const interval=gunInterval(s),price=fieldPrice(s,'rapid');assert.ok(s.modify('rapid'));assert.equal(s.player.cargo,500-price.parts);assert.equal(s.supplies.wire,40-price.wire);assert.ok(gunInterval(s)<interval);s.modify('rapid');s.modify('rapid');assert.equal(s.modify('rapid'),false);assert.equal(s.rogue.levels.rapid,3);
  assert.ok(s.modify('rocket'));const e=s.spawn('walker',s.player.x,s.player.y+100);e.born=0;tick(s,.02);assert.ok(s.bullets.some(b=>b.kind==='rocket'));assert.deepEqual(s.rogue.offer,[]);assert.equal(s.rogue.xp,0);assert.equal(s.choose('power'),false);assert.ok(SurvivalRun.restore(s.snapshot()));
});
test('repair, first aid and ammo use their respective materials and reject pointless spending',()=>{
  const s=quiet(new SurvivalRun());s.player.cargo=100;s.supplies={wire:2,food:1,meds:1};assert.equal(s.modify('heal'),false);s.hero.hp=30;assert.ok(s.modify('heal'));assert.equal(s.hero.hp,75);assert.equal(s.supplies.meds,0);s.player.hp=40;assert.ok(s.modify('patch'));assert.equal(s.player.hp,85);assert.equal(s.player.cargo,88);s.hero.ammo=0;assert.ok(s.modify('ammo'));assert.equal(s.hero.ammo,45);assert.equal(s.supplies.food,0);
});
test('old vehicle saves retain earned parts and permanent gear without importing card mechanics',()=>{
  const old=new Expedition(['armor'],123);old.player.cargo=55;const s=SurvivalRun.restore(old.snapshot());assert.ok(s);assert.deepEqual(s.modules,['armor']);assert.equal(s.player.cargo,55);assert.deepEqual(s.rogue.offer,[]);assert.deepEqual(s.rogue.levels,{});assert.ok(SurvivalRun.restore(s.snapshot()));
});
test('endless terrain draws only visible complete district images without allocating scene canvases',()=>{
  const calls=[],c={save(){},restore(){},translate(){},rotate(){},drawImage(...args){calls.push(args);}},a={width:1254,height:1254},b={width:1254,height:1254},terrain=new EndlessTerrain({map:a,mapAlt:b});for(const n of [0,100000,-200000]){calls.length=0;terrain.draw(c,{x:n,y:n,w:650,h:1100});assert.ok(calls.length<=4);assert.ok(calls.every(args=>[a,b].includes(args[0])&&args[3]===1536&&args[4]===1536));}assert.equal(Object.keys(terrain).length,1);
});
function harness(initial={}){const data=new Map(Object.entries(initial)),ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),measureText:s=>({width:String(s).length*7})},{get:(t,k)=>k in t?t[k]:()=>{}}),canvas={getContext:()=>ctx,width:390,height:844};const g=new RoverGame({canvas,createImage:()=>({width:1254,height:1254,set src(url){if(url.includes('characters')){this.width=1774;this.height=887;}queueMicrotask(()=>this.onload());}}),createSurface:(w,h)=>({width:w,height:h,getContext:()=>ctx}),storage:{get:k=>structuredClone(data.get(k)),set:(k,v)=>{data.set(k,structuredClone(v));return true;}}});g.resize({width:390,height:844});return{g,data};}
async function loaded(initial={}){const h=harness(initial);await h.g.load();h.g.start();return h;}
test('default game uses zombie exploration; keyboard and touch expose boarding and in-run workshop',async()=>{
  const {g}=await loaded();assert.equal(g.run.survivalVersion,1);assert.ok(g.renderer.buttons.some(b=>b.id==='vehicle'));g.keyboard('e',true);g.keyboard('e',false);assert.equal(g.run.mode,'foot');g.keyboard('e',true);g.keyboard('e',false);assert.equal(g.run.mode,'vehicle');g.keyboard('r',true);g.keyboard('r',false);assert.equal(g.screen,'field-workshop');assert.equal(g.renderer.buttons.filter(b=>b.id.startsWith('pick:')).length,0);const t=g.run.time;g.frame(0);g.frame(50000);assert.equal(g.run.time,t);g.keyboard('escape',true);assert.equal(g.screen,'play');
});
test('touch HUD and field workshop fit short/tall phones with distinct usable hit targets',async()=>{
  const {g}=await loaded();for(const size of [{width:320,height:480},{width:430,height:932}]){g.resize(size);g.screen='play';g.draw();const buttons=g.renderer.buttons;for(const b of buttons){assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=390&&b.y+b.h<=g.renderer.layout.h,b.id);assert.ok(Math.min(b.w,b.h)*g.renderer.layout.scale>=44,b.id);}for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){const a=buttons[i],b=buttons[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'overlap '+a.id+'/'+b.id);}g.action('field-workshop');assert.equal(g.screen,'field-workshop');for(const b of g.renderer.buttons)assert.ok(b.y>=0&&b.y+b.h<=g.renderer.layout.h,b.id);g.action('close-field');}
});
test('device workshop pages fit phones, unlock only real schematic purchases, and no map extraction button remains',async()=>{
  const {g}=await loaded();g.run.player.cargo=1000;g.run.supplies.wire=50;g.run.blueprints=['blade','arc','mine','frost','drone','laser'];
  for(const size of [{width:320,height:480},{width:430,height:932}]){
    g.resize(size);g.screen='play';g.action('field-workshop');g.action('field-tab:rig');
    for(let page=0;page<2;page++){g.rigPage=page;g.draw();const buttons=g.renderer.buttons;assert.equal(buttons.filter(b=>b.id.startsWith('field-buy:')).length,3);for(const b of buttons){assert.ok(b.x>=0&&b.y>=0&&b.x+b.w<=390&&b.y+b.h<=g.renderer.layout.h,b.id);assert.ok(Math.min(b.w,b.h)*g.renderer.layout.scale>=44,b.id);}for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){const a=buttons[i],b=buttons[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'overlap '+a.id+'/'+b.id);}}
    g.action('close-field');g.action('map');assert.equal(g.renderer.buttons.some(b=>b.id==='return-guide'),false);g.action('close-map');
  }
  g.action('field-workshop');g.action('field-buy:blade');assert.equal(g.run.rogue.levels.blade,1);g.action('close-field');g.action('vehicle');g.action('map');assert.ok(g.renderer.buttons.some(b=>b.id==='car-guide'));g.action('car-guide');assert.deepEqual(g.waypoint,{x:g.run.player.x,y:g.run.player.y});
});
test('floor transition releases controls, saves the floor and resets the follow camera',async()=>{
  const {g,data}=await loaded(),s=indoors('villa');g.run=s;Object.assign(s.hero,{x:s.bounds.up.x,y:s.bounds.up.y});g.input={x:1,y:1};g.action('action');assert.equal(s.floor,2);assert.deepEqual(g.input,{x:0,y:0});assert.equal(g.transition,.28);assert.equal(data.get(SAVE_KEY).run.floor,2);assert.ok(SurvivalRun.restore(data.get(SAVE_KEY).run));g.draw();assert.equal(g.renderer.zone,s.zone+'@2');
});
test('portrait height never enlarges indoor art or changes the size of the pedestrian',async()=>{
  const {g}=await loaded();for(const type of Object.keys(ROOM_SIZES)){g.run=quiet(indoors(type));for(const size of [{width:320,height:480},{width:430,height:932},{width:390,height:1100}]){g.resize(size);g.screen='play';g.justStarted=true;g.draw();assert.equal(g.projection.z,.92);assert.ok(g.projection.ox<=0);if(g.run.bounds.h*.92<g.projection.height)assert.equal(g.projection.oy,(g.projection.height-g.run.bounds.h*.92)/2);}}
});
test('background pause and result settlement retain survival saves and credit only once',async()=>{
  const {g,data}=await loaded({[SAVE_KEY]:{...newProfile(),bank:100}});g.run.player.cargo=55;g.run.secured=16;g.frame(0);g.frame(500);g.setVisible(false);const time=g.run.time;g.frame(1e9);assert.equal(g.run.time,time);const restored=await loaded(Object.fromEntries(data));assert.equal(restored.g.run.player.cargo,55);restored.g.run.finish(false);restored.g.frame(0);restored.g.frame(20);assert.equal(restored.g.profile.bank,135);restored.g.frame(40);assert.equal(restored.g.profile.bank,135);
});
