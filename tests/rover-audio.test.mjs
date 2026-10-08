import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoverAudio} from '../src/rover/audio.js';

function context(){
  const state={starts:0,buffers:0,suspended:0,resumed:0,closed:0};
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}});
  const node=()=>({connect(){},disconnect(){},start(){state.starts++;},stop(){this.onended?.();},gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});
  return{state,currentTime:0,sampleRate:44100,destination:{},createGain:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,createDynamicsCompressor:node,
    createBuffer(channels,length){state.buffers++;return{getChannelData:()=>new Float32Array(length)};},resume(){state.resumed++;return Promise.resolve();},suspend(){state.suspended++;return Promise.resolve();},close(){state.closed++;return Promise.resolve();}};
}
test('audio initializes only after interaction, layered effects reuse buffers and rapid duplicates are throttled',()=>{
  const c=context(),audio=createRoverAudio(()=>c);assert.equal(c.state.starts,0);audio.unlock();assert.equal(c.state.starts,2);
  audio.play('shot');const voices=c.state.starts,buffers=c.state.buffers;assert.equal(voices,4);audio.play('shot');assert.equal(c.state.starts,voices);
  c.currentTime=.5;audio.play('shot');assert.equal(c.state.starts,voices+2);assert.equal(c.state.buffers,buffers);
  for(const name of ['cannon','kill','boost','flame','loot','upgrade','win','lose']){c.currentTime+=1;audio.play(name);}assert.ok(c.state.starts>20);
  audio.motor(1);audio.destroy();assert.equal(c.state.closed,1);
});
test('mute and background suppress new sounds, resume works, unsupported audio stays harmless',()=>{
  const c=context(),audio=createRoverAudio(()=>c);audio.setEnabled(false);audio.unlock();audio.play('shot');assert.equal(c.state.starts,0);audio.setEnabled(true);audio.play('shot');const count=c.state.starts;audio.pause();audio.play('hurt');assert.equal(c.state.starts,count);assert.equal(c.state.suspended,1);audio.resume();c.currentTime=1;audio.play('hurt');assert.ok(c.state.starts>count);
  for(const factory of [()=>null,()=>{throw new Error('Unavailable');},()=>({close(){},createGain(){throw new Error('Broken context');}})]){const silent=createRoverAudio(factory);assert.doesNotThrow(()=>{silent.unlock();silent.play('shot');silent.motor(1);silent.pause();silent.resume();silent.destroy();});}
});
