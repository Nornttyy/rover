import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {IMAGES,EQUIPMENT_SPRITES,COMPOUND_SPRITES,SCENERY_SPRITES,equipmentRegion,extractionRegion,compoundRegion,sceneryRegion} from '../src/rover/assets.js';
function decode(path){
  const png=readFileSync(new URL('../'+path,import.meta.url)),width=png.readUInt32BE(16),height=png.readUInt32BE(20),chunks=[];
  assert.equal(png[24],8);assert.equal(png[25],6);assert.equal(png[28],0);
  for(let o=8;o<png.length;){const n=png.readUInt32BE(o);if(png.toString('ascii',o+4,o+8)==='IDAT')chunks.push(png.subarray(o+8,o+8+n));o+=n+12;}
  const packed=inflateSync(Buffer.concat(chunks)),stride=width*4,pixels=Buffer.alloc(stride*height);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  let source=0;for(let y=0;y<height;y++){const filter=packed[source++];assert.ok(filter<=4);for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-stride]:0,c=y&&x>=4?pixels[i-stride-4]:0;pixels[i]=(packed[source++]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
  return {width,height,alpha:(x,y)=>pixels[(y*width+x)*4+3]};
}
test('active map, equipment and recovery bay use delivered production PNGs, not missing placeholders',()=>{
  for(const path of Object.values(IMAGES)){const png=readFileSync(new URL('../'+path,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.length>50000);}
  assert.equal('map' in IMAGES,false,'a thumbnail must not be stretched across the live world');assert.equal('buildings' in IMAGES,false);assert.match(IMAGES.compoundsA,/compounds-a-v8/);assert.match(IMAGES.compoundsB,/compounds-b-v8/);assert.match(IMAGES.base,/base-v8/);assert.match(IMAGES.scenery,/scenery-v6/);
  assert.doesNotMatch(readFileSync(new URL('../src/rover/render.js',import.meta.url),'utf8'),/convoy:depot|accept-contract|beginDelivery/);
});
test('all 12 equipment sprites have measured, non-overlapping crops with real transparent edges',()=>{
  const image=decode(IMAGES.equipment),rects=Object.keys(EQUIPMENT_SPRITES).map(id=>({id,box:equipmentRegion(image,id)}));assert.equal(rects.length,12);
  for(const {id,box:[x,y,w,h]} of rects){assert.ok(x>=0&&y>=0&&x+w<=image.width&&y+h<=image.height,id);for(const other of rects){if(other.id===id)continue;const [a,b,c,d]=other.box;assert.ok(x+w<=a||a+c<=x||y+h<=b||b+d<=y,id+' crop intersects '+other.id);}
    for(let i=0;i<w;i++)assert.ok(image.alpha(x+i,y)<=32&&image.alpha(x+i,y+h-1)<=32,id+' top/bottom clipping');
    for(let i=0;i<h;i++)assert.ok(image.alpha(x,y+i)<=32&&image.alpha(x+w-1,y+i)<=32,id+' left/right clipping');
    let opaque=0;for(let yy=y;yy<y+h;yy+=4)for(let xx=x;xx<x+w;xx+=4)opaque+=image.alpha(xx,yy)>40;assert.ok(opaque>1000,id+' is empty');
  }
});
test('recovery bay is a tall transparent sprite with an empty drivable apron',()=>{const image=decode(IMAGES.extraction),[x,y,w,h]=extractionRegion(image);assert.ok(x>=0&&y>=0&&x+w<=image.width&&y+h<=image.height);assert.ok(h>w*1.4);assert.equal(image.alpha(0,0),0);assert.ok(image.alpha(570,900)>200);});
test('eight complete locations and street details have separate transparent crops',()=>{for(const key of ['compoundsA','compoundsB','scenery']){const boxes=key==='scenery'?SCENERY_SPRITES:Object.fromEntries(Object.entries(COMPOUND_SPRITES).filter(([,v])=>v.sheet===key).map(([id,v])=>[id,v.box])),region=key==='scenery'?sceneryRegion:compoundRegion,image=decode(IMAGES[key]),rects=Object.keys(boxes).map(id=>({id,box:region(image,id)}));assert.equal(rects.length,key==='scenery'?12:4);for(const {id,box:[x,y,w,h]} of rects){assert.ok(x>=0&&y>=0&&x+w<=image.width&&y+h<=image.height);for(const other of rects){if(other.id===id)continue;const [a,b,c,d]=other.box;assert.ok(x+w<=a||a+c<=x||y+h<=b||b+d<=y,id+' shares neighbour pixels');}for(let i=0;i<w;i++)assert.ok(image.alpha(x+i,y)<=32&&image.alpha(x+i,y+h-1)<=32,id+' top/bottom clipping');for(let i=0;i<h;i++)assert.ok(image.alpha(x,y+i)<=32&&image.alpha(x+w-1,y+i)<=32,id+' side clipping');}}});
