import {TOWN,district,rotateLocal} from './survival-data.js?v=12';
export class EndlessTerrain{
  constructor(images){this.images=images;}
  draw(c,bounds){
    const size=TOWN.w,minX=Math.floor(bounds.x/size),maxX=Math.floor((bounds.x+bounds.w)/size),minY=Math.floor(bounds.y/size),maxY=Math.floor((bounds.y+bounds.h)/size);
    for(let ty=minY;ty<=maxY;ty++)for(let tx=minX;tx<=maxX;tx++){
      const d=district(tx,ty),img=d.variant?this.images.mapAlt:this.images.map;if(!img?.width)continue;c.save();c.translate((tx+.5)*size,(ty+.5)*size);c.rotate(d.rotation*Math.PI/2);c.drawImage(img,-size/2,-size/2,size,size);c.restore();
    }
  }
  drawRegion(c,x,y,size,tx,ty){const d=district(tx,ty),img=d.variant?this.images.mapAlt:this.images.map;c.save();c.translate(x+size/2,y+size/2);c.rotate(d.rotation*Math.PI/2);c.drawImage(img,-size/2,-size/2,size,size);c.restore();}
}
