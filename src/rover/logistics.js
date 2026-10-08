import {WORLD,FREIGHT,dist,angleTo,angleDelta,DRIVE} from './data.js?v=9';
import {damageScale} from './rogue.js?v=9';
export const MAX_TRAILERS=4;
export function newConvoy(){return{trailers:[],loose:[],freight:FREIGHT.map(f=>({...f})),peak:0,boostId:0};}
export function attach(s,f){
  const c=s.convoy;if(!f||f.claimed||f.fuse>0||c.trailers.length>=MAX_TRAILERS)return false;
  f.claimed=true;const front=c.trailers.at(-1)||s.player,x=front.x-Math.sin(front.a)*66,y=front.y+Math.cos(front.a)*66,blocked=s.blocked(x,y,20);
  c.trailers.push({...f,x:blocked?f.x:x,y:blocked?f.y:y,a:front.a,hit:0,invuln:0,fire:.4});c.loose=c.loose.filter(t=>t!==f);c.freight[f.id].claimed=true;c.peak=Math.max(c.peak,c.trailers.length);s.emit('attach',f.x,f.y);s.effect('loot',f.x,f.y,.35);return true;
}
export function detach(s){
  const t=s.convoy.trailers.pop();if(!t)return false;t.claimed=false;t.vx=Math.sin(t.a)*120;t.vy=-Math.cos(t.a)*120;t.fuse=t.kind==='bomb'?1.1:0;t.grace=1.4;s.convoy.loose.push(t);s.emit('detach',t.x,t.y);return true;
}
export function hurtTrailer(s,t,damage){
  if(t.invuln>0||t.hp<=0)return;t.hp=Math.max(0,t.hp-damage);t.invuln=.7;t.hit=.16;s.effect('spark',t.x,t.y,.15);
  if(t.hp>0)return;const c=s.convoy,i=c.trailers.indexOf(t);if(i<0)return;const rest=c.trailers.splice(i);
  for(const piece of rest.slice(1)){piece.claimed=false;piece.grace=1.4;piece.vx=0;piece.vy=0;c.loose.push(piece);}
  if(t.kind!=='bomb'){const f=c.freight[t.id];f.claimed=false;f.x=t.x;f.y=t.y;f.hp=40;f.grace=2;}
  s.effect('pop',t.x,t.y,.4);s.emit('trailer-lost',t.x,t.y);
}
export const convoyTarget=(s,e)=>e.kind==='raider'&&s.convoy.trailers.length?s.convoy.trailers.at(-1):s.player;
export function hitTarget(s,target,damage){if(target===s.player)s.hurtPlayer(damage);else if(s.convoy.trailers.includes(target))hurtTrailer(s,target,damage);}
export function logisticsContext(s){
  const f=[...s.convoy.freight,...s.convoy.loose].filter(f=>!f.claimed&&!f.fuse&&!(f.grace>0)&&dist(f,s.player)<88).sort((a,b)=>dist(a,s.player)-dist(b,s.player))[0];
  return f?{kind:'freight',id:f.id,name:s.convoy.trailers.length<MAX_TRAILERS?'接挂':'拖挂已满',duration:.3,progress:f.progress||0,ready:s.convoy.trailers.length<MAX_TRAILERS}:null;
}
export function logisticsStep(s,dt){
  const c=s.convoy,p=s.player;let front=p;
  for(const t of c.trailers){
    t.invuln=Math.max(0,t.invuln-dt);t.hit=Math.max(0,t.hit-dt);t.fire-=dt;const d=dist(t,front),a=angleTo(t,front);
    if(d>66)s.move(t,(front.x-t.x)/d*(d-66),(front.y-t.y)/d*(d-66));
    t.a+=angleDelta(t.a,a)*(1-Math.exp(-dt*18));if(dist(t,front)>160){hurtTrailer(s,t,100);break;}front=t;
    if(t.kind==='repair')p.hp=Math.min(p.maxHp,p.hp+dt*.7);
    if(t.kind==='gun'&&t.fire<=0){const enemy=s.enemies.filter(e=>e.hp>0&&e.born<=0&&dist(t,e)<300).sort((a,b)=>dist(a,t)-dist(b,t))[0];if(enemy){s.shoot(t,angleTo(t,enemy),14*damageScale(s),470,'trailer');t.fire=.65;s.emit('cannon',t.x,t.y);}}
  }
  for(const f of [...c.freight,...c.loose]){if(f.grace>0)f.grace-=dt;if(!f.claimed&&!f.fuse&&!(f.grace>0)&&dist(f,p)<50&&Math.hypot(p.vx,p.vy)<300)attach(s,f);}
  for(const t of c.loose){t.vx=(t.vx||0)*Math.exp(-dt*3);t.vy=(t.vy||0)*Math.exp(-dt*3);s.move(t,t.vx*dt,t.vy*dt);if(t.fuse>0){t.fuse-=dt;if(t.fuse<=0){for(const e of s.enemies)if(dist(t,e)<120+e.r)s.hurtEnemy(e,180*damageScale(s));t.hp=0;s.effect('blast',t.x,t.y,.5,{big:true});s.emit('kill',t.x,t.y);}}}
  c.loose=c.loose.filter(t=>t.hp>0&&!t.claimed);
}
export function ramImpacts(s){
  if(s.player.boostTime<=0)return;const p=s.player,c=s.convoy;
  for(const e of s.enemies){if(e.born>0||e.hp<=0||e.rammed===c.boostId||dist(p,e)>p.r+e.r+16||Math.abs(angleDelta(p.a,angleTo(p,e)))>1.05)continue;e.rammed=c.boostId;s.hurtEnemy(e,DRIVE.ramDamage*damageScale(s));s.move(e,Math.sin(p.a)*32,-Math.cos(p.a)*32);s.effect('spark',e.x,e.y,.18);s.emit('ram',e.x,e.y);}
}
export function cleanConvoy(raw){
  if(!raw||!Array.isArray(raw.trailers)||raw.trailers.length>4||!Array.isArray(raw.loose)||raw.loose.length>FREIGHT.length||!Array.isArray(raw.freight)||raw.freight.length!==FREIGHT.length)return null;
  const valid=t=>t&&Number.isSafeInteger(t.id)&&FREIGHT[t.id]?.kind===t.kind&&['x','y','a','hp','maxHp'].every(k=>Number.isFinite(t[k]))&&t.hp>0&&t.hp<=100&&t.maxHp===100&&t.r===20&&typeof t.claimed==='boolean'&&['fire','grace','fuse','hit','invuln','progress','vx','vy'].every(k=>t[k]===undefined||Number.isFinite(t[k])&&Math.abs(t[k])<=86400)&&t.x>=0&&t.x<=WORLD.w&&t.y>=0&&t.y<=WORLD.h;
  if(![...raw.trailers,...raw.loose,...raw.freight].every(valid)||raw.freight.some((f,i)=>f.id!==i)||raw.trailers.some(t=>!t.claimed)||raw.loose.some(t=>t.claimed)||[...raw.trailers,...raw.loose].some(t=>!raw.freight[t.id].claimed))return null;
  const physical=[...raw.trailers,...raw.loose];if(new Set(physical.map(t=>t.id)).size!==physical.length||!['peak','boostId'].every(k=>Number.isSafeInteger(raw[k])&&raw[k]>=0)||raw.peak>4)return null;
  return {trailers:structuredClone(raw.trailers),loose:structuredClone(raw.loose),freight:structuredClone(raw.freight),peak:raw.peak,boostId:raw.boostId};
}
