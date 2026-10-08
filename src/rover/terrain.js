import {WORLD,clamp} from './data.js?v=9';

// One complete generated illustration. Cropping is camera culling, not tile assembly:
// every curb, road, garden, factory and recovery roof is already in this PNG.
export function mapCrop(bounds,image){
  const x=clamp(bounds.x,0,WORLD.w),y=clamp(bounds.y,0,WORLD.h);
  const w=Math.max(0,Math.min(bounds.x+bounds.w,WORLD.w)-x),h=Math.max(0,Math.min(bounds.y+bounds.h,WORLD.h)-y);
  return {source:[x/WORLD.w*image.width,y/WORLD.h*image.height,w/WORLD.w*image.width,h/WORLD.h*image.height],target:[x,y,w,h]};
}
export class RoverTerrain{
  constructor(images,createSurface){this.images=images;this.createSurface=createSurface;this.overview=null;}
  paint(c,bounds){
    const image=this.images.map;if(!image?.width||!image?.height)return;
    const {source,target}=mapCrop(bounds,image);if(target[2]<=0||target[3]<=0)return;
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,...source,...target);
  }
  draw(c,bounds){this.paint(c,bounds);}
  drawOverview(c,x,y,w,h){
    const image=this.images.map;if(!image?.width)return;
    if(!this.overview){
      let surface;try{surface=this.createSurface(640,640);}catch{}
      const ctx=surface?.getContext('2d');if(ctx){ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,640,640);this.overview=surface;}
    }
    c.drawImage(this.overview||image,x,y,w,h);
  }
}
