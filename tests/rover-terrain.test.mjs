import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD,RECOVERY_ROOF,terrainBlocked} from '../src/rover/data.js';
import {RoverTerrain,mapCrop} from '../src/rover/terrain.js';

const context=()=>{const calls=[];return {calls,drawImage:(...args)=>calls.push(args)};};
function harness(allocate=true){const sizes=[],images={map:{width:1254,height:1254}},offscreen=context();const terrain=new RoverTerrain(images,(w,h)=>{sizes.push([w,h]);return allocate?{width:w,height:h,getContext:()=>offscreen}:null;});return {terrain,images,sizes,offscreen};}
test('live terrain renders one camera crop of one complete generated map, never compound or scenery sprites',()=>{
  const {terrain,images,sizes}=harness(),c=context();terrain.draw(c,{x:3000,y:3100,w:430,h:930},2);
  assert.equal(c.calls.length,1);assert.equal(c.calls[0][0],images.map);assert.equal(c.calls[0].length,9);assert.deepEqual(c.calls[0].slice(5),[3000,3100,430,930]);assert.equal(c.imageSmoothingQuality,'high');assert.deepEqual(sizes,[]);
  const source=readFileSync(new URL('../src/rover/terrain.js',import.meta.url),'utf8');assert.doesNotMatch(source,/COMPOUND|BUILDINGS|GROUND_DETAILS|ROAD_DASHES|sceneryRegion|chunk\(/);
});
test('visible crop stays in exact world coordinates at every edge, never wraps or tiles',()=>{
  const image={width:1254,height:1254};for(const bounds of [{x:-50,y:-80,w:440,h:900},{x:6000,y:5960,w:440,h:900},{x:3003.17,y:3391.27,w:436,h:650}]){
    const {source:[sx,sy,sw,sh],target:[x,y,w,h]}=mapCrop(bounds,image);assert.ok(x>=0&&y>=0&&x+w<=WORLD.w&&y+h<=WORLD.h);assert.ok(sx>=0&&sy>=0&&sx+sw<=image.width+.00001&&sy+sh<=image.height+.00001);
    assert.ok(Math.abs(sx/image.width-x/WORLD.w)<1e-10);assert.ok(Math.abs(sy/image.height-y/WORLD.h)<1e-10);assert.ok(Math.abs(sw/image.width-w/WORLD.w)<1e-10);assert.ok(Math.abs(sh/image.height-h/WORLD.h)<1e-10);
  }
});
test('camera travel never allocates giant canvases, tiles or a growing sprite cache',()=>{
  const {terrain,sizes}=harness(),c=context();for(let i=0;i<1000;i++)terrain.draw(c,{x:i*7%WORLD.w,y:i*13%WORLD.h,w:440,h:900},i%2?1:2);
  assert.equal(c.calls.length,1000);assert.deepEqual(sizes,[]);assert.equal(terrain.overview,null);assert.equal('chunks' in terrain,false);
});
test('minimap and route chart cache the same full image including its painted recovery bay',()=>{
  const {terrain,images,sizes,offscreen}=harness(),c=context();terrain.drawOverview(c,0,0,59,59);const overview=terrain.overview;
  for(let i=0;i<30;i++)terrain.drawOverview(c,20,100,340,340);assert.equal(terrain.overview,overview);assert.deepEqual(sizes,[[640,640]]);assert.equal(offscreen.calls.length,1);assert.deepEqual(offscreen.calls[0],[images.map,0,0,640,640]);
});
test('overview allocation failure uses the actual image rather than a placeholder',()=>{
  const {terrain,images}=harness(false),c=context();terrain.drawOverview(c,10,10,100,100);assert.deepEqual(c.calls,[[images.map,10,10,100,100]]);
});
test('only the garage roof blocks, not the generated apron or the removed v8 roof position',()=>{
  const b=RECOVERY_ROOF;assert.equal(terrainBlocked(b.x+b.w/2,b.y+b.h/2),true);
  for(const p of [{x:WORLD.home.x,y:WORLD.home.y},{x:WORLD.home.x,y:WORLD.home.y-210},{x:WORLD.home.x,y:WORLD.home.y+170}])assert.equal(terrainBlocked(p.x,p.y),false);
  const render=readFileSync(new URL('../src/rover/render.js',import.meta.url),'utf8');assert.doesNotMatch(render,/crop\('extraction'\)|images\.extraction/);
});
