import {DISHES,CATEGORIES,reagentKind} from './dishes.js';
export {CATEGORIES,reagentKind};
export const KEY='cook99.v2';
export const CURRENCIES=['EUR','USD','GBP'];
export function newId(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  const bytes=new Uint8Array(16);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256);
  bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
// baseline: what a usual month of delivery cost before you started. pantry: reagents you have in. picks: this week's plan.
export const initialState=()=>({version:2,currency:'EUR',baseline:null,events:[],dishes:[],pantry:[],picks:{week:'',dishes:[]}});
export function cents(value){
  const s=String(value).trim().replace(',','.');
  if(!/^\d{1,6}(\.\d{1,2})?$/.test(s))throw new Error('Enter an amount with up to two decimals.');
  const n=Math.round(Number(s)*100);
  if(n>10000000)throw new Error('Enter an amount below 100,000.');
  return n;
}
export function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function validDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d,12);
  return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d;
}
const parts=key=>key.split('-').map(Number);
export const monthOf=key=>key.slice(0,7);
export const daysInMonth=month=>{const [y,m]=parts(month);return new Date(Date.UTC(y,m,0)).getUTCDate();};
const dayNumber=key=>{const [y,m,d]=parts(key);return Math.round(Date.UTC(y,m-1,d)/86400000);};
export const daysBetween=(from,to)=>dayNumber(to)-dayNumber(from);
export function addMonths(month,n){const [y,m]=parts(month);const d=new Date(Date.UTC(y,m-1+n,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
export function addDays(key,n){const d=new Date((dayNumber(key)+n)*86400000);return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;}
export function weekStart(key){const day=(new Date(dayNumber(key)*86400000).getUTCDay()+6)%7;return addDays(key,-day);}   // Mondays

// ---------- the skill ----------
// The real OSRS experience table, divided by 50 so a home-cooked meal is worth 30 to 250 XP: level 92 is half way and
// 99 is 260,689 XP. Under it, a floor so early levels cost real cooking (OSRS hands them out in a single meal):
// level 2 after two or three meals, 10 after about five weeks of dinners, 30 after about five months. The floor gives
// way to the OSRS table at level 82.
export const XP_SCALE=50,FLOOR_XP=150,FLOOR_POWER=1.3;
const OSRS=[0,0];{let points=0;for(let l=1;l<99;l++){points+=Math.floor(l+300*2**(l/7));OSRS.push(Math.floor(points/4));}}
export const osrsXp=level=>OSRS[Math.max(1,Math.min(99,level))];
export const xpAtLevel=level=>level<=1?0:Math.max(Math.round(osrsXp(level)/XP_SCALE),Math.round(FLOOR_XP*(Math.min(99,level)-1)**FLOOR_POWER));
export function levelFor(xp){let level=1;while(level<99&&xp>=xpAtLevel(level+1))level++;return level;}
export const dishXp=level=>Math.round((30+2.2*level)/5)*5;      // level 1: 30, level 25: 85, level 50: 140, level 99: 250
export const DAILY_CAP=3;                                          // meals a day that earn XP
// Rested: from the third cooking day in a row, meals earn half again. One day off is forgiven; two end the streak.
export const RESTED_BONUS=0.5,RESTED_FROM=3,GRACE_DAYS=1;
// How much effort a dish of your own takes sets its XP. Levels are internal; the book never shows them.
export const TIERS=[{label:'Quick',level:5},{label:'Everyday',level:20},{label:'Involved',level:40},{label:'A project',level:65},{label:'A showpiece',level:85}];

// ---------- the book ----------
const norm=name=>String(name||'').trim().replace(/\s+/g,' ');
const key=name=>norm(name).toLowerCase();
const ingredientsOf=text=>[...new Set((Array.isArray(text)?text:String(text||'').split(',')).map(s=>norm(s).toLowerCase()).filter(Boolean))].slice(0,10);
export function catalogue(state){
  const cooked={};for(const e of state.events)if(e.type==='cooked')cooked[key(e.dish)]=(cooked[key(e.dish)]||0)+1;
  const own=new Set(state.dishes.map(d=>key(d.name)));
  return [...DISHES.filter(d=>!own.has(key(d.name))).map(d=>({...d,custom:false})),...state.dishes.map(d=>({name:d.name,level:d.level,minutes:d.minutes??null,category:d.category||'feast',ingredients:d.ingredients||[],custom:true}))]
    .map(d=>({...d,xp:dishXp(d.level),cooked:cooked[key(d.name)]||0})).sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
}
export const findDish=(state,name)=>catalogue(state).find(d=>key(d.name)===key(name))||null;
// Your book: every dish you have cooked, most cooked first. Nothing is locked; cooking a dish writes it in.
export function book(state){
  const last={};for(const e of state.events)if(e.type==='cooked'&&(!last[key(e.dish)]||e.date>last[key(e.dish)]))last[key(e.dish)]=e.date;
  return catalogue(state).filter(d=>d.cooked>0).map(d=>({...d,last:last[key(d.name)]})).sort((a,b)=>b.cooked-a.cooked||b.last.localeCompare(a.last)||a.name.localeCompare(b.name));
}
// What to cook: your book first, then the ideas in the catalogue, matched by name.
export function searchDishes(state,query,limit=8){
  const q=key(query),mine=book(state),own=new Set(mine.map(d=>key(d.name)));
  const ideas=catalogue(state).filter(d=>!own.has(key(d.name)));
  const match=d=>!q||key(d.name).includes(q);
  return [...mine.filter(match).map(d=>({...d,inBook:true})),...ideas.filter(match).map(d=>({...d,inBook:false}))].slice(0,limit);
}
export function saveRecipe(state,{name,level,category,minutes,ingredients},original=null){
  const clean=norm(name).slice(0,60);if(!clean)throw new Error('Give the recipe a name.');
  if(!Number.isInteger(level)||level<1||level>99)throw new Error('Pick a level from 1 to 99.');
  if(!CATEGORIES.some(c=>c.key===category))throw new Error('Pick a category.');
  const mins=minutes===''||minutes==null?null:Number(minutes);if(mins!==null&&(!Number.isInteger(mins)||mins<1||mins>1440))throw new Error('Minutes should be a whole number.');
  const clash=findDish(state,clean);if(clash&&key(clash.name)!==key(original||'')&&clash.custom)throw new Error('You already have a recipe with that name.');
  const recipe={name:clean,level,category,minutes:mins,ingredients:ingredientsOf(ingredients)};
  const rest=state.dishes.filter(d=>key(d.name)!==key(original||clean));
  return {...state,dishes:[...rest,recipe]};
}
// Reagents: what is in your kitchen. Ready means every main ingredient is in.
export const hasIngredient=(state,name)=>state.pantry.includes(key(name));
export const setHave=(state,name,have)=>{const n=key(name);return {...state,pantry:have?[...new Set([...state.pantry,n])].sort():state.pantry.filter(x=>x!==n)};};
export const isReady=(state,dish)=>dish.ingredients.length>0&&dish.ingredients.every(i=>hasIngredient(state,i));

// ---------- the week: up to seven dinners, and what to buy for them ----------
export const MAX_PICKS=7;
export const picksFor=(state,today=dayKey())=>state.picks.week===weekStart(today)?state.picks.dishes.map(d=>findDish(state,d)).filter(Boolean):[];
export function togglePick(state,dish,today=dayKey()){
  const known=findDish(state,dish);if(!known)throw new Error('That recipe is not in the book.');
  const current=picksFor(state,today).map(d=>d.name);
  const next=current.includes(known.name)?current.filter(n=>n!==known.name):[...current,known.name];
  if(next.length>MAX_PICKS)throw new Error(`A week has ${MAX_PICKS} dinners. Take one off first.`);
  return {...state,picks:{week:weekStart(today),dishes:next}};
}
export const clearPicks=(state,today=dayKey())=>({...state,picks:{week:weekStart(today),dishes:[]}});
export function shoppingList(state,today=dayKey()){
  const need=new Map();
  for(const d of picksFor(state,today))for(const i of d.ingredients){if(hasIngredient(state,i))continue;const entry=need.get(i)||{name:i,kind:reagentKind(i),for:[]};entry.for.push(d.name);need.set(i,entry);}
  return [...need.values()].sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name));
}

// ---------- events ----------
function checkDate(state,date,today){
  if(!validDate(date)||date>today)throw new Error('Choose today or a past date.');
  if(state.baseline&&date<state.baseline.since)throw new Error(`Choose a date since you started, ${state.baseline.since}.`);
}
export function logCooked(state,{dish,date,tempted=false},{now=Date.now(),today=dayKey()}={}){
  date=date||today;checkDate(state,date,today);
  const known=findDish(state,dish);if(!known)throw new Error('Add that recipe to your book first.');
  const event={id:newId(),type:'cooked',date,dish:known.name,level:known.level,xp:dishXp(known.level),tempted:Boolean(tempted),createdAt:now};
  return {state:{...state,events:[...state.events,event]},event};
}
export const plannedUsed=(state,start)=>state.events.some(e=>e.type==='ordered'&&e.planned&&weekStart(e.date)===start);
export function logOrdered(state,{amount,date,note='',planned=false},{now=Date.now(),today=dayKey()}={}){
  date=date||today;checkDate(state,date,today);
  const value=cents(amount);if(!value)throw new Error('Enter what the order cost.');
  if(planned&&plannedUsed(state,weekStart(date)))throw new Error('This week already had its planned treat.');
  const event={id:newId(),type:'ordered',date,amount:value,note:norm(note).slice(0,60),planned:Boolean(planned),createdAt:now};
  return {state:{...state,events:[...state.events,event]},event};
}
// A grocery shop is logged once, at the receipt amount, with how long it roughly lasts. Its cost is spread evenly over
// those days, so one big shop on the 2nd does not make the month look worse than it is.
export const GROCERY_SPANS=[{days:3,label:'A few days'},{days:7,label:'A week'},{days:10,label:'Ten days'},{days:14,label:'Two weeks'},{days:21,label:'Three weeks'},{days:30,label:'A month'}];
export function logGroceries(state,{amount,date,note='',days=7},{now=Date.now(),today=dayKey()}={}){
  date=date||today;checkDate(state,date,today);
  const value=cents(amount);if(!value)throw new Error('Enter what the shop cost.');
  if(!Number.isInteger(days)||days<1||days>31)throw new Error('Choose how long it lasts.');
  const event={id:newId(),type:'groceries',date,amount:value,note:norm(note).slice(0,60),days,createdAt:now};
  return {state:{...state,events:[...state.events,event]},event};
}
export const lastGrocerySpan=state=>[...state.events].filter(e=>e.type==='groceries').sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt)[0]?.days||7;
// Grocery money attributed to the days from..to inclusive: each shop contributes amount × overlapping days ÷ its span.
export function groceriesBetween(state,from,to){
  if(to<from)return 0;let total=0;
  for(const e of state.events){if(e.type!=='groceries')continue;const last=addDays(e.date,e.days-1),a=e.date>from?e.date:from,b=last<to?last:to;
    if(b>=a)total+=e.amount*(daysBetween(a,b)+1)/e.days;}
  return total;
}
export const removeEvent=(state,id)=>({...state,events:state.events.filter(e=>e.id!==id)});
// The usual month: delivery (and how many orders) plus groceries, from real history. Groceries default to zero for
// older records; then every shop counts as new spending, which understates what you keep, never overstates it.
export function setBaseline(state,{monthly,orders,since,groceries=0}){
  const total=cents(monthly);const count=Number(orders);const shop=groceries===''||groceries==null?0:cents(groceries);
  if(!Number.isInteger(count)||count<0||count>999)throw new Error('Enter how many orders that was.');
  if(!validDate(since))throw new Error('Choose a start date.');
  return {...state,baseline:{monthly:total,orders:count,since,groceries:shop}};
}

// ---------- money: usual spend by now, minus what you actually spent ----------
export function trackedDays(state,month,today){
  if(!state.baseline)return 0;
  const start=[month+'-01',state.baseline.since].sort().at(-1),end=[`${month}-${String(daysInMonth(month)).padStart(2,'0')}`,today].sort()[0];
  return end<start?0:daysBetween(start,end)+1;
}
// Kept = your usual food spending by now (delivery plus groceries, pro-rated) minus what you actually spent on both.
export function monthReport(state,month,today=dayKey()){
  const days=trackedDays(state,month,today),share=days/daysInMonth(month);
  let spent=0,orders=0,cooked=0;
  for(const e of state.events)if(monthOf(e.date)===month){if(e.type==='ordered'){spent+=e.amount;orders++;}else if(e.type==='cooked')cooked++;}
  const from=state.baseline?[month+'-01',state.baseline.since].sort().at(-1):month+'-01',to=[`${month}-${String(daysInMonth(month)).padStart(2,'0')}`,today].sort()[0];
  const groceries=days?Math.round(groceriesBetween(state,from,to)):0;
  const usualDelivery=state.baseline?Math.round(state.baseline.monthly*share):0,usualGroceries=state.baseline?Math.round((state.baseline.groceries||0)*share):0;
  const usual=usualDelivery+usualGroceries,usualOrders=state.baseline?state.baseline.orders*share:0;
  return {month,days,share,spent,orders,cooked,groceries,usual,usualDelivery,usualGroceries,usualOrders,kept:usual-spent-groceries,
    homeMeal:groceries>0&&cooked>0?Math.round(groceries/cooked):null};
}
export function weekReport(state,start,today=addDays(start,6)){
  const end=addDays(start,6);let cooked=0,planned=0,unplanned=0,spent=0;const days=new Set();
  for(const e of state.events){if(e.date<start||e.date>end)continue;if(e.type==='cooked'){cooked++;days.add(e.date);}else if(e.type==='ordered'){spent+=e.amount;if(e.planned)planned++;else unplanned++;}}
  const groceries=Math.round(groceriesBetween(state,start,end<today?end:today));
  return {start,end,cooked,nights:days.size,planned,unplanned,orders:planned+unplanned,spent,groceries};
}
export function weeks(state,today=dayKey(),count=8){
  const list=[];let start=weekStart(today);const first=state.baseline?weekStart(state.baseline.since):start;
  for(let i=0;i<count&&start>=first;i++){list.push(weekReport(state,start,today));start=addDays(start,-7);}
  return list;
}

// ---------- everything the window shows ----------
const byTime=(a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt||a.id.localeCompare(b.id);
export function summary(state,today=dayKey()){
  const months=[];
  if(state.baseline){let m=monthOf(state.baseline.since);const last=monthOf(today);while(m<=last){months.push(monthReport(state,m,today));m=addMonths(m,1);}}
  const perDay={},counted=new Set(),gains=new Map();let xp=0,cookedTotal=0,ordersTotal=0,spentTotal=0,groceriesTotal=0,resisted=0,streak=0,lastDay=null;
  for(const e of [...state.events].sort(byTime)){
    if(e.type==='ordered'){ordersTotal++;spentTotal+=e.amount;continue;}
    if(e.type==='groceries'){groceriesTotal+=e.amount;continue;}
    cookedTotal++;if(e.tempted)resisted++;perDay[e.date]=(perDay[e.date]||0)+1;if(perDay[e.date]>DAILY_CAP)continue;
    if(e.date!==lastDay){streak=lastDay&&daysBetween(lastDay,e.date)<=GRACE_DAYS+1?streak+1:1;lastDay=e.date;}
    const bonus=streak>=RESTED_FROM?Math.round(e.xp*RESTED_BONUS):0;gains.set(e.id,{base:e.xp,rested:bonus});counted.add(e.id);xp+=e.xp+bonus;
  }
  const alive=lastDay!==null&&daysBetween(lastDay,today)<=GRACE_DAYS+1;
  const streakNow=alive?streak:0,nextStreak=!alive?1:lastDay===today?streak:streak+1;
  const level=levelFor(xp),thisMonth=months.at(-1)||monthReport(state,monthOf(today),today),thisWeek=weekReport(state,weekStart(today),today);
  const unplannedMonth=state.events.filter(e=>e.type==='ordered'&&!e.planned&&monthOf(e.date)===monthOf(today)).length;
  return {months,thisMonth,thisWeek,unplannedMonth,keptTotal:months.reduce((a,m)=>a+m.kept,0),xp,level,counted,gains,resisted,cookedTotal,ordersTotal,spentTotal,groceriesTotal,
    streak:streakNow,rested:nextStreak>=RESTED_FROM,cookedToday:perDay[today]||0,averageOrder:state.baseline?.orders?Math.round(state.baseline.monthly/state.baseline.orders):0};
}
export function xpInfo(s){
  const capped=s.level>=99,floor=xpAtLevel(s.level),next=capped?s.xp:xpAtLevel(s.level+1);
  const into=capped?s.xp:s.xp-floor,span=Math.max(1,capped?s.xp:next-floor);
  return {xp:s.xp,next,into,span,remaining:Math.max(0,next-s.xp),fraction:capped?1:into/span,pct:capped?100:Math.round(into/span*100)};
}

// ---------- storage ----------
export function validateState(raw){
  if(raw?.version!==2||!Array.isArray(raw.events)||!Array.isArray(raw.dishes)||raw.events.length>50000)throw new Error('This is not a Cook99 backup.');
  const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000,text=(v,max)=>typeof v==='string'&&v.length<=max;
  const b=raw.baseline;
  if(b!==null&&!(money(b?.monthly)&&Number.isInteger(b?.orders)&&b.orders>=0&&b.orders<=999&&validDate(b?.since)&&(b.groceries===undefined||money(b.groceries))))throw new Error('Invalid baseline in backup.');
  const ids=new Set();
  for(const e of raw.events){
    if(!text(e.id,80)||ids.has(e.id)||!validDate(e.date)||!Number.isSafeInteger(e.createdAt)||e.createdAt<0)throw new Error('Invalid entry in backup.');
    if(e.type==='cooked'){if(!text(e.dish,60)||!Number.isInteger(e.level)||e.level<1||e.level>99||!Number.isInteger(e.xp)||e.xp<0||e.xp>1000)throw new Error('Invalid meal in backup.');}
    else if(e.type==='ordered'){if(!money(e.amount)||!text(e.note??'',60))throw new Error('Invalid order in backup.');}
    else if(e.type==='groceries'){if(!money(e.amount)||!text(e.note??'',60)||!Number.isInteger(e.days)||e.days<1||e.days>31)throw new Error('Invalid grocery shop in backup.');}
    else throw new Error('Invalid entry in backup.');
    ids.add(e.id);
  }
  // Older saves had a tired-night shelf with staples per dish: those staples become your own recipes' ingredients.
  const shelf=Array.isArray(raw.shelf)?raw.shelf:[];const staples=new Map(shelf.filter(s=>text(s?.dish,60)&&Array.isArray(s.staples)).map(s=>[key(s.dish),s.staples.filter(x=>text(x,40))]));
  const dishes=raw.dishes.map(d=>{
    if(!text(d.name,60)||!Number.isInteger(d.level)||d.level<1||d.level>99)throw new Error('Invalid dish in backup.');
    const ingredients=Array.isArray(d.ingredients)?d.ingredients:staples.get(key(d.name))||[];
    if(ingredients.length>10||!ingredients.every(x=>text(x,40)))throw new Error('Invalid dish in backup.');
    const minutes=Number.isInteger(d.minutes)&&d.minutes>0&&d.minutes<=1440?d.minutes:null;
    return {name:d.name,level:d.level,category:CATEGORIES.some(c=>c.key===d.category)?d.category:'feast',minutes,ingredients:[...ingredients]};
  });
  const pantry=Array.isArray(raw.pantry)?raw.pantry:[];if(pantry.length>500||!pantry.every(x=>text(x,40)))throw new Error('Invalid pantry in backup.');
  const picks=raw.picks&&typeof raw.picks==='object'?raw.picks:{week:'',dishes:[]};
  if(!(picks.week===''||validDate(picks.week))||!Array.isArray(picks.dishes)||picks.dishes.length>MAX_PICKS||!picks.dishes.every(x=>text(x,60)))throw new Error('Invalid week plan in backup.');
  return {version:2,currency:CURRENCIES.includes(raw.currency)?raw.currency:'EUR',baseline:b?{monthly:b.monthly,orders:b.orders,since:b.since,groceries:b.groceries||0}:null,
    events:raw.events.map(e=>e.type==='cooked'?{id:e.id,type:'cooked',date:e.date,dish:e.dish,level:e.level,xp:e.xp,tempted:e.tempted===true,createdAt:e.createdAt}
      :e.type==='groceries'?{id:e.id,type:'groceries',date:e.date,amount:e.amount,note:e.note||'',days:e.days,createdAt:e.createdAt}
      :{id:e.id,type:'ordered',date:e.date,amount:e.amount,note:e.note||'',planned:e.planned===true,createdAt:e.createdAt}),
    dishes,pantry:[...new Set(pantry.map(key))].sort(),picks:{week:picks.week,dishes:[...picks.dishes]}};
}
export function load(storage=localStorage){const raw=storage.getItem(KEY);return raw?validateState(JSON.parse(raw)):initialState();}
export function persist(state,storage=localStorage){storage.setItem(KEY,JSON.stringify(validateState(state)));}
