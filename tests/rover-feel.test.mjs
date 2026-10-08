import test from 'node:test';
import assert from 'node:assert/strict';
import {STICK,steerStick,RoverFeel,followCamera} from '../src/rover/feel.js';
import {driveMotion,DRIVE_RESPONSE} from '../src/rover/drive.js';
import {angleDelta} from '../src/rover/data.js';
import {Expedition,STEP} from '../src/rover/core.js';

test('floating stick has a true dead zone, smooth analog response and bounded full deflection',()=>{
  const joy={origin:{x:12,y:700}};
  assert.deepEqual(steerStick(joy,{x:12+STICK.dead,y:700}),{x:0,y:0});
  assert.equal(steerStick(joy,{x:12+(STICK.dead+STICK.radius)/2,y:700}).x,.5);
  const diagonal=steerStick(joy,{x:54,y:742});assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-9);
  const far=steerStick(joy,{x:300,y:700});assert.ok(Math.abs(Math.hypot(far.x,far.y)-1)<1e-9);
  assert.ok(Math.abs(Math.hypot(300-joy.origin.x,700-joy.origin.y)-STICK.follow)<1e-9);
  const origin={...joy.origin};assert.deepEqual(steerStick(joy,origin),{x:0,y:0});
  assert.equal(steerStick(joy,{x:origin.x-STICK.radius,y:origin.y}).x,-1);
});
test('small thumb movements ramp progressively instead of jumping to half speed',()=>{
  const joy={origin:{x:100,y:600}};let previous=0;
  for(let d=0;d<=STICK.radius;d+=.25){const input=steerStick(joy,{x:100+d,y:600});assert.ok(input.x>=previous);assert.ok(input.x-previous<.01);previous=input.x;}
  assert.ok(steerStick(joy,{x:100+STICK.dead+1,y:600}).x<.04);
  assert.deepEqual(steerStick(joy,joy.origin),{x:0,y:0});
});
test('the first driving frame accelerates, turns on the short arc, and never snaps 90 degrees',()=>{
  const p={x:0,y:0,a:0,vx:0,vy:0,speed:224};driveMotion(p,{x:1,y:0},STEP);
  assert.ok(p.vx>90&&p.vx<224);assert.ok(p.a>0&&p.a<=DRIVE_RESPONSE.maxTurn*STEP);
  for(let i=0;i<8;i++)driveMotion(p,{x:1,y:0},STEP);assert.ok(Math.abs(p.a-Math.PI/2)<.025);
  p.a=Math.PI-.03;driveMotion(p,{x:-.03,y:1},STEP);assert.ok(Math.abs(angleDelta(Math.PI-.03,p.a))<.04,'crossing ±π takes the short arc');
});
test('integrated acceleration and braking match at 30, 60 and 120Hz without extra speed',()=>{
  const runs=[30,60,120].map(hz=>{const p={x:0,y:0,a:0,vx:0,vy:0,speed:224};for(let i=0;i<hz;i++){const m=driveMotion(p,{x:1,y:1},1/hz);p.x+=m.x;p.y+=m.y;}assert.ok(Math.hypot(p.vx,p.vy)<=224.00001);for(let i=0;i<hz/5;i++){const m=driveMotion(p,{x:0,y:0},1/hz);p.x+=m.x;p.y+=m.y;}assert.equal(p.vx,0);return p;});
  assert.ok(Math.max(...runs.map(p=>p.x))-Math.min(...runs.map(p=>p.x))<.03);
});
test('camera lead is small and eases through a reversal rather than throwing the screen',()=>{
  const p={x:3200,y:3500,vx:224,vy:0},camera={x:0,y:0};followCamera(camera,p,0,{snap:true});assert.equal(camera.x,p.x);
  for(let i=0;i<60;i++)followCamera(camera,p,STEP);assert.ok(camera.x-p.x>10&&camera.x-p.x<13);
  const before=camera.x;p.vx=-224;followCamera(camera,p,STEP);assert.ok(Math.abs(camera.x-before)<2);
  for(let i=0;i<90;i++)followCamera(camera,p,STEP,{reduced:true});assert.ok(Math.abs(camera.x-p.x)<.01);
});
test('driving responds immediately, brakes within eight world pixels and reverses promptly',()=>{
  const s=new Expedition();s.enemies=[];const p=s.player;
  for(let i=0;i<3;i++)s.step(STEP,{x:1,y:0});assert.ok(p.vx>95,'more than half speed within 50 ms');
  for(let i=0;i<27;i++)s.step(STEP,{x:1,y:0});const before=p.x;
  for(let i=0;i<15;i++)s.step(STEP);assert.equal(p.vx,0);assert.ok(p.x-before<8);
  for(let i=0;i<30;i++)s.step(STEP,{x:1,y:0});
  for(let i=0;i<6;i++)s.step(STEP,{x:-1,y:0});assert.ok(p.vx< -105,'opposite direction reached within 100 ms');
});
test('movement smoothing remains consistent at 30, 60 and 120 physics steps per second',()=>{
  const runs=[30,60,120].map(hz=>{const s=new Expedition();s.enemies=[];for(let i=0;i<hz;i++)s.step(1/hz,{x:1,y:0});return s.player;});
  assert.ok(Math.max(...runs.map(p=>p.x))-Math.min(...runs.map(p=>p.x))<2.5);
  assert.ok(Math.max(...runs.map(p=>p.vx))-Math.min(...runs.map(p=>p.vx))<.001);
});
test('effects are consumed once, bounded, presentation-only and omitted from run saves',()=>{
  const s=new Expedition(),feel=new RoverFeel();s.effect('pop',480,1000,.46,{kind:'drone'});const before=s.snapshot();
  feel.tick(s,STEP);const count=feel.particles.length;assert.equal(count,3);assert.deepEqual(s.snapshot(),before);assert.deepEqual(before.effects,[]);
  feel.tick(s,STEP);assert.equal(feel.particles.length,count);
  for(let i=0;i<400;i++){s.player.x+=2;s.player.vx=150;s.player.a+=.05;s.effect('pop',480,1000,.46);feel.tick(s,STEP);}
  assert.ok(feel.particles.length<=64);assert.ok(feel.tracks.length<=140);assert.equal(feel.decals.length,0);
  for(let i=0;i<60;i++)feel.loot({x:480,y:1000,value:3});assert.equal(feel.numbers.length,10);assert.equal(feel.collect.length,10);
  assert.ok(Number.isFinite(feel.roll));
});
test('reduced motion suppresses movement trails, extra explosion smoke and camera shake',()=>{
  const s=new Expedition(),feel=new RoverFeel();s.player.y-=10;s.player.vy=-176;s.player.boostTime=.8;s.effect('pop',480,1000,.46,{big:true});feel.tick(s,STEP,true);assert.equal(feel.particles.length,0);assert.equal(feel.tracks.length,0);assert.equal(feel.kick,0);
});
test('older saved runs without presentation counters restore safely',()=>{
  const old=new Expedition(['side']).snapshot();delete old.fxId;delete old.sideA;const restored=Expedition.restore(old);assert.ok(restored);assert.equal(restored.fxId,0);assert.equal(restored.sideA,Math.PI/2);restored.shoot(restored.player,0,12);assert.equal(restored.effects[0].id,1);
  assert.equal(Expedition.restore({...old,fxId:'invalid'}),null);assert.equal(Expedition.restore({...old,sideA:NaN}),null);
});
test('projectile and muzzle origins match the rotating main and side sockets',()=>{
  const s=new Expedition(['side']),p=s.player;p.a=Math.PI/2;s.shoot(p,Math.PI/2,12);const gun=s.bullets[0];assert.ok(Math.abs(gun.x-(p.x+16))<1e-8);assert.ok(Math.abs(gun.y-p.y)<1e-8);
  s.shoot(p,Math.PI,20,490,'side');const side=s.bullets[1];assert.ok(Math.abs(side.x-(p.x-3))<1e-8);assert.ok(Math.abs(side.y-(p.y+46))<1e-8);assert.equal(s.effects[1].x,side.x);assert.equal(s.effects[1].y,side.y);
});
