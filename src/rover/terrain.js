import {WORLD,BLOCKS,clamp} from './data.js?v=8';
import {COMPOUND_SPRITES,compoundRegion,sceneryRegion,extractionRegion} from './assets.js?v=8';
import {TERRAIN_COLORS as C,GARDENS,BUILDINGS,GROUND_DETAILS,ROAD_CURVES,ROAD_DASHES} from './terrain-scene.js?v=8';
export const TERRAIN_CHUNK=384,TERRAIN_CACHE_LIMIT=16;
const intersects=(a,b)=>a.x+a.w>=b.x&&a.y+a.h>=b.y&&a.x<=b.x+b.w&&a.y<=b.y+b.h;
const objectBox=o=>{const cos=Math.abs(Math.cos(o.a||0)),sin=Math.abs(Math.sin(o.a||0)),w=o.w*cos+o.h*sin+36,h=o.w*sin+o.h*cos+36;return{x:o.x-w/2,y:o.y-h/2,w,h};};
function polygon(c,points,r=28){c.beginPath();for(let i=0;i<points.length;i++){const p=points[i],before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length],a=Math.hypot(before.x-p.x,before.y-p.y)||1,b=Math.hypot(after.x-p.x,after.y-p.y)||1,inset=Math.min(r,a*.2,b*.2),x=p.x+(before.x-p.x)/a*inset,y=p.y+(before.y-p.y)/a*inset;if(!i)c.moveTo(x,y);else c.lineTo(x,y);c.quadraticCurveTo(p.x,p.y,p.x+(after.x-p.x)/b*inset,p.y+(after.y-p.y)/b*inset);}c.closePath();}
function line(c,path,color,width){c.beginPath();path.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
export class RoverTerrain{
  constructor(images,createSurface){this.images=images;this.createSurface=createSurface;this.chunks=new Map();this.overview=null;this.ratio=0;this.builds=0;}
  surface(w,h){try{return this.createSurface(w,h);}catch{return null;}}
  sprite(c,group,id,o){const compound=group==='compounds',image=this.images[compound?COMPOUND_SPRITES[id]?.sheet:group],box=compound?compoundRegion(image,id):sceneryRegion(image,id);if(!image||!box)return;const ratio=box[2]/box[3],w=Math.min(o.w,o.h*ratio),h=w/ratio;c.save();c.translate(o.x,o.y);c.rotate(o.a||0);c.drawImage(image,...box,-w/2,-h/2,w,h);c.restore();}
  paint(c,bounds){
    c.fillStyle=C.road;c.fillRect(bounds.x-3,bounds.y-3,bounds.w+6,bounds.h+6);
    for(const path of ROAD_CURVES)line(c,path,C.route,164);
    for(const d of ROAD_DASHES)if(intersects(objectBox(d),bounds)){c.save();c.translate(d.x,d.y);c.rotate(d.a);c.fillStyle=C.mark;c.beginPath();c.roundRect(-d.w/2,-1.4,d.w,2.8,1.4);c.fill();c.restore();}
    for(const d of GROUND_DETAILS)if(intersects(objectBox(d),bounds)){
      if(d.id==='patch'){c.save();c.translate(d.x,d.y);c.rotate(d.a);c.fillStyle='#5b7a8b';c.strokeStyle='#446779';c.lineWidth=1.5;c.beginPath();c.roundRect(-d.w/2,-d.h/2,d.w,d.h,5);c.fill();c.stroke();c.restore();}else this.sprite(c,'scenery',d.id,d);
    }
    // Fine service-floor seams around the garage, drawn at device resolution rather than enlarged pixels.
    if(intersects({x:WORLD.home.x-250,y:WORLD.home.y+110,w:500,h:400},bounds)){
      for(const side of [-1,1]){const x=WORLD.home.x+side*185;line(c,[{x,y:WORLD.home.y+164},{x,y:WORLD.home.y+350}],'#7a989d',2.5);for(let i=0;i<3;i++)line(c,[{x,y:WORLD.home.y+175+i*61},{x:x+side*61,y:WORLD.home.y+175+i*61}],'#8ba5a9',2.5);}
      line(c,[{x:WORLD.home.x-135,y:WORLD.home.y+315},{x:WORLD.home.x+135,y:WORLD.home.y+315}],'#416478',2);
    }
    for(let index=0;index<BLOCKS.length;index++){const b=BLOCKS[index];if(!intersects({...b,x:b.x-20,y:b.y-20,w:b.w+40,h:b.h+40},bounds))continue;const garden=GARDENS.has(index);
      polygon(c,b.points);c.fillStyle=garden?C.garden:C.paving;c.fill();c.strokeStyle=C.curbEdge;c.lineWidth=27;c.stroke();c.strokeStyle=C.curb;c.lineWidth=20;c.stroke();c.strokeStyle='#edf1d940';c.lineWidth=2;c.stroke();
      c.save();polygon(c,b.points,33);c.clip();
      for(const o of BUILDINGS)if(o.island===index&&intersects(objectBox(o),bounds))this.sprite(c,'compounds',o.id,o);
      c.restore();
    }
  }
  chunk(x,y){const key=x+','+y;let surface=this.chunks.get(key);if(surface){this.chunks.delete(key);this.chunks.set(key,surface);return surface;}const size=TERRAIN_CHUNK,bleed=2;surface=this.surface((size+bleed*2)*this.ratio,(size+bleed*2)*this.ratio);const c=surface?.getContext('2d');if(!c)return null;c.setTransform(this.ratio,0,0,this.ratio,(bleed-x*size)*this.ratio,(bleed-y*size)*this.ratio);this.paint(c,{x:x*size-bleed,y:y*size-bleed,w:size+bleed*2,h:size+bleed*2});if(this.chunks.size>=TERRAIN_CACHE_LIMIT){const oldest=this.chunks.keys().next().value,old=this.chunks.get(oldest);old.width=old.height=1;this.chunks.delete(oldest);}this.chunks.set(key,surface);this.builds++;return surface;}
  draw(c,bounds,pixelRatio=1){const ratio=pixelRatio>1.15?2:1;if(this.ratio!==ratio){this.ratio=ratio;for(const surface of this.chunks.values())surface.width=surface.height=1;this.chunks.clear();}const size=TERRAIN_CHUNK,cols=WORLD.w/size,x0=clamp(Math.floor(bounds.x/size),0,cols-1),x1=clamp(Math.floor((bounds.x+bounds.w)/size),0,cols-1),y0=clamp(Math.floor(bounds.y/size),0,cols-1),y1=clamp(Math.floor((bounds.y+bounds.h)/size),0,cols-1);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const surface=this.chunk(x,y);if(surface)c.drawImage(surface,x*size-2,y*size-2,size+4,size+4);else{c.save();c.beginPath();c.rect(x*size,y*size,size,size);c.clip();this.paint(c,{x:x*size,y:y*size,w:size,h:size});c.restore();}}}
  drawOverview(c,x,y,w,h){if(!this.overview){const size=640,surface=this.surface(size,size),ctx=surface?.getContext('2d');if(ctx){ctx.setTransform(size/WORLD.w,0,0,size/WORLD.h,0,0);this.paint(ctx,{x:0,y:0,w:WORLD.w,h:WORLD.h});const image=this.images.extraction,box=extractionRegion(image);if(box)ctx.drawImage(image,...box,WORLD.home.x-128,WORLD.home.y-250,256,392);this.overview=surface;}}if(this.overview)c.drawImage(this.overview,x,y,w,h);else{c.save();c.translate(x,y);c.scale(w/WORLD.w,h/WORLD.h);this.paint(c,{x:0,y:0,w:WORLD.w,h:WORLD.h});c.restore();}}
}
