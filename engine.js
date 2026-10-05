import { campaign } from './levels.js';
export {campaign, campaign as levelData} from './levels.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const at=(a,x,y)=>a.x===x&&a.y===y;

/** Pure deterministic grid simulation. Rendering and keyboard timing live in app.js. */
export function createGame({levelIndex=0}={}) {
 let state,checkpointSave,serial=0;

 function announce(text,kind='info'){state.message=text;state.messageKind=kind;state.eventId=++serial;}
 function condition(rule,context) {
  if(!rule)return true;
  if(Array.isArray(rule))return rule.every(r=>condition(r,context));
  if(typeof rule==='object')return rule.any?rule.any.some(r=>condition(r,context)):condition(rule.all,context);
  const split=rule.indexOf(':'),kind=rule.slice(0,split),id=rule.slice(split+1);
  if(kind==='node')return !!state.nodes.find(n=>n.id===id)?.active;
  if(kind==='not')return !state.nodes.find(n=>n.id===id)?.active;
  if(kind==='plate')return !!state.plates.find(p=>p.id===id)?.pressed;
  if(kind==='near')return !!context&&!state.players[Number(id)].downed&&dist(state.players[Number(id)],context)<=2;
  return false;
 }
 function updateMechanisms(){
  state.plates.forEach(p=>p.pressed=state.players.some(a=>!a.downed&&(p.role===null||p.role===a.id)&&at(a,p.x,p.y))||(p.role===null&&state.crates.some(c=>at(c,p.x,p.y))));
  state.gates.forEach(g=>{const requested=condition(g.requires,g);const occupied=[...state.players,...state.crates].some(a=>at(a,g.x,g.y));g.heldOpen=!requested&&occupied&&g.open;g.open=!!(requested||g.heldOpen);});
  state.nodes.forEach(n=>n.ready=condition(n.requires,n));
  state.ferries.forEach(f=>f.ready=condition(f.requires,f));
  const all=state.nodes.filter(n=>n.required);state.objective={done:all.filter(n=>n.active).length,total:all.length};
  if(state.status==='playing'&&all.every(n=>n.active)&&state.players.every(p=>!p.downed&&dist(p,state.exit)<=1)){
   state.status=state.levelIndex===campaign.length-1?'ending':'levelComplete';
   announce(state.status==='ending'?'潮汐把八座島連成了家。因為有你，路才會發光。':'這座島重新亮了起來。你們一起留下了一條回家的路。','success');
  }
 }
 function start(index){
  const n=Math.max(0,Math.min(campaign.length-1,index|0)),l=clone(campaign[n]);
  state={...l,levelIndex:n,status:'playing',elapsed:0,moves:0,interactions:0,hintIndex:0,eventId:++serial,message:l.intro,messageKind:'info',
   players:l.players.map((p,id)=>({...p,id,startX:p.x,startY:p.y,role:id===0?'light':'root',name:id===0?'燈燈':'芽芽',rescues:0,falls:0,downed:false})),
   nodes:l.nodes.map(o=>({...o,active:false,ready:false})),plates:l.plates.map(o=>({...o,pressed:false})),gates:l.gates.map(o=>({...o,open:false,heldOpen:false})),checkpoint:{...l.checkpoint,active:false},
   rescues:0,falls:0,checkpointCount:0};
  updateMechanisms();checkpointSave=clone(state);
 }
 function tile(x,y){return state.map[y]?.[x]??'#';}
 function blocked(x,y,forCrate=false){
  if(tile(x,y)==='#')return true;
  const gate=state.gates.find(g=>at(g,x,y));
  if(gate&&!gate.open)return true;
  if(forCrate&&(tile(x,y)==='~'||tile(x,y)==='!')&&!gate?.open)return true;
  return state.crates.some(c=>at(c,x,y));
 }
 function dangerous(x,y){const t=tile(x,y),g=state.gates.find(q=>at(q,x,y));return(t==='~'||t==='!')&&!g?.open&&!state.ferries.some(f=>at(f,x,y));}
 function move(player,dx,dy){
  if(state.status!=='playing'||![0,1].includes(player)||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;
  updateMechanisms();const p=state.players[player];if(p.downed){announce('搭檔需要靠近你，按互動鍵把你扶起；或按 R 回到月白石。');return false;}const oldX=p.x,oldY=p.y,x=p.x+dx,y=p.y+dy;
  if(tile(x,y)==='#')return false;
  const g=state.gates.find(g=>at(g,x,y));if(g&&!g.open){announce('這條路還在等機關。看看踏板、心石，或另一位搭檔的位置。');return false;}
  const crate=state.crates.find(c=>at(c,x,y));
  if(crate){
   if(player!==1){announce('果核箱需要芽芽來推。燈燈可以先去找需要光的地方。');return false;}
   const nx=x+dx,ny=y+dy;
   if(blocked(nx,ny,true)||state.players.some(a=>a.id!==player&&at(a,nx,ny))){announce('箱子的前方沒有空位。換個方向，或從月白石重試。');return false;}
   crate.x=nx;crate.y=ny;
  }
  p.x=x;p.y=y;state.moves++;
  if(dangerous(x,y)){
   p.x=oldX;p.y=oldY;p.downed=true;p.falls++;state.falls++;
   announce(`${p.name}被潮霧絆住了。搭檔走到一格內，按互動鍵把彼此扶起；也可以按 R 重試。`,'downed');
  }
  updateMechanisms();return true;
 }
 function act(player){
  if(state.status!=='playing'||![0,1].includes(player))return false;
  updateMechanisms();const p=state.players[player];if(p.downed){announce('現在需要搭檔來扶你一把。靠近後，讓搭檔按互動鍵。');return false;}
  const partner=state.players[1-player];
  if(partner.downed&&dist(p,partner)<=1){partner.downed=false;partner.rescues++;state.rescues++;state.interactions++;announce(`${p.name}扶起了${partner.name}。一起找條安全的路。`,'rescue');updateMechanisms();return true;}
  if(dist(p,state.checkpoint)===0&&state.players.every(a=>!a.downed&&dist(a,state.checkpoint)<=1)){state.checkpoint.active=true;state.checkpointCount++;state.interactions++;announce('月白石記住了你們的位置、心石和果核箱。重試會回到這一刻。','checkpoint');updateMechanisms();checkpointSave=clone(state);return true;}
  const candidates=state.nodes.filter(n=>n.role===player&&dist(p,n)<=1&&(n.kind==='switch'||!n.active));
  // Prefer the node directly occupied, then an actionable adjacent node.
  candidates.sort((a,b)=>(dist(p,a)-dist(p,b))||(Number(b.ready)-Number(a.ready)));
  if(candidates.length){
   const n=candidates[0];if(!condition(n.requires,n)){announce(n.requires.some?.(r=>typeof r==='string'&&r.startsWith('near:'))?'這顆心石需要搭檔在兩格內。靠近彼此，再試一次。':'心石還在等另一個機關。請搭檔站上對應踏板，或先喚醒相連的心石。');return false;}
   n.active=n.kind==='switch'?!n.active:true;state.interactions++;
   announce(n.kind==='switch'?(n.active?'滿月升起：北門打開了。':'新月降臨：南門打開了。'):(player===0?'一顆燈心亮了起來。':'一顆芽心舒展了新葉。'),'activate');updateMechanisms();return true;
  }
  const ferry=state.ferries.find(f=>dist(p,f)<=1);
  if(ferry){
   if(player!==0){announce('芽芽負責定住風。等燈燈在船邊按 E 掌舵。');return false;}
   if(!condition(ferry.requires,ferry)){announce('船帆還在等左岸的燈心和芽心醒來。');return false;}
   if(!state.players.every(a=>!a.downed&&dist(a,ferry)<=1)){announce('紙船要兩人一起出發。請搭檔也走到船的一格內。');return false;}
   const end=ferry.endpoints.find(e=>!at(e,ferry.x,ferry.y));if(!end)return false;if(blocked(end.x,end.y,true)){announce('彼岸的渡口被擋住了。先把落腳處清空，紙船才能靠岸。');return false;}
   ferry.x=end.x;ferry.y=end.y;state.players.forEach(a=>{a.x=end.x;a.y=end.y;});state.interactions++;announce('燈掌舵，芽定風。紙船把你們一起送到彼岸。','ferry');updateMechanisms();return true;
  }
  if(dist(p,state.checkpoint)<=1){
   if(!state.players.every(a=>!a.downed&&dist(a,state.checkpoint)<=1)){announce('兩人都靠近月白石，再按互動鍵，就能保存目前的機關。');return false;}
   state.checkpoint.active=true;state.checkpointCount++;state.interactions++;announce('月白石記住了你們的位置、心石和果核箱。重試會回到這一刻。','checkpoint');updateMechanisms();checkpointSave=clone(state);return true;
  }
  const wrong=state.nodes.find(n=>n.role!==player&&dist(p,n)<=1&&!n.active);
  announce(wrong?(wrong.role===0?'這是燈燈的心石，讓光來喚醒它。':'這是芽芽的心石，讓根來喚醒它。'):'靠近自己的心石、月相輪、紙船，或一起靠近月白石，再按互動鍵。');return false;
 }
 function restoreCheckpoint(report=true){const elapsed=state.elapsed,moves=state.moves,rescues=state.rescues,falls=state.falls,counters=state.players.map(p=>({rescues:p.rescues,falls:p.falls}));state=clone(checkpointSave);state.elapsed=elapsed;state.moves=moves;state.rescues=rescues;state.falls=falls;state.players.forEach((p,i)=>{p.rescues=counters[i].rescues;p.falls=counters[i].falls;p.downed=false;});state.status='playing';if(report)announce(state.checkpoint.active?'回到月白石記住的時刻。你們可以換一種走法。':'重新回到這座島的出發處。','retry');updateMechanisms();return true;}
 function tick(dt){if(state.status==='playing'&&Number.isFinite(dt)&&dt>0)state.elapsed+=Math.min(dt,1);return state.status;}
 function retry(){if(state.status!=='playing')return false;return restoreCheckpoint();}
 function restartLevel(){const index=state.levelIndex;start(index);return true;}
 function advance(){if(state.status!=='levelComplete')return false;start(state.levelIndex+1);return true;}
 function snapshot(){return clone(state);}
 start(levelIndex);
 return{move,act,tick,retry,restartLevel,advance,snapshot};
}
