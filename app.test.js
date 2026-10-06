import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGame,campaign} from './engine.js';

// Small deterministic DOM fixture. This tests real app event handlers and engine
// calls, but does not claim to replace browser layout, accessibility or audio QA.
class Target {
 constructor(){this.listeners=new Map();}
 addEventListener(type,fn){const set=this.listeners.get(type)||[];set.push(fn);this.listeners.set(type,set);}
 dispatch(type,detail={}){const event={type,target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},...detail};for(const fn of this.listeners.get(type)||[])fn(event);return event;}
}
class Element extends Target {
 constructor(tag='div',id=''){super();this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.attributes={};this.hidden=false;this.open=false;this.textContent='';}
 setAttribute(key,value){this.attributes[key]=value;}
 getAttribute(key){return this.attributes[key];}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 focus(){globalThis.document.activeElement=this;}
 click(){this.focus();const event=this.dispatch('click');return this.onclick?.(event);}
 showModal(){this.open=true;globalThis.document.getElementById('dialog-actions').children[0]?.focus();}
 close(){this.open=false;}
 getContext(){return {};}
}
class Button extends Element {constructor(id=''){super('button',id);}}
class Anchor extends Element {constructor(id=''){super('a',id);}}
let fixtureNumber=0;
async function boot({stored=null,denied=false}={}){
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
 const ids=new Map();for(const match of html.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"/g))ids.set(match[2],match[1]==='button'?new Button(match[2]):new Element(match[1],match[2]));
 const document=new Target();Object.assign(document,{hidden:false,activeElement:null,getElementById:id=>{assert.ok(ids.has(id),`DOM id exists: ${id}`);return ids.get(id);},createElement:tag=>tag==='button'?new Button():new Element(tag),createDocumentFragment:()=>new Element('fragment')});
 let raw=stored;const window=new Target();window.scrollTo=()=>{};
 Object.defineProperty(window,'localStorage',{get:()=>{if(denied)throw Error('storage unavailable');return{getItem:()=>raw,setItem:(_,value)=>{raw=value;}};}});
 const frames=[];let latestGame=null;const renders=[];const audioContexts=[];
 class Audio {
  constructor(){this.state='suspended';this.currentTime=0;this.destination={};audioContexts.push(this);}
  async resume(){this.state='running';}
  createOscillator(){return{frequency:{value:0},connect(){},disconnect(){},start(){},stop(){}};}
  createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 const globals={document,window,HTMLButtonElement:Button,HTMLAnchorElement:Anchor,matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>frames.push(fn),AudioContext:Audio,__auditEngine:{campaign,createGame:options=>(latestGame=createGame(options))},__auditRenderer:{render:(_ctx,s)=>renders.push(s),renderTitle:()=>{}}};
 const previous=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));Object.assign(globalThis,globals);
 let source=await readFile(new URL('./app.js',import.meta.url),'utf8');
 source=source.replace(/import \{createGame, campaign\} from '\.\/engine.js';/, 'const {createGame,campaign}=globalThis.__auditEngine;').replace(/import \{render, renderTitle\} from '\.\/renderer.js';/,'const {render,renderTitle}=globalThis.__auditRenderer;');
 source=source.replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL(path,import.meta.url).href}'`);
 try{await import(`data:text/javascript;base64,${Buffer.from(source+`\n//# sourceURL=app-fixture-${++fixtureNumber}.js`).toString('base64')}`);}catch(error){for(const[k,v]of previous){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}throw error;}
 const $=id=>document.getElementById(id);
 return{document,window,$,frames,renders,audioContexts,get game(){return latestGame;},get stored(){return raw;},
  press(code,detail={}){return window.dispatch('keydown',{code,repeat:false,target:document.activeElement||$('game'),...detail});},
  release(code){return window.dispatch('keyup',{code});},
  frame(stamp){assert.ok(frames.length);frames.shift()(stamp);},
  action(index=0){return $('dialog-actions').children[index].click();},
  start(){ $('start').click();assert.equal($('dialog').open,true);$('dialog-actions').children[0].click();assert.equal($('dialog').open,false);assert.equal(document.activeElement,$('game'));},
  dispose(){for(const[k,v]of previous){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
 };
}

test('real app starts, focuses canvas, routes both players and suppresses repeated interactions',async()=>{
 const f=await boot();try{
  f.frame(16);assert.equal(f.$('play').hidden,true);f.start();assert.equal(f.$('landing').hidden,true);assert.equal(f.$('play').hidden,false);
  const initial=f.game.snapshot();assert.equal(f.press('KeyD').defaultPrevented,true);f.press('ArrowRight');
  assert.equal(f.game.snapshot().players[0].x,initial.players[0].x+1);assert.equal(f.game.snapshot().players[1].x,initial.players[1].x+1);
  f.press('KeyD',{repeat:true});assert.equal(f.game.snapshot().players[0].x,initial.players[0].x+1);
  f.press('KeyE');assert.equal(f.game.snapshot().objective.done,1);f.press('KeyE',{repeat:true});assert.equal(f.game.snapshot().objective.done,1);
  f.release('KeyD');f.release('ArrowRight');f.release('KeyE');const moves=f.game.snapshot().moves;f.frame(66);f.frame(116);f.frame(166);f.frame(216);assert.equal(f.game.snapshot().moves,moves);
  assert.equal(JSON.parse(f.stored).level,0);assert.match(f.$('objective').textContent,/1 \/ 4/);
 }finally{f.dispose();}
});

test('pause, hint, retry and blur dialogs block movement and return focus; blur clears both keys',async()=>{
 const f=await boot();try{
  f.start();f.press('KeyD');f.press('ArrowRight');f.window.dispatch('blur');assert.equal(f.$('dialog').open,true);
  const moves=f.game.snapshot().moves,elapsed=f.game.snapshot().elapsed;f.frame(50);f.frame(100);assert.equal(f.game.snapshot().moves,moves);assert.equal(f.game.snapshot().elapsed,elapsed);
  f.press('KeyD');assert.equal(f.game.snapshot().moves,moves);f.action(1);assert.equal(f.document.activeElement,f.$('game'));
  for(let i=0;i<5;i++)f.frame(150+i*50);assert.equal(f.game.snapshot().moves,moves,'held keys were released by blur');
  f.press('KeyH');assert.equal(f.$('dialog').open,true);assert.match(f.$('dialog-title').textContent,/線索/);f.action(0);assert.equal(f.$('dialog').open,true);f.action(1);assert.equal(f.document.activeElement,f.$('game'));
  f.press('KeyR');assert.equal(f.$('dialog').open,true);f.action(2);assert.equal(f.$('dialog').open,false);assert.equal(f.game.snapshot().players[0].x,3);
  f.press('Space');assert.equal(f.$('dialog').open,true);const e=f.$('dialog').dispatch('cancel');assert.equal(e.defaultPrevented,true);assert.equal(f.$('dialog').open,false);assert.equal(f.document.activeElement,f.$('game'));
  f.document.hidden=true;f.document.dispatch('visibilitychange');assert.equal(f.$('dialog').open,true);
 }finally{f.dispose();}
});

test('title help restores original focus; sound and motion buttons do not strand gameplay focus',async()=>{
 const f=await boot();try{
  f.$('help').click();assert.equal(f.$('dialog').open,true);f.action();assert.equal(f.document.activeElement,f.$('help'));assert.equal(f.$('play').hidden,true);
  f.start();f.$('motion').click();assert.equal(f.document.activeElement,f.$('game'));assert.equal(f.$('motion').getAttribute('aria-pressed'),'true');
  const x=f.game.snapshot().players[0].x;f.press('KeyD');f.release('KeyD');assert.equal(f.game.snapshot().players[0].x,x+1);
  await f.$('music').click();assert.equal(f.document.activeElement,f.$('game'));assert.equal(f.$('music').getAttribute('aria-pressed'),'true');assert.equal(f.audioContexts.length,1);
  await f.$('music').click();assert.equal(f.$('music').getAttribute('aria-pressed'),'false');
 }finally{f.dispose();}
});

test('denied storage and malformed progress never prevent starting; valid continue restores correct island',async()=>{
 for(const options of [{denied:true},{stored:'{broken'},{stored:'{"version":1,"level":8,"complete":true}'}]){
  const f=await boot(options);try{assert.equal(f.$('continue').hidden,true);f.start();assert.equal(f.game.snapshot().levelIndex,0);if(options.denied)assert.match(f.$('save-note').textContent,/未允許儲存/);}finally{f.dispose();}
 }
 const f=await boot({stored:JSON.stringify({version:1,level:4,complete:false})});try{
  assert.equal(f.$('continue').hidden,false);f.$('continue').click();assert.equal(f.game.snapshot().levelIndex,4);f.action();assert.equal(f.document.activeElement,f.$('game'));
 }finally{f.dispose();}
});

test('modifier shortcuts and focused controls do not accidentally move actors',async()=>{
 const f=await boot();try{f.start();const moves=f.game.snapshot().moves;f.press('KeyD',{ctrlKey:true});f.press('KeyD',{altKey:true});f.press('KeyD',{metaKey:true});assert.equal(f.game.snapshot().moves,moves);f.$('help').focus();f.press('Enter');assert.equal(f.game.snapshot().moves,moves);}finally{f.dispose();}
});

test('restarting an island preserves total session time while resetting local puzzle state',async()=>{
 const f=await boot();try{
  f.start();for(let i=1;i<=30;i++)f.frame(i*50);assert.ok(f.game.snapshot().elapsed>=1);const displayed=f.$('elapsed').textContent;
  f.press('KeyD');f.release('KeyD');f.press('KeyE');f.release('KeyE');assert.equal(f.game.snapshot().objective.done,1);
  f.press('KeyR');f.action(1);assert.equal(f.game.snapshot().objective.done,0);assert.equal(f.game.snapshot().elapsed,0);assert.equal(f.$('elapsed').textContent,displayed);assert.equal(f.$('dialog').open,true);f.action();assert.equal(f.document.activeElement,f.$('game'));
 }finally{f.dispose();}
});

test('paused and reduced-motion frames avoid redundant canvas redraws while input still updates',async()=>{
 const f=await boot();try{
  f.start();f.frame(40);f.press('Space');f.frame(80);const pausedRenders=f.renders.length;
  for(let i=0;i<120;i++)f.frame(100+i*17);
  assert.equal(f.renders.length,pausedRenders,'paused screen is drawn once');
  f.action(1);f.$('motion').click();f.frame(2200);const quiet=f.renders.length;
  for(let i=0;i<120;i++)f.frame(2250+i*17);
  assert.equal(f.renders.length,quiet,'reduced-motion idle screen is static');
  f.press('KeyD');f.release('KeyD');f.frame(4350);assert.equal(f.renders.length,quiet+1,'input still redraws in reduced motion');
 }finally{f.dispose();}
});
