import {WORLD,dist} from './data.js?v=9';
const SIZE=48,COLS=WORLD.w/SIZE,ROWS=WORLD.h/SIZE,cache=new WeakMap();let sharedWalk=null;
const neighbors=[[1,0],[-1,0],[0,1],[0,-1]];
function index(p){return Math.max(0,Math.min(ROWS-1,Math.floor(p.y/SIZE)))*COLS+Math.max(0,Math.min(COLS-1,Math.floor(p.x/SIZE)));}
function center(i){return{x:(i%COLS+.5)*SIZE,y:(Math.floor(i/COLS)+.5)*SIZE};}
function state(s){let data=cache.get(s);if(data)return data;if(!sharedWalk){sharedWalk=new Uint8Array(COLS*ROWS);for(let i=0;i<sharedWalk.length;i++){const p=center(i);sharedWalk[i]=Number(!s.blocked(p.x,p.y,29));}}data={walk:sharedWalk,fields:new Map()};cache.set(s,data);return data;}
function nearest(data,p){let best=index(p);if(data.walk[best])return best;let distance=Infinity;for(let i=0;i<data.walk.length;i++)if(data.walk[i]){const d=dist(p,center(i));if(d<distance){best=i;distance=d;}}return best;}
function field(data,p){const goal=nearest(data,p);if(data.fields.has(goal))return data.fields.get(goal);const values=new Uint16Array(COLS*ROWS);values.fill(65535);values[goal]=0;const queue=[goal];for(let i=0;i<queue.length;i++){const cell=queue[i],x=cell%COLS,y=Math.floor(cell/COLS);for(const [dx,dy] of neighbors){const nx=x+dx,ny=y+dy;if(nx<0||nx>=COLS||ny<0||ny>=ROWS)continue;const next=ny*COLS+nx;if(!data.walk[next]||values[next]!==65535)continue;values[next]=values[cell]+1;queue.push(next);}}
  if(data.fields.size>=8)data.fields.delete(data.fields.keys().next().value);data.fields.set(goal,values);return values;
}
export function roadPoint(s,p){return s.blocked(p.x,p.y,29)?center(nearest(state(s),p)):{...p};}
export function navigationTarget(s,actor,target){
  const length=dist(actor,target),samples=Math.ceil(length/32);let clear=true;for(let i=1;i<=samples;i++){const t=i/samples;if(s.blocked(actor.x+(target.x-actor.x)*t,actor.y+(target.y-actor.y)*t,actor.r)){clear=false;break;}}if(clear)return target;
  const data=state(s),cell=nearest(data,actor),values=field(data,target);if(!data.walk[index(actor)])return center(cell);
  let best=cell,cost=values[cell],alignment=Infinity;const x=cell%COLS,y=Math.floor(cell/COLS);
  for(const [dx,dy] of neighbors){const nx=x+dx,ny=y+dy;if(nx<0||nx>=COLS||ny<0||ny>=ROWS)continue;const next=ny*COLS+nx,p=center(next),distance=dist(p,target);if(values[next]<cost||values[next]===cost&&distance<alignment){best=next;cost=values[next];alignment=distance;}}
  return center(best);
}
