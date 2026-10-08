export const IMAGES={atlas:'assets/rover/atlas-v1.png',garage:'assets/rover/garage-v1.png',base:'assets/rover/base-v8.png',effects:'assets/rover/effects-v2.png',convoy:'assets/rover/convoy-v3.png',equipment:'assets/rover/equipment-v5.png',map:'assets/rover/district-v9.png'};
// Alpha bounds measured from the delivered atlas, with a transparent guard around every sprite.
const boxes={
  truck:[38,32,255,274],gun:[383,46,199,246],drill:[652,36,275,266],side:[1006,47,199,254],
  flame:[57,330,224,286],cargo:[368,388,234,197],armor:[658,401,259,176],repair:[978,350,234,248],
  drone:[44,670,249,230],spitter:[330,623,291,290],ram:[640,645,213,276],boss:[875,617,375,310],
  closed:[53,964,229,252],open:[368,957,235,260],scrap:[660,989,244,224],impact:[996,978,205,213]
};
export const SPRITES=Object.freeze(boxes);
export function region(image,id){return boxes[id]?.map((v,i)=>v*(i%2===0?image.width:image.height)/1254);}
const effects={
  muzzle:[61,38,226,268],gold:[444,26,103,292],aqua:[711,26,111,292],plasma:[1028,32,139,268],
  dust:[47,384,237,208],smoke:[362,368,241,229],explosion:[649,350,250,260],ring:[960,332,272,282],
  fire:[79,640,177,277],sparks:[353,687,235,184],glint:[677,671,208,218],pickup:[978,665,240,236],
  slash:[52,971,242,236],shield:[373,968,226,231],boost:[698,946,166,282],residue:[967,972,241,246]
};
export const FX_SPRITES=Object.freeze(effects);
export function fxRegion(image,id){return effects[id]?.map((v,i)=>v*(i%2===0?image.width:image.height)/1254);}
export const CONVOY_SPRITES={empty:[72,30,335,409],cargo:[502,30,335,410],repair:[942,30,337,410],gun:[1369,30,340,410],winch:[56,498,368,337],depot:[487,481,371,349],raider:[951,460,313,371],bomb:[1369,456,339,383]};
export function convoyRegion(image,id){return CONVOY_SPRITES[id]?.map((v,i)=>v*(i%2===0?image.width/1774:image.height/887));}
export const EQUIPMENT_IDS=['rocket','tesla','saw','cryo','laser','oil','drone','shield','mortar','magnet','mine','radar'];
// Measured connected alpha bounds, not equal cells: generated artwork has unequal padding.
export const EQUIPMENT_SPRITES={rocket:[23,134,283,290],tesla:[341,117,268,316],saw:[645,134,275,300],cryo:[960,138,278,305],laser:[35,467,251,342],oil:[343,489,246,324],drone:[640,533,284,271],shield:[955,524,285,282],mortar:[27,868,291,299],magnet:[358,878,247,287],mine:[635,952,294,219],radar:[974,866,250,308]};
export function equipmentRegion(image,id){return image&&EQUIPMENT_SPRITES[id]?.map((v,i)=>v*(i%2===0?image.width:image.height)/1254);}
export function extractionRegion(image){return image&&[176,41,794,1213].map((v,i)=>v*(i%2===0?image.width/1145:image.height/1374));}
export const BUILDING_SPRITES={workshop:[69,118,561,488],warehouse:[673,131,554,485],tanks:[55,747,569,398],depot:[711,745,514,389]};
export const SCENERY_SPRITES={tree:[34,149,257,262],shrubs:[330,149,296,272],crate:[680,177,199,219],boxes:[958,177,266,217],pipe:[33,535,260,250],barrier:[338,561,275,172],manhole:[663,526,245,244],grate:[966,547,251,209],lamp:[42,932,285,157],cone:[401,927,173,175],cabinet:[647,902,278,217],chips:[998,929,199,163]};
export function buildingRegion(image,id){return image&&BUILDING_SPRITES[id]?.map((v,i)=>v*(i%2===0?image.width:image.height)/1254);}
export function sceneryRegion(image,id){return image&&SCENERY_SPRITES[id]?.map((v,i)=>v*(i%2===0?image.width:image.height)/1254);}
// Each crop is a complete illustrated place, including its foundation and all fixtures.
export const COMPOUND_SPRITES={workshop:{sheet:'compoundsA',box:[28,68,584,529]},warehouse:{sheet:'compoundsA',box:[650,98,588,505]},tanks:{sheet:'compoundsA',box:[28,671,581,495]},power:{sheet:'compoundsA',box:[649,682,583,475]},park:{sheet:'compoundsB',box:[47,80,577,513]},garden:{sheet:'compoundsB',box:[672,79,531,507]},recycling:{sheet:'compoundsB',box:[46,663,566,503]},station:{sheet:'compoundsB',box:[644,695,577,482]}};
export function compoundRegion(image,id){return image&&COMPOUND_SPRITES[id]?.box.map((v,i)=>v*(i%2===0?image.width:image.height)/1254);}
