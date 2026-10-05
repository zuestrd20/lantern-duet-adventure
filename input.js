export const KEYMAP = {
  KeyW: [0,0,-1], KeyS: [0,0,1], KeyA: [0,-1,0], KeyD: [0,1,0],
  ArrowUp:[1,0,-1], ArrowDown:[1,0,1], ArrowLeft:[1,-1,0], ArrowRight:[1,1,0]
};
export class DuetInput {
  constructor(move, act, interval=0.15) { this.move=move; this.act=act; this.interval=interval; this.keys=new Map(); this.sequence=0; this.wait=[0,0]; }
  down(code, repeat=false) {
    if(repeat || this.keys.has(code)) return;
    if(code==='KeyE'||code==='Enter') {this.keys.set(code,++this.sequence); this.act(code==='KeyE'?0:1); return;}
    const k=KEYMAP[code]; if(!k)return;
    this.keys.set(code,++this.sequence); this.move(...k);this.wait[k[0]]=this.interval;
  }
  up(code){this.keys.delete(code);}
  clear(){this.keys.clear();this.wait=[0,0];}
  tick(dt){ for(let p=0;p<2;p++) {
    this.wait[p]-=Math.min(Math.max(dt,0),0.05);
    const held=[...this.keys.entries()].filter(([k])=>KEYMAP[k]?.[0]===p).sort((a,b)=>b[1]-a[1]);
    if(held.length && this.wait[p]<=0){this.move(...KEYMAP[held[0][0]]);this.wait[p]=this.interval;}
  }}
}
