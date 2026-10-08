import {MODULE_BY_ID,powerOf,clamp,dist} from './data.js?v=12';

export const TOWN={w:1536,h:1536,home:{x:768,y:768,r:85},endless:true};
export const ROOM={w:1600,h:1600,door:{x:800,y:1464,r:65}};
export const HOUSE_TYPES={small:{name:'小房子',floors:[1,1]},large:{name:'大房子',floors:[1,1]},villa:{name:'别墅',floors:[2,3]},tower:{name:'住宅楼',floors:[5,8]}};
// Entrances sit on the curb outside the illustrated roofs; interiors are real explorable spaces.
export const COMPOUNDS=[{x:.098,y:.093,w:.358,h:.328},{x:.543,y:.093,w:.360,h:.328},{x:.097,y:.519,w:.358,h:.336},{x:.543,y:.519,w:.360,h:.336}];
// These Q illustrations have front-facing facades: rotating a whole district
// would make houses lie on their side. Keep the art upright; vary whole scenes.
export function district(tx,ty){const hash=(Math.imul(tx|0,73856093)^Math.imul(ty|0,19349663)^817)>>>0;return{tx,ty,rotation:0,variant:(hash>>>3)%2,hash};}
export function rotateLocal(x,y,rotation){for(let i=0;i<rotation;i++)[x,y]=[1-y,x];return{x,y};}
export function houseFromId(id){
  if(typeof id!=='string'||!/^(-?\d+),(-?\d+):[0-3]$/.test(id))return null;const [cell,index]=id.split(':'),[tx,ty]=cell.split(',').map(Number),i=Number(index);if(![tx,ty].every(Number.isSafeInteger))return null;
  const d=district(tx,ty),b=COMPOUNDS[i],p=rotateLocal(b.x+b.w/2,b.y+b.h+.025,d.rotation),kind=['food','parts','meds','wire'][(i+(d.hash>>>4))%4],type=(d.variant?['small','large','villa','tower']:['small','large','small','large'])[i],limits=HOUSE_TYPES[type].floors,floors=limits[0]+(d.hash>>>7)%(limits[1]-limits[0]+1);
  return{id,tx,ty,index:i,x:(tx+p.x)*TOWN.w,y:(ty+p.y)*TOWN.h,kind,type,floors,name:HOUSE_TYPES[type].name,danger:1+Number(type==='large')+Number(type==='villa')+Number(type==='tower')+Math.min(3,Math.floor((Math.abs(tx)+Math.abs(ty))/3))};
}
export function floorInfo(key){if(typeof key!=='string')return null;const [id,n,...extra]=key.split('@'),house=houseFromId(id),floor=Number(n);return !extra.length&&house&&Number.isInteger(floor)&&floor>=1&&floor<=house.floors?{house,floor}:null;}
export function houseCleared(run,id){const house=houseFromId(id);return !!house&&Array.from({length:house.floors},(_,i)=>run.rooms[id+'@'+(i+1)]?.nodes.every(n=>n.open)).every(Boolean);}
export function districtDoors(p,radius=1){const cx=Math.floor(p.x/TOWN.w),cy=Math.floor(p.y/TOWN.h),list=[];for(let ty=cy-radius;ty<=cy+radius;ty++)for(let tx=cx-radius;tx<=cx+radius;tx++)for(let i=0;i<4;i++)list.push(houseFromId(tx+','+ty+':'+i));return list;}
export const HOUSES=districtDoors(TOWN.home,0);
export const ZOMBIES={
  walker:{hp:48,speed:46,r:17,damage:8,sprite:'walker',loot:2},
  runner:{hp:38,speed:101,r:15,damage:9,sprite:'runner',loot:3},
  spitter:{hp:78,speed:38,r:20,damage:10,sprite:'spitter',loot:4},
  brute:{hp:360,speed:34,r:29,damage:18,sprite:'brute',loot:12}
};
export const SUPPLIES={parts:{name:'零件',sprite:'parts'},wire:{name:'电子元件',sprite:'parts'},food:{name:'罐头',sprite:'bag'},meds:{name:'药品',sprite:'meds'},ammo:{name:'弹药',sprite:'bag'}};
export const FIELD_MODS=[
  {id:'rapid',name:'改良机芯',sprite:'side',group:'fire',max:3,parts:18,wire:1,detail:'主炮射速 +12%'},
  {id:'twin',name:'加装炮管',sprite:'gun',group:'fire',max:2,parts:32,wire:2,detail:'多一发子弹 · 单发 80%伤害'},
  {id:'rocket',name:'火箭支架',sprite:'equip:rocket',group:'fire',max:2,parts:48,wire:3,detail:'增加追踪火箭'},
  {id:'armor',name:'加固车壳',sprite:'armor',group:'body',max:3,parts:20,wire:0,detail:'车辆耐久 +25，补回 25'},
  {id:'haste',name:'发动机调校',sprite:'truck',group:'body',max:3,parts:24,wire:1,detail:'车速 +6% · 冲撞冷却 −7%'},
  {id:'magnet',name:'回收磁铁',sprite:'equip:magnet',group:'body',max:3,parts:16,wire:1,detail:'车辆拾取范围 +45'},
  {id:'patch',name:'修车',sprite:'repair',group:'supply',max:999,parts:12,wire:0,detail:'恢复 45 点车辆耐久'},
  {id:'heal',name:'包扎',sprite:'survival:meds',group:'supply',max:999,parts:0,wire:0,meds:1,detail:'恢复 45 点人物生命'},
  {id:'ammo',name:'补充弹药',sprite:'cargo',group:'supply',max:999,parts:0,wire:0,food:1,detail:'补充 45 发手枪弹药'}
];
export const FIELD_BY_ID=Object.fromEntries(FIELD_MODS.map(m=>[m.id,m]));
export function fieldPrice(run,id){const m=FIELD_BY_ID[id];if(!m)return null;const n=run.rogue.levels[id]||0;return{parts:m.parts*(m.max<999?n+1:1),wire:m.wire*(m.max<999?n+1:1),meds:m.meds||0,food:m.food||0};}
export function streetBlocked(x,y,r=16){
  if(!Number.isFinite(x)||!Number.isFinite(y))return true;
  const tx=Math.floor(x/TOWN.w),ty=Math.floor(y/TOWN.h),d=district(tx,ty);let p={x:x/TOWN.w-tx,y:y/TOWN.h-ty};p=rotateLocal(p.x,p.y,(4-d.rotation)%4);const margin=r/TOWN.w;
  return COMPOUNDS.some(b=>p.x+margin>b.x&&p.x-margin<b.x+b.w&&p.y+margin>b.y&&p.y-margin<b.y+b.h);
}
// Furniture and wall footprints are in normalized image coordinates. Floor artwork
// is drawn whole, and the same layout governs navigation, loot and the camera.
const SMALL_BLOCKS=[[.055,.035,.372,.164],[.58,.032,.369,.195],[.049,.326,.142,.259],[.711,.358,.238,.176],[.89,.534,.059,.104],[.092,.668,.268,.136]];
const ROOMS_CACHE=new Map();
const rect=([x,y,w,h],size)=>({x:x*size,y:y*size,w:w*size,h:h*size});
const verticalWalls=(xs,segments)=>xs.flatMap(x=>segments.map(([y,h])=>[x,y,.027,h]));
const horizontalWalls=(ys,leftEnd,rightStart)=>ys.flatMap(([y,h])=>[[.04,y,leftEnd-.04,h],[rightStart,y,.96-rightStart,h]]);
export function roomLayout(house,floor=1){
  const type=house?.type||'small',mirror=type!=='small'&&((house.tx+house.ty+house.index+floor)&1)===1,key=type+':'+floor+':'+Number(mirror);if(ROOMS_CACHE.has(key))return ROOMS_CACHE.get(key);
  const size={small:1600,large:2400,villa:2800,tower:3200}[type];
  const asset=type==='small'?'interior':type==='large'?'interiorLarge':type==='villa'?(floor===1?'interiorVilla':'interiorVillaUpper'):'interiorTower';
  let boxes,nodes,spawnPoints;
  if(type==='small'){
    boxes=SMALL_BLOCKS;nodes=[[.28,.23],[.65,.25],[.67,.59]];spawnPoints=[[.28,.44],[.53,.45],[.72,.70]];
  }else if(type==='large'){
    boxes=[...verticalWalls([.411,.563],[[.04,.384],[.508,.392]]),
      ...[.395,.514].flatMap(y=>[[.04,y,.184,.028],[.313,y,.125,.028],[.571,y,.116,.028],[.780,y,.18,.028]]),
      [.055,.05,.065,.105],[.117,.07,.155,.085],[.275,.04,.125,.098],[.063,.285,.09,.114],
      [.61,.048,.104,.089],[.79,.05,.13,.175],[.85,.34,.105,.055],
      [.064,.555,.185,.12],[.316,.559,.082,.11],[.062,.752,.098,.1],
      [.734,.718,.178,.08],[.59,.745,.087,.087],[.908,.557,.051,.17],[.75,.81,.152,.044]];
    nodes=[[.32,.32],[.69,.32],[.30,.73],[.71,.73]];spawnPoints=[[.30,.30],[.70,.30],[.30,.70],[.70,.70],[.50,.42]];
  }else if(type==='villa'&&floor===1){
    boxes=[...verticalWalls([.390,.585],[[.04,.212],[.296,.111],[.489,.195],[.748,.102]]),...horizontalWalls([[.308,.053],[.565,.029]],.390,.612),
      [.063,.053,.32,.105],[.318,.125,.069,.095],[.057,.16,.052,.118],
      [.735,.08,.195,.104],[.759,.197,.10,.058],[.613,.067,.052,.161],
      [.14,.398,.17,.14],[.059,.40,.051,.134],[.754,.404,.177,.132],[.625,.338,.121,.063],
      [.060,.608,.101,.113],[.178,.607,.20,.115],[.06,.773,.097,.077],
      [.626,.609,.054,.11],[.711,.604,.115,.11],[.834,.594,.099,.146],[.857,.752,.079,.09],
      [.49,.03,.020,.164]];
    nodes=[[.33,.27],[.68,.28],[.33,.455],[.67,.455],[.30,.76],[.70,.79]];
    spawnPoints=[[.26,.24],[.70,.29],[.35,.46],[.67,.46],[.29,.77],[.72,.79],[.50,.42],[.50,.64]];
  }else if(type==='villa'){
    boxes=[...verticalWalls([.38,.597],[[.024,.195],[.273,.150],[.479,.209],[.748,.103]]),...horizontalWalls([[.318,.023],[.561,.027]],.405,.623),
      [.10,.078,.12,.175],[.264,.046,.106,.104],[.633,.046,.094,.107],[.784,.076,.128,.175],
      [.125,.36,.254,.095],[.059,.43,.08,.123],[.246,.49,.041,.060],[.308,.513,.065,.04],
      [.65,.354,.096,.096],[.762,.354,.131,.10],[.62,.486,.075,.064],[.884,.429,.059,.11],
      [.06,.61,.055,.203],[.112,.611,.18,.134],[.14,.769,.052,.08],
      [.667,.613,.088,.12],[.766,.615,.082,.116],[.852,.61,.083,.132],[.874,.740,.058,.071],
      [.491,.03,.019,.155]];
    nodes=[[.30,.265],[.69,.265],[.32,.49],[.72,.52],[.30,.80],[.81,.81]];
    spawnPoints=[[.30,.265],[.69,.265],[.30,.48],[.72,.52],[.30,.80],[.81,.81],[.50,.42],[.50,.61]];
  }else{
    boxes=[...verticalWalls([.396,.577],[[.01,.168],[.249,.137],[.474,.146],[.710,.132]]),...horizontalWalls([[.262,.04],[.522,.045]],.42,.604),
      [.073,.043,.17,.09],[.07,.13,.06,.05],[.286,.04,.052,.108],
      [.61,.068,.116,.118],[.835,.055,.098,.156],[.9,.19,.042,.065],
      [.063,.325,.112,.155],[.307,.298,.082,.14],[.07,.465,.035,.055],
      [.61,.302,.09,.13],[.81,.315,.123,.085],[.816,.426,.113,.088],
      [.063,.669,.08,.131],[.065,.574,.055,.08],[.104,.582,.108,.078],[.18,.725,.107,.071],
      [.868,.575,.067,.141],[.813,.725,.094,.102],[.91,.735,.039,.056],
      [.493,.03,.015,.125]];
    nodes=[[.32,.22],[.69,.24],[.28,.445],[.74,.43],[.32,.75],[.73,.71]];
    spawnPoints=[[.31,.22],[.73,.24],[.28,.445],[.74,.43],[.32,.75],[.73,.71],[.50,.42],[.50,.61]];
  }
  const point=([x,y])=>({x:(mirror?1-x:x)*size,y:y*size});
  const layout={w:size,h:size,asset,mirror,type,door:{x:size*.50,y:size*.915,r:65},entry:{x:size*.50,y:size*.88},
    up:type==='villa'||type==='tower'?{...point([.46,.218]),r:65}:null,down:type==='villa'||type==='tower'?{...point([.54,.218]),r:65}:null,
    upArrival:{x:size*.50,y:size*.295},downArrival:{x:size*.50,y:size*.295},
    blocks:boxes.map(b=>rect(mirror?[1-b[0]-b[2],b[1],b[2],b[3]]:b,size)),nodes:nodes.map(point),spawnPoints:spawnPoints.map(point)};
  // Only finite layout variants are cached, never world coordinates.
  ROOMS_CACHE.set(key,layout);return layout;
}
export const ROOM_BLOCKS=roomLayout({type:'small'}).blocks;
export function roomBlocked(x,y,r=12,layout=roomLayout(null)){
  const nx=x/layout.w,ny=y/layout.h,doorway=nx>.43&&nx<.57&&ny>.84;
  return x<layout.w*.055+r||y<layout.h*.055+r||x>layout.w*.945-r||y>layout.h*(doorway?.965:.855)-r||layout.blocks.some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h);
}
export function validMods(modules){return Array.isArray(modules)&&new Set(modules).size===modules.length&&modules.every(id=>MODULE_BY_ID[id])&&powerOf(modules)<=4;}

const cache=new WeakMap(),neighbors=[[1,0],[-1,0],[0,1],[0,-1]];
function grid(s,target,radius){
  const indoor=s.zone!=='street',tx=Math.floor(target.x/TOWN.w),ty=Math.floor(target.y/TOWN.h),scene=indoor?s.roomKey:tx+','+ty,size=indoor?16:32,r=radius<=12?12:radius<=17?17:radius<=23?23:29;
  let state=cache.get(s);if(state?.scene!==scene){state={scene,grids:new Map()};cache.set(s,state);}if(state.grids.has(r))return state.grids.get(r);
  const cols=indoor?Math.ceil(s.bounds.w/size):144,rows=indoor?Math.ceil(s.bounds.h/size):cols,ox=indoor?0:(tx-1)*TOWN.w,oy=indoor?0:(ty-1)*TOWN.h,walk=new Uint8Array(cols*rows);
  for(let i=0;i<walk.length;i++)walk[i]=Number(!s.blocked(ox+(i%cols+.5)*size,oy+(Math.floor(i/cols)+.5)*size,r));
  const data={walk,cols,rows,ox,oy,size,fields:new Map()};state.grids.set(r,data);return data;
}
const center=(data,i)=>({x:data.ox+(i%data.cols+.5)*data.size,y:data.oy+(Math.floor(i/data.cols)+.5)*data.size});
const cellIndex=(data,p)=>clamp(Math.floor((p.y-data.oy)/data.size),0,data.rows-1)*data.cols+clamp(Math.floor((p.x-data.ox)/data.size),0,data.cols-1);
function nearest(data,p){const i=cellIndex(data,p);if(data.walk[i])return i;let best=-1,d=Infinity;for(let j=0;j<data.walk.length;j++)if(data.walk[j]){const n=dist(p,center(data,j));if(n<d){d=n;best=j;}}return best;}
export function safeStreet(p,r=21){if(!streetBlocked(p.x,p.y,r))return{x:p.x,y:p.y};for(let distance=24;distance<700;distance+=24)for(let i=0;i<16;i++){const a=i*Math.PI/8,q={x:p.x+Math.cos(a)*distance,y:p.y+Math.sin(a)*distance};if(!streetBlocked(q.x,q.y,r))return q;}return{x:p.x,y:p.y};}
export function survivalRoute(s,actor,target){
  const d=dist(actor,target),n=Math.ceil(d/24);let clear=true;for(let i=1;i<=n;i++)if(s.blocked(actor.x+(target.x-actor.x)*i/n,actor.y+(target.y-actor.y)*i/n,actor.r)){clear=false;break;}if(clear)return target;
  const data=grid(s,target,actor.r),goal=nearest(data,target),cell=nearest(data,actor);if(goal<0||cell<0)return actor;let field=data.fields.get(goal);
  if(!field){field=new Uint16Array(data.walk.length);field.fill(65535);field[goal]=0;const q=[goal];for(let i=0;i<q.length;i++){const c=q[i],x=c%data.cols,y=Math.floor(c/data.cols);for(const [dx,dy] of neighbors){const nx=x+dx,ny=y+dy,j=ny*data.cols+nx;if(nx<0||ny<0||nx>=data.cols||ny>=data.rows||!data.walk[j]||field[j]!==65535)continue;field[j]=field[c]+1;q.push(j);}}if(data.fields.size>=8)data.fields.delete(data.fields.keys().next().value);data.fields.set(goal,field);}
  if(!data.walk[cellIndex(data,actor)])return center(data,cell);
  let best=cell,cost=field[cell],alignment=Infinity;const x=cell%data.cols,y=Math.floor(cell/data.cols);for(const [dx,dy] of neighbors){const nx=x+dx,ny=y+dy,i=ny*data.cols+nx;if(nx<0||ny<0||nx>=data.cols||ny>=data.rows||!data.walk[i])continue;const d=dist(center(data,i),target);if(field[i]<cost||field[i]===cost&&d<alignment){best=i;cost=field[i];alignment=d;}}return center(data,best);
}
