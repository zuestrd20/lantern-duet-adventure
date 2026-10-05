import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createGame} from './engine.js';
import {render, renderTitle, BIOME_PALETTES} from './renderer.js';

// A strict Canvas2D recorder keeps these tests dependency-free and catches invalid
// geometry, leaked save() frames, missing context APIs, and simulation mutation.
function recordingContext() {
  let depth = 0, gradients = 0, count = 0;
  const stack = [], properties = ['globalAlpha','fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','font','textAlign','textBaseline'];
  const digest = createHash('sha256'), labels = [];
  const record = (name, values = []) => { count++; digest.update(JSON.stringify([name, ...values])); };
  const finite = values => values.forEach(v => { if (typeof v === 'number') assert.ok(Number.isFinite(v), `Non-finite canvas coordinate: ${v}`); });
  const result = {canvas:{width:1120,height:680}, labels,globalAlpha:1,fillStyle:'#000',strokeStyle:'#000',lineWidth:1,lineCap:'butt',lineJoin:'miter',font:'10px sans-serif',textAlign:'start',textBaseline:'alphabetic',
    finish() { assert.equal(depth, 0, 'Every canvas save has a matching restore'); return {hash:digest.digest('hex'),count,labels}; },
    save() { depth++; stack.push(Object.fromEntries(properties.map(k=>[k,result[k]]))); record('save'); },
    restore() { assert.ok(depth > 0, 'Unmatched canvas restore'); depth--; Object.assign(result,stack.pop()); record('restore'); },
    createLinearGradient(...args) { finite(args); record('linearGradient', args); return gradient(); },
    createRadialGradient(...args) { finite(args); assert.ok(args[2] >= 0 && args[5] >= 0); record('radialGradient',args); return gradient(); },
    ellipse(...args) { finite(args); assert.ok(args[2] >= 0 && args[3] >= 0); record('ellipse', args); },
    roundRect(...args) { finite(args); assert.ok(args[2] >= 0 && args[3] >= 0); record('roundRect',args); },
    fillText(...args) { labels.push(args[0]); finite(args); record('fillText',args); },
    setLineDash(args) { finite(args); record('setLineDash',args); },
  };
  function gradient() { const id = ++gradients; return {id, addColorStop(stop,color) { assert.ok(stop >= 0 && stop <= 1); assert.equal(typeof color,'string'); record('colorStop',[id,stop,color]); }}; }
  for (const method of ['beginPath','closePath','moveTo','lineTo','bezierCurveTo','fill','stroke','fillRect','translate','rotate','scale']) result[method] = (...args) => { finite(args); record(method,args); };
  return new Proxy(result, {
    set(target,key,value) { finite([value]); record(`set:${key}`,[value]); target[key] = value; return true; },
    get(target,key) { if (!(key in target)) throw new Error(`Unexpected Canvas2D API: ${String(key)}`); return target[key]; },
  });
}

function freeze(value) { Object.freeze(value); for (const item of Object.values(value)) if (item && typeof item === 'object' && !Object.isFrozen(item)) freeze(item); return value; }

test('all eight original biome palettes are distinct', () => {
  assert.equal(BIOME_PALETTES.length,8);
  assert.equal(new Set(BIOME_PALETTES.map(p=>p.sky)).size,8);
});

test('every island renders without mutating its deeply frozen snapshot', () => {
  for (let i = 0; i < 8; i++) {
    const state = freeze(createGame({levelIndex:i}).snapshot());
    const before = JSON.stringify(state), ctx = recordingContext();
    render(ctx,state,{time:5,playerPositions:state.players.map(a=>({x:a.x+.2,y:a.y}))});
    assert.ok(ctx.finish().count > 1000);
    assert.equal(JSON.stringify(state),before);
  }
});

test('downed, overlap, active mechanisms, and ending have valid visible artwork', () => {
  const state = createGame({levelIndex:7}).snapshot();
  state.players[1].x = state.players[0].x; state.players[1].y = state.players[0].y;
  state.players[0].downed = true;
  state.nodes.forEach(n=>{n.active=true;n.ready=true;}); state.plates.forEach(p=>p.pressed=true); state.gates.forEach(g=>g.open=true);
  state.checkpoint.active = true; state.objective.done = state.objective.total;
  const ctx = recordingContext(); render(ctx,freeze(state),{time:12});
  assert.ok(ctx.finish().labels.includes('救援'));
  const ending = {...state,status:'ending'}; const ctx2 = recordingContext(); render(ctx2,ending,{time:20}); ctx2.finish();
});

test('reduced-motion render is time-invariant for title and gameplay', () => {
  const state = freeze(createGame({levelIndex:3}).snapshot());
  function draw(seconds,title=false) { const ctx=recordingContext(); if(title) renderTitle(ctx,seconds,true); else render(ctx,state,{time:seconds,reducedMotion:true}); return ctx.finish().hash; }
  assert.equal(draw(0),draw(200));
  assert.equal(draw(0,true),draw(200,true));
});

test('animated cover draws successfully and changes over time', () => {
  const a=recordingContext(), b=recordingContext(); renderTitle(a,0,false); renderTitle(b,5,false);
  assert.notEqual(a.finish().hash,b.finish().hash);
});
