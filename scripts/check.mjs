import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {IMAGES} from '../src/rover/assets.js';
for(const name of await readdir('src/rover'))if(name.endsWith('.js'))execFileSync(process.execPath,['--check','src/rover/'+name]);
for(const url of Object.values(IMAGES)){const image=await readFile(url);if(image.toString('ascii',1,4)!=='PNG')throw new Error('Invalid asset: '+url);}
const html=await readFile('index.html','utf8');if(!html.includes('./src/rover/web.js?v=14'))throw new Error('Invalid entry');
console.log('Source, release entry and all production images verified.');
