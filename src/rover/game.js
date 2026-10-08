import {SAVE_KEY,WORLD,DRIVE,MODULE_BY_ID,newProfile,cleanProfile,purchase,equip,powerOf,clamp} from './data.js?v=12';
import {Expedition,STEP} from './core.js?v=12';
import {IMAGES} from './assets.js?v=12';
import {RoverRenderer} from './render.js?v=12';
import {RoverFeel,steerStick} from './feel.js?v=12';
import {roadPoint} from './navigation.js?v=12';
import {SurvivalRun} from './survival.js?v=12';
import {SurvivalRenderer} from './survival-render.js?v=12';
import {TOWN,safeStreet} from './survival-data.js?v=12';
export class RoverGame{
  constructor({canvas,createImage,createSurface,storage,audio,reducedMotion=false,runType=SurvivalRun,rendererType=SurvivalRenderer}){
    this.canvas=canvas;this.createImage=createImage;this.images={};this.storage=storage;this.audio=audio;this.reducedMotion=reducedMotion;
    this.runType=runType;const raw=storage.get(SAVE_KEY);this.profile=cleanProfile(raw);this.run=runType.restore(raw?.run);this.profile.run=this.run?.snapshot()||null;
    this.screen='garage';this.selected=null;this.progress=0;this.loaded=false;this.visible=true;this.input={x:0,y:0};this.keys=new Set();this.joy=null;this.pressed=null;this.toast=null;this.flash=0;this.returnGuide=false;this.lastTime=null;this.accumulator=0;this.lastSave=0;this.settled=false;this.justStarted=true;
    this.bounce=0;this.lootPulse=0;this.resultAge=0;this.uiTime=0;this.gearPage=0;this.fieldTab='fire';this.transition=0;this.lastImpact=-1;this.feel=new RoverFeel();this.renderer=new rendererType(canvas,this.images,createSurface);this.audio?.setEnabled(this.profile.sound);
  }
  resize({width,height,dpr=1}){const old=this.renderer.layout;if(Math.abs(old.width-width)>1||Math.abs(old.height-height)>100)this.clearInput();this.renderer.resize(width,height,dpr);this.draw();}
  async load(){let count=0;const assets=Object.entries(IMAGES);await Promise.all(assets.map(([key,url])=>new Promise((resolve,reject)=>{const img=this.createImage(),timeout=setTimeout(()=>reject(new Error('素材加载超时: '+url)),15000);img.onload=()=>{clearTimeout(timeout);this.images[key]=img;this.progress=++count/assets.length;resolve();};img.onerror=()=>{clearTimeout(timeout);reject(new Error('素材加载失败: '+url));};img.src=url;})));this.loaded=true;this.draw();}
  notify(text){this.toast={text,time:1.8};}
  draw(dt=0){this.renderer.draw(this,dt);}
  frame(now){const dt=this.lastTime===null?0:clamp((now-this.lastTime)/1000,0,.08);this.lastTime=now;if(!this.visible)return;
    this.uiTime+=dt;this.transition=Math.max(0,this.transition-dt);if(this.toast)this.toast.time-=dt;this.flash=Math.max(0,this.flash-dt*2.5);this.bounce=Math.max(0,this.bounce-dt*2.6);this.lootPulse=Math.max(0,this.lootPulse-dt*2.5);if(this.screen==='result')this.resultAge+=dt;
    if(this.loaded&&this.screen==='play'){
      this.accumulator+=dt;for(let n=0;this.accumulator+1e-10>=STEP&&n<5;n++){this.run.step(STEP,this.input);this.accumulator=Math.max(0,this.accumulator-STEP);if(this.run.phase!=='play'){this.settle();break;}if(this.run.rogue.offer.length){this.screen='upgrade';this.clearInput();this.save();break;}}
      this.feel.tick(this.run.actor?{player:this.run.actor,effects:this.run.effects}:this.run,dt,this.reducedMotion||this.run.mode==='foot');
      for(const event of this.run.events){this.audio?.play(event.type);if(event.type==='hurt'){this.flash=1;this.feel.kick=this.reducedMotion?0:2;}if(event.type==='loot'){this.lootPulse=1;this.feel.loot(event);}if(['ram','kill'].includes(event.type)&&this.uiTime-this.lastImpact>.18){this.lastImpact=this.uiTime;this.feel.kick=this.reducedMotion?0:event.type==='ram'?2.8:Math.max(this.feel.kick,.6);}if(event.type==='trailer-lost')this.notify('拖挂脱落');}this.run.events=[];
      this.audio?.motor(this.run.mode==='foot'?0:Math.min(1,Math.hypot(this.run.player.vx,this.run.player.vy)/DRIVE.speed));
      const actor=this.run.actor||this.run.player;if(this.waypoint&&Math.hypot(actor.x-this.waypoint.x,actor.y-this.waypoint.y)<75)this.waypoint=null;
      if(this.run.time-this.lastSave>5){this.save();this.lastSave=this.run.time;}
    }else this.audio?.motor(0);
    this.draw(dt);this.justStarted=false;
  }
  start(){if(!this.run||this.run.phase!=='play'){this.run=new this.runType(this.profile.equipped,9031+this.profile.runs*157);this.settled=false;this.profile.run=null;}
    this.feel.reset(this.run.actor||this.run.player);this.screen=this.run.rogue.offer.length?'upgrade':'play';this.returnGuide=false;this.justStarted=true;this.lastTime=null;this.accumulator=0;this.lastSave=this.run.time;this.clearInput();this.save();this.audio?.resume();this.audio?.unlock();this.draw();
  }
  settle(){if(this.settled||!this.run?.result)return;this.settled=true;this.resultAge=0;const r=this.run.result,p=this.profile;p.bank+=r.reward;p.runs++;p.bestTime=Math.max(p.bestTime,r.time);p.bestLevel=Math.max(p.bestLevel,r.level);p.bestConvoy=Math.max(p.bestConvoy,r.peak||0);p.bossWins+=r.bosses||0;if(r.success){p.extractions++;p.best=Math.max(p.best,r.reward);}p.run=null;this.screen='result';this.clearInput();this.storage.set(SAVE_KEY,{...p,run:null});}
  save(){if(this.run?.phase==='play')this.profile.run=this.run.snapshot();else this.profile.run=null;return this.storage.set(SAVE_KEY,{...this.profile});}
  clearInput(){this.input={x:0,y:0};this.keys.clear();this.joy=null;this.pressed=null;this.accumulator=0;}
  syncInput(){if(this.screen!=='play'){this.input={x:0,y:0};return;}const x=Number(this.keys.has('d')||this.keys.has('arrowright'))-Number(this.keys.has('a')||this.keys.has('arrowleft')),y=Number(this.keys.has('s')||this.keys.has('arrowdown'))-Number(this.keys.has('w')||this.keys.has('arrowup'));this.input=x||y?{x,y}:this.joy?.vector||{x:0,y:0};}
  setVisible(value){this.visible=value;this.clearInput();this.lastTime=null;if(!value){if(this.screen==='play')this.screen='pause';this.run?.cancelInteract();this.audio?.pause();this.save();}else{this.audio?.resume();this.draw();}}
  buttonAt(x,y){return [...this.renderer.buttons].reverse().find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);}
  pointerDown(x,y,id){if(!this.loaded)return;this.audio?.unlock();const point=this.renderer.point(x,y),b=this.buttonAt(point.x,point.y);
    if(b){const instant=['boost','detach'].includes(b.id);this.pressed={id,button:b.id,activated:instant};if(b.id!=='boost')this.audio?.play('tap');if(instant)this.action(b.id);return;}
    if(this.screen==='play'&&point.y>112&&!this.joy){this.joy={id,origin:{...point},base:{...point},vector:{x:0,y:0}};this.syncInput();}
  }
  pointerMove(x,y,id){if(!this.joy||this.joy.id!==id||this.screen!=='play')return;const p=this.renderer.point(x,y);this.joy.vector=steerStick(this.joy,p);this.syncInput();this.joy.base={x:clamp(this.joy.origin.x,44,346),y:clamp(this.joy.origin.y,142,this.renderer.layout.h-48)};}
  pointerUp(x,y,id){if(this.joy?.id===id){this.joy=null;this.syncInput();}if(this.pressed?.id===id){const p=this.renderer.point(x,y),button=this.buttonAt(p.x,p.y),pressed=this.pressed.button,activated=this.pressed.activated;this.pressed=null;if(!activated&&button?.id===pressed){if(pressed==='chart'){const r=this.renderer.chartRect;this.waypoint=this.run.survivalVersion?safeStreet({x:r.worldX+(p.x-r.x)/r.w*r.worldW,y:r.worldY+(p.y-r.y)/r.h*r.worldH}):roadPoint(this.run,{x:clamp((p.x-r.x)/r.w*WORLD.w,30,WORLD.w-30),y:clamp((p.y-r.y)/r.h*WORLD.h,30,WORLD.h-80)});}this.action(pressed);}}}
  pointerCancel(id){if(this.joy?.id===id){this.joy=null;this.syncInput();}if(this.pressed?.id===id)this.pressed=null;}
  keyboard(key,down){key=key.toLowerCase();const fresh=down&&!this.keys.has(key);if(fresh){if(this.screen==='upgrade'&&['1','2','3'].includes(key))this.action('pick:'+this.run.rogue.offer[Number(key)-1]);if([' ','enter'].includes(key)&&['garage','play','pause','result'].includes(this.screen))this.action(this.screen==='garage'?'start':this.screen==='play'?'action':this.screen==='pause'?'resume':'garage');if(key==='escape')this.action(this.screen==='play'?'pause':this.screen==='field-workshop'?'close-field':this.screen==='map'?'close-map':this.screen==='pause'?'resume':this.screen==='module'?'close':this.screen==='workshop'?'garage':'cancel');if(key==='q'&&this.screen==='play')this.run.detach();if(key==='m')this.action(this.screen==='play'?'map':'close-map');if(key==='shift'&&this.screen==='play')this.run.boost();}
    if(fresh&&key==='e')this.action('vehicle');if(fresh&&key==='r')this.action(this.screen==='field-workshop'?'close-field':'field-workshop');
    if(down)this.keys.add(key);else this.keys.delete(key);this.syncInput();
  }
  action(id){
    if(this.screen==='garage'){
      if(id==='workshop'||id==='arsenal'){this.gearPage=id==='arsenal'?1:0;this.screen='workshop';}
      if(id==='start'){this.start();return;}
      if(id==='sound'){this.profile.sound=!this.profile.sound;this.audio?.setEnabled(this.profile.sound);this.save();}
    }else if(this.screen==='workshop'){
      if(id==='garage')this.screen='garage';
      if(id==='gear-next')this.gearPage=(this.gearPage+1)%2;
      if(id==='gear-prev')this.gearPage=(this.gearPage+1)%2;
      if(id.startsWith('module:')){this.selected=id.slice(7);this.screen='module';}
    }else if(this.screen==='module'){
      if(id==='close')this.screen='workshop';
      if(id==='equip'&&!this.profile.run){const p=this.profile,m=MODULE_BY_ID[this.selected],owned=p.owned.includes(m.id);if((owned?equip(p,m.id):purchase(p,m.id))){this.audio?.play('upgrade');this.bounce=1;this.save();this.screen='workshop';if(!owned&&!p.equipped.includes(m.id))this.notify('已购入 · 电力已满');}else if(owned&&powerOf([...p.equipped,m.id])>4)this.notify('先卸下一件装备');}
    }else if(this.screen==='play'){
      if(id==='pause'){this.screen='pause';this.run.cancelInteract();this.clearInput();this.audio?.motor(0);this.save();}
      if(id==='action'){if(this.run.interacting)this.run.cancelInteract();else if(!this.run.context()){this.screen='map';this.clearInput();}else{const zone=this.run.zone,floor=this.run.floor;this.run.startInteract();if(zone!==this.run.zone||floor!==this.run.floor){this.clearInput();this.feel.reset(this.run.actor);this.justStarted=true;this.transition=.28;this.lastTime=null;this.waypoint=null;this.save();}}}
      if(id==='vehicle'&&this.run.toggleVehicle?.()){this.clearInput();this.feel.reset(this.run.actor);this.save();}
      if(id==='field-workshop'&&this.run.canModify?.()){this.screen='field-workshop';this.clearInput();this.run.cancelInteract();this.audio?.motor(0);this.save();}
      if(id==='boost')this.run.boost();
      if(id==='detach')this.run.detach();
      if(id==='map'){this.screen='map';this.run.cancelInteract();this.clearInput();}
      if(id.startsWith('loot:')){const context=this.run.context();if(context?.kind==='loot'&&context.id===Number(id.slice(5)))this.run.startInteract();}
      if(id.startsWith('freight:')){const context=this.run.context();if(context?.kind==='freight'&&context.id===Number(id.slice(8)))this.run.startInteract();}
    }else if(this.screen==='field-workshop'){
      if(id==='close-field'){this.screen='play';this.clearInput();this.lastTime=null;}
      if(id.startsWith('field-tab:'))this.fieldTab=id.slice(10);
      if(id.startsWith('field-buy:')&&this.run.modify(id.slice(10))){this.audio?.play('upgrade');this.save();}
    }else if(this.screen==='upgrade'){
      if(id==='reroll'&&this.run.reroll())this.save();
      if(id.startsWith('pick:')&&this.run.choose(id.slice(5))){this.audio?.play('upgrade');this.bounce=1;this.clearInput();this.lastTime=null;this.screen=this.run.rogue.offer.length?'upgrade':'play';this.save();}
    }else if(this.screen==='map'){
      if(id==='return-guide'){this.waypoint={...(this.run.survivalVersion?TOWN:WORLD).home};this.returnGuide=true;this.screen='play';this.clearInput();this.lastTime=null;}
      if(['close-map','chart'].includes(id)){this.screen='play';this.clearInput();this.lastTime=null;this.returnGuide=false;}
    }else if(this.screen==='pause'){
      if(id==='resume'){this.screen=this.run.rogue.offer.length?'upgrade':'play';this.clearInput();this.lastTime=null;}
      if(id==='save-home'){this.save();this.screen='garage';this.clearInput();}
      if(id==='finish')this.screen='confirm';
    }else if(this.screen==='confirm'){
      if(id==='cancel')this.screen='pause';
      if(id==='abandon'){this.run.finish(false,'结束生存');this.settle();this.audio?.play('lose');}
    }else if(this.screen==='result'&&id==='garage'){this.screen='garage';this.run=null;this.profile.run=null;this.save();}
    this.draw();
  }
}
