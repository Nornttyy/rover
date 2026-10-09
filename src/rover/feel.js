import {clamp,angleDelta} from './data.js?v=13';

export const STICK={dead:3,radius:32,follow:32};
export function steerStick(joy,point){
  let dx=point.x-joy.origin.x,dy=point.y-joy.origin.y,length=Math.hypot(dx,dy);
  if(length>STICK.follow){joy.origin.x=point.x-dx/length*STICK.follow;joy.origin.y=point.y-dy/length*STICK.follow;dx=point.x-joy.origin.x;dy=point.y-joy.origin.y;length=STICK.follow;}
  const amount=clamp((length-STICK.dead)/(STICK.radius-STICK.dead),0,1);
  return{x:length?dx/length*amount:0,y:length?dy/length*amount:0};
}

export function followCamera(camera,p,dt,{snap=false,reduced=false}={}){
  const lead=reduced?0:.055,length=Math.hypot(p.vx,p.vy)||1,limit=Math.min(1,24/(length*lead||1));
  const tx=p.vx*lead*limit,ty=p.vy*lead*limit;
  if(snap){camera.x=p.x;camera.y=p.y;camera.lookX=camera.lookY=0;return;}
  const look=1-Math.exp(-dt*12),follow=1-Math.exp(-dt*24);
  camera.lookX=(camera.lookX||0)+(tx-(camera.lookX||0))*look;camera.lookY=(camera.lookY||0)+(ty-(camera.lookY||0))*look;
  camera.x+=(p.x+camera.lookX-camera.x)*follow;camera.y+=(p.y+camera.lookY-camera.y)*follow;
}

// Presentation state is separate from combat, saves and the combat random stream.
export class RoverFeel{
  constructor(){this.reset({x:480,y:1270,a:0});}
  reset(p){this.last={x:p.x,y:p.y,a:p.a};this.time=0;this.distance=0;this.roll=0;this.kick=0;this.particles=[];this.tracks=[];this.decals=[];this.numbers=[];this.collect=[];this.seenFx=0;this.seed=817;this.dustClock=0;this.trackClock=0;this.hpRatio=p.maxHp?clamp(p.hp/p.maxHp,0,1):1;this.hpEcho=this.hpRatio;this.hpDelay=0;}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  puff(x,y,kind='dust',scale=1,vx=0,vy=0){this.particles.push({x,y,vx,vy,kind,size:(14+this.random()*10)*scale,a:this.random()*Math.PI*2,life:.5+this.random()*.3,total:.8});if(this.particles.length>64)this.particles.shift();}
  loot(event){this.numbers.push({x:event.x,y:event.y,value:event.value,life:1.05,total:1.05});this.collect.push({x:event.x,y:event.y,life:.58,total:.58});if(this.numbers.length>10)this.numbers.shift();if(this.collect.length>10)this.collect.shift();}
  tick(s,dt,reduced=false){
    if(!s||dt<=0)return;const p=s.player,dx=p.x-this.last.x,dy=p.y-this.last.y,distance=Math.hypot(dx,dy),speed=Math.hypot(p.vx,p.vy),turn=angleDelta(this.last.a,p.a)/dt;
    this.time+=dt;this.distance+=distance;this.roll+=(clamp(-turn*.023,-.09,.09)-this.roll)*(1-Math.exp(-dt*13));this.kick*=Math.exp(-dt*17);
    const hp=clamp(p.hp/p.maxHp,0,1);if(hp<this.hpRatio)this.hpDelay=.22;
    this.hpRatio=hp;this.hpDelay=Math.max(0,this.hpDelay-dt);
    if(reduced||hp>=this.hpEcho)this.hpEcho=hp;else if(this.hpDelay===0)this.hpEcho+=(hp-this.hpEcho)*(1-Math.exp(-dt*8));
    this.dustClock-=dt;this.trackClock-=dt;
    if(!reduced&&distance>.35&&speed>85&&this.dustClock<=0){const back=28,r=Math.sin(p.a),v=Math.cos(p.a);this.puff(p.x-r*back,p.y+v*back,p.boostTime>0?'smoke':'dust',p.boostTime>0?.8:.45,-p.vx*.1,-p.vy*.1);this.dustClock=.075;}
    if(!reduced&&distance>.5&&speed>65&&this.trackClock<=0&&(Math.abs(turn)>.8||p.boostTime>0)){
      for(const side of [-1,1]){const x=p.x+Math.cos(p.a)*side*23,y=p.y+Math.sin(p.a)*side*23;this.tracks.push({x,y,a:p.a,length:Math.min(15,4+distance),life:2.5,total:2.5});}this.trackClock=.045;
    }
    for(const f of s.effects){if(f.id<=this.seenFx)continue;this.seenFx=Math.max(this.seenFx,f.id||0);if(f.type==='pop'||f.type==='blast'){
      if(!reduced)this.kick=Math.min(3,this.kick+(f.big?2.3:.4));
      if(!reduced)for(let i=0;i<(f.big?7:3);i++)this.puff(f.x+(this.random()-.5)*28,f.y+(this.random()-.5)*28,'smoke',f.big?1.8:1,(this.random()-.5)*25,(this.random()-.5)*25);
    }}
    for(const a of this.particles){a.life-=dt;a.x+=a.vx*dt;a.y+=a.vy*dt;}
    for(const collection of [this.tracks,this.decals,this.numbers,this.collect])for(const a of collection)a.life-=dt;
    this.particles=this.particles.filter(a=>a.life>0);this.tracks=this.tracks.filter(a=>a.life>0).slice(-140);this.decals=this.decals.filter(a=>a.life>0).slice(-20);this.numbers=this.numbers.filter(a=>a.life>0);this.collect=this.collect.filter(a=>a.life>0);this.last={x:p.x,y:p.y,a:p.a};
  }
}
