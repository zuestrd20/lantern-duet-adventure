import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,campaign} from './engine.js';
const key=(x,y)=>`${x},${y}`;
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
// Public, legal-input walker. Reads only a cloned snapshot and issues real moves.
// It neither mutates the engine nor teleports actors nor activates hidden state.
export function walk(game,player,x,y){
 const s=game.snapshot(),start=s.players[player];if(start.x===x&&start.y===y)return;
 const queue=[[start.x,start.y,[]]],seen=new Set([key(start.x,start.y)]);
 while(queue.length){const[cx,cy,path]=queue.shift();for(const[dx,dy]of[[1,0],[0,1],[-1,0],[0,-1]]){
  const nx=cx+dx,ny=cy+dy,k=key(nx,ny),t=s.map[ny]?.[nx];if(seen.has(k)||!t||t==='#')continue;
  const g=s.gates.find(g=>g.x===nx&&g.y===ny);if(g&&!g.open)continue;
  if((t==='~'||t==='!')&&!g?.open)continue;
  if(s.crates.some(c=>c.x===nx&&c.y===ny))continue;
  const next=[...path,[dx,dy]];
  if(nx===x&&ny===y){for(const[a,b]of next){if(game.snapshot().status!=='playing'&&x===s.exit.x&&y===s.exit.y)return;assert.equal(game.move(player,a,b),true,`legal move ${s.levelIndex} player ${player}`);}if(game.snapshot().status!=='playing'&&x===s.exit.x&&y===s.exit.y)return;const p=game.snapshot().players[player];assert.deepEqual([p.x,p.y],[x,y],`walk destination in stage ${s.levelIndex+1}`);return;}
  seen.add(k);queue.push([nx,ny,next]);
 }}
 throw new Error(`No legal path in stage ${s.levelIndex+1}: P${player+1} ${start.x},${start.y} → ${x},${y}`);
}
export function use(game,player,id){const n=game.snapshot().nodes.find(n=>n.id===id);walk(game,player,n.x,n.y);assert.equal(game.act(player),true,`activate ${id} on stage ${game.snapshot().levelIndex+1}: ${game.snapshot().message}`);}
function together(game,x,y){walk(game,0,x,y);walk(game,1,x,y);}
function save(game){const c=game.snapshot().checkpoint;together(game,c.x,c.y);assert.equal(game.act(0),true);assert.equal(game.snapshot().checkpoint.active,true);}
function pushRight(game,x,y,count=2){walk(game,1,x-1,y);for(let i=0;i<count;i++)assert.equal(game.move(1,1,0),true);}
function finish(game){const e=game.snapshot().exit;walk(game,0,e.x,e.y);if(game.snapshot().status==='playing')walk(game,1,e.x,e.y);assert.ok(['levelComplete','ending'].includes(game.snapshot().status));}
export const solutions=[
 g=>{use(g,0,'dawn');use(g,1,'seed');save(g);walk(g,0,14,3);use(g,1,'south');walk(g,1,14,9);use(g,0,'north');finish(g);},
 g=>{pushRight(g,5,3);pushRight(g,5,9);save(g);walk(g,0,16,3);use(g,1,'sprout');use(g,0,'crown');finish(g);},
 g=>{walk(g,0,5,3);use(g,1,'moor');save(g);walk(g,1,10,3);use(g,0,'shore');walk(g,0,16,9);use(g,1,'bloom');use(g,0,'echo');finish(g);},
 g=>{use(g,0,'sail');use(g,1,'anchor');walk(g,0,7,6);walk(g,1,7,5);assert.equal(g.act(0),true);save(g);pushRight(g,15,8);walk(g,1,16,3);use(g,0,'wind');use(g,1,'home');finish(g);},
 g=>{walk(g,1,5,9);use(g,0,'moon');use(g,0,'memory');use(g,0,'moon');walk(g,0,16,9);use(g,1,'tide');finish(g);},
 g=>{use(g,0,'ward');use(g,1,'shelf');save(g);walk(g,0,16,9);use(g,1,'path');use(g,0,'story');finish(g);},
 g=>{use(g,1,'relay-root');save(g);walk(g,1,10,9);use(g,0,'relay-light');pushRight(g,15,7);walk(g,0,18,9);use(g,1,'star-root');walk(g,1,16,9);use(g,0,'star-light');finish(g);},
 g=>{use(g,0,'farewell-light');use(g,1,'farewell-root');walk(g,0,6,6);walk(g,1,6,5);assert.equal(g.act(0),true);save(g);pushRight(g,9,7);walk(g,0,11,9);use(g,1,'harbour');use(g,0,'moon');walk(g,0,16,3);use(g,1,'home-root');walk(g,1,16,9);use(g,0,'home-light');finish(g);}
];

test('all eight original islands complete through legal public inputs',()=>{
 const game=createGame();let moves=0;
 for(let i=0;i<campaign.length;i++){assert.equal(game.snapshot().levelIndex,i);solutions[i](game);const s=game.snapshot();moves+=s.moves;assert.equal(s.objective.done,s.objective.total);assert.equal(s.rescues,0,'solution does not exploit rescues');if(i<7)assert.equal(game.advance(),true);else{assert.equal(s.status,'ending');assert.equal(game.advance(),false);}}
 assert.ok(moves>500,`campaign has ${moves} real movement steps`);
 console.log(`Campaign solved legally in ${moves} movement inputs.`);
});

test('snapshot is isolated and outside mutations cannot open gates or win',()=>{
 const g=createGame();const s=g.snapshot();s.players[0].x=18;s.nodes.forEach(n=>n.active=true);s.status='ending';s.map[1]='.....................';
 assert.equal(g.snapshot().status,'playing');assert.equal(g.snapshot().players[0].x,3);assert.equal(g.snapshot().nodes[0].active,false);assert.equal(g.advance(),false);
});

test('wrong role cannot activate the other role, and a single role cannot finish any island',()=>{
 for(let stage=0;stage<8;stage++)for(let solo=0;solo<2;solo++){
  const g=createGame({levelIndex:stage});const inactiveRole=1-solo;
  // Exhaust reachable unblocked positions and repeatedly use every legal own action.
  // Other actor is never moved or asked to act. All required opposite nodes stay dark.
  for(let pass=0;pass<2;pass++)for(let y=1;y<12;y++)for(let x=1;x<20;x++){
   try{walk(g,solo,x,y);g.act(solo);}catch{/* An unreachable cell is not a legal solo route. */}
  }
  const s=g.snapshot();assert.ok(s.nodes.some(n=>n.required&&n.role===inactiveRole&&!n.active));assert.equal(s.status,'playing');
 }
});

test('crate only moves for seed guardian; pressure and restart restore correctly',()=>{
 const g=createGame({levelIndex:1});walk(g,0,4,3);assert.equal(g.move(0,1,0),false);assert.equal(g.snapshot().crates[0].x,5);
 walk(g,0,3,3);pushRight(g,5,3);assert.equal(g.snapshot().plates.find(p=>p.id==='upper').pressed,true);assert.equal(g.snapshot().gates[0].open,false);
 pushRight(g,5,9);assert.equal(g.snapshot().gates[0].open,true);g.retry();assert.equal(g.snapshot().crates[0].x,5);assert.equal(g.snapshot().gates[0].open,false);
});

test('held gate cannot crush an actor when plate releases, and closes after exit',()=>{
 const g=createGame({levelIndex:2});walk(g,0,5,3);walk(g,1,8,9);assert.equal(g.snapshot().gates[0].open,true);
 g.move(0,-1,0);assert.equal(g.snapshot().gates[0].heldOpen,true);assert.equal(g.snapshot().players[1].x,8);
 assert.equal(g.move(1,1,0),true);assert.equal(g.snapshot().gates[0].open,false);assert.equal(g.move(1,-1,0),false);
});

test('water downs on last safe tile; nearby partner rescues without skipping puzzle',()=>{
 const g=createGame({levelIndex:2});walk(g,1,7,5);g.move(1,1,0);const s=g.snapshot();assert.equal(s.falls,1);assert.equal(s.players[1].downed,true);assert.deepEqual([s.players[1].x,s.players[1].y],[7,5]);assert.equal(s.objective.done,0);assert.equal(s.gates.every(g=>!g.open),true);assert.equal(g.move(1,-1,0),false);assert.equal(g.act(1),false);walk(g,0,6,5);assert.equal(g.act(0),true);assert.equal(g.snapshot().players[1].downed,false);assert.equal(g.snapshot().rescues,1);
});

test('checkpoint preserves solved mechanisms and crate positions on retry',()=>{
 const g=createGame({levelIndex:1});pushRight(g,5,3);pushRight(g,5,9);save(g);walk(g,0,16,3);use(g,1,'sprout');assert.equal(g.snapshot().nodes[0].active,true);g.retry();const s=g.snapshot();assert.equal(s.checkpoint.active,true);assert.equal(s.nodes[0].active,false);assert.equal(s.crates[0].x,7);assert.equal(s.crates[1].x,7);assert.equal(s.gates[0].open,true);assert.deepEqual([s.players[0].x,s.players[0].y],[12,6]);
});

test('checkpoint retry clears downed actors and retains saved puzzle region',()=>{
 const g=createGame({levelIndex:2});walk(g,0,5,3);use(g,1,'moor');save(g);walk(g,1,11,5);g.move(1,1,0);const s=g.snapshot();assert.equal(s.falls,1);assert.equal(s.players[1].downed,true);assert.deepEqual([s.players[1].x,s.players[1].y],[11,5]);g.retry();assert.equal(g.snapshot().players[1].downed,false);assert.deepEqual([g.snapshot().players[1].x,g.snapshot().players[1].y],[10,6]);assert.equal(s.nodes.find(n=>n.id==='moor').active,true);assert.equal(s.gates[1].open,false);
});

test('ferry needs both roles nearby, transports both, and retry restores ferry side',()=>{
 const g=createGame({levelIndex:3});use(g,0,'sail');use(g,1,'anchor');walk(g,0,7,6);assert.equal(g.act(0),false);walk(g,1,7,5);assert.equal(g.act(1),false);assert.equal(g.act(0),true);assert.equal(g.snapshot().players.every(p=>p.x===13&&p.y===6),true);g.retry();assert.equal(g.snapshot().ferries[0].x,7);assert.equal(g.snapshot().players[0].x,3);
});

test('overlapping collaboration checks partner presence and role-specific plate',()=>{
 const g=createGame();use(g,0,'dawn');use(g,1,'seed');walk(g,0,16,3);assert.equal(g.act(0),false);walk(g,0,14,9);assert.equal(g.snapshot().plates.find(p=>p.id==='leaf').pressed,false);walk(g,1,14,9);use(g,0,'north');assert.equal(g.snapshot().nodes.find(n=>n.id==='north').active,true);
});

test('validation, frozen completion, bounded tick, and fresh restart',()=>{
 const g=createGame();assert.equal(g.move(0,2,0),false);assert.equal(g.move(2,1,0),false);assert.equal(g.move(0,1,1),false);g.tick(-1);g.tick(Infinity);assert.equal(g.snapshot().elapsed,0);g.tick(.5);assert.equal(g.snapshot().elapsed,.5);solutions[0](g);const before=g.snapshot();assert.equal(g.move(0,-1,0),false);assert.equal(g.act(0),false);g.tick(1);assert.equal(g.snapshot().elapsed,before.elapsed);g.restartLevel();assert.equal(g.snapshot().status,'playing');assert.equal(g.snapshot().objective.done,0);assert.equal(g.snapshot().checkpoint.active,false);
});

test('mist downs both actors; checkpoint retry always recovers a split or double fall',()=>{
 const g=createGame({levelIndex:5});walk(g,0,5,5);g.move(0,0,1);walk(g,1,4,5);g.move(1,0,1);
 assert.equal(g.snapshot().players.every(p=>p.downed),true);assert.equal(g.act(0),false);assert.equal(g.act(1),false);g.retry();assert.equal(g.snapshot().players.every(p=>!p.downed),true);assert.equal(g.snapshot().falls,2);assert.equal(g.snapshot().objective.done,0);
});

test('reversible moon gates never crush a standing player',()=>{
 const g=createGame({levelIndex:4});use(g,0,'moon');walk(g,1,10,3);use(g,0,'moon');assert.equal(g.snapshot().gates.find(q=>q.id==='north').heldOpen,true);g.move(1,1,0);assert.equal(g.snapshot().gates.find(q=>q.id==='north').open,false);assert.equal(g.move(1,-1,0),false);g.retry();assert.equal(g.snapshot().nodes.find(n=>n.id==='moon').active,false);
});

test('required objectives never bypass both-player exit requirement',()=>{
 const g=createGame();use(g,0,'dawn');use(g,1,'seed');walk(g,0,14,3);use(g,1,'south');walk(g,1,14,9);use(g,0,'north');walk(g,0,18,6);assert.equal(g.snapshot().objective.done,g.snapshot().objective.total);assert.equal(g.snapshot().status,'playing');walk(g,1,18,6);assert.equal(g.snapshot().status,'levelComplete');
});

test('all authored stages have valid bounds, original IDs, and indispensable roles',()=>{
 assert.equal(new Set(campaign.map(l=>l.id)).size,8);
 for(const l of campaign){assert.equal(l.map.length,13);assert.ok(l.map.every(r=>r.length===21));for(const e of [...l.players,...l.nodes,...l.plates,...l.crates,...l.ferries,l.checkpoint,l.exit]){assert.ok(e.x>0&&e.x<20&&e.y>0&&e.y<12,`${l.id} has entity in bounds`);assert.notEqual(l.map[e.y][e.x],'#',`${l.id} has entity off walls`);}assert.ok(l.nodes.some(n=>n.required&&n.role===0));assert.ok(l.nodes.some(n=>n.required&&n.role===1));}
});

test('closing gate waits for both a crate and its pusher to leave the threshold',()=>{
 const g=createGame({levelIndex:1});pushRight(g,5,3);pushRight(g,5,9);
 walk(g,1,6,3);assert.equal(g.move(1,1,0),true);walk(g,0,7,3); // Replace the moved crate's pressure.
 walk(g,1,8,2);for(let i=0;i<3;i++)assert.equal(g.move(1,0,1),true);
 walk(g,1,7,6);for(let i=0;i<2;i++)assert.equal(g.move(1,1,0),true); // Crate now occupies gate.
 g.move(0,-1,0);assert.equal(g.snapshot().gates[0].heldOpen,true);assert.equal(g.snapshot().crates[0].x,10);
 assert.equal(g.move(1,1,0),true);assert.equal(g.snapshot().gates[0].heldOpen,true); // Actor now in gate.
 assert.equal(g.move(1,-1,0),true);assert.equal(g.snapshot().gates[0].open,false);
});

test('same campaign action sequence produces the same deterministic snapshots',()=>{
 for(let levelIndex=0;levelIndex<8;levelIndex++){const a=createGame({levelIndex}),b=createGame({levelIndex});solutions[levelIndex](a);solutions[levelIndex](b);assert.deepEqual(a.snapshot(),b.snapshot());}
});
