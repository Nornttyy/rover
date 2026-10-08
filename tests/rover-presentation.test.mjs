import test from 'node:test';
import assert from 'node:assert/strict';
import {frameWorld,minimapView,impactFan} from '../src/rover/presentation.js';
import {RoverFeel} from '../src/rover/feel.js';
import {Expedition,STEP} from '../src/rover/core.js';
import {WORLD} from '../src/rover/data.js';

test('framing keeps the whole viewport inside the one-image world, including short and tall phones',()=>{
  for(const height of [585,780,915])for(const x of [23,WORLD.home.x,WORLD.w-23])for(const y of [23,WORLD.home.y,WORLD.h-23]){
    const p={x,y,vx:0,vy:0},before={...p},camera={};
    const projection={...frameWorld(camera,p,height,4,0,{snap:true}),height},view=minimapView(projection);
    assert.deepEqual(p,before);assert.ok(view.x>=0&&view.y>=0);
    assert.ok(view.x+view.w<=WORLD.w+1e-8&&view.y+view.h<=WORLD.h+1e-8);
    assert.ok(projection.ox<=1e-8&&projection.oy<=1e-8);
    assert.ok(projection.ox+WORLD.w*projection.z>=390-1e-8);
    assert.ok(projection.oy+WORLD.h*projection.z>=height-1e-8);
  }
});
test('trailer attachment and detachment change the camera continuously without jumping the player anchor',()=>{
  const p={x:3200,y:3450,vx:0,vy:0},camera={};
  const first=frameWorld(camera,p,780,0,0,{snap:true});assert.equal(first.z,.8);
  const second=frameWorld(camera,p,780,4,STEP);assert.ok(first.z-second.z>0&&first.z-second.z<.005);
  assert.ok(Math.abs(first.ox+p.x*first.z-second.ox-p.x*second.z)<1e-8);
  assert.ok(Math.abs(first.oy+p.y*first.z-second.oy-p.y*second.z)<1e-8);
  for(let i=0;i<180;i++)frameWorld(camera,p,780,4,STEP);
  assert.ok(Math.abs(camera.zoom-.728)<.00001);
  const before=camera.zoom;frameWorld(camera,p,780,0,0);assert.equal(camera.zoom,before,'redraws do not advance animation');
  frameWorld(camera,p,780,0,STEP);assert.ok(camera.zoom-before<.005);
});
test('camera zoom is consistent across 30, 60 and 120 rendered frames per second',()=>{
  const result=[30,60,120].map(hz=>{const camera={},p={x:3200,y:3450,vx:0,vy:0};frameWorld(camera,p,780,0,0,{snap:true});for(let i=0;i<hz;i++)frameWorld(camera,p,780,4,1/hz);return camera.zoom;});
  assert.ok(Math.max(...result)-Math.min(...result)<1e-10);
});
test('damage echo pauses briefly, then follows real health; healing and reduced motion update immediately',()=>{
  const s=new Expedition(),feel=new RoverFeel();feel.reset(s.player);const before=s.snapshot();
  feel.tick(s,STEP);assert.deepEqual(s.snapshot(),before);
  s.player.hp=65;feel.tick(s,STEP);assert.equal(feel.hpRatio,.5);assert.equal(feel.hpEcho,1);
  for(let i=0;i<8;i++)feel.tick(s,STEP);assert.equal(feel.hpEcho,1);
  for(let i=0;i<60;i++)feel.tick(s,STEP);assert.ok(feel.hpEcho>.5&&feel.hpEcho<.501);
  s.player.hp=100;feel.tick(s,STEP);assert.equal(feel.hpEcho,100/130);
  s.player.hp=30;feel.tick(s,STEP,true);assert.equal(feel.hpEcho,30/130);
});
test('impact fans expand once, stay bounded, and do not consume combat randomness',()=>{
  const e={id:71,life:.16,total:.16,critical:false},s=new Expedition(),seed=s.seed;
  const first=impactFan(e),middle=impactFan({...e,life:.08}),last=impactFan({...e,life:0});
  assert.equal(first.count,5);assert.equal(first.radius,4);assert.ok(middle.radius>first.radius&&middle.radius<last.radius);
  assert.equal(last.fade,0);assert.equal(last.length,0);assert.equal(last.radius,22);
  const crit=impactFan({...e,critical:true});assert.equal(crit.count,7);assert.ok(crit.length>first.length);
  assert.deepEqual(impactFan(e),first);assert.equal(s.seed,seed);
});
