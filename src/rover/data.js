export const VERSION=1;
export const SAVE_KEY='mobile-base-v1';
export const LEGACY_WORLD={w:960,h:1440,home:{x:480,y:1270,r:92},duration:180};
export const LEGACY2_WORLD={w:1920,h:2880,home:{x:960,y:2510,r:100},duration:480};
export const WORLD={w:6144,h:6144,home:{x:3200,y:3280,r:105}};
export const MAP_REVISION=9;
// Measured from district-v9.png (1254 x 1254), not the retired separate bay sprite.
export const RECOVERY_ROOF={x:622/1254*WORLD.w,y:572/1254*WORLD.h,w:76/1254*WORLD.w,h:36/1254*WORLD.h};
export const DRIVE={speed:224,boostTime:.65,boostCooldown:3.5,boostMultiplier:1.85,ramDamage:60,gunInterval:.34};
export const MODULES=[
  {id:'drill',name:'冲撞钻头',sprite:'drill',cost:320,power:2,x:0,y:-42,angle:0,brief:'车头撞击 · 35 伤害/秒',detail:'向前顶住敌人持续伤害。撞击时仍会受伤。'},
  {id:'side',name:'侧翼机炮',sprite:'side',cost:420,power:2,x:24,y:0,angle:Math.PI/2,brief:'右侧开火 · 20 伤害 / 0.65 秒',detail:'只攻击车身右侧。绕圈驾驶，让炮口对准敌人。'},
  {id:'flame',name:'尾焰喷口',sprite:'flame',cost:480,power:2,x:0,y:34,angle:Math.PI,brief:'车尾扇形 · 13 伤害 / 0.22 秒',detail:'短射程、能烧到多个目标。适合带着追兵跑。'},
  {id:'cargo',name:'磁力货箱',sprite:'cargo',cost:180,power:1,x:0,y:14,angle:0,brief:'拾取范围 +60 · 车速 −8%',detail:'更容易吸取经验和零件，不增加拖挂长度。'},
  {id:'armor',name:'缓冲装甲',sprite:'armor',cost:240,power:1,x:-22,y:-5,angle:0,brief:'耐久 +60 · 车速 −5%',detail:'提高容错，但不会挡住所有伤害。每次出发修满。'},
  {id:'repair',name:'应急维修',sprite:'repair',cost:400,power:2,x:-19,y:16,angle:0,brief:'脱战修复 · 每趟最多 50 耐久',detail:'5 秒未受伤后，每秒恢复 1 点耐久。'},
  {id:'rocket',name:'火箭巢',sprite:'equip:rocket',cost:850,power:2,brief:'追踪火箭 · 范围爆炸',detail:'每 2.8 秒发射追踪火箭，爆炸伤害 65。'},
  {id:'tesla',name:'电弧线圈',sprite:'equip:tesla',cost:720,power:2,brief:'连锁电击 · 最多 3 个目标',detail:'电弧自动寻找附近敌人，适合对付密集追兵。'},
  {id:'saw',name:'环绕锯',sprite:'equip:saw',cost:600,power:2,brief:'环绕切割 · 近身防守',detail:'一把锯刃环绕车辆，每次切到造成 22 伤害。'},
  {id:'mine',name:'布雷器',sprite:'equip:mine',cost:560,power:2,brief:'移动布雷 · 感应爆炸',detail:'驾驶时在车尾留下地雷，追兵靠近后爆炸。'},
  {id:'laser',name:'激光器',sprite:'equip:laser',cost:800,power:2,brief:'贯穿光束 · 每 1.2 秒',detail:'光束贯穿整条射线上的敌人。'},
  {id:'cryo',name:'冷却喷雾',sprite:'equip:cryo',cost:680,power:2,brief:'近身冰雾 · 减速 45%',detail:'每两秒冻结附近追兵的行动速度。'}
];
// Permanent purchases: entry support, mid-tier chassis, and advanced weapons.
export const MODULE_PRICES=Object.freeze(Object.fromEntries(MODULES.map(m=>[m.id,m.cost])));
export const MODULE_BY_ID=Object.fromEntries(MODULES.map(m=>[m.id,m]));
export const ENEMIES={
  drone:{hp:48,speed:65,r:18,damage:7,sprite:'drone'},
  spitter:{hp:72,speed:46,r:22,damage:10,sprite:'spitter'},
  ram:{hp:115,speed:50,r:24,damage:14,sprite:'ram'},
  boss:{hp:1100,speed:32,r:52,damage:18,sprite:'boss'},
  raider:{hp:64,speed:112,r:20,damage:9,sprite:'raider'}
};
// Authored positions: three low-risk caches, a middle route and a northern risk/reward loop.
export const LEGACY_CACHES=[
  [480,1100,12],[270,1260,14],[720,1280,16],
  [340,880,30],[630,800,36],[480,630,42],
  [255,325,60],[705,325,70],[480,205,80]
].map(([x,y,value],i)=>({id:i,x,y,value}));
export const LEGACY2_CACHES=[...LEGACY_CACHES.map(c=>({...c,x:c.id===6?470:c.id===7?1490:c.x+480,y:c.y+(c.id===0?1200:c.id<3?1300:1400)})),
  ...[[450,1900,24],[1470,2010,30],[980,1380,40],[460,1150,36],[1450,1110,44],[950,760,50],[410,520,55],[1510,500,60],[960,260,80]].map(([x,y,value],i)=>({id:i+9,x,y,value}))];
export const LEGACY2_DEPOTS=[
  {id:0,name:'货场',x:535,y:1220,r:105,duration:32,hp:340},
  {id:1,name:'工厂',x:1580,y:610,r:105,duration:42,hp:460}
];
export const LEGACY2_FREIGHT=[
  ['cargo',960,2440,0,55],['cargo',640,2230,0,60],['repair',1330,2360,0,70],['gun',1380,2100,0,75],['bomb',500,2050,0,45],
  ['cargo',960,1330,1,80],['cargo',1450,960,1,85],['repair',1360,1370,1,90],['gun',430,950,1,95],['bomb',700,950,1,60]
].map(([kind,x,y,destination,value],id)=>({id,kind,x,y,destination,value,hp:100,maxHp:100,a:0,r:20,claimed:false}));
export const TRAILER_NAMES={cargo:'储能拖挂',repair:'维修拖挂',gun:'火炮拖挂',bomb:'爆破拖挂'};
export const CACHES=[{id:0,x:3200,y:3500,value:12},...Array.from({length:35},(_,i)=>({id:i+1,x:300+((i*1739+627)%5450),y:300+((i*2177+1379)%5450),value:8+(i%4)*4}))];
export const FREIGHT=[['gun',3072,3010],['cargo',2850,3260],['repair',3400,3450],['bomb',3200,3560],
  ...Array.from({length:40},(_,i)=>[['gun','cargo','repair','bomb'][i%4],300+((i*1597+823)%5450),300+((i*1879+1107)%5450)])].map(([kind,x,y],id)=>({id,kind,x,y,hp:100,maxHp:100,a:0,r:20,claimed:false}));
// The broad route network stays open; only actual roof/container islands collide.
export const LEGACY2_BLOCKS=[
  {x:0,y:0,w:540,h:470},{x:1400,y:0,w:520,h:470},
  {x:0,y:590,w:215,h:270},{x:1710,y:590,w:210,h:270},
  {x:400,y:600,w:440,h:245},{x:1080,y:600,w:380,h:265},
  {x:0,y:1010,w:300,h:440},{x:1620,y:1010,w:300,h:440},
  {x:0,y:1550,w:300,h:495},{x:1620,y:1550,w:300,h:495},
  {x:540,y:1570,w:290,h:305},{x:1100,y:1570,w:250,h:305},
  {x:0,y:2160,w:560,h:495},{x:1400,y:2160,w:520,h:495},
  {x:0,y:2810,w:1920,h:70}
];
// Hand-traced curb islands from district-v5, including the small triangular gardens.
export const ISLANDS=[
 [[.018,.192],[.070,.092],[.123,.058],[.180,.091],[.225,.191],[.203,.234],[.071,.224]],
 [[.270,.083],[.399,.012],[.426,.033],[.477,.173],[.453,.210],[.343,.179]],
 [[.550,.113],[.582,.086],[.695,.065],[.741,.109],[.741,.201],[.696,.218],[.554,.210]],
 [[.785,0],[.950,0],[1,.076],[1,.120],[.871,.177],[.832,.149]],
 [[0,.335],[.060,.280],[.080,.291],[.027,.414],[0,.432]],
 [[.246,.227],[.262,.194],[.316,.241],[.393,.279],[.395,.297],[.362,.305],[.244,.270]],
 [[.491,.268],[.587,.256],[.599,.270],[.496,.316],[.485,.300]],
 [[.651,.276],[.677,.277],[.727,.339],[.722,.358],[.662,.310]],
 [[.793,.243],[.972,.203],[1,.221],[.968,.394],[.944,.416],[.783,.363]],
 [[.133,.287],[.279,.331],[.328,.381],[.261,.484],[.199,.502],[.084,.453]],
 [[.423,.385],[.450,.384],[.460,.410],[.431,.480],[.403,.488],[.387,.463]],
 [[.787,.429],[.873,.467],[.889,.486],[.877,.498],[.798,.508],[.782,.486]],
 [[.957,.464],[1,.511],[1,.541],[.943,.498]],
 [[0,.495],[.176,.552],[.197,.604],[.178,.663],[0,.722]],
 [[.247,.552],[.277,.539],[.281,.554],[.266,.587],[.255,.589]],
 [[.326,.571],[.444,.617],[.441,.638],[.322,.672],[.304,.657]],
 [[.798,.553],[.932,.519],[.953,.527],[.991,.664],[.973,.711],[.811,.677],[.741,.611]],
 [[.643,.628],[.669,.636],[.755,.710],[.754,.742],[.724,.771],[.700,.775],[.610,.670]],
 [[.066,.756],[.254,.711],[.278,.734],[.315,.892],[.279,.929],[.067,.841],[.045,.818]],
 [[.386,.744],[.526,.691],[.548,.711],[.601,.847],[.565,.884],[.486,.900],[.400,.810]],
 [[.776,.789],[.825,.754],[.958,.780],[1,.810],[1,.947],[.976,.953],[.811,.875],[.762,.823]],
 [[.611,.959],[.678,.850],[.699,.862],[.817,.943],[.813,.968],[.622,.990]],
 [[.368,.902],[.429,.956],[.424,.975],[.352,.985],[.352,.951]],
 [[0,.896],[.115,.940],[.161,1],[0,1]],
 [[.222,0],[.291,0],[.241,.034],[.223,.034]],[[.541,0],[.590,.036],[.610,.037],[.621,0]]
].map(points=>points.map(([x,y])=>({x:x*WORLD.w,y:y*WORLD.h})));
export const BLOCKS=ISLANDS.map(points=>({x:Math.min(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),w:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),h:Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)),points}));
export function terrainBlocked(x,y,r=23){
  if(x<r||y<r||x>WORLD.w-r||y>WORLD.h-r)return true;
  // Only the roof painted in the full map blocks motion; the apron is drive-over.
  if(x+r>RECOVERY_ROOF.x&&x-r<RECOVERY_ROOF.x+RECOVERY_ROOF.w&&y+r>RECOVERY_ROOF.y&&y-r<RECOVERY_ROOF.y+RECOVERY_ROOF.h)return true;
  for(const b of BLOCKS){if(x+r<b.x||x-r>b.x+b.w||y+r<b.y||y-r>b.y+b.h)continue;let inside=false;for(let i=0,j=b.points.length-1;i<b.points.length;j=i++){
    const a=b.points[j],p=b.points[i];if((a.y>y)!==(p.y>y)&&x<(p.x-a.x)*(y-a.y)/(p.y-a.y)+a.x)inside=!inside;
    const dx=p.x-a.x,dy=p.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));if(Math.hypot(x-a.x-dx*t,y-a.y-dy*t)<r)return true;
  }if(inside)return true;}return false;
}
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const angleTo=(a,b)=>Math.atan2(b.x-a.x,-(b.y-a.y));
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const powerOf=ids=>ids.reduce((n,id)=>n+(MODULE_BY_ID[id]?.power||0),0);
export function statsFor(ids=[]){return{hp:130+(ids.includes('armor')?60:0),speed:DRIVE.speed*(ids.includes('cargo')?.92:1)*(ids.includes('armor')?.95:1),capacity:90+(ids.includes('cargo')?60:0)};}
export function newProfile(){return{version:VERSION,bank:0,owned:[],equipped:[],runs:0,extractions:0,best:0,bossWins:0,deliveries:0,bestConvoy:0,bestTime:0,bestLevel:1,sound:true,run:null};}
export function cleanProfile(raw){
  const p=newProfile();if(!raw||raw.version!==VERSION)return p;
  for(const key of ['bank','runs','extractions','best','bossWins','deliveries','bestConvoy','bestTime','bestLevel'])p[key]=Number.isFinite(raw[key])?clamp(Math.floor(raw[key]),0,999999):p[key];
  p.owned=MODULES.filter(m=>raw.owned?.includes(m.id)).map(m=>m.id);
  for(const id of p.owned)if(raw.equipped?.includes(id)&&powerOf([...p.equipped,id])<=4)p.equipped.push(id);
  p.sound=raw.sound!==false;return p;
}
export function purchase(p,id){const m=MODULE_BY_ID[id];if(!m||p.owned.includes(id)||p.bank<m.cost)return false;p.bank-=m.cost;p.owned.push(id);if(powerOf([...p.equipped,id])<=4)p.equipped.push(id);return true;}
export function equip(p,id){if(!p.owned.includes(id))return false;const i=p.equipped.indexOf(id);if(i>=0){p.equipped.splice(i,1);return true;}if(powerOf([...p.equipped,id])>4)return false;p.equipped.push(id);return true;}
