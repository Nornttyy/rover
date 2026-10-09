import {clamp,angleDelta} from './data.js?v=13';

export const DRIVE_RESPONSE=Object.freeze({accelerate:38,reverse:48,brake:66,turn:30,maxTurn:26,stop:3});

// Exact integration keeps the short response the same at different frame rates.
export function driveMotion(p,input,dt,speed=p.speed){
  if(dt<=0)return {x:0,y:0,moving:false};
  const x=Number.isFinite(input.x)?input.x:0,y=Number.isFinite(input.y)?input.y:0,length=Math.hypot(x,y),amount=Math.min(1,length),moving=amount>.02;
  const tx=moving?x/length*speed*amount:0,ty=moving?y/length*speed*amount:0;
  const rate=!moving?DRIVE_RESPONSE.brake:p.vx*tx+p.vy*ty<0?DRIVE_RESPONSE.reverse:DRIVE_RESPONSE.accelerate,decay=Math.exp(-rate*dt),integral=(1-decay)/rate;
  const motion={x:tx*dt+(p.vx-tx)*integral,y:ty*dt+(p.vy-ty)*integral,moving};
  p.vx=tx+(p.vx-tx)*decay;p.vy=ty+(p.vy-ty)*decay;
  if(!moving&&Math.hypot(p.vx,p.vy)<DRIVE_RESPONSE.stop)p.vx=p.vy=0;
  if(moving){const delta=angleDelta(p.a,Math.atan2(x,-y)),limit=DRIVE_RESPONSE.maxTurn*dt;p.a+=clamp(delta*(1-Math.exp(-DRIVE_RESPONSE.turn*dt)),-limit,limit);}
  return motion;
}
