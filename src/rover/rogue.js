import {DRIVE,statsFor,dist,angleTo,clamp} from './data.js?v=12';

export const UPGRADES=[
  {id:'rapid',name:'连发机芯',sprite:'side',max:6,detail:'主炮间隔 −12%',group:'主炮'},
  {id:'twin',name:'双联炮管',sprite:'gun',max:4,detail:'主炮多射一颗 · 单发伤害 80%',group:'主炮'},
  {id:'pierce',name:'穿甲弹',sprite:'fx:aqua',max:4,detail:'子弹多穿透一个敌人',group:'弹道'},
  {id:'bounce',name:'弹射弹',sprite:'fx:gold',max:4,detail:'命中后转向附近另一敌人',group:'弹道'},
  {id:'blade',name:'环绕切割',sprite:'equip:saw',max:5,detail:'增加一把环绕车辆的锯刃',group:'近身'},
  {id:'arc',name:'连锁电弧',sprite:'equip:tesla',max:5,detail:'自动电击 · 电弧连锁更多目标',group:'范围'},
  {id:'mine',name:'车尾布雷',sprite:'equip:mine',max:5,detail:'移动时留下感应地雷',group:'布置'},
  {id:'nova',name:'震荡冲撞',sprite:'fx:ring',max:5,detail:'冲撞同时放出范围震荡波',group:'冲撞'},
  {id:'power',name:'大口径',sprite:'gun',max:6,detail:'所有攻击伤害 +18%',group:'火力'},
  {id:'haste',name:'轻量底盘',sprite:'truck',max:5,detail:'车速 +6% · 冲撞冷却 −7%',group:'驾驶'},
  {id:'armor',name:'厚实装甲',sprite:'armor',max:6,detail:'耐久上限 +25 · 恢复 25 耐久',group:'防护'},
  {id:'magnet',name:'磁力收集',sprite:'equip:magnet',max:5,detail:'经验拾取范围 +45',group:'成长'},
  {id:'repair',name:'自愈焊机',sprite:'repair',max:5,detail:'每秒恢复 0.35 耐久',group:'防护'},
  {id:'rocket',name:'追踪火箭',sprite:'equip:rocket',max:5,detail:'追踪火箭爆炸 · 每级多一颗',group:'爆破'},
  {id:'laser',name:'贯穿激光',sprite:'equip:laser',max:5,detail:'光束穿过整条线上的敌人',group:'光束'},
  {id:'frost',name:'低温喷雾',sprite:'equip:cryo',max:5,detail:'近身冰雾 · 减速 45%',group:'控制'},
  {id:'oil',name:'滑油尾迹',sprite:'equip:oil',max:4,detail:'留下油迹 · 追兵减速 40%',group:'布置'},
  {id:'drone',name:'伴飞无人机',sprite:'equip:drone',max:4,detail:'多一架无人机 · 独立射击',group:'伙伴'},
  {id:'mortar',name:'榴弹轰炸',sprite:'equip:mortar',max:4,detail:'向敌群中心抛出爆炸榴弹',group:'爆破'},
  {id:'critical',name:'弱点雷达',sprite:'equip:radar',max:5,detail:'暴击概率 +5% · 暴击 2.2 倍',group:'火力'},
  {id:'longshot',name:'远射镜',sprite:'equip:radar',max:4,detail:'主炮与激光射程 +45',group:'弹道'},
  {id:'shield',name:'储能护盾',sprite:'equip:shield',max:5,detail:'护盾 +25 · 脱战自动充能',group:'防护'},
  {id:'thorns',name:'反应装甲',sprite:'armor',max:4,detail:'受伤时反击近身敌人',group:'防护'},
  {id:'siphon',name:'回收修复',sprite:'equip:drone',max:4,detail:'每次击破恢复 0.6 耐久',group:'防护'},
  {id:'growth',name:'经验增幅',sprite:'equip:magnet',max:4,detail:'经验获得 +10%',group:'成长'},
  {id:'supply',name:'应急补给',sprite:'convoy:repair',max:99999,detail:'立即恢复 35% 耐久',group:'补给'}
];
export const UPGRADE_BY_ID=Object.fromEntries(UPGRADES.map(u=>[u.id,u]));
export const newRogue=()=>({level:1,xp:0,next:8,offer:[],levels:{},nextBoss:180,bosses:0,eliteClock:75,rerolls:1,shield:0});
export const rank=(s,id)=>s.rogue.levels[id]||0;
export const skill=(s,id)=>rank(s,id)+Number(s.modules.includes(({arc:'tesla',blade:'saw',frost:'cryo'})[id]||id));
export const damageScale=s=>1+rank(s,'power')*.18;
export const gunInterval=s=>DRIVE.gunInterval*Math.pow(.88,rank(s,'rapid'));
export const boostCooldown=s=>DRIVE.boostCooldown*Math.pow(.93,rank(s,'haste'));
export const pickupRadius=s=>140+rank(s,'magnet')*45+(s.modules.includes('cargo')?60:0);
export function syncStats(s){const stats=statsFor(s.modules);s.player.maxHp=stats.hp+rank(s,'armor')*25;s.player.speed=stats.speed*(1+rank(s,'haste')*.06);}
function roll(s){const pool=UPGRADES.filter(u=>u.id!=='supply'&&rank(s,u.id)<u.max);if(pool.length<3)pool.push(UPGRADE_BY_ID.supply);const result=[];while(pool.length&&result.length<3){const i=Math.floor(s.random()*pool.length);result.push(pool.splice(i,1)[0].id);}s.rogue.offer=result;}
export function checkLevel(s){const r=s.rogue;if(r.offer.length||r.xp<r.next)return;r.xp-=r.next;r.level++;r.next=8+(r.level-1)*5;roll(s);s.emit('level-up');}
export function grantXP(s,n){if(!(n>0))return;const batteries=s.convoy.trailers.filter(t=>t.kind==='cargo').length;s.rogue.xp+=n*(1+batteries*.15+rank(s,'growth')*.1);checkLevel(s);}
export function choose(s,id){const r=s.rogue,u=UPGRADE_BY_ID[id];if(!r.offer.includes(id)||!u)return false;r.levels[id]=rank(s,id)+1;r.offer=[];syncStats(s);if(id==='armor')s.player.hp=Math.min(s.player.maxHp,s.player.hp+25);if(id==='shield')r.shield=rank(s,id)*25;if(id==='supply')s.player.hp=Math.min(s.player.maxHp,s.player.hp+s.player.maxHp*.35);s.emit('upgrade');checkLevel(s);return true;}
export function reroll(s){if(!s.rogue.offer.length||s.rogue.rerolls<=0)return false;const previous=[...s.rogue.offer];s.rogue.rerolls--;roll(s);if(s.rogue.offer.every(id=>previous.includes(id))){const alternative=UPGRADES.find(u=>u.id!=='supply'&&!previous.includes(u.id)&&rank(s,u.id)<u.max);if(alternative)s.rogue.offer[0]=alternative.id;}return true;}
export function rogueWeapons(s,dt){
  const p=s.player,scale=damageScale(s),r=s.rogue;
  if(rank(s,'repair'))p.hp=Math.min(p.maxHp,p.hp+dt*rank(s,'repair')*.35);
  if(rank(s,'shield')&&s.time-p.lastHit>4)r.shield=Math.min(rank(s,'shield')*25,r.shield+dt*6);
  for(const name of ['blade','arc','mine','rocket','laser','frost','oil','drone','mortar'])if(!Number.isFinite(s.cooldowns[name]))s.cooldowns[name]=0;
  if(skill(s,'blade')&&s.cooldowns.blade<=0){s.cooldowns.blade=.32;for(let i=0;i<skill(s,'blade');i++){const a=s.time*2.7+i*Math.PI*2/skill(s,'blade'),blade={x:p.x+Math.cos(a)*90,y:p.y+Math.sin(a)*90};for(const e of s.enemies)if(e.born<=0&&dist(e,blade)<e.r+23)s.hurtEnemy(e,22*scale);}}
  if(skill(s,'arc')&&s.cooldowns.arc<=0){let from=p;const hit=[],points=[{x:p.x,y:p.y}];for(let i=0;i<2+skill(s,'arc');i++){const e=s.enemies.filter(e=>e.hp>0&&e.born<=0&&!hit.includes(e)&&dist(e,from)<(i?155:250)).sort((a,b)=>dist(a,from)-dist(b,from))[0];if(!e)break;hit.push(e);points.push({x:e.x,y:e.y});s.hurtEnemy(e,(20+skill(s,'arc')*6)*scale);from=e;}if(hit.length){s.cooldowns.arc=1.8;s.effect('arc',p.x,p.y,.23,{points});s.emit('cannon');}}
  if(skill(s,'mine')&&Math.hypot(p.vx,p.vy)>60&&s.cooldowns.mine<=0){s.cooldowns.mine=Math.max(.8,2.6-skill(s,'mine')*.3);const x=p.x-Math.sin(p.a)*48,y=p.y+Math.cos(p.a)*48;if(!s.blocked(x,y,12))s.mines.push({x,y,life:18,arm:.45});}
  for(const m of s.mines){m.life-=dt;m.arm-=dt;if(m.arm<=0&&s.enemies.some(e=>e.born<=0&&e.hp>0&&dist(e,m)<e.r+42)){for(const e of s.enemies)if(dist(e,m)<110+e.r)s.hurtEnemy(e,(48+skill(s,'mine')*12)*scale);m.life=0;s.effect('blast',m.x,m.y,.4);s.emit('kill',m.x,m.y);}}
  s.mines=s.mines.filter(m=>m.life>0).slice(-24);
  const target=s.nearest(350+rank(s,'longshot')*45);
  if(target&&skill(s,'rocket')&&s.cooldowns.rocket<=0){s.cooldowns.rocket=2.8;for(let i=0;i<skill(s,'rocket');i++){s.shoot(p,angleTo(p,target)+(i-(skill(s,'rocket')-1)/2)*.18,65*scale,270,'rocket');s.bullets.at(-1).life=2.8;}s.emit('cannon');}
  if(target&&skill(s,'laser')&&s.cooldowns.laser<=0){s.cooldowns.laser=1.2;const a=angleTo(p,target),dx=Math.sin(a),dy=-Math.cos(a);let reach=360+rank(s,'longshot')*45;for(let t=20;t<reach;t+=20)if(s.blocked(p.x+dx*t,p.y+dy*t,2)){reach=t;break;}for(const e of s.enemies){const x=e.x-p.x,y=e.y-p.y,along=x*dx+y*dy,across=Math.abs(x*dy-y*dx);if(e.born<=0&&along>0&&along<reach&&across<e.r+6)s.hurtEnemy(e,(28+skill(s,'laser')*9)*scale);}s.effect('laser',p.x,p.y,.15,{points:[{x:p.x,y:p.y},{x:p.x+dx*reach,y:p.y+dy*reach}]});s.emit('laser');}
  if(skill(s,'frost')&&s.cooldowns.frost<=0&&s.enemies.some(e=>dist(e,p)<170&&e.born<=0)){s.cooldowns.frost=2;for(const e of s.enemies)if(dist(e,p)<170+e.r){e.slow=2.4;s.hurtEnemy(e,8*skill(s,'frost')*scale);}s.effect('frost',p.x,p.y,.5);}
  if(rank(s,'oil')&&Math.hypot(p.vx,p.vy)>60&&s.cooldowns.oil<=0){s.cooldowns.oil=.6;s.oil.push({x:p.x,y:p.y,life:9});}for(const o of s.oil){o.life-=dt;for(const e of s.enemies)if(dist(e,o)<70+e.r)e.oiled=.3;}s.oil=s.oil.filter(o=>o.life>0).slice(-22);
  if(rank(s,'drone')&&s.cooldowns.drone<=0){s.cooldowns.drone=.7;for(let i=0;i<rank(s,'drone');i++){const a=s.time*.9+i*Math.PI*2/rank(s,'drone'),drone={x:p.x+Math.cos(a)*120,y:p.y+Math.sin(a)*120,a:0},e=s.enemies.filter(e=>e.hp>0&&e.born<=0&&dist(drone,e)<270).sort((a,b)=>dist(a,drone)-dist(b,drone))[0];if(e){drone.a=angleTo(drone,e);s.shoot(drone,drone.a,10*scale,430,'drone');}}}
  if(target&&rank(s,'mortar')&&s.cooldowns.mortar<=0){s.cooldowns.mortar=3;const a=angleTo(p,target);s.shoot(p,a,(65+rank(s,'mortar')*15)*scale,dist(p,target)/.75,'mortar');s.bullets.at(-1).life=.75;s.emit('cannon');}
}
export function firePrimary(s,target){const count=1+rank(s,'twin'),a=angleTo(s.player,target),damage=12*damageScale(s)*(count>1?.8:1);for(let i=0;i<count;i++){const spread=(i-(count-1)/2)*.095;s.shoot(s.player,a+spread,damage);const b=s.bullets.at(-1);b.pierce=rank(s,'pierce');b.bounce=rank(s,'bounce');b.hitIds=[];b.life=1.05+rank(s,'longshot')*.1;}s.cooldowns.gun=gunInterval(s);s.emit('shot');}
export function cleanRogue(raw){
  if(!raw||!Number.isSafeInteger(raw.level)||raw.level<1||raw.level>100000||!Number.isFinite(raw.xp)||raw.xp<0||raw.xp>1e7||raw.next!==8+(raw.level-1)*5||!Array.isArray(raw.offer)||raw.offer.length>3||new Set(raw.offer).size!==raw.offer.length||!raw.levels||Array.isArray(raw.levels))return null;
  const levels={};for(const [id,n] of Object.entries(raw.levels)){const u=UPGRADE_BY_ID[id];if(!u||!Number.isSafeInteger(n)||n<0||n>u.max)return null;levels[id]=n;}
  if(raw.offer.some(id=>!UPGRADE_BY_ID[id]||(levels[id]||0)>=UPGRADE_BY_ID[id].max)||!['nextBoss','eliteClock','shield'].every(k=>Number.isFinite(raw[k]))||raw.shield<0||raw.shield>(levels.shield||0)*25||!Number.isSafeInteger(raw.bosses)||raw.bosses<0||![0,1].includes(raw.rerolls))return null;
  return {...raw,levels,offer:[...raw.offer]};
}
