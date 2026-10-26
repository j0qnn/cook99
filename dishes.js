// The recipe book: every dish has a level, rough minutes, a category (its icon) and its main ingredients (reagents).
// Catalogue recipes are learned when you reach their level, like recipes from a trainer; yours are always known.
export const CATEGORIES=[
  {key:'seafood',name:'Seafood'},{key:'poultry',name:'Poultry'},{key:'pork',name:'Pork'},{key:'beef',name:'Beef & lamb'},
  {key:'eggs',name:'Eggs'},{key:'veg',name:'Vegetables'},{key:'pasta',name:'Pasta & noodles'},{key:'grains',name:'Rice & grains'},
  {key:'soup',name:'Soups & stews'},{key:'bread',name:'Bread & baking'},{key:'sweet',name:'Desserts'},{key:'drink',name:'Drinks & smoothies'},
  {key:'feast',name:'Feasts'}
];
const D=(level,name,minutes,category,ingredients)=>({level,name,minutes,category,ingredients:ingredients.split(', ')});
export const DISHES=[
  D(1,'Scrambled eggs on toast',10,'eggs','eggs, bread, butter'),D(1,'Porridge',8,'grains','oats, milk, honey'),D(1,'Banana smoothie',5,'drink','bananas, milk, yoghurt'),
  D(2,'Pasta with a jar of sauce',15,'pasta','pasta, pasta sauce, parmesan'),D(3,'Beans on toast',8,'veg','baked beans, bread, butter'),D(3,'Grilled cheese sandwich',10,'bread','bread, cheddar, butter'),
  D(4,'Quesadilla',12,'veg','tortillas, cheddar, peppers'),D(5,'Baked potato with toppings',60,'veg','potatoes, cheddar, sour cream'),D(5,'Avocado toast',8,'veg','avocado, bread, lemons'),
  D(6,'Instant noodles, upgraded',12,'pasta','instant noodles, eggs, spring onions'),D(6,'Green smoothie',5,'drink','spinach, bananas, apples'),D(7,'Omelette',12,'eggs','eggs, cheddar, butter'),
  D(8,'Pancakes',20,'sweet','flour, eggs, milk'),D(8,'Tuna pasta',15,'seafood','pasta, tinned tuna, sweetcorn, mayonnaise'),D(9,'Tomato soup and a sandwich',15,'soup','tinned tomatoes, onions, bread, cheddar'),
  D(9,'Fresh lemonade',10,'drink','lemons, sugar'),D(10,'Pasta aglio e olio',15,'pasta','spaghetti, garlic, olive oil, chilli flakes'),D(10,'Tuna melt',12,'seafood','tinned tuna, bread, cheddar'),
  D(11,'Egg fried rice',15,'grains','rice, eggs, soy sauce, peas'),D(12,'Vegetable stir fry',20,'veg','mixed vegetables, soy sauce, garlic, noodles'),D(12,'Miso soup with rice',15,'soup','miso paste, tofu, rice'),
  D(12,'Hot chocolate from scratch',10,'drink','milk, cocoa, sugar'),D(13,'Frittata',25,'eggs','eggs, potatoes, onions, cheddar'),D(14,'Tomato pasta from scratch',25,'pasta','pasta, tinned tomatoes, garlic, basil'),
  D(15,'Shakshuka',25,'eggs','eggs, tinned tomatoes, peppers, onions'),D(15,'Brownies',40,'sweet','dark chocolate, butter, eggs, sugar'),D(16,'Chicken fajitas',25,'poultry','chicken breast, peppers, tortillas, onions'),
  D(16,'Garlic butter prawns',15,'seafood','prawns, garlic, butter, lemons'),D(17,'Dal',35,'veg','red lentils, onions, garlic, curry spices'),D(18,'Chilli con carne',40,'beef','beef mince, kidney beans, tinned tomatoes, onions'),
  D(18,'Mango lassi',5,'drink','mangoes, yoghurt, milk'),D(19,'Burrito bowl',25,'grains','rice, black beans, sweetcorn, avocado'),D(20,'Pesto pasta, homemade pesto',20,'pasta','pasta, basil, pine nuts, parmesan'),
  D(20,'Banana bread',70,'sweet','bananas, flour, eggs, butter'),D(21,'Greek salad and pita',15,'veg','tomatoes, cucumber, feta, pita'),D(22,'Fish tacos',30,'seafood','white fish, tortillas, cabbage, limes'),
  D(23,'Lentil soup',35,'soup','red lentils, carrots, onions, stock'),D(24,'Bolognese',45,'beef','beef mince, tinned tomatoes, spaghetti, onions'),D(24,'Apple crumble',50,'sweet','apples, flour, butter, oats'),
  D(25,'Carbonara',20,'pork','spaghetti, eggs, guanciale, pecorino'),D(26,'Chicken noodle soup',40,'soup','chicken thighs, noodles, carrots, stock'),D(26,'Salmon traybake',35,'seafood','salmon, potatoes, broccoli, lemons'),
  D(27,'Pad see ew',25,'pasta','rice noodles, broccoli, eggs, soy sauce'),D(28,'Chicken curry',40,'poultry','chicken thighs, onions, curry spices, coconut milk'),D(29,'Mac and cheese from scratch',35,'pasta','macaroni, cheddar, milk, butter'),
  D(29,'Pork chops with apples',30,'pork','pork chops, apples, potatoes, butter'),D(30,'Burgers from scratch',30,'beef','beef mince, burger buns, cheddar, onions'),D(31,'Enchiladas',45,'poultry','chicken breast, tortillas, enchilada sauce, cheddar'),
  D(32,'Pad thai',30,'pasta','rice noodles, prawns, eggs, peanuts'),D(33,'Quick ramen',30,'pasta','ramen noodles, eggs, stock, spring onions'),D(34,'Katsu curry',40,'pork','pork loin, panko, rice, curry roux'),
  D(35,'Risotto',35,'grains','arborio rice, stock, parmesan, onions'),D(36,'Thai green curry',35,'poultry','chicken thighs, green curry paste, coconut milk, rice'),D(37,'Bibimbap',40,'grains','rice, beef mince, spinach, eggs, gochujang'),
  D(38,'Roast chicken',75,'poultry','whole chicken, potatoes, lemons, garlic'),D(39,"Shepherd's pie",60,'beef','lamb mince, potatoes, carrots, onions'),D(40,'Lasagne',75,'pasta','lasagne sheets, beef mince, tinned tomatoes, mozzarella'),
  D(42,'Fish pie',60,'seafood','white fish, smoked haddock, potatoes, milk'),D(44,'Gnocchi from scratch',60,'pasta','potatoes, flour, eggs, butter'),D(45,'Paella',50,'seafood','paella rice, prawns, chorizo, saffron'),
  D(46,'Moussaka',80,'beef','aubergine, lamb mince, tinned tomatoes, milk'),D(47,'Pizza with homemade dough',90,'bread','flour, yeast, mozzarella, tinned tomatoes'),D(48,'Butter chicken',50,'poultry','chicken thighs, butter, cream, curry spices'),
  D(50,'Ratatouille',60,'veg','aubergine, courgettes, peppers, tinned tomatoes'),D(52,'Beef stew, slow cooked',150,'soup','stewing beef, carrots, potatoes, stock'),D(53,'Falafel from dried chickpeas',60,'veg','dried chickpeas, parsley, garlic, pita'),
  D(55,'Fresh pasta',60,'pasta','00 flour, eggs, olive oil'),D(57,'Biryani',80,'grains','basmati rice, chicken thighs, yoghurt, curry spices'),D(58,'Dumplings from scratch',90,'pork','flour, pork mince, cabbage, ginger'),
  D(60,'Sourdough loaf',240,'bread','flour, sourdough starter, salt'),D(62,'Coq au vin',120,'poultry','chicken thighs, red wine, bacon, mushrooms'),D(65,'Pho',180,'soup','beef bones, rice noodles, star anise, beef sirloin'),
  D(66,'Bao buns',120,'bread','flour, yeast, pork belly, hoisin sauce'),D(68,'Cinnamon rolls',150,'sweet','flour, yeast, cinnamon, butter'),D(70,'Tamales',180,'grains','masa harina, pork shoulder, corn husks, dried chillies'),
  D(72,'Tonkotsu ramen',360,'pork','pork bones, ramen noodles, pork belly, eggs'),D(73,'Beef wellington',150,'beef','beef fillet, puff pastry, mushrooms, prosciutto'),D(74,'Croissants',300,'bread','flour, butter, yeast, milk'),
  D(76,'Cassoulet',240,'pork','white beans, duck legs, sausages, pork belly'),D(77,'Sunday roast with all the trimmings',180,'beef','beef joint, potatoes, carrots, flour'),D(78,'Cheese soufflé',60,'eggs','eggs, gruyère, milk, butter'),
  D(79,'Whole fish, filleted yourself',60,'seafood','whole fish, lemons, butter, herbs'),D(80,'Three-course dinner for guests',180,'feast','seasonal vegetables, a main to roast, cream, wine'),D(82,'Laminated puff pastry',300,'bread','flour, butter, salt'),
  D(84,'Mole',240,'poultry','dried chillies, dark chocolate, chicken thighs, almonds'),D(85,'Baked Alaska',90,'sweet','sponge cake, ice cream, eggs, sugar'),D(88,'Peking duck',300,'poultry','whole duck, hoisin sauce, mandarin pancakes, cucumber'),
  D(90,'Wedding cake',480,'sweet','flour, butter, sugar, eggs'),D(92,'Dinner party for eight',300,'feast','a main to roast, seasonal vegetables, dessert, wine'),D(95,'A feast: three mains in one evening',360,'feast','three mains, sides, bread, wine'),
  D(99,'Your own recipe, written down and cooked twice',60,'feast','a notebook, your own ingredients')
];
// Which little icon a reagent gets, by the words in its name. First match wins; the sack is the fallback.
const KINDS=[
  ['seafood',['tuna','fish','prawn','salmon','haddock']],['eggs',['egg']],
  ['poultry',['chicken','duck']],['pork',['pork','bacon','chorizo','guanciale','prosciutto','sausage']],['beef',['beef','lamb','mince']],
  ['sauce',['sauce','paste','stock','oil','mayonnaise','gochujang','honey','wine','coconut','roux','miso','chocolate']],
  ['dairy',['milk','cheddar','parmesan','pecorino','mozzarella','feta','gruyère','butter','cream','yoghurt','cheese']],
  ['fruit',['banana','apple','lemon','lime','mango']],['herb',['basil','parsley','herbs','ginger','spring onion']],
  ['pasta',['pasta','spaghetti','noodle','macaroni','lasagne']],['grains',['rice','oats','masa']],
  ['bread',['bread','bun','tortilla','pita','pastry','sponge','pancakes','panko','flour','yeast','starter']],
  ['spice',['spice','salt','sugar','saffron','anise','cinnamon','flakes','cocoa','nuts','peanut','almond','chillies']],
  ['veg',['onion','garlic','pepper','potato','tomato','carrot','spinach','broccoli','cabbage','avocado','aubergine','courgette','mushroom','cucumber','sweetcorn','peas','beans','lentil','chickpea','tofu','vegetable','corn','sides']]
];
export function reagentKind(name){const n=name.toLowerCase();for(const [kind,words] of KINDS)if(words.some(w=>n.includes(w)))return kind;return 'sack';}
