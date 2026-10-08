import {WORLD,clamp} from './data.js?v=12';
import {followCamera} from './feel.js?v=12';

// Camera framing never changes world coordinates, collision or driving speed.
export function frameWorld(camera,p,height,trailers,dt,{snap=false,reduced=false}={}){
  followCamera(camera,p,dt,{snap,reduced});
  const target=.8-clamp(trailers,0,4)*.018;
  if(snap||!Number.isFinite(camera.zoom))camera.zoom=target;
  else camera.zoom+=(target-camera.zoom)*(1-Math.exp(-Math.max(0,dt)*3.6));
  const z=camera.zoom,anchorX=195,anchorY=68+(height-68)*.46;
  camera.x=clamp(camera.x,anchorX/z,WORLD.w-(390-anchorX)/z);
  camera.y=clamp(camera.y,anchorY/z,WORLD.h-(height-anchorY)/z);
  return {z,ox:anchorX-camera.x*z,oy:anchorY-camera.y*z};
}

export function minimapView(projection){
  const {ox,oy,z,height}=projection;
  const x=clamp(-ox/z,0,WORLD.w),y=clamp(-oy/z,0,WORLD.h);
  return {x,y,w:Math.max(0,Math.min(390/z,WORLD.w-x)),h:Math.max(0,Math.min(height/z,WORLD.h-y))};
}

// A short outward fan, not a looping animation or random combat state.
export function impactFan(effect){
  const t=clamp(1-effect.life/effect.total,0,1),critical=!!effect.critical;
  return {t,fade:1-t,count:critical?7:5,radius:4+Math.sqrt(t)*(critical?27:18),length:(1-t)*(critical?11:7),angle:(effect.id%13)*2.39996323};
}
