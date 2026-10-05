import test from 'node:test';
import assert from 'node:assert/strict';
import {DuetInput,KEYMAP} from './input.js';
import {loadProgress,saveProgress} from './storage.js';
import {DuetAudio} from './audio.js';
import {createGame,campaign} from './engine.js';

const steps=(input,count=4)=>{for(let i=0;i<count;i++)input.tick(.05);};

test('both keyboard sets act immediately, repeat independently, and suppress native repeats',()=>{
 const moves=[],actions=[];const input=new DuetInput((...m)=>moves.push(m),p=>actions.push(p));
 input.down('KeyD');input.down('ArrowUp');assert.deepEqual(moves,[[0,1,0],[1,0,-1]]);
 input.down('KeyD',true);input.down('KeyD');assert.equal(moves.length,2);
 steps(input);assert.deepEqual(moves.slice(-2),[[0,1,0],[1,0,-1]]);
 input.down('KeyE');input.down('Enter');input.down('KeyE',true);input.down('Enter');steps(input);
 assert.deepEqual(actions,[0,1],'interactions are edge-triggered, never auto-repeated');
 input.up('KeyE');input.down('KeyE');assert.deepEqual(actions,[0,1,0]);
 assert.equal(Object.keys(KEYMAP).length,8);
});

test('opposite directions use newest press then return to still-held direction',()=>{
 const moves=[];const input=new DuetInput((...m)=>moves.push(m),()=>{});
 input.down('KeyA');input.down('KeyD');steps(input);assert.deepEqual(moves.at(-1),[0,1,0]);
 input.up('KeyD');steps(input);assert.deepEqual(moves.at(-1),[0,-1,0]);
 input.down('ArrowDown');input.down('ArrowUp');steps(input);assert.deepEqual(moves.filter(m=>m[0]===1).at(-1),[1,0,-1]);
 input.up('ArrowUp');steps(input);assert.deepEqual(moves.filter(m=>m[0]===1).at(-1),[1,0,1]);
 input.clear();const before=moves.length;steps(input,100);assert.equal(moves.length,before);
 assert.equal(input.keys.size,0);input.down('KeyD');assert.equal(moves.length,before+1);
});

test('unmapped keys and released keys do not move; repeat clocks cap long gaps',()=>{
 const moves=[];const input=new DuetInput((...m)=>moves.push(m),()=>{});
 input.down('Space');input.down('KeyZ');input.up('KeyQ');assert.equal(input.keys.size,0);
 input.down('KeyW');input.tick(100);assert.equal(moves.length,1,'one stale frame cannot run many moves');
 input.up('KeyW');steps(input,100);assert.equal(moves.length,1);
});

test('progress round-trips every island and completion, without accepting malformed data',()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(key,value)=>{assert.equal(key,'lantern-duet-v1');raw=value;}};
 assert.deepEqual(loadProgress(storage),{version:1,level:0,complete:false});
 for(let level=0;level<8;level++){assert.equal(saveProgress(storage,level,level===7),true);assert.deepEqual(loadProgress(storage),{version:1,level,complete:level===7});}
 for(const value of [null,'{','null','[]','3','{}','{"version":2,"level":2,"complete":false}','{"version":1,"level":8,"complete":false}','{"version":1,"level":-1,"complete":false}','{"version":1,"level":1.2,"complete":false}','{"version":1,"level":2,"complete":"false"}']){
  raw=value;assert.deepEqual(loadProgress(storage),{version:1,level:0,complete:false});
 }
 for(const invalid of [-1,8,1.1,NaN,Infinity,'2',null])assert.equal(saveProgress(storage,invalid),false);
 const denied={getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');}};
 assert.deepEqual(loadProgress(denied),{version:1,level:0,complete:false});assert.equal(saveProgress(denied,0),false);
 assert.deepEqual(loadProgress(undefined),{version:1,level:0,complete:false});assert.equal(saveProgress(undefined,0),false);
});

class AudioContextMock{
 constructor(){this.currentTime=0;this.state='suspended';this.destination={};this.oscillators=[];this.gains=[];this.resumes=0;}
 async resume(){this.resumes++;this.state='running';}
 createOscillator(){const o={frequency:{value:0},connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(when){this.stops??=[];this.stops.push(when);if(when===undefined)this.onended?.();}};this.oscillators.push(o);return o;}
 createGain(){const g={gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){this.disconnected=true;}};this.gains.push(g);return g;}
}

test('audio opts in, schedules locally, pauses/stops cleanly, and resumes the same context',async()=>{
 const audio=new DuetAudio(AudioContextMock);audio.setActive(true);audio.update(0);assert.equal(audio.ctx,null);
 assert.equal(await audio.enable(true),true);const context=audio.ctx;audio.update(0);assert.equal(context.oscillators.length,2);assert.equal(audio.nodes.size,2);
 audio.update(0);assert.equal(context.oscillators.length,2);context.currentTime=.5;audio.update(1);assert.equal(context.oscillators.length,3);
 audio.setActive(false);assert.equal(audio.nodes.size,0);assert.ok(context.oscillators.every(o=>o.disconnected));assert.ok(context.gains.every(g=>g.disconnected));
 audio.update(0);assert.equal(context.oscillators.length,3);audio.setActive(true);audio.effect('node');assert.equal(audio.nodes.size,2);
 assert.equal(await audio.enable(false),false);assert.equal(audio.enabled,false);assert.equal(audio.nodes.size,0);
 assert.equal(await audio.enable(true),true);assert.equal(audio.ctx,context);assert.equal(context.resumes,2);
});

test('unavailable and denied audio fail safely, without pretending sound is enabled',async()=>{
 const unavailable=new DuetAudio(null);assert.equal(await unavailable.enable(true),false);assert.equal(unavailable.enabled,false);
 class Rejected extends AudioContextMock{async resume(){throw Error('gesture needed');}}
 const denied=new DuetAudio(Rejected);assert.equal(await denied.enable(true),false);assert.equal(denied.enabled,false);denied.update();assert.equal(denied.nodes.size,0);
});

test('campaign requires both distinct actors on every island, with full hints and safe starts',()=>{
 assert.equal(campaign.length,8);assert.equal(new Set(campaign.map(l=>l.id)).size,8);
 for(const [i,l]of campaign.entries()){
  assert.equal(l.players.length,2);assert.equal(l.map.length,l.height);assert.ok(l.map.every(r=>r.length===l.width));assert.ok(l.hints.length>=3);
  assert.equal(new Set(l.nodes.map(n=>n.id)).size,l.nodes.length,`unique nodes on island ${i+1}`);
  for(const p of l.players)assert.equal(l.map[p.y][p.x],'.',`safe starting square on island ${i+1}`);
  for(const role of [0,1])assert.ok(l.nodes.some(n=>n.required&&n.role===role),`island ${i+1} has mandatory player ${role+1} action`);
 }
 // Nodes only change in their owner's act branch. No amount of one-role input
 // can activate the other role's required nodes, so exit remains impossible.
 const engineText=awaitableReadEngine();assert.match(engineText,/n\.role===player/);assert.match(engineText,/all\.every\(n=>n\.active\)/);
});
import {readFileSync} from 'node:fs';
function awaitableReadEngine(){return readFileSync(new URL('./engine.js',import.meta.url),'utf8');}

test('seeded adversarial public input preserves simulation invariants on all eight islands',()=>{
 let seed=0xc0ffee;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let stage=0;stage<8;stage++){
  const game=createGame({levelIndex:stage});
  for(let i=0;i<700;i++){
   const player=rand(2),action=rand(8);if(action<4)game.move(player,...[[1,0],[-1,0],[0,1],[0,-1]][action]);else if(action<7)game.act(player);else game.retry();game.tick(.025);
   const s=game.snapshot();assert.ok(Number.isFinite(s.elapsed));assert.ok(s.elapsed>=0);assert.equal(s.objective.done,s.nodes.filter(n=>n.required&&n.active).length);assert.ok(s.objective.done<=s.objective.total);
   for(const p of s.players){assert.ok(p.x>0&&p.x<s.width-1&&p.y>0&&p.y<s.height-1);assert.notEqual(s.map[p.y][p.x],'#');assert.equal(typeof p.downed,'boolean');}
   for(const p of s.plates){const occupied=s.players.some(a=>!a.downed&&(p.role===null||a.id===p.role)&&a.x===p.x&&a.y===p.y)||(p.role===null&&s.crates.some(c=>c.x===p.x&&c.y===p.y));assert.equal(p.pressed,occupied);}
   for(const g of s.gates)if(g.heldOpen)assert.ok(g.open&&[...s.players,...s.crates].some(a=>a.x===g.x&&a.y===g.y));
   assert.equal(new Set(s.crates.map(c=>`${c.x},${c.y}`)).size,s.crates.length);
  }
 }
});

import {render,renderTitle} from './renderer.js';
function checkedCanvas(){
 let depth=0,calls=0;const values={globalAlpha:1};const stack=[];
 const check=args=>{for(const value of args.flat(Infinity))if(typeof value==='number')assert.ok(Number.isFinite(value),'canvas receives finite coordinates');};
 const context=new Proxy(values,{get(target,property){
  if(property in target)return target[property];
  if(property==='save')return()=>{stack.push({...target});depth++;};
  if(property==='restore')return()=>{assert.ok(depth>0,'restore is matched');Object.assign(target,stack.pop());depth--;};
  return(...args)=>{calls++;check(args);if(property==='createLinearGradient'||property==='createRadialGradient')return{addColorStop(...args){check(args);}};if(property==='measureText')return{width:String(args[0]).length*10};};
 },set(target,property,value){if(typeof value==='number')assert.ok(Number.isFinite(value),`finite canvas property ${property}`);target[property]=value;return true;}});
 return{context,verify(){assert.equal(depth,0,'renderer balances canvas save/restore');assert.ok(calls>100,'real drawing commands executed');}};
}
function deepFreeze(value){if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(deepFreeze);}return value;}

test('all island and title render paths accept frozen snapshots and finite animated coordinates',()=>{
 for(const reducedMotion of [false,true]){
  const title=checkedCanvas();renderTitle(title.context,12.7,reducedMotion);title.verify();
  for(let levelIndex=0;levelIndex<8;levelIndex++){
   const snapshot=createGame({levelIndex}).snapshot();snapshot.players[0].downed=true;snapshot.players[1].x=snapshot.players[0].x;snapshot.players[1].y=snapshot.players[0].y;
   const before=JSON.stringify(snapshot);deepFreeze(snapshot);const canvas=checkedCanvas();render(canvas.context,snapshot,{time:12.7,reducedMotion,width:1120,height:680});canvas.verify();assert.equal(JSON.stringify(snapshot),before);
  }
 }
});

test('rapid audio toggle and stale resume failure preserve the newest user choice',async()=>{
 class Delayed extends AudioContextMock{
  constructor(){super();this.pending=[];}
  resume(){return new Promise((resolve,reject)=>this.pending.push({resolve,reject}));}
 }
 const audio=new DuetAudio(Delayed);const enabling=audio.enable(true);
 assert.equal(await audio.enable(false),false);audio.ctx.pending[0].resolve();assert.equal(await enabling,false);assert.equal(audio.enabled,false);
 const stale=audio.enable(true),latest=audio.enable(true);audio.ctx.pending[2].resolve();assert.equal(await latest,true);
 audio.ctx.pending[1].reject(Error('stale resume'));assert.equal(await stale,true);assert.equal(audio.enabled,true,'old rejection cannot cancel current enable');
});
