import {blocks,paintBlocks,spendingMeter} from './charts.js';
import {KEY,CURRENCIES,CATEGORIES,initialState,dayKey,setBaseline,logCooked,logOrdered,logGroceries,GROCERY_SPANS,lastGrocerySpan,removeEvent,summary,monthDays,monthOf,setHabit,checkIn,checkInDue,daysBetween,tonight,tonightList,dinnerSettled,weekRecap,recapWeek,xpInfo,xpAtLevel,MEALS,mealXp,mealFor,findDish,book,searchDishes,saveRecipe,setHave,hasIngredient,isReady,picksFor,togglePick,clearPicks,shoppingList,weekStart,weeks,plannedUsed,validateState,load,persist} from './model.js';
const $=id=>document.getElementById(id);
const set=(id,text)=>{$(id).textContent=text;};
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const button=(className,text,onclick)=>{const b=el('button',className,text);b.type='button';b.onclick=onclick;return b;};
const option=(value,text)=>Object.assign(document.createElement('option'),{value,textContent:text});
let state,loadError=false,undo=null,open=null,view='all';
// Inside the iPhone app, saving goes to a file the app owns (window.cook99Storage, injected natively); in a browser, localStorage.
const store=window.cook99Storage||localStorage;
const native=msg=>{try{window.webkit?.messageHandlers?.native?.postMessage(msg);return Boolean(window.webkit?.messageHandlers?.native);}catch{return false;}};
try{state=load(store);}catch{state=initialState();loadError=true;}
const money=n=>new Intl.NumberFormat(undefined,{style:'currency',currency:state.currency,maximumFractionDigits:0}).format(n/100);
const exact=n=>new Intl.NumberFormat(undefined,{style:'currency',currency:state.currency}).format(n/100);
const shortDate=k=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).format(new Date(`${k}T12:00:00`));
const monthName=k=>new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(new Date(`${k}-15T12:00:00`));
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;

// ---------- messages ----------
function message(text,kind='',canUndo=false){
  const line=el('div',`msg ${kind}`,text);
  if(canUndo)line.append(button(null,'Undo',()=>{if(!undo)return;persist(undo,store);state=undo;undo=null;render();line.remove();}));
  $('messages').append(line);line.addEventListener('animationend',()=>line.remove());while($('messages').children.length>2)$('messages').firstChild.remove();
}
function commit(next,text,kind=''){
  if(loadError){message('Saved data could not be read. Export it in Settings first.');return false;}
  persist(next,store);undo=state;state=next;render();if(text)message(text,kind,true);return true;
}

// ---------- the page ----------
function render(){
  const s=summary(state),info=xpInfo(s),m=s.thisMonth;
  set('level',String(s.level));set('xpText',s.level>=99?`${info.xp.toLocaleString()} xp`:`${info.into.toLocaleString()} / ${info.span.toLocaleString()} xp`);
  set('purseAmount',state.baseline?money(m.kept):'—');$('purse').classList.toggle('is-negative',m.kept<0);
  $('barFill').style.width=`${info.fraction*100}%`;$('bar').setAttribute('aria-valuenow',String(info.pct));$('bar').classList.toggle('is-rested',s.rested);
  const picks=picksFor(state).length;set('weekButton',picks?`Week · ${picks}`:'Week');
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('is-on',t.dataset.view===view));
  const recapOn=renderRecap();renderTonight();renderMonth(s);renderList();$('cookButton').disabled=loadError;
  $('checkin').hidden=recapOn||!checkInDue(state)||!$('visit').hidden;
  if(state.habit?.checked||state.habit?.from)set('checkinLine',`Any takeaway since ${shortDate(state.habit.checked||state.habit.from)} you haven’t logged?`);
  saveVisit(s);
}
// ---------- since your last visit: what happened while you were away, like a watch syncing ----------
const VISIT_KEY='cook99.visit';   // a note on this phone of what the page last showed; not part of the record
let holdVisit=false;
function saveVisit(s){if(holdVisit)return;try{store.setItem(VISIT_KEY,JSON.stringify({date:dayKey(),level:s.level,xp:s.xp,kept:s.keptTotal,meals:s.cookedTotal}));}catch{}}
function showVisit(){
  let last=null;try{last=JSON.parse(store.getItem(VISIT_KEY)||'null');}catch{}
  const s=summary(state);if(!last||!last.date||last.date>=dayKey()||!state.baseline)return;
  const days=daysBetween(last.date,dayKey()),meals=s.cookedTotal-last.meals,xp=s.xp-last.xp,kept=s.keptTotal-last.kept,levels=s.level-last.level;
  if(meals<=0&&xp<=0&&!levels)return;
  const when=days===1?'yesterday':days<7?new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(new Date(`${last.date}T12:00:00`)):shortDate(last.date);
  set('visitTitle',`Since ${when}`);
  set('visitLine',[levels>0?`+${plural(levels,'level')}`:null,`+${xp.toLocaleString()} xp`,meals>0?`${plural(meals,'home meal')}`:null,state.baseline?`${kept>=0?'':'−'}${money(Math.abs(kept))} ${kept>=0?'kept':'over'}`:null].filter(Boolean).join(' · '));
  if($('recap').hidden){$('visit').hidden=false;$('checkin').hidden=true;}   // on the first visit of a week the review says it instead
  if(levels>0)setTimeout(()=>levelUp(last.level,s.level,s),700);
}
$('visitDone').onclick=()=>{$('visit').hidden=true;render();};
$('checkinNo').onclick=()=>{commit(checkIn(state),'Every day counted. Well cooked.');};
$('checkinYes').onclick=()=>{openSpent('takeaway');};
// ---------- the month as a little landscape: one slab per meal, green cooked, tomato takeaway ----------
const longDate=k=>new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${k}T12:00:00`));
let monthView=null,weekView=null,firstPaint=true;
// What the month and the week say: home meals, and takeaways against your usual by now. Counts that only add up; there
// is no run of days to break, so one takeaway is one tomato slab, not a reset to zero.
const takeaways=(n,usual)=>`${n?plural(n,'takeaway'):'no takeaway'}${usual?`, usually ${usual}`:''}`;
const slabs=(meals,orders)=>[...meals.map(()=>({kind:'home',h:7})),...orders.map(()=>({kind:'out',h:7}))];
const dayTip=(date,meals,orders,empty)=>({title:longDate(date),lines:meals.length||orders.length?[...meals.map(e=>`${mealLabel(e.meal)} · ${e.assumed?'home-cooked':e.dish}`),...orders.map(o=>`Takeaway · ${exact(o.amount)}${o.planned?' (planned)':''}`)]:[empty]});
function renderMonth(s){
  const today=dayKey(),m=monthDays(state,monthOf(today),today),meals=m.days.reduce((a,d)=>a+d.meals.length,0),outs=m.days.reduce((a,d)=>a+d.orders.length,0);
  set('monthTitle',new Intl.DateTimeFormat(undefined,{month:'long'}).format(new Date(`${today}T12:00:00`)));
  set('monthLine',`${plural(meals,'home meal')} · ${takeaways(outs,state.baseline?Math.round(s.thisMonth.usualOrders):0)}`);
  const cells=m.days.map(d=>({col:d.col,row:d.row,today:d.isToday,ahead:d.ahead,segments:slabs(d.meals,d.orders),
    tip:d.ahead?{title:longDate(d.date),lines:['Still to come']}:dayTip(d.date,d.meals,d.orders,'Nothing logged')}));
  monthView?.destroy();
  monthView=blocks($('monthChart'),{cols:7,rows:m.rows,cells,rise:firstPaint,label:`${$('monthTitle').textContent}: ${plural(meals,'home meal')} and ${plural(outs,'takeaway')} so far. Each day shows one slab per meal.`});
  firstPaint=false;
}
// ---------- tonight: one dinner idea from your own book ----------
let tonightSkip=0;
const ago=k=>{const n=daysBetween(k,dayKey());return n<=0?'today':n===1?'yesterday':n<14?`${n} days ago`:shortDate(k);};
function renderTonight(){
  const today=dayKey(),list=state.baseline&&!loadError&&!dinnerSettled(state,today)?tonightList(state,today):[],d=list[tonightSkip%Math.max(1,list.length)];
  $('tonight').hidden=!d;if(!d)return;
  set('tonightDish',d.name);$('tonightOther').hidden=list.length<2;
  set('tonightMeta',(d.idea?['An idea',d.minutes?`${d.minutes} min`:null,d.ingredients.slice(0,3).join(', ')]:[d.ready?'Everything in':null,d.minutes?`${d.minutes} min`:null,`last made ${ago(d.last)}`]).filter(Boolean).join(' · '));
}
$('tonightOther').onclick=()=>{tonightSkip++;renderTonight();};
$('tonightCook').onclick=()=>{const d=tonight(state,dayKey(),tonightSkip);if(d&&cookDish(d.name,dayKey(),'dinner'))tonightSkip=0;};

// ---------- the week in review: on the first visit after a week ends, until you close it ----------
const RECAP_KEY='cook99.recap';   // a note on this phone of the last week whose review you closed; not part of the record
// The week in Cook99's voice. A takeaway week gets no lecture: nothing earned is ever taken back.
const RECAP_LINES={
  clean:['Not one delivery fee all week.','The delivery apps had a quiet week.','A whole week out of your own kitchen.'],
  treat:['One planned treat, and everything else from your own kitchen.','A planned treat, enjoyed. The rest was yours.'],
  fewer:['Less takeaway than your usual week. That is the whole trick.','Down on your usual. Keep it boring.','Fewer orders than usual, more meals of your own.'],
  usual:['Some takeaway this week. Nothing you earned went anywhere.','Weeks like this happen. The kitchen is still yours.','A takeaway week. Your level stays, and this week is a fresh pan.']};
function recapLine(w){
  const list=!w.orders?RECAP_LINES.clean:!w.unplanned?RECAP_LINES.treat:w.orders<Math.round(w.usualOrders)?RECAP_LINES.fewer:RECAP_LINES.usual;
  return list[Number(w.start.slice(8,10))%list.length];
}
let recapView=null,recapShown='',shareImage=null;
const weekDates=w=>new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'}).formatRange(new Date(`${w.start}T12:00:00`),new Date(`${w.end}T12:00:00`));   // 19–25 Oct
function renderRecap(){
  const start=loadError?null:recapWeek(state);let seen='';try{seen=store.getItem(RECAP_KEY)||'';}catch{}
  if(!start||seen===start){$('recap').hidden=true;recapView?.destroy();recapView=null;recapShown='';return false;}
  const w=weekRecap(state,start),line=recapLine(w),usual=Math.round(w.usualOrders);
  const meals=`${plural(w.cooked,'home meal')} · ${takeaways(w.orders,usual)}`,levels=w.levelTo>w.levelFrom?`Cooking ${w.levelFrom} → ${w.levelTo}`:`Cooking ${w.levelTo}`;
  const moneyLine=`${w.kept>=0?`${money(w.kept)} kept`:`${money(-w.kept)} over`} · ${levels}`,sig=JSON.stringify([start,meals,moneyLine,w.days.map(d=>[d.meals.length,d.orders.length])]);
  $('recap').hidden=false;if(sig===recapShown)return true;
  const first=!recapShown;recapShown=sig;
  set('recapDates',weekDates(w));set('recapMeals',meals);set('recapMoney',moneyLine);set('recapVoice',line);
  const cells=w.days.map((d,i)=>({col:i,row:0,ahead:!d.tracked,segments:slabs(d.meals,d.orders),tip:d.tracked?dayTip(d.date,d.meals,d.orders,'Nothing logged'):{title:longDate(d.date),lines:['Before you started']}}));
  recapView?.destroy();
  recapView=blocks($('recapChart'),{cols:7,rows:1,cells,cell:36,inset:7,theta:18,range:[18,18],phi:34,rise:first,label:`Week of ${shortDate(w.start)}: ${meals}.`});
  shareImage=null;$('recapShare').disabled=true;
  weekImage(w,{meals,moneyLine:w.kept>=0?moneyLine:levels,line,cells}).then(img=>{if(recapShown===sig){shareImage=img;$('recapShare').disabled=false;}}).catch(()=>{});
  return true;
}
$('recapDone').onclick=()=>{try{store.setItem(RECAP_KEY,recapWeek(state)||'');}catch{}if(state.habit?.mode==='assume'&&state.habit.from)commit(checkIn(state));else render();};   // the review doubles as the week's check-in
$('recapAdd').onclick=()=>{const start=recapWeek(state);openSpent('takeaway',start?weekRecap(state,start).end:dayKey());};
// Sharing: the picture is drawn when the review appears, so the share sheet opens straight from the tap.
$('recapShare').onclick=async()=>{
  if(!shareImage)return;const {file,url}=shareImage;
  if(native({type:'shareImage',name:file.name,data:url}))return;
  try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file]});return;}}catch(err){if(err?.name==='AbortError')return;}
  const a=document.createElement('a');a.href=url;a.download=file.name;a.click();
};
// The picture: always on paper, whatever the phone's theme, with the same blocks, numbers and line as the card (money
// only when the week kept some: a picture to share is not a statement).
const PAPER={bg:'#f5f4f0',ink:'#161614',soft:'#4a4944',muted:'#8d8b84',tile:'#e7e5df',line:'#cfccc4',home:'#24946b',out:'#e4572e'};
const mixHex=(a,b,t)=>{const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),x=rgb(a),y=rgb(b);return `rgb(${x.map((v,i)=>Math.round(v+(y[i]-v)*t)).join(',')})`;};
const shades=c=>({f:c,t:mixHex(c,'#ffffff',.32),r:mixHex(c,'#000000',.28)});
async function weekImage(w,{meals,moneyLine,line,cells}){
  await Promise.all(['400 100px Instrument','600 40px Geist','500 40px Geist','400 40px Geist'].map(f=>document.fonts.load(f)));
  const W=1080,H=1350,pad=96,canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
  const text=(str,x,y,font,colour,align='left')=>{ctx.font=font;ctx.fillStyle=colour;ctx.textAlign=align;ctx.fillText(str,x,y);return ctx.measureText(str).width;};
  ctx.fillStyle=PAPER.bg;ctx.fillRect(0,0,W,H);
  text('Cook99',pad,pad+28,'600 36px Geist',PAPER.ink);text(weekDates(w),W-pad,pad+28,'400 34px Geist',PAPER.muted,'right');
  const big=text(String(w.cooked),pad-10,pad+380,'400 330px Instrument',PAPER.ink);
  text(w.cooked===1?'home meal':'home meals',pad+big+26,pad+316,'500 40px Geist',PAPER.ink);text('this week',pad+big+26,pad+368,'400 40px Geist',PAPER.muted);
  text(meals.split(' · ')[1],pad,pad+470,'400 40px Geist',PAPER.soft);text(moneyLine,pad,pad+524,'400 40px Geist',PAPER.soft);
  const top=pad+600,h=paintBlocks(ctx,{cols:7,rows:1,cells,cell:36,inset:7,theta:18,phi:34,x:pad,y:top,width:W-pad*2,colours:{tile:PAPER.tile,ahead:PAPER.line,home:shades(PAPER.home),out:shades(PAPER.out)}});
  let x=pad;const key=(colour,label)=>{ctx.fillStyle=colour;ctx.fillRect(x,top+h+44,22,22);x+=36+text(label,x+36,top+h+64,'400 28px Geist',PAPER.soft)+40;};
  key(PAPER.home,'Cooked at home');key(PAPER.out,'Takeaway');
  ctx.font='400 58px Instrument';const words=line.split(' '),rows=[''];for(const word of words){const next=rows.at(-1)?`${rows.at(-1)} ${word}`:word;if(ctx.measureText(next).width>W-pad*2&&rows.at(-1))rows.push(word);else rows[rows.length-1]=next;}
  rows.forEach((r,i)=>text(r,pad,H-pad-60-(rows.length-1-i)*66,'400 58px Instrument',PAPER.ink));
  text('Order less. Cook more.',pad,H-pad+4,'400 30px Geist',PAPER.muted);
  const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
  return {file:new File([blob],`cook99-week-${w.start}.png`,{type:'image/png'}),url:canvas.toDataURL('image/png')};
}

function renderList(){
  const box=$('list'),week=new Set(picksFor(state).map(d=>d.name)),all=book(state);box.replaceChildren();
  const list=all.filter(d=>view==='all'||(view==='ready'&&isReady(state,d))||(view==='quick'&&isReady(state,d)&&(d.minutes??99)<=20)||(view==='week'&&week.has(d.name)));
  if(!all.length){box.append(el('p','empty',state.habit?.mode==='assume'?'Your days count as home-cooked on their own. Log a dish here only if you want to keep it, with its ingredients, for the next time you need an idea.':'Nothing here yet. Cook something and it stays here, with its ingredients, ready for the next time you need an idea.'));return;}
  if(!list.length){box.append(el('p','empty',{ready:'Nothing has all its ingredients in. Tap an ingredient to mark it.',quick:'Nothing quick has all its ingredients in.',week:'Nothing planned. Open a dish and plan it.'}[view]));return;}
  for(const d of list){
    const item=el('div','item'),row=button('row',null,()=>{open=open===d.name?null:d.name;renderList();});
    row.append(el('span','name',d.name));if(week.has(d.name))row.append(el('span','meta','this week'));if(isReady(state,d))row.append(Object.assign(el('span','dot'),{title:'Everything is in'}));
    row.append(el('span','meta',`${d.cooked}×`));item.append(row);
    if(open===d.name)item.append(details(d,week.has(d.name)));
    box.append(item);
  }
}
function details(d,planned){
  const box=el('div','open');
  box.append(el('p','facts',[d.minutes?`${d.minutes} min`:null,`cooked ${plural(d.cooked,'time')}`,`last ${shortDate(d.last)}`].filter(Boolean).join(' · ')));
  const ings=el('div','ings');
  if(!d.ingredients.length)ings.append(el('span','facts','No ingredients written down.'));
  for(const name of d.ingredients){const have=hasIngredient(state,name);const b=button(`ing${have?'':' is-out'}`,name,()=>commit(setHave(state,name,!have)));b.title=have?'In. Tap when it runs out.':'Out. Tap when you have it.';ings.append(b);}
  const acts=el('div','acts');
  acts.append(button('pill primary small','Cook again',()=>cookDish(d.name,dayKey())),button('link',planned?'Unplan':'Plan',()=>{try{commit(togglePick(state,d.name));}catch(e){message(e.message);}}),button('link','Edit',()=>openEdit(d)));
  box.append(ings,acts);return box;
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{view=t.dataset.view;open=null;render();});

// ---------- cooking ----------
const mealLabel=k=>(MEALS.find(m=>m.key===k)||MEALS[2]).label;
function cookDish(name,date,meal=mealFor()){
  try{
    const before=summary(state),r=logCooked(state,{dish:name,date,meal}),after=summary(r.state),g=after.gains.get(r.event.id);open=r.event.dish;
    if(!commit(r.state,g?`${r.event.dish} · ${mealLabel(meal).toLowerCase()} · +${g.base+g.rested} xp`:`${r.event.dish} · no xp, three meals already today`))return false;
    if(after.level>before.level)levelUp(before.level,after.level,after);
    return true;
  }catch(e){message(e.message);return false;}
}
// ---------- the level-up ----------
// The level-up in Cook99's own voice: short, warm, a little dry. One line per level, rotating so it rarely repeats.
const LEVEL_LINES=['Well cooked.','Earned at the stove.','Another level, no delivery fee.','Your hands are learning.','That one tasted like progress.','Steady hands, better dinners.','Slow and honest, like a good stew.','One more notch on the spoon.','The kitchen remembers.','Cooked, not ordered.','Better than last time.'];
const MILESTONES={10:'Double digits.',25:'A quarter of the way.',50:'Half the levels. Not half the work.',75:'Three quarters of the levels.',92:'Half way to 99, in experience.'};
let dingTimer=null;
// Fireworks around the numeral: rockets streak up from below, then each bursts into big square sparks in two bright
// colours with white glints, trailing as they fan out, fall and twinkle out. More volleys for milestones and 99.
const SPARKS=['#ff3b30','#ff9f0a','#ffd60a','#a6ff00','#34c759','#32d7ff','#0a84ff','#bf5af2','#ff2d92','#ff6b3d'];
let fxFrame=0;
function fireworks(big=false){
  const canvas=$('dingFx'),ctx=canvas.getContext('2d'),dpr=Math.min(2,window.devicePixelRatio||1);
  const w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const box=document.querySelector('.ding-num').getBoundingClientRect(),cx=box.left+box.width/2,cy=box.top+box.height*.5;   // the still box, not the rolling digit
  const rockets=[],sparks=[],volleys=big?12:7,pick=()=>SPARKS[Math.floor(Math.random()*SPARKS.length)];
  for(let b=0;b<volleys;b++){
    const angle=Math.PI*(1.12-1.24*(b+.5)/volleys)+(Math.random()-.5)*.3,dist=(big?150:130)+Math.random()*70;   // a fan over the top half
    const bx=Math.max(24,Math.min(w-24,cx+Math.cos(angle)*dist*1.15)),by=Math.max(30,cy-Math.abs(Math.sin(angle))*dist*.95-10);
    const launch=300+b*(big?150:170)+Math.random()*90,flight=420+Math.random()*120,pop=launch+flight,a=pick(),c=pick();
    rockets.push({x0:bx+(Math.random()-.5)*60,y0:h+10,x1:bx,y1:by,launch,flight});
    for(let i=0;i<(big?60:48);i++){const t=Math.random()*Math.PI*2,v=2.2+Math.random()*3.6;
      sparks.push({x:bx,y:by,vx:Math.cos(t)*v,vy:Math.sin(t)*v-1,delay:pop,life:950+Math.random()*750,size:Math.random()<.3?7:Math.random()<.6?5:4,colour:Math.random()<.14?'#ffffff':Math.random()<.5?a:c});}
    for(let i=0;i<12;i++){const t=Math.random()*Math.PI*2,v=.6+Math.random()*1.2;   // a small inner ring that crackles after the main burst
      sparks.push({x:bx,y:by,vx:Math.cos(t)*v,vy:Math.sin(t)*v,delay:pop+120,life:600+Math.random()*300,size:3,colour:'#fff6c2'});}
  }
  const start=performance.now();cancelAnimationFrame(fxFrame);
  const pos=(s,age)=>{const k=age/16.7;return [s.x+s.vx*k*(1-k*.004),s.y+s.vy*k+.05*k*k];};   // a little drag and gravity
  const tick=now=>{
    const t=now-start;ctx.clearRect(0,0,w,h);let alive=false;
    for(const r of rockets){const age=t-r.launch;if(age<0){alive=true;continue;}if(age>r.flight)continue;alive=true;
      const p=1-(1-age/r.flight)**2,x=r.x0+(r.x1-r.x0)*p,y=r.y0+(r.y1-r.y0)*p;
      for(let i=0;i<6;i++){ctx.globalAlpha=.85-i*.13;ctx.fillStyle=i?'#ffb35c':'#fff3c4';ctx.fillRect(Math.round(x-(r.x1-r.x0)*.012*i),Math.round(y+i*7),4,5);}}
    for(const s of sparks){
      const age=t-s.delay;if(age<0){alive=true;continue;}if(age>s.life)continue;alive=true;
      const fade=1-age/s.life;if(fade<.3&&Math.floor(age/80)%2)continue;   // twinkle before going out
      const [x,y]=pos(s,age),[tx,ty]=pos(s,Math.max(0,age-60));
      ctx.globalAlpha=Math.min(1,fade*1.5)*.35;ctx.fillStyle=s.colour;ctx.fillRect(Math.round(tx),Math.round(ty),s.size-1,s.size-1);   // trail
      ctx.globalAlpha=Math.min(1,fade*1.5);ctx.fillRect(Math.round(x),Math.round(y),s.size,s.size);
    }
    ctx.globalAlpha=1;if(alive&&!$('ding').hidden)fxFrame=requestAnimationFrame(tick);else ctx.clearRect(0,0,w,h);
  };
  fxFrame=requestAnimationFrame(tick);
}
function levelUp(from,to,s){
  const bar=$('bar');bar.classList.add('is-full');   // the line runs to the end first, the old number held until the reveal
  const span=xpAtLevel(from+1)-xpAtLevel(from);set('level',String(from));set('xpText',`${span.toLocaleString()} / ${span.toLocaleString()} xp`);
  setTimeout(()=>{
    const info=xpInfo(s),gained=to-from;
    set('dingOld',String(from));set('dingNew',String(to));
    set('dingTitle',to>=99?'Cooking 99. Nothing left to learn but new dishes.':gained>1?`Up ${gained} levels in one go.`:LEVEL_LINES[to%LEVEL_LINES.length]);
    set('dingSub',to>=99?`${plural(s.cookedTotal,'meal')} cooked to get here.`:`Cooking ${to} · ${info.remaining.toLocaleString()} xp to ${to+1}`);
    set('dingNote',to<99?(MILESTONES[to]||''):'');
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());   // open sheets sit in the top layer and would hide it
    const ding=$('ding');ding.classList.remove('is-leaving');ding.hidden=false;
    fireworks(to>=99||Boolean(MILESTONES[to]));if(!native({type:'haptic',kind:'levelup'})&&navigator.userActivation?.hasBeenActive)try{navigator.vibrate?.([12,60,24]);}catch{}
    clearTimeout(dingTimer);dingTimer=setTimeout(closeDing,to>=99?9000:6000);
  },520);
}
function closeDing(){
  const ding=$('ding');if(ding.hidden)return;clearTimeout(dingTimer);ding.classList.add('is-leaving');
  setTimeout(()=>{ding.hidden=true;ding.classList.remove('is-leaving');$('bar').classList.remove('is-full');cancelAnimationFrame(fxFrame);render();},480);
}
$('ding').onclick=closeDing;
// Plays the moment from your current level to the next without changing the record.
$('previewDing').onclick=()=>{const s=summary(state),to=Math.min(99,s.level+1);document.querySelectorAll('dialog[open]').forEach(d=>d.close());window.scrollTo({top:0,behavior:'instant'});levelUp(to-1,to,{...s,level:to,xp:xpAtLevel(to),cookedTotal:s.cookedTotal});};
document.addEventListener('keydown',e=>{if(!$('ding').hidden&&(e.key==='Escape'||e.key==='Enter'||e.key===' '))closeDing();});

let picked=null,meal='dinner';
function setMeal(m){meal=m;document.querySelectorAll('#mealSeg button').forEach(b=>{b.classList.toggle('is-on',b.dataset.meal===m);b.setAttribute('aria-selected',String(b.dataset.meal===m));});results();}
document.querySelectorAll('#mealSeg button').forEach(b=>b.onclick=()=>setMeal(b.dataset.meal));
function openCook(){
  picked=null;$('cookSearch').value='';$('cookDate').value=dayKey();$('cookDate').max=dayKey();$('cookDate').min=state.baseline?.since||'';$('cookError').textContent='';$('newIngredients').value='';
  setMeal(mealFor());$('cookDialog').showModal();$('cookSearch').focus();
}
function results(){
  const q=$('cookSearch').value.trim(),box=$('cookResults'),found=searchDishes(state,q,q?8:9);box.replaceChildren();
  const exactMatch=q?found.find(d=>d.name.toLowerCase()===q.toLowerCase()):null;
  if(picked&&!found.some(d=>d.name===picked.name))picked=null;if(!picked&&exactMatch)picked=exactMatch;
  let lastGroup=null;
  for(const d of found){
    const group=d.inBook?'Yours':'Ideas';if(group!==lastGroup){box.append(el('p','caption result-group',group));lastGroup=group;}
    const row=button(`result${picked&&picked.name===d.name?' is-on':''}`,null,()=>{picked=d;$('cookSearch').value=d.name;results();});
    const name=el('span','name',d.name);if(d.ingredients.length)name.append(el('small',null,d.ingredients.join(', ')));row.append(name,el('span','meta',d.inBook?`${d.cooked}×`:''));box.append(row);
  }
  const isNew=Boolean(q)&&!exactMatch&&!picked;$('newDish').hidden=!isNew;if(isNew)set('newLabel',`New: ${q}`);
  const save=$('cookSave');save.disabled=!picked&&!isNew;save.textContent=`${isNew?'Add and cook':'Cook'} ${mealLabel(meal).toLowerCase()} · ${mealXp(meal)} xp`;
}
$('cookSearch').addEventListener('input',()=>{picked=null;results();});
$('cookForm').addEventListener('submit',e=>{
  e.preventDefault();
  try{let name=picked?.name;
    if(!name){name=$('cookSearch').value.trim().replace(/\s+/g,' ');state=saveRecipe(state,{name,ingredients:$('newIngredients').value});}
    if(cookDish(name,$('cookDate').value,meal))$('cookDialog').close();}
  catch(err){$('cookError').textContent=err.message;}
});

// ---------- editing ----------
let editing=null;
function openEdit(d){editing=d;$('editName').value=d.name;$('editMinutes').value=d.minutes??'';$('editIngredients').value=d.ingredients.join(', ');$('editError').textContent='';$('editDialog').showModal();}
$('editForm').addEventListener('submit',e=>{
  e.preventDefault();
  try{const name=$('editName').value.trim().replace(/\s+/g,' ');let next=saveRecipe(state,{name,level:editing.level,category:editing.category,minutes:$('editMinutes').value.trim(),ingredients:$('editIngredients').value},editing.name);
    if(name.toLowerCase()!==editing.name.toLowerCase())next={...next,events:next.events.map(ev=>ev.type==='cooked'&&ev.dish.toLowerCase()===editing.name.toLowerCase()?{...ev,dish:name}:ev)};   // a rename keeps its history
    open=name;commit(next,'Saved');$('editDialog').close();}
  catch(err){$('editError').textContent=err.message;}
});

// ---------- spending: takeaway or groceries ----------
let spendKind='takeaway';
function plannedState(){const used=plannedUsed(state,weekStart($('orderDate').value||dayKey()));$('orderPlanned').disabled=used;if(used)$('orderPlanned').checked=false;set('plannedNote',used?'This week’s treat is already used.':'One a week. It still costs what it costs.');}
function setKind(kind){
  spendKind=kind;document.querySelectorAll('#spendSeg button').forEach(b=>{b.classList.toggle('is-on',b.dataset.kind===kind);b.setAttribute('aria-selected',String(b.dataset.kind===kind));});
  const shop=kind==='groceries';$('plannedRow').hidden=shop;$('lastsRow').hidden=!shop;
  set('orderNoteLabel',shop?'Shop':'What or where');$('orderNote').placeholder=shop?'Rimi, optional':'optional';$('orderAmount').placeholder=shop?'84.20':'23.50';
  set('orderSave',shop?'Log groceries':'Log takeaway');
}
function openSpent(kind='takeaway',date=dayKey()){
  $('orderAmount').value='';$('orderNote').value='';$('orderPlanned').checked=false;$('orderDate').value=date;$('orderDate').max=dayKey();$('orderDate').min=state.baseline?.since||'';
  $('groceryDays').replaceChildren(...GROCERY_SPANS.map(x=>option(String(x.days),x.label)));$('groceryDays').value=String(lastGrocerySpan(state));
  plannedState();setKind(kind);$('orderError').textContent='';$('orderDialog').showModal();$('orderAmount').focus();
}
document.querySelectorAll('#spendSeg button').forEach(b=>b.onclick=()=>setKind(b.dataset.kind));
$('orderButton').onclick=()=>openSpent();
$('orderDate').addEventListener('input',plannedState);
$('orderForm').addEventListener('submit',e=>{e.preventDefault();try{
  if(spendKind==='groceries'){const r=logGroceries(state,{amount:$('orderAmount').value,note:$('orderNote').value,date:$('orderDate').value,days:Number($('groceryDays').value)});
    commit(r.state,`${r.event.note||'Groceries'} · ${exact(r.event.amount)} · ${GROCERY_SPANS.find(x=>x.days===r.event.days)?.label.toLowerCase()||`${r.event.days} days`}`);}
  else{const r=logOrdered(state,{amount:$('orderAmount').value,note:$('orderNote').value,date:$('orderDate').value,planned:$('orderPlanned').checked});commit(r.state,`${r.event.planned?'Planned treat':'Takeaway'} · ${exact(r.event.amount)}`);}
  $('orderDialog').close();}catch(err){$('orderError').textContent=err.message;}});

// ---------- week ----------
function line(left,right){const row=el('div','line');row.append(left);if(right)row.append(right);return row;}
function openWeek(){
  const w=summary(state).thisWeek,list=$('weekList'),shop=$('shopList');list.replaceChildren();shop.replaceChildren();
  set('weekRhythm',`Cooked ${w.cooked} on ${plural(w.nights,'night')}. Ordered ${w.orders}${w.planned?', one planned':''}.${w.groceries?` Groceries so far ${money(w.groceries)}.`:''}`);
  const picks=picksFor(state);if(!picks.length)list.append(el('p','empty','Open a dish and plan it for this week.'));
  for(const d of picks){const left=el('span','grow');left.append(d.name,el('small',null,isReady(state,d)?'everything in':`${d.ingredients.filter(i=>!hasIngredient(state,i)).length} to buy`));const row=line(left,button('link','Remove',()=>{commit(togglePick(state,d.name));openWeek();}));list.append(row);}
  const items=shoppingList(state);if(!items.length)shop.append(el('p','empty',picks.length?'Everything is in.':'Nothing yet.'));
  for(const i of items){const left=el('span','grow');left.append(i.name,el('small',null,i.for.join(', ')));const box=document.createElement('input');box.type='checkbox';box.setAttribute('aria-label',`Bought ${i.name}`);box.onchange=()=>{commit(setHave(state,i.name,true));openWeek();};shop.append(line(left,box));}
  if(!$('weekDialog').open)$('weekDialog').showModal();
}
$('weekButton').onclick=openWeek;$('logShop').onclick=()=>{$('weekDialog').close();openSpent('groceries');};$('clearWeek').onclick=()=>{commit(clearPicks(state),'Week cleared');openWeek();};

// ---------- ledger ----------
function openLedger(){
  const s=summary(state),m=s.thisMonth,kept=$('ledgerKept');kept.textContent=state.baseline?exact(m.kept):'—';kept.classList.toggle('is-negative',m.kept<0);
  const about=m.groceriesEstimated>0?'about ':'';
  set('ledgerLine',state.baseline?`Kept this month, against your usual food spending of ${money(m.usual)} by now.`:'Set your usual month in Settings.');
  spendingMeter($('spendMeter'),{usual:m.usual,parts:[{kind:'home',value:m.groceries},{kind:'out',value:m.spent}],label:`Usual food spending by now ${money(m.usual)}: groceries ${money(m.groceries)}, takeaway ${money(m.spent)}.`});
  const legend=$('spendLegend');legend.replaceChildren();
  const key=(cls,text)=>{const span=el('span');span.append(el('i',`key ${cls}`),text);legend.append(span);};
  key('home',`Groceries ${about}${money(m.groceries)}`);key('out',`Takeaway ${money(m.spent)}`);key('track',m.kept>=0?`Kept ${money(m.kept)}`:`Over by ${money(-m.kept)}`);
  const recent=weeks(state).reverse(),unit=Math.min(3.5,48/Math.max(1,...recent.map(w=>w.cooked+w.orders)));
  weekView?.destroy();
  weekView=blocks($('weekChart'),{cols:recent.length,rows:1,cell:34,inset:11,theta:20,range:[10,34],phi:34,rise:true,label:`Last ${plural(recent.length,'week')}: meals cooked and takeaways per week.`,
    cells:recent.map((w,i)=>({col:i,row:0,today:i===recent.length-1,segments:[{kind:'home',h:w.cooked*unit},{kind:'out',h:w.orders*unit}].filter(x=>x.h>0),
      tip:{title:i===recent.length-1?'This week':`Week of ${shortDate(w.start)}`,lines:[`${plural(w.cooked,'meal')} cooked`,`${plural(w.orders,'takeaway')}${w.planned?', one planned':''}`]}}))});
  const axis=$('weekAxis');axis.replaceChildren(el('span',null,recent.length>1?shortDate(recent[0].start):''),el('span',null,'This week'));
  set('ledgerMeal',(m.groceriesEstimated>0?`Groceries are estimated at ${money(Math.round((state.habit.groceriesWeekly??Math.round((state.baseline?.groceries||0)*12/52))))} a week where no shop is logged; logging a shop replaces the estimate. `:'')+(m.homeMeal!=null?`Home meals this month: about ${exact(m.homeMeal)} each.${s.averageOrder?` A takeaway: about ${money(s.averageOrder)}.`:''}`:state.baseline&&!state.baseline.groceries&&m.groceries?'Add your usual grocery month in Settings, or every shop counts as new spending.':''));
  set('ledgerTotal',state.baseline?`Since ${shortDate(state.baseline.since)}: ${exact(s.keptTotal)} kept, ${plural(s.cookedTotal,'meal')} cooked.`:'');
  const wk=$('weeks'),mo=$('months'),en=$('entries');wk.replaceChildren();mo.replaceChildren();en.replaceChildren();
  for(const w of weeks(state)){const left=el('span','grow');left.append(`Week of ${shortDate(w.start)}`,el('small',null,`cooked ${w.cooked} on ${plural(w.nights,'night')}${w.planned?', a planned treat':''}${w.groceries?` · groceries ${money(w.groceries)}`:''}`));wk.append(line(left,el('span',`amount ${w.unplanned?'bad':'good'}`,`${w.unplanned} unplanned`)));}
  for(const x of [...s.months].reverse()){const left=el('span','grow');left.append(monthName(x.month),el('small',null,`${plural(x.orders,'takeaway')} ${money(x.spent)} · groceries ${money(x.groceries)} · usual ${money(x.usual)}`));mo.append(line(left,el('span',`amount ${x.kept<0?'bad':'good'}`,`${x.kept<0?'−':'+'}${money(Math.abs(x.kept))}`)));}
  const all=[...state.events].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);if(!all.length)en.append(el('p','empty','Nothing yet.'));
  for(const ev of all.slice(0,60)){const left=el('span','grow'),x=button('link','Remove',()=>{commit(removeEvent(state,ev.id),'Removed');openLedger();});
    if(ev.type==='cooked'){const g=s.gains.get(ev.id);left.append(ev.dish,el('small',null,`${shortDate(ev.date)} · ${mealLabel(ev.meal).toLowerCase()} · ${g?`${g.base+g.rested} xp`:'no xp, three already that day'}`));}
    else if(ev.type==='groceries')left.append(ev.note||'Groceries',el('small',null,`${shortDate(ev.date)} · ${exact(ev.amount)} · groceries, ${GROCERY_SPANS.find(x=>x.days===ev.days)?.label.toLowerCase()||`${ev.days} days`}`));
    else left.append(ev.note||'Takeaway',el('small',null,`${shortDate(ev.date)} · ${exact(ev.amount)}${ev.planned?' · planned':''}`));
    en.append(line(left,x));}
  if(!$('ledgerDialog').open)$('ledgerDialog').showModal();
}
$('purse').onclick=openLedger;$('ledgerButton').onclick=openLedger;

// ---------- settings and first run ----------
// Counting settings: assume home-cooked or log each meal; usual meals a day; from when; groceries per week.
let settingMode='assume',settingMeals=3;
function paintCounting(){
  document.querySelectorAll('#modeSeg button').forEach(b=>b.classList.toggle('is-on',b.dataset.mode===settingMode));
  document.querySelectorAll('#mealsSeg button').forEach(b=>b.classList.toggle('is-on',Number(b.dataset.meals)===settingMeals));
  $('assumeFields').hidden=settingMode!=='assume';
  set('modeHint',settingMode==='assume'?'Every finished day counts as home-cooked unless you log a takeaway. Logging a dish is optional, for your book.':'Only the meals you log count toward your level.');
}
document.querySelectorAll('#modeSeg button').forEach(b=>b.onclick=()=>{settingMode=b.dataset.mode;paintCounting();});
document.querySelectorAll('#mealsSeg button').forEach(b=>b.onclick=()=>{settingMeals=Number(b.dataset.meals);paintCounting();});
$('settingsButton').onclick=()=>{const h=state.habit||{};settingMode=h.mode||'assume';settingMeals=h.meals||3;$('habitFrom').value=h.from||dayKey();$('habitFrom').max=dayKey();$('habitFrom').min=state.baseline?.since||'';$('habitWeekly').value=h.groceriesWeekly!=null?(h.groceriesWeekly/100).toFixed(2):'';$('habitWeekly').placeholder=state.baseline?.groceries?`empty: ${money(Math.round(state.baseline.groceries*12/52))}, from your usual month`:'';paintCounting();const b=state.baseline;$('settingMonthly').value=b?(b.monthly/100).toFixed(2):'';$('settingOrders').value=b?String(b.orders):'';$('settingGroceries').value=b?.groceries?(b.groceries/100).toFixed(2):'';$('settingSince').value=b?b.since:dayKey();$('settingSince').max=dayKey();$('settingCurrency').value=state.currency;$('settingsError').textContent=loadError?'Saved data needs recovery. Export it, then import a valid backup.':'';$('settingsDialog').showModal();};
$('settingsForm').addEventListener('submit',e=>{e.preventDefault();try{const next=setBaseline({...state,currency:CURRENCIES.includes($('settingCurrency').value)?$('settingCurrency').value:state.currency},{monthly:$('settingMonthly').value,orders:Number($('settingOrders').value),since:$('settingSince').value,groceries:$('settingGroceries').value.trim()});if(next.baseline.since>dayKey())throw new Error('The start date cannot be in the future.');
  const from=settingMode==='assume'?($('habitFrom').value||dayKey()):(state.habit?.from||'');if(from>dayKey())throw new Error('Counting cannot start in the future.');
  const before=summary(state),withHabit=setHabit(next,{mode:settingMode,meals:settingMeals,from:from&&from<next.baseline.since?next.baseline.since:from,groceriesWeekly:$('habitWeekly').value.trim()});
  commit(withHabit,'Saved');$('settingsDialog').close();if($('ledgerDialog').open)openLedger();
  const after=summary(state);if(after.level>before.level){document.querySelectorAll('dialog[open]').forEach(d=>d.close());levelUp(before.level,after.level,after);}}catch(err){$('settingsError').textContent=err.message;}});
$('welcomeForm').addEventListener('submit',e=>{e.preventDefault();try{commit(setHabit(setBaseline({...state,currency:$('welcomeCurrency').value},{monthly:$('welcomeMonthly').value,orders:Number($('welcomeOrders').value),since:dayKey(),groceries:$('welcomeGroceries').value.trim()}),{mode:'assume',meals:3,from:dayKey(),groceriesWeekly:$('welcomeWeekly').value.trim()}));$('welcomeDialog').close();}catch(err){$('welcomeError').textContent=err.message;}});
// Export: the iPhone share sheet when it can take a file (save to Files, AirDrop, mail), a download otherwise.
$('exportButton').onclick=async()=>{
  const raw=loadError?store.getItem(KEY):JSON.stringify(state,null,2),name=`cook99-${dayKey()}.json`,blob=new Blob([raw||''],{type:'application/json'});
  if(native({type:'export',name,text:raw||''}))return;   // the iPhone app shows its share sheet
  try{const file=new File([blob],name,{type:'application/json'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Cook99 backup'});return;}}catch(err){if(err?.name==='AbortError')return;}
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('importFile').addEventListener('change',async e=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>8_000_000)throw new Error('That file is too large to be a backup.');const restored=validateState(JSON.parse(await file.text()));if(!confirm(`Import ${restored.events.length} entries? This replaces what is in this browser.`))return;persist(restored,store);undo=loadError?null:state;state=restored;loadError=false;render();$('settingsDialog').close();message('Imported','',Boolean(undo));}catch(err){$('settingsError').textContent=err.message||'Unable to read this backup.';}finally{e.target.value='';}});
$('resetButton').onclick=()=>{if(!confirm('Start over? This deletes everything in this browser. Export first if you want to keep it.'))return;state=initialState();persist(state,store);undo=null;loadError=false;open=null;render();$('settingsDialog').close();$('ledgerDialog').close();$('welcomeDialog').showModal();};
$('cookButton').onclick=openCook;
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
window.addEventListener('storage',e=>{if(e.key!==KEY)return;try{state=load(store);loadError=false;undo=null;render();}catch{loadError=true;render();}});
holdVisit=true;render();holdVisit=false;showVisit();saveVisit(summary(state));
// An app left open in the background wakes on a new day: a fresh dinner idea, the week's review, what happened since.
let shownDay=dayKey();
document.addEventListener('visibilitychange',()=>{if(document.hidden||shownDay===dayKey())return;shownDay=dayKey();tonightSkip=0;holdVisit=true;render();holdVisit=false;showVisit();saveVisit(summary(state));});
if(loadError)message('Saved data could not be read. Open the Ledger, then Settings, to export it.');
else if(!state.baseline)$('welcomeDialog').showModal();
// Installed to the Home Screen: work offline, and ask the browser to keep this app's data rather than clear it when space runs low.
if(!window.cook99Storage&&'serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
navigator.storage?.persist?.().catch(()=>{});
