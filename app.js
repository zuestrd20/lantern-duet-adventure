import {createGame, campaign} from './engine.js';
import {render, renderTitle} from './renderer.js';
import {DuetInput, KEYMAP} from './input.js';
import {DuetAudio} from './audio.js';
import {loadProgress, saveProgress} from './storage.js';
const $=id=>document.getElementById(id), canvas=$('game'), ctx=canvas.getContext('2d'), titleCtx=$('title-art').getContext('2d');
let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('disabled');}};}
let saved=loadProgress(storage), game=null,state=null,mode='landing',paused=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,last=0,time=0,hintStep=0,lastEvent=-1,previousStatus='playing',totalTime=0,totalRescues=0,toastUntil=0,modalReturn=null;
const audio=new DuetAudio(), tweens=[null,null];
function persist(level,complete=false){const ok=saveProgress(storage,level,complete);if(!ok)$('save-note').textContent='此瀏覽器未允許儲存進度。請保留分頁；本次遊玩的月白石仍可使用。';else saved=loadProgress(storage);}
function clearKeys(){input.clear();}
function updateMotion(){ $('motion').setAttribute('aria-pressed',String(reduced));$('motion').textContent=reduced?'≈ 動態：少':'≈ 減少動態'; }
updateMotion();
function showLanding(){mode='landing';$('landing').hidden=false;$('play').hidden=true;$('ending').hidden=true;$('continue').hidden=!(saved.level>0||saved.complete);$('continue').textContent=saved.complete?'重訪最後一座島':'從第 '+(saved.level+1)+' 座島繼續';}
showLanding();
function reflect(){if(!state)return;$('chapter-number').textContent=`ISLAND ${String(state.levelIndex+1).padStart(2,'0')} / 08`;$('chapter-title').textContent=state.title.replace(/^\d+\s*·\s*/,'');$('chapter-subtitle').textContent=state.subtitle;$('objective').textContent=`心石 ${state.objective.done} / ${state.objective.total}`;$('elapsed').textContent=formatTime(totalTime+state.elapsed);}
function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
function refresh(){const old=state;state=game.snapshot();if(old){state.players.forEach((p,i)=>{if(p.x!==old.players[i].x||p.y!==old.players[i].y)tweens[i]={from:{x:old.players[i].x,y:old.players[i].y},at:time};});}reflect();if(state.eventId!==lastEvent){lastEvent=state.eventId;$('toast').textContent=state.message;toastUntil=time+7;if(state.messageKind==='activate')audio.effect('node');if(state.messageKind==='rescue'||state.messageKind==='downed')audio.effect('rescue');}if(state.status!==previousStatus){previousStatus=state.status;if(state.status==='levelComplete')finishIsland();else if(state.status==='ending')finishGame();}}
const input=new DuetInput((p,x,y)=>{if(mode==='play'&&!paused&&!$('dialog').open){game.move(p,x,y);refresh();}},p=>{if(mode==='play'&&!paused&&!$('dialog').open){game.act(p);refresh();}});
function setPaused(value){paused=value;clearKeys();audio.setActive(!value&&mode!=='ending');$('pause').textContent=paused?'繼續 Space':'暫停 Space';}
function closeModal(resume=true){$('dialog').close();if(resume)setPaused(false);if(mode==='play')canvas.focus({preventScroll:true});else modalReturn?.focus({preventScroll:true});}
function modal(title,body,actions,kicker='LANTERN DUET'){modalReturn=document.activeElement;setPaused(true);$('dialog-title').textContent=title;$('dialog-kicker').textContent=kicker;$('dialog-body').replaceChildren();if(typeof body==='string'){const p=document.createElement('p');p.textContent=body;$('dialog-body').append(p);}else $('dialog-body').append(body);$('dialog-actions').replaceChildren();for(const a of actions){const b=document.createElement('button');b.textContent=a.text;if(a.primary)b.className='primary';b.addEventListener('click',a.run);$('dialog-actions').append(b);}if(!$('dialog').open)$('dialog').showModal();}
function paragraph(text,cls=''){const p=document.createElement('p');p.textContent=text;p.className=cls;return p;}
function intro(){const fragment=document.createDocumentFragment();fragment.append(paragraph(state.intro));fragment.append(paragraph('所有心石都醒來後，兩人一起靠近白色風帆。遇到困局，按 H 看提示；按 R 回到月白石。','quiet'));modal(state.title,fragment,[{text:'一起上岸 →',primary:true,run:()=>closeModal()}],`ISLAND ${state.levelIndex+1} / 08`);}
function start(index=0){game=createGame({levelIndex:index});state=null;mode='play';paused=false;hintStep=0;previousStatus='playing';lastEvent=-1;totalTime=0;totalRescues=0;tweens.fill(null);$('landing').hidden=true;$('ending').hidden=true;$('play').hidden=false;persist(index);refresh();intro();}
function newJourney(){if(saved.level>0||saved.complete){modal('重新開始旅程？','會覆蓋這個瀏覽器保存的島嶼進度。',[{text:'保留進度',run:()=>closeModal()},{text:'從第一座島出發',primary:true,run:()=>{closeModal(false);start(0);}}]);}else start(0);}
$('start').onclick=newJourney;$('again').onclick=newJourney;$('continue').onclick=()=>start(saved.level);
function finishIsland(){clearKeys();audio.effect('complete');const fragment=document.createDocumentFragment();fragment.append(paragraph(state.message));fragment.append(paragraph(`下一站：${campaign[state.levelIndex+1].title.replace(/^\d+\s*·\s*/,'')}。旅程會自動保存。`,'quiet'));modal('這座島，記住了你們。',fragment,[{text:'航向下一座島 →',primary:true,run:()=>{totalTime+=state.elapsed;totalRescues+=state.rescues||0;closeModal(false);game.advance();state=null;previousStatus='playing';hintStep=0;tweens.fill(null);refresh();persist(state.levelIndex);intro();}}],`ISLAND ${state.levelIndex+1} COMPLETE`);}
function finishGame(){clearKeys();audio.effect('complete');persist(7,true);mode='ending';$('dialog').close();setPaused(false);audio.setActive(false);$('play').hidden=true;$('ending').hidden=false;$('ending-stats').textContent=`這次旅程 ${formatTime(totalTime+state.elapsed)} · 一起走過 8 座島。${totalRescues+(state.rescues||0)>0?'潮霧裡的每次跌倒，也成了故事的一部分。':''}`;$('again').focus({preventScroll:true});window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});}
function pauseMenu(){if(mode!=='play'||$('dialog').open)return;modal('在潮聲裡，休息一下。','遊戲已暫停。兩個人的按鍵都已放開，準備好再出發。',[{text:'查看玩法',run:help},{text:'繼續旅程',primary:true,run:()=>closeModal()}],'TAKE YOUR TIME');}
$('pause').onclick=pauseMenu;
function retryPrompt(){if(mode!=='play'||$('dialog').open)return;modal('回到月白石？',state.checkpoint.active?'兩人與機關將回到最近一次一起記錄的狀態。':'尚未記錄月白石，兩人與機關將回到本島起點。',[{text:'再想一想',run:()=>closeModal()},{text:'本島重新開始',run:()=>{totalTime+=state.elapsed;totalRescues+=state.rescues||0;closeModal(false);game.restartLevel();state=null;previousStatus='playing';hintStep=0;tweens.fill(null);refresh();intro();}},{text:'一起重試',primary:true,run:()=>{closeModal();game.retry();tweens.fill(null);refresh();}}]);}
$('retry').onclick=retryPrompt;
function hint(){if(mode!=='play'||$('dialog').open)return;const text=state.hints[Math.min(hintStep,state.hints.length-1)];const fragment=document.createDocumentFragment();fragment.append(paragraph(`線索 ${Math.min(hintStep+1,state.hints.length)} / ${state.hints.length}`,'hint-number'));fragment.append(paragraph(text));modal('把線索，分一半給彼此。',fragment,[{text:'下一個線索',run:()=>{hintStep=Math.min(hintStep+1,state.hints.length-1);$('dialog').close();hint();}},{text:'回去試試',primary:true,run:()=>closeModal()}],'A SMALL NUDGE');}
$('hint').onclick=hint;
function help(){const frag=document.createDocumentFragment();const players=document.createElement('div');players.className='help-players';for(const [name,keys,ability]of[['燈燈 · 玩家一','W A S D 移動 · E 互動','金色燈心與月相輪，只聽光的聲音。'],['芽芽 · 玩家二','方向鍵移動 · Enter 互動','綠色芽心與果核箱，等待根的力量。']]){const d=document.createElement('div');d.className='help-player';const h=document.createElement('strong');h.textContent=name;d.append(h,paragraph(keys),paragraph(ability));players.append(d);}frag.append(players);const ul=document.createElement('ul');for(const text of ['互動距離：心石與月白石一格內。心石若還沒亮，可能需要搭檔站上對應踏板。','金色／綠色踏板只接受對應角色；圓形踏板也能用果核箱壓住。兩人可以站在同一格。','黑色迷霧與水面會讓你暈倒。搭檔靠近一格內按互動救援；若都倒下，按 R 一起重試。','兩人靠近月白石後互動，可保存本島機關與位置。重新整理只保留目前島嶼，不保留島內機關。','白色風帆是出口：喚醒所有心石，兩人都到風帆一格內，才能一起離開。','H 提示 · R 重試 · 空白鍵暫停。離開分頁會自動暫停。']){const li=document.createElement('li');li.textContent=text;ul.append(li);}frag.append(ul,paragraph('這是同一台電腦的雙人合作遊戲，沒有網路連線。建議使用可同時接收多鍵的實體鍵盤；觸控及手把未提供操作。','quiet'));modal('一人一半，剛剛好。',frag,[{text:mode==='play'?'知道了，繼續':'知道了',primary:true,run:()=>closeModal()}],'HOW TO PLAY');}
$('help').onclick=help;
$('music').onclick=async()=>{const requested=!audio.enabled;const enabled=await audio.enable(requested);audio.setActive(!paused&&mode!=='ending');$('music').setAttribute('aria-pressed',String(enabled));$('music').textContent=enabled?'♫ 音樂：開':'♫ 音樂：關';$('music').title=requested&&!enabled?'此瀏覽器無法播放音樂':'切換原創配樂';if(mode==='play'&&!$('dialog').open)canvas.focus({preventScroll:true});};
$('motion').onclick=()=>{reduced=!reduced;updateMotion();if(mode==='play'&&!$('dialog').open)canvas.focus({preventScroll:true});};
$('dialog').addEventListener('cancel',event=>{event.preventDefault();if(mode==='play'&&state?.status==='levelComplete')return;closeModal();});
window.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.altKey||event.metaKey)return;
  if($('dialog').open)return;
  const isButton=event.target instanceof HTMLButtonElement||event.target instanceof HTMLAnchorElement;
  if(mode!=='play'||isButton)return;
  if(KEYMAP[event.code]||event.code==='KeyE'||event.code==='Enter'){event.preventDefault();if(!paused)input.down(event.code,event.repeat);return;}
  if(event.repeat)return;
  if(event.code==='Space'||event.code==='Escape'){event.preventDefault();pauseMenu();}
  if(event.code==='KeyR'){event.preventDefault();retryPrompt();}
  if(event.code==='KeyH'){event.preventDefault();hint();}
});
window.addEventListener('keyup',event=>input.up(event.code));
window.addEventListener('blur',()=>{clearKeys();if(mode==='play'&&!$('dialog').open)pauseMenu();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();if(mode==='play'&&!$('dialog').open)pauseMenu();audio.setActive(false);}});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
function frame(stamp){const dt=Math.min(Math.max((stamp-last)/1000,0),.05);last=stamp;time+=dt;if(mode==='landing'){renderTitle(titleCtx,time,reduced);}if(mode==='play'){
  if(!paused&&!$('dialog').open){game.tick(dt);input.tick(dt);state=game.snapshot();reflect();audio.update(state.levelIndex);}
  const positions=state.players.map((p,i)=>{const t=tweens[i];if(!t||reduced)return{x:p.x,y:p.y};const a=Math.min((time-t.at)/.115,1),ease=1-(1-a)**3;return{x:t.from.x+(p.x-t.from.x)*ease,y:t.from.y+(p.y-t.from.y)*ease};});
  render(ctx,state,{time,reducedMotion:reduced,width:1120,height:680,playerPositions:positions});
  if(time>toastUntil)$('toast').textContent='';
}requestAnimationFrame(frame);}
requestAnimationFrame(frame);
