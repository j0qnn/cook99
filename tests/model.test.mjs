import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,cents,setBaseline,logCooked,logOrdered,removeEvent,monthReport,trackedDays,summary,xpInfo,xpAtLevel,osrsXp,levelFor,MEALS,mealXp,mealFor,catalogue,findDish,book,searchDishes,saveRecipe,setHave,hasIngredient,isReady,togglePick,clearPicks,picksFor,shoppingList,weekStart,addDays,weekReport,weeks,plannedUsed,validateState,load,persist,KEY,daysInMonth,DAILY_CAP,MAX_PICKS,reagentKind} from '../model.js';
import {DISHES,CATEGORIES} from '../dishes.js';
const started=(since='2026-09-17')=>setBaseline(initialState(),{monthly:'247.00',orders:11,since});
const T='2026-09-30';
const cook=(state,dish,over={},i=1)=>logCooked(state,{dish,...over},{now:i,today:over.today||T}).state;
const order=(state,amount,over={},i=1)=>logOrdered(state,{amount,...over},{now:i,today:over.today||T}).state;

test('the curve: a floor for the early levels, then the OSRS table, scaled; 92 is still half of 99',()=>{
  assert.equal(osrsXp(2),83);assert.equal(osrsXp(50),101333);assert.equal(osrsXp(92),6517253);assert.equal(osrsXp(99),13034431);
  assert.equal(xpAtLevel(99),260689);assert.equal(xpAtLevel(92),130345);assert.equal(xpAtLevel(2),150);assert.equal(xpAtLevel(10),2610);
  assert.equal(levelFor(30),1);assert.equal(levelFor(149),1);assert.equal(levelFor(150),2);   // one meal is not a level any more
  assert.equal(xpAtLevel(81),Math.round(150*80**1.3));assert.equal(xpAtLevel(82),Math.round(osrsXp(82)/50));   // where the floor hands over
  for(let l=2;l<=99;l++)assert.ok(xpAtLevel(l)>xpAtLevel(l-1));
  assert.equal(levelFor(0),1);assert.equal(levelFor(260689),99);assert.equal(levelFor(260688),98);
  assert.deepEqual(MEALS.map(m=>[m.key,m.xp]),[['breakfast',50],['lunch',70],['dinner',100]]);assert.equal(mealXp('lunch'),70);assert.equal(mealXp('nonsense'),100);
  assert.equal(mealFor(7),'breakfast');assert.equal(mealFor(12),'lunch');assert.equal(mealFor(19),'dinner');
});
test('the recipe book: 91 dishes, every one with a category and main ingredients, and reagents get an icon',()=>{
  assert.equal(DISHES.length,91);assert.equal(new Set(DISHES.map(d=>d.name.toLowerCase())).size,91);
  const keys=new Set(CATEGORIES.map(c=>c.key));for(const d of DISHES)assert.ok(keys.has(d.category)&&d.ingredients.length>=2&&d.minutes>0,d.name);
  assert.equal(reagentKind('coconut milk'),'sauce');assert.equal(reagentKind('pasta sauce'),'sauce');assert.equal(reagentKind('cheddar'),'dairy');assert.equal(reagentKind('a notebook'),'sack');
});
test('the book holds only what you have cooked; any dish can be cooked, and your own are written in by cooking them',()=>{
  let s=started();assert.equal(book(s).length,0);
  s=cook(s,'Risotto',{date:'2026-09-20'},1);s=cook(s,'Porridge',{date:'2026-09-21'},2);s=cook(s,'Porridge',{date:'2026-09-22'},3);
  assert.deepEqual(book(s).map(d=>[d.name,d.cooked,d.last]),[['Porridge',2,'2026-09-22'],['Risotto',1,'2026-09-20']]);
  const found=searchDishes(s,'risot');assert.equal(found[0].name,'Risotto');assert.ok(found[0].inBook);assert.ok(found.slice(1).every(d=>!d.inBook));
  assert.equal(searchDishes(s,'').length,8);assert.equal(searchDishes(s,'').filter(d=>d.inBook).length,2);
  assert.throws(()=>cook(s,"Gran's stew"));                                    // a new dish is written down first
  s=saveRecipe(s,{name:"Gran's stew",minutes:'90',ingredients:'Beef, carrots, Beef'});
  assert.equal(book(s).length,2);s=cook(s,"gran's stew",{date:'2026-09-23'},4);
  const gran=findDish(s,"Gran's stew");assert.ok(gran.custom);assert.deepEqual(gran.ingredients,['beef','carrots']);assert.equal(gran.minutes,90);
  assert.equal(book(s)[0].name,'Porridge');assert.equal(book(s).length,3);
  assert.throws(()=>saveRecipe(s,{name:"Gran's Stew",level:20,category:'soup'}));assert.throws(()=>saveRecipe(s,{name:'X',level:10,category:'nope'}));
  s=saveRecipe(s,{name:'Risotto',level:35,category:'grains',ingredients:'arborio rice, stock, peas'},'Risotto');   // edit a catalogue dish: your version wins
  assert.deepEqual(findDish(s,'Risotto').ingredients,['arborio rice','stock','peas']);assert.equal(catalogue(s).filter(d=>d.name==='Risotto').length,1);
});
test('XP comes from the meal: every breakfast, lunch and dinner is worth the same, whatever the dish; three a day count',()=>{
  let s=started();for(let i=1;i<=4;i++)s=cook(s,i===1?'Porridge':'Beef wellington',{date:'2026-09-20',meal:'breakfast'},i);
  let sum=summary(s,T);assert.equal(sum.xp,150);assert.equal(sum.counted.size,DAILY_CAP);   // a showpiece breakfast earns what porridge does
  s=cook(s,'Porridge',{date:'2026-09-21',meal:'lunch'},5);s=cook(s,'Carbonara',{date:'2026-09-22'},6);   // dinner by default; day 3 of the streak
  sum=summary(s,'2026-09-22');assert.equal(sum.xp,150+70+150);assert.equal(sum.streak,3);assert.ok(sum.rested);assert.equal([...sum.gains.values()].at(-1).rested,50);
  assert.throws(()=>cook(s,'Dal',{meal:'brunch'}));
});
test('the streak forgives one day off; two days off end it, and nothing earned is lost',()=>{
  let s=started();for(const [d,i] of [['2026-09-20',1],['2026-09-22',2],['2026-09-24',3]])s=cook(s,'Porridge',{date:d,meal:'breakfast'},i);
  let sum=summary(s,'2026-09-24');assert.equal(sum.streak,3);assert.equal(sum.xp,50+50+75);
  assert.ok(summary(s,'2026-09-26').rested);assert.equal(summary(s,'2026-09-27').streak,0);assert.ok(!summary(s,'2026-09-27').rested);
  s=cook(s,'Porridge',{date:'2026-09-27',meal:'breakfast'},4);sum=summary(s,'2026-09-27');assert.equal(sum.streak,1);assert.equal(sum.xp,50+50+75+50);
  const fresh=summary(started(),T);assert.ok(!fresh.rested);assert.equal(fresh.streak,0);
  const old=validateState({...started(),events:[{id:'x',type:'cooked',date:'2026-09-20',dish:'Dal',level:17,xp:65,tempted:false,createdAt:1}]});
  assert.equal(old.events[0].meal,'dinner');assert.equal(summary(old,T).xp,100);   // older meals become dinners
});
test('reagents: tick what is in, a recipe is ready when all of it is, and the week builds a shopping list',()=>{
  let s=started();const omelette=findDish(s,'Omelette');assert.deepEqual(omelette.ingredients,['eggs','cheddar','butter']);
  s=setHave(s,'Eggs',true);s=setHave(s,'butter',true);assert.ok(hasIngredient(s,'eggs'));assert.ok(!isReady(s,omelette));
  s=setHave(s,'cheddar',true);assert.ok(isReady(s,findDish(s,'Omelette')));assert.equal(setHave(s,'eggs',false).pantry.length,2);
  s=togglePick(s,'Omelette',T);s=togglePick(s,'Carbonara',T);assert.deepEqual(picksFor(s,T).map(d=>d.name),['Omelette','Carbonara']);
  const list=shoppingList(s,T);assert.deepEqual(list.map(i=>i.name).sort(),['guanciale','pecorino','spaghetti']);
  assert.deepEqual(list.find(i=>i.name==='spaghetti').for,['Carbonara']);
  assert.equal(togglePick(s,'omelette',T).picks.dishes.length,1);assert.equal(picksFor(s,addDays(T,7)).length,0);assert.equal(clearPicks(s,T).picks.dishes.length,0);
  for(const d of ['Porridge','Dal','Pancakes','Risotto','Bolognese'])s=togglePick(s,d,T);assert.equal(picksFor(s,T).length,MAX_PICKS);assert.throws(()=>togglePick(s,'Pad thai',T));
});
test('money: usual spend pro-rated from the start, minus actual orders; it can go negative',()=>{
  const s=started();assert.equal(daysInMonth('2026-02'),28);assert.equal(trackedDays(s,'2026-09',T),14);
  const r=monthReport(order(s,'23.50',{date:'2026-09-20'}),'2026-09',T);assert.equal(r.usual,Math.round(24700*14/30));assert.equal(r.kept,r.usual-2350);
  assert.ok(summary(order(s,'400',{date:'2026-09-28'}),T).thisMonth.kept<0);assert.equal(summary(s,T).averageOrder,2245);
  assert.throws(()=>order(s,'10',{date:'2026-09-10'}));assert.throws(()=>order(s,'10',{date:'2026-10-01'}));
});
test('weeks count cooked nights, planned and unplanned orders; one planned treat a week',()=>{
  assert.equal(weekStart('2026-09-30'),'2026-09-28');assert.equal(weekStart('2026-09-27'),'2026-09-21');
  let s=started();s=cook(s,'Dal',{date:'2026-09-28'},1);s=cook(s,'Omelette',{date:'2026-09-29'},2);s=order(s,'20',{date:'2026-09-26',planned:true},3);s=order(s,'25',{date:'2026-09-29'},4);
  const w=weekReport(s,'2026-09-28');assert.equal(w.cooked,2);assert.equal(w.nights,2);assert.equal(w.unplanned,1);assert.ok(plannedUsed(s,'2026-09-21'));
  assert.throws(()=>order(s,'30',{date:'2026-09-25',planned:true}),/already/);assert.equal(weeks(s,T).length,3);assert.equal(summary(s,T).unplannedMonth,1);
});
test('backups round-trip, and an older save with a shelf migrates its staples into your own recipes',()=>{
  let s=saveRecipe(started(),{name:'Toastie',level:5,category:'bread',ingredients:'bread, cheddar'});s=setHave(s,'bread',true);s=togglePick(s,'Toastie',T);s=cook(s,'Toastie',{},1);
  const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};persist(s,storage);assert.deepEqual(load(storage),s);
  const old={version:2,currency:'EUR',baseline:null,events:[],dishes:[{name:"Mum's dal",level:20}],shelf:[{dish:"Mum's dal",staples:['lentils','onions']}],outOf:['onions'],picks:{week:'',dishes:[]}};
  const migrated=validateState(old);assert.deepEqual(migrated.dishes[0],{name:"Mum's dal",level:20,category:'feast',minutes:null,ingredients:['lentils','onions']});assert.deepEqual(migrated.pantry,[]);
  assert.throws(()=>validateState({...s,version:1}));storage.setItem(KEY,'broken');assert.throws(()=>load(storage));
  assert.equal(summary(removeEvent(s,s.events[0].id),T).cookedTotal,0);
});

import {logGroceries,groceriesBetween,lastGrocerySpan,GROCERY_SPANS} from '../model.js';
const shop=(state,amount,over={},i=1)=>logGroceries(state,{amount,...over},{now:i,today:over.today||T}).state;
test('a grocery shop is spread over the days it lasts, and never counts as a meal or an order',()=>{
  let s=shop(started(),'84.00',{date:'2026-09-20',days:14},1);
  assert.equal(Math.round(groceriesBetween(s,'2026-09-20','2026-09-26')),4200);   // half the days, half the money
  assert.equal(Math.round(groceriesBetween(s,'2026-09-20','2026-10-10')),8400);assert.equal(groceriesBetween(s,'2026-09-01','2026-09-19'),0);
  assert.equal(lastGrocerySpan(s),14);assert.equal(lastGrocerySpan(started()),7);assert.ok(GROCERY_SPANS.some(x=>x.days===14));
  const sum=summary(s,T);assert.equal(sum.cookedTotal,0);assert.equal(sum.ordersTotal,0);assert.equal(sum.groceriesTotal,8400);
  const w=weekReport(s,'2026-09-14','2026-09-30');assert.equal(w.cooked,0);assert.equal(w.orders,0);assert.equal(w.groceries,Math.round(8400*1/14));   // only the 20th falls in that week
  assert.throws(()=>shop(started(),'0'));assert.throws(()=>shop(started(),'40',{days:40}));assert.throws(()=>shop(started(),'40',{date:'2026-09-01'}));
});
test('kept compares all food spending with the usual month, and home meals get a real cost',()=>{
  let s=setBaseline(initialState(),{monthly:'247',orders:11,since:'2026-09-01',groceries:'200'});   // a usual month: 247 delivery + 200 groceries
  s=shop(s,'90.00',{date:'2026-09-01',days:14,today:'2026-09-14'},1);
  for(let i=1;i<=10;i++)s=cook(s,'Dal',{date:`2026-09-${String(i).padStart(2,'0')}`,today:'2026-09-14'},1+i);
  s=order(s,'22.00',{date:'2026-09-12',today:'2026-09-14'},20);
  const m=monthReport(s,'2026-09','2026-09-14');
  assert.equal(m.usual,Math.round(24700*14/30)+Math.round(20000*14/30));assert.equal(m.groceries,9000);assert.equal(m.spent,2200);
  assert.equal(m.kept,m.usual-2200-9000);assert.equal(m.homeMeal,900);   // €90 of groceries over 10 dinners: €9 a meal
  const old=validateState({...s,baseline:{monthly:24700,orders:11,since:'2026-09-01'}});assert.equal(old.baseline.groceries,0);   // older saves: groceries start at zero
  assert.ok(monthReport(old,'2026-09','2026-09-14').kept<m.kept);   // without a grocery baseline every shop is new spending: understated, never overstated
  assert.equal(monthReport(started(),'2026-09',T).homeMeal,null);
});
test('grocery shops survive a backup and bad ones are refused',()=>{
  const s=shop(started(),'55.40',{note:'Rimi',days:7},1);
  const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};persist(s,storage);assert.deepEqual(load(storage),s);
  const bad=structuredClone(s);bad.events[0].days=0;assert.throws(()=>validateState(bad));
  const neg=structuredClone(s);neg.baseline.groceries=-5;assert.throws(()=>validateState(neg));
});

import {monthDays} from '../model.js';
test('the month picture: a Monday-first grid with each day\u2019s meals in meal order and its takeaways',()=>{
  let s=started('2026-10-01');s=cook(s,'Dal',{date:'2026-10-07',meal:'dinner',today:'2026-10-26'},1);s=cook(s,'Porridge',{date:'2026-10-07',meal:'breakfast',today:'2026-10-26'},2);
  s=order(s,'22',{date:'2026-10-07',today:'2026-10-26'},3);
  const m=monthDays(s,'2026-10','2026-10-26');assert.equal(m.days.length,31);
  assert.deepEqual([m.days[0].col,m.days[0].row],[3,0]);   // 1 October 2026 is a Thursday
  assert.deepEqual([m.days[30].col,m.days[30].row],[5,4]);assert.equal(m.rows,5);
  const d7=m.days[6];assert.deepEqual(d7.meals.map(e=>e.meal),['breakfast','dinner']);assert.equal(d7.orders.length,1);
  assert.ok(m.days[25].isToday);assert.ok(m.days[26].ahead&&!m.days[24].ahead);
  assert.equal(monthDays(s,'2026-02','2026-10-26').rows,5);   // February 2026 starts on a Sunday, so it spills into a fifth row
});
