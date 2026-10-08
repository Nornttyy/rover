import {WORLD,BLOCKS,terrainBlocked} from './data.js?v=8';
import {COMPOUND_SPRITES} from './assets.js?v=8';

// Static visual layout only. This never consumes the combat RNG or changes collision data.
export const TERRAIN_COLORS={road:'#547386',route:'#58798a',curb:'#bed1ce',curbEdge:'#284b60',garden:'#417966',paving:'#718e93',mark:'#d0dcda',seam:'#395e73'};
export const GARDENS=new Set([4,5,6,7,10,11,12,14,15,17,21,22,24,25]);
const hash=n=>{let v=Math.imul(n^947821,1597334677);v=Math.imul(v^(v>>>16),2246822507);return((v^(v>>>13))>>>0)/4294967296;};
export function inIsland(p,index){const points=BLOCKS[index].points;let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
const buildingKinds=['workshop','warehouse','tanks','power','recycling','station'];
export const BUILDINGS=[],STREET_PROPS=[],GROUND_DETAILS=[];
export function compoundFootprint(o,padding=18){
  const cos=Math.cos(o.a),sin=Math.sin(o.a),w=o.w/2+padding,h=o.h/2+padding;
  return [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[0,0]].map(([x,y])=>({x:o.x+x*w*cos-y*h*sin,y:o.y+x*w*sin+y*h*cos}));
}
const compoundBounds=o=>{const w=Math.abs(Math.cos(o.a))*o.w+Math.abs(Math.sin(o.a))*o.h,h=Math.abs(Math.sin(o.a))*o.w+Math.abs(Math.cos(o.a))*o.h;return{x:o.x-w/2,y:o.y-h/2,w,h};};
const overlap=(a,b)=>a.x<b.x+b.w+24&&a.x+a.w+24>b.x&&a.y<b.y+b.h+24&&a.y+a.h+24>b.y;
// Place whole generated locations. No roof assembly, extra foundations, or separate props.
// All placements are deterministic and remain inside the existing collision islands.
for(let island=0;island<BLOCKS.length;island++){
  const b=BLOCKS[island],garden=GARDENS.has(island),placed=[],center={x:b.points.reduce((n,p)=>n+p.x,0)/b.points.length,y:b.points.reduce((n,p)=>n+p.y,0)/b.points.length};
  let edge=0,length=0;for(let i=0;i<b.points.length;i++){const p=b.points[i],q=b.points[(i+1)%b.points.length],d=Math.hypot(q.x-p.x,q.y-p.y);if(d>length){length=d;edge=Math.atan2(q.y-p.y,q.x-p.x);}}
  for(let ordinal=0;ordinal<(garden?1:3);ordinal++){
    const id=garden?(island%2?'garden':'park'):buildingKinds[(island+ordinal*3)%buildingKinds.length],box=COMPOUND_SPRITES[id].box,ratio=box[2]/box[3];let chosen=null;
    for(const size of garden?[580,480,390,300,220,160,100,60]:[580,480,390,300,220]){
      let best=Infinity;
      for(const a of [0,Math.PI/2,edge])for(let iy=1;iy<12;iy++)for(let ix=1;ix<12;ix++){
        const o={id,x:b.x+b.w*ix/12,y:b.y+b.h*iy/12,w:size,h:size/ratio,a,island},bounds=compoundBounds(o);
        if(placed.some(other=>overlap(bounds,compoundBounds(other)))||!compoundFootprint(o).every(p=>inIsland(p,island)))continue;
        const score=Math.hypot(o.x-center.x,o.y-center.y)+(a?12:0);if(score<best){chosen=o;best=score;}
      }
      if(chosen)break;
    }
    if(!chosen)break;placed.push(chosen);BUILDINGS.push(chosen);
  }
}
// Low flat street details are drive-over. Raised props remain inside the existing curb islands.
for(let i=0;i<650;i++){
  const x=80+hash(i*67+32)*(WORLD.w-160),y=80+hash(i*67+33)*(WORLD.h-160);if(terrainBlocked(x,y,50)||Math.hypot(x-WORLD.home.x,y-WORLD.home.y)<210)continue;
  const id=i%8===0?'manhole':i%8===1?'grate':i%8===2?'patch':'chips',size=id==='patch'?78:id==='chips'?28:36;GROUND_DETAILS.push({id,x,y,w:size,h:id==='grate'?24:size,a:hash(i+2500)*Math.PI*2});
}
// Authored low-relief detail around the starting plaza; not new obstacles or interactables.
GROUND_DETAILS.push({id:'manhole',x:WORLD.home.x+133,y:WORLD.home.y+228,w:42,h:42,a:0},{id:'grate',x:WORLD.home.x-142,y:WORLD.home.y+144,w:48,h:26,a:0},{id:'patch',x:WORLD.home.x-105,y:WORLD.home.y+385,w:102,h:76,a:.12},{id:'chips',x:WORLD.home.x+100,y:WORLD.home.y+360,w:32,h:30,a:0});
GROUND_DETAILS.push({id:'grate',x:WORLD.home.x+118,y:WORLD.home.y+440,w:46,h:24,a:Math.PI/2},{id:'manhole',x:WORLD.home.x-138,y:WORLD.home.y+590,w:36,h:36,a:0},{id:'chips',x:WORLD.home.x-68,y:WORLD.home.y+275,w:29,h:25,a:0},{id:'patch',x:WORLD.home.x+220,y:WORLD.home.y+460,w:62,h:42,a:-.2});
export const ROAD_PATHS=[
  [[.04,0],[.20,.03],[.26,.16],[.26,.26],[.43,.34],[.52,.45],[.58,.57],[.60,.75],[.68,.85],[.81,.95],[1,.98]],
  [[0,.28],[.10,.25],[.30,.27],[.47,.23],[.76,.24],[.85,.16],[.79,0]],
  [[0,.46],[.06,.48],[.26,.51],[.50,.56],[.70,.54],[.80,.42],[.92,.42],[1,.40]],
  [[0,.73],[.12,.71],[.36,.69],[.54,.64],[.65,.60],[.76,.53],[.96,.48],[1,.50]],
  [[.34,1],[.31,.92],[.30,.77],[.34,.53],[.36,.39],[.46,.33],[.65,.33],[.81,.45],[.91,.45],[1,.59]],
  [[0,.89],[.08,.88],[.28,.93],[.48,.93],[.62,.92],[.77,.78],[.95,.76],[1,.75]]
].map(path=>path.map(([x,y])=>({x:x*WORLD.w,y:y*WORLD.h})));
function sample(path){const result=[];for(let i=0;i<path.length-1;i++){const p0=path[Math.max(0,i-1)],p1=path[i],p2=path[i+1],p3=path[Math.min(path.length-1,i+2)];for(let j=0;j<18;j++){const t=j/18,t2=t*t,t3=t2*t,resultPoint={};for(const k of ['x','y'])resultPoint[k]=.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);result.push(resultPoint);}}result.push(path.at(-1));return result;}
export const ROAD_CURVES=ROAD_PATHS.map(sample);
export const ROAD_DASHES=[];
for(const path of ROAD_CURVES){let travelled=0,last=0;for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);while(last+58<=travelled+d){last+=58;const t=(last-travelled)/d,x=p.x+dx*t,y=p.y+dy*t;if(!terrainBlocked(x,y,55))ROAD_DASHES.push({x,y,w:23,h:2.8,a:Math.atan2(dy,dx)});}travelled+=d;}}
