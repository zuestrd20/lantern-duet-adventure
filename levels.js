/** Lantern Duet: an original eight-island, same-keyboard cooperative campaign. */
const W = 21, H = 13;
function board() { return Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>(!x||!y||x===W-1||y===H-1)?'#':'.')); }
function wall(b,x1,y1,x2,y2,t='#') { for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)b[y][x]=t; }
function floor(b,x,y){b[y][x]='.';}
function node(id,x,y,kind,requires=[],extra={}) { return {id,x,y,kind,role:kind==='root'?1:0,required:kind!=='switch',requires,label:kind==='root'?'芽之心':kind==='switch'?'月相轉輪':'燈之心',...extra}; }
function gate(id,x,y,requires,extra={}) {return{id,x,y,requires,kind:'gate',...extra};}
function plate(id,x,y,role=null){return{id,x,y,role};}
function make(config,draw){const b=board();draw(b);return{width:W,height:H,map:b.map(r=>r.join('')),nodes:[],plates:[],gates:[],crates:[],ferries:[],...config};}

export const campaign = [
make({
 id:'first-spark',biome:'meadow',title:'01 · 甦醒的草岸',subtitle:'光記得方向，芽記得回家。',
 intro:'燈燈用 WASD 移動、E 點亮。芽芽用方向鍵移動、Enter 生根。靠近自己的心石，按互動鍵。',
 hints:['先各自喚醒左岸同色的心石，中央門會打開。','右岸的葉紋踏板要芽芽站上去，燈燈才可點亮北邊的心石。','再換燈燈站在右岸的光紋踏板上，讓芽芽喚醒南邊心石。兩人一起去潮汐出口。'],
 players:[{x:3,y:3},{x:3,y:9}],exit:{x:18,y:6},checkpoint:{x:12,y:6},
 nodes:[node('dawn',5,3,'light'),node('seed',5,9,'root'),node('north',16,3,'light',['plate:leaf']),node('south',16,9,'root',['plate:sun'])],
 plates:[plate('sun',14,3,0),plate('leaf',14,9,1)],gates:[gate('together',10,6,['node:dawn','node:seed'])],
},b=>{wall(b,10,1,10,11);floor(b,10,6);wall(b,3,6,6,6);wall(b,16,5,16,7);}),
make({
 id:'weighted-orchard',biome:'orchard',title:'02 · 果核工坊',subtitle:'有些門，需要留下重量。',
 intro:'芽芽能推動果核箱，燈燈不能。把兩個箱子留在圓形踏板上，替彼此騰出雙手。',
 hints:['芽芽站到箱子左邊，把上、下兩個箱子各向右推兩格。','箱子能壓住沒有角色花紋的圓踏板。兩個都壓住，工坊門才會打開。','過門後，燈燈留在北面的光紋踏板，芽芽先喚醒南方心石；再讓燈燈完成最後一盞燈。'],
 players:[{x:3,y:3},{x:3,y:9}],exit:{x:18,y:6},checkpoint:{x:12,y:6},
 crates:[{id:'apple',x:5,y:3},{id:'pear',x:5,y:9}],plates:[plate('upper',7,3),plate('lower',7,9),plate('sun',16,3,0)],
 gates:[gate('press',10,6,['plate:upper','plate:lower'])],
 nodes:[node('sprout',15,9,'root',['plate:sun']),node('crown',18,9,'light',['node:sprout'])],
},b=>{wall(b,10,1,10,11);floor(b,10,6);wall(b,5,2,7,2);wall(b,5,4,7,4);wall(b,5,8,7,8);wall(b,5,10,7,10);wall(b,14,5,17,5);}),
make({
 id:'tidal-relay',biome:'tide',title:'03 · 雙橋潮汐',subtitle:'先把路交給你，再等你把路留給我。',
 intro:'踏板只在有人站著時發光。彼岸的心石能讓潮橋永久留下；一步一步，交換領路的人。',
 hints:['燈燈站在左岸上方光紋踏板。芽芽由下方第一座橋走到中島，喚醒根心。','第一座橋留下後，兩人到中島。芽芽站上中島葉紋踏板，讓燈燈由上方橋到右岸點燈。','右岸最下面的兩顆心石需要搭檔在兩格內。先一起靠近，再輪流互動。'],
 players:[{x:3,y:3},{x:3,y:9}],exit:{x:18,y:6},checkpoint:{x:10,y:6},
 plates:[plate('sun',5,3,0),plate('leaf',10,3,1)],
 gates:[gate('first',8,9,{any:['plate:sun','node:moor']},{kind:'bridge'}),gate('second',12,3,{any:['plate:leaf','node:shore']},{kind:'bridge'})],
 nodes:[node('moor',10,9,'root'),node('shore',16,3,'light'),node('bloom',17,9,'root',['near:0']),node('echo',15,9,'light',['near:1'])],
},b=>{wall(b,8,1,8,11,'~');wall(b,12,1,12,11,'~');wall(b,2,6,5,6);wall(b,15,5,17,5);wall(b,15,7,17,7);}),
make({
 id:'paper-ferry',biome:'lagoon',title:'04 · 紙船渡口',subtitle:'一盞燈掌舵，一株芽定住風。',
 intro:'紙船需要燈燈掌舵、芽芽在船邊壓住風。兩人都靠近船後，由燈燈按 E，一起渡海。',
 hints:['先喚醒左岸上下兩顆心石。船只有在兩人都距離它一格內時，才會出發。','兩人靠近左岸渡口，燈燈按 E。右岸可先在月白石旁一起存下旅程。','芽芽把右岸果核箱向右推兩格，再站上北方葉紋踏板；燈燈點亮心石後，芽芽去喚醒南方心石。'],
 players:[{x:3,y:3},{x:3,y:9}],exit:{x:18,y:6},checkpoint:{x:14,y:6},
 nodes:[node('sail',5,3,'light'),node('anchor',5,9,'root'),node('wind',17,3,'light',['plate:weight','plate:leaf']),node('home',17,10,'root',['node:wind'])],
 ferries:[{id:'paper',x:7,y:6,endpoints:[{x:7,y:6},{x:13,y:6}],requires:['node:sail','node:anchor'],label:'雙人紙船'}],
 crates:[{id:'peach',x:15,y:8}],plates:[plate('weight',17,8),plate('leaf',16,3,1)],
},b=>{wall(b,8,1,12,11,'~');wall(b,3,6,4,6);wall(b,15,7,17,7);wall(b,15,9,17,9);floor(b,18,9);}),
make({
 id:'moon-clock',biome:'moon',title:'05 · 月相庭院',subtitle:'同一輪月亮，會打開不同的路。',
 intro:'燈燈可轉動月相輪。滿月開北門，新月開南門。改變道路時，記得搭檔還站在哪裡。',
 hints:['先讓芽芽站在左下的葉紋踏板。燈燈在左上轉動月相輪，從北門進右岸，點亮北邊心石。','右岸上下庭院被牆隔開。燈燈必須回到左岸，把月相輪轉回新月，才能從南門進下庭。','兩人都走進南庭，彼此靠近。芽芽喚醒下方心石後，中央的回家門就會永久開啟。'],
 players:[{x:3,y:3},{x:3,y:9}],exit:{x:18,y:9},checkpoint:{x:5,y:6},
 nodes:[node('moon',5,3,'switch',[],{label:'新月／滿月'}),node('memory',17,3,'light',['node:moon','plate:leaf']),node('tide',17,9,'root',['not:moon','node:memory','near:0'])],
 plates:[plate('leaf',5,9,1)],
 gates:[gate('north',10,3,['node:moon']),gate('south',10,9,['not:moon']),gate('reunion',16,6,['node:tide'])],
},b=>{wall(b,10,1,10,11);floor(b,10,3);floor(b,10,9);wall(b,11,6,19,6);floor(b,16,6);wall(b,3,5,3,7);wall(b,13,2,13,4);wall(b,13,8,13,10);}),
make({
 id:'mist-library',biome:'mist',title:'06 · 迷霧書庫',subtitle:'跌進霧裡也沒關係，我會牽你回到光裡。',
 intro:'深色迷霧會絆住腳步。搭檔靠近一格內，按互動鍵就能扶起你。兩人在月白石旁互動，就能存下目前機關。',
 hints:['左上方點燈後，左側霧橋變安全。先過橋，芽芽喚醒左下心石，打開書庫的隔牆。','兩人一起到下方中央的月白石存下進度。遇到困局，可以重試這個存檔點。','兩人沿下方走到右岸。燈燈靠近芽芽，讓芽芽喚醒右下心石；右側霧橋才會打開，通往最後的燈。'],
 players:[{x:3,y:3},{x:4,y:3}],exit:{x:18,y:3},checkpoint:{x:12,y:9},
 nodes:[node('ward',5,3,'light'),node('shelf',5,9,'root',['node:ward']),node('path',16,9,'root',['near:0']),node('story',17,3,'light',['node:path'])],
 gates:[gate('mist-west',6,6,['node:ward'],{kind:'bridge'}),gate('library',10,9,['node:shelf']),gate('mist-east',16,6,['node:path'],{kind:'bridge'})],
},b=>{wall(b,1,6,19,6,'!');wall(b,10,1,10,11);floor(b,10,9);wall(b,3,8,3,10);wall(b,7,8,7,10);wall(b,14,2,14,4);wall(b,18,8,18,10);}),
make({
 id:'root-observatory',biome:'aurora',title:'07 · 極光接力塔',subtitle:'把短暫的光，接成一條長路。',
 intro:'三座塔、兩次接力。讓搭檔先過門，替你把門留下。最後的星圖，還需要果核箱和彼此的位置。',
 hints:['燈燈站上左塔光紋踏板，芽芽穿過上方門，到中塔喚醒根心。','根心留下第一扇門。芽芽改站中塔下方葉紋踏板，讓燈燈穿過上方第二扇門，到右塔點燈。','芽芽把右塔果核箱向右推兩格。燈燈靠近，讓芽芽喚醒下方根心；芽芽再站到葉紋踏板，燈燈完成最後的星燈。'],
 players:[{x:3,y:3},{x:3,y:9}],exit:{x:18,y:6},checkpoint:{x:10,y:6},
 nodes:[node('relay-root',10,3,'root'),node('relay-light',17,3,'light'),node('star-root',17,9,'root',['plate:weight','near:0']),node('star-light',18,10,'light',['node:star-root','plate:last'])],
 plates:[plate('sun',3,3,0),plate('leaf',10,9,1),plate('weight',17,7),plate('last',16,9,1)],crates:[{id:'star',x:15,y:7}],
 gates:[gate('one',7,3,{any:['plate:sun','node:relay-root']}),gate('two',13,3,{any:['plate:leaf','node:relay-light']})],
},b=>{wall(b,7,1,7,11);floor(b,7,3);wall(b,13,1,13,11);floor(b,13,3);wall(b,3,6,5,6);wall(b,9,7,11,7);wall(b,14,8,16,8);wall(b,16,5,18,5);}),
make({
 id:'home-tide',biome:'home',title:'08 · 回家的潮汐',subtitle:'我們不是找到了一條路。我們一起種出了路。',
 intro:'最後一座島，把一路學會的默契連起來。點燈、生根、渡船、留下重量，然後一起打開家的門。',
 hints:['先喚醒左岸兩顆心石。兩人到紙船旁，由燈燈掌舵，渡到中島。','芽芽把中島果核箱向右推兩格；燈燈靠近，讓芽芽喚醒中島根心。燈燈轉動上方月輪，打開北門。','右岸最後兩顆心石仍需要你們分工：芽芽站南方葉紋踏板，燈燈點亮北心；燈燈再站北方光紋踏板，芽芽喚醒南心。一起回到中央的家。'],
 players:[{x:3,y:3},{x:3,y:9}],exit:{x:18,y:6},checkpoint:{x:10,y:6},
 nodes:[node('farewell-light',5,3,'light'),node('farewell-root',5,9,'root'),node('moon',10,3,'switch'),node('harbour',10,9,'root',['plate:weight','near:0']),node('home-light',17,3,'light',['plate:leaf']),node('home-root',17,9,'root',['plate:sun','node:harbour'])],
 ferries:[{id:'last-boat',x:6,y:6,endpoints:[{x:6,y:6},{x:8,y:6}],requires:['node:farewell-light','node:farewell-root'],label:'歸途紙船'}],
 crates:[{id:'memory',x:9,y:7}],plates:[plate('weight',11,7),plate('sun',16,3,0),plate('leaf',16,9,1)],
 gates:[gate('moon-door',13,3,['node:moon']),gate('root-door',13,9,['node:harbour']),gate('home',17,6,['node:home-light','node:home-root'])],
},b=>{wall(b,7,1,7,11,'~');wall(b,13,1,13,11);floor(b,13,3);floor(b,13,9);wall(b,9,8,11,8);wall(b,17,5,19,5);wall(b,17,7,19,7);wall(b,17,5,17,7);floor(b,17,6);}),
];
export const levelData=campaign;
export default campaign;
