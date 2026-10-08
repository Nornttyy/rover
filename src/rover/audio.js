// Short layered mechanical sounds. No music loop or square-wave arcade beeps.
// Audio is optional; blocked or unsupported audio never interrupts play.
export function createRoverAudio(createContext){
  let ctx,master,engine,engineGain,rolling,rollingGain,enabled=true,foreground=true;const sources=new Set(),last=new Map(),buffers=new Map();
  function safe(fn){try{fn();}catch{}}
  function init(){
    if(!ctx){try{
      ctx=createContext();if(!ctx)return false;master=ctx.createGain();master.gain.value=enabled?.48:0;
      const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.003;limiter.release.value=.12;master.connect(limiter);limiter.connect(ctx.destination);
      engine=ctx.createOscillator();engine.type='sine';engine.frequency.value=49;engineGain=ctx.createGain();engineGain.gain.value=0;engine.connect(engineGain);engineGain.connect(master);engine.start();
      rolling=ctx.createBufferSource();rolling.buffer=noiseBuffer(1);rolling.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=500;rollingGain=ctx.createGain();rollingGain.gain.value=0;rolling.connect(filter);filter.connect(rollingGain);rollingGain.connect(master);rolling.start();
    }catch{safe(()=>ctx?.close()?.catch?.(()=>{}));ctx=null;master=null;buffers.clear();return false;}}
    safe(()=>{ctx.resume()?.catch?.(()=>{});});return true;
  }
  function track(source,nodes){sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();for(const node of nodes)node.disconnect();};}
  function noiseBuffer(duration){
    let buffer=buffers.get(duration);if(buffer)return buffer;buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);const data=buffer.getChannelData(0);let previous=0;
    for(let i=0;i<data.length;i++){previous=previous*.45+(Math.random()*2-1)*.55;data[i]=previous;}
    buffers.set(duration,buffer);return buffer;
  }
  function tone(freq,time,duration,volume=.25,end=freq){const o=ctx.createOscillator(),gain=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(freq,time);o.frequency.exponentialRampToValueAtTime(end,time+duration);gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(volume,time+.004);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(gain);gain.connect(master);track(o,[gain]);o.start(time);o.stop(time+duration);}
  function noise(duration,cutoff,volume=.4,highpass=false){const s=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),time=ctx.currentTime;filter.type=highpass?'highpass':'lowpass';filter.frequency.value=cutoff;filter.Q.value=.65;s.buffer=noiseBuffer(duration);gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(volume,time+.003);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);s.connect(filter);filter.connect(gain);gain.connect(master);track(s,[filter,gain]);s.start();}
  return{
    unlock(){if(enabled&&foreground)init();},
    setEnabled(value){enabled=!!value;if(master)safe(()=>master.gain.setTargetAtTime(enabled?.48:0,ctx.currentTime,.03));},
    play(name){if(!enabled||!foreground||!init()||sources.size>28)return;const time=ctx.currentTime;if(time-(last.get(name)??-1)<(['shot','flame','kill'].includes(name)?.12:.06))return;last.set(name,time);
      safe(()=>{
        if(name==='shot'){tone(215,time,.09,.25,82);noise(.065,1900,.32);}
        else if(name==='cannon'||name==='ram'){tone(140,time,.16,.5,48);noise(.14,1250,.5);}
        else if(name==='kill'){tone(92,time,.22,.34,38);noise(.24,1500,.52);}
        else if(name==='hurt'){tone(160,time,.13,.38,58);noise(.13,900,.5);}
        else if(name==='impact'){noise(.035,1700,.14);tone(320,time,.045,.09,170);}
        else if(name==='laser'){noise(.09,2600,.14,true);tone(870,time,.15,.14,220);}
        else if(name==='boost'){noise(.45,1600,.28);tone(95,time,.17,.14,230);}
        else if(name==='flame'){noise(.2,1200,.62);tone(70,time,.13,.14,42);}
        else if(['tap','attach','detach'].includes(name)){noise(.045,1100,.2);tone(360,time,.05,.08,240);}
        else{
          const notes=['win'].includes(name)?[523.25,659.25,783.99]:['lose','trailer-lost'].includes(name)?[180,120]:name==='loot'?[880,1174.66]:['upgrade','level-up'].includes(name)?[440,659.25,880]:name==='boss-start'?[75,75,105]:[];
          notes.forEach((n,i)=>{tone(n,time+i*.075,name==='boss-start'?.21:.24,name==='boss-start'?.35:.16);if(name==='boss-start')noise(.12,450,.2);});
        }
      });
    },
    motor(amount){if(!ctx||!engineGain)return;amount=Math.max(0,Math.min(1,amount));safe(()=>{const a=enabled&&foreground?amount:0;engineGain.gain.setTargetAtTime(.075*a,ctx.currentTime,.07);rollingGain.gain.setTargetAtTime(.065*a,ctx.currentTime,.08);engine.frequency.setTargetAtTime(49+26*a,ctx.currentTime,.08);});},
    pause(){foreground=false;for(const s of sources)safe(()=>s.stop());sources.clear();if(ctx)safe(()=>{ctx.suspend()?.catch?.(()=>{});});},
    resume(){foreground=true;if(ctx)safe(()=>{ctx.resume()?.catch?.(()=>{});});},
    destroy(){if(ctx)safe(()=>{ctx.close()?.catch?.(()=>{});});ctx=null;master=null;buffers.clear();last.clear();sources.clear();}
  };
}
