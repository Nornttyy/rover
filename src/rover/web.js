import {RoverGame} from './game.js?v=8';
import {createRoverAudio} from './audio.js?v=8';
const canvas=document.getElementById('rover');
const storage={get(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}};
const createSurface=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const audio=createRoverAudio(()=>{const Audio=window.AudioContext||window.webkitAudioContext;return Audio?new Audio():null;});
export const game=new RoverGame({canvas,createImage:()=>new Image(),createSurface,storage,audio,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
function resize(){const rect=canvas.getBoundingClientRect();game.resize({width:rect.width,height:rect.height,dpr:devicePixelRatio});}
const point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.x,y:e.clientY-r.y};};
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);const p=point(e);game.pointerDown(p.x,p.y,e.pointerId);});
canvas.addEventListener('pointermove',e=>{const p=point(e);game.pointerMove(p.x,p.y,e.pointerId);});
canvas.addEventListener('pointerup',e=>{const p=point(e);game.pointerUp(p.x,p.y,e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
canvas.addEventListener('pointercancel',e=>game.pointerCancel(e.pointerId));
canvas.addEventListener('lostpointercapture',e=>game.pointerCancel(e.pointerId));
const controlKey=e=>({KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyQ:'q',KeyM:'m'}[e.code]||e.key.toLowerCase());
const controlKeys=new Set(['w','a','s','d','q','m','1','2','3','arrowup','arrowdown','arrowleft','arrowright',' ','enter','escape','shift']);
canvas.addEventListener('keydown',e=>{const key=controlKey(e);if(controlKeys.has(key)){e.preventDefault();game.keyboard(key,true);}});
window.addEventListener('keyup',e=>{const key=controlKey(e);if(controlKeys.has(key)&&game.keys.has(key)){if(document.activeElement===canvas)e.preventDefault();game.keyboard(key,false);}});
canvas.addEventListener('blur',()=>{if(game.screen==='play')game.action('pause');else game.clearInput();});
window.addEventListener('blur',()=>game.setVisible(false));window.addEventListener('focus',()=>game.setVisible(!document.hidden));document.addEventListener('visibilitychange',()=>game.setVisible(!document.hidden));window.addEventListener('pagehide',()=>game.save());window.addEventListener('resize',resize);new ResizeObserver(resize).observe(canvas);
let status='';function frame(time){game.frame(time);const key=game.screen+'|'+game.loaded;if(key!==status){status=key;canvas.dataset.ready=String(game.loaded);canvas.dataset.screen=game.screen;document.getElementById('game-status').textContent=game.screen==='garage'?'移动基地大厅，点击工坊改装或出发。':game.screen==='workshop'?'改装工坊，基础与进阶装备分为两页。':game.screen==='module'?'装备详情，可以购买、装配或返回工坊。':game.screen==='play'?'拖动驾驶，击败敌人收集经验，升级选择装备，车库可撤离。':game.screen==='upgrade'?'战斗已暂停，选择一张升级卡。':game.screen==='result'?game.run.result.reason:'移动基地';}requestAnimationFrame(frame);}
document.getElementById('retry').onclick=()=>location.reload();resize();requestAnimationFrame(frame);game.load().then(()=>{canvas.dataset.ready='true';}).catch(error=>{console.error(error);document.getElementById('load-error').hidden=false;});
