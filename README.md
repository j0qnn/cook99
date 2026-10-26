# Cook99

Your cooking book: an airy, minimal page of the dishes you actually cook. Cook at home, level Cooking from 1 to 99, and
watch real money stay in your purse. No account, no server process, no dependencies; everything stays in the
browser. `npm start` serves it on http://localhost:4175, `npm run share` on the local network for a phone,
`npm run check` runs syntax checks and the 12 model tests.

History: the pixel savings app (`../cook99-savings`) guessed the money; the clean app (`../archive/cook99-clean`)
measured it. This version (2026-10-02) keeps the measured money and the data format and puts it in the cooking ## The page

Typography and space carry it: no icons, textures or cards. Geist for the interface, Instrument Serif for
the two big numbers, warm off-white (dark at night, following the system) and one tomato accent.

- **Top.** *Cook99*, then *Week* (with the number of planned dinners) and *Ledger*.
- **Hero.** The level as one large serif numeral, "Cooking · 16 / 36 xp" beside it, and this month's kept money on
  the right (tap it for the Ledger; it turns tomato when negative). Under it a 2px progress line: ink normally,
  tomato while a cooking streak is on. That colour is the only sign of the streak.
- **Tabs.** All, Ready (every ingredient in), Quick (ready and twenty minutes or less), This week.
- **The list.** Only dishes you have cooked, most cooked first: name, a tomato dot when everything is in, "this
  week" when planned, times cooked. Tap a dish and it opens in place: XP, minutes, last cooked, its ingredients as
  pills (tap to strike one out when it runs out), *Cook again*, *Plan for this week*, *Edit*.
- **Dock.** A dark *Cook* pill and a light *Ordered* pill. Cook opens a sheet: search your dishes (Yours) and the
  91-dish catalogue (Ideas); a name the book has not seen is added on the spot with its kind, effort and ingredients.
  Sheets rise from the bottom on a phone.

## The rules

- **No unlocking, no recipe levels.** Every dish is open from the start. Cooking one writes it into the book.
- **XP.** Comes from the meal, not the dish: every breakfast earns 50, every lunch 70, every dinner 100 (`MEALS`),
  whatever was cooked, so nothing pushes you toward fancy dishes. Dinner is worth most because it is the meal that
  replaces a takeaway. Up to three meals a day earn XP. The cook sheet has a Breakfast / Lunch / Dinner switch that
  defaults by time of day; *Cook again* uses the time of day. Older records' meals count as dinners. The level table
  is the real OSRS one divided by 50, with a floor under it so early levels cost real cooking
  (`FLOOR_XP` × (level − 1)^1.3): level 2 at 150 XP (two meals), 10 at 2,610, 30 at 11,946. The floor hands over to
  the OSRS table at level 82; 92 is still half way and 99 is 260,689 XP.
- **Level-up.** Borrowed from the OSRS skill-up, silently: the progress line runs to the end while the page holds the
  old number, then the page clears to one large numeral rolling from the old level to the new, with fireworks, a
  tomato line drawn under it, and a short line in Cook99's own voice ("Well cooked.", "Another level, no delivery
  fee." and others), "Cooking 12 · 341 xp to 13" and a blue "Tap to carry on". Milestones at 10, 25, 50, 75 and 92
  add a line of their own. No sound; a short haptic on iPhone. Settings has *Preview the level-up*.
- **Streak.** From the third cooking day in a row meals earn half again; one day off is forgiven, two end it.
  Shown only as the bar's colour, and folded into the XP number of each meal.
- **Ingredients and the week.** Up to seven dinners planned for the week (cleared on Monday). This week shows the
  rhythm and what to buy: every ingredient of the planned dishes that is struck out, with the dishes needing it.
- **Money.** Measured, never guessed. Your usual month of food spending, from real history: delivery (and how many
  orders) plus groceries. From then on you log what you actually spend through *Spent*, as *Takeaway* (optionally the
  week's one planned treat) or *Groceries* (the receipt, the shop, and how long it lasts: a few days to a month).
  A grocery shop is spread evenly over the days it lasts (`groceriesBetween`), so one big shop on the 2nd does not
  skew the month. Kept = your usual food spending pro-rated to today, minus takeaway and groceries spent. Groceries
  also give a real **cost per home meal** (groceries so far this month ÷ dinners cooked), shown in the Ledger next to
  the average takeaway. Older records start with a grocery baseline of zero, which understates what you keep, never
  overstates it. The week sheet's *Log this shop* opens the grocery form straight from the shopping list. The Ledger
  shows the month, the total, weeks (with groceries and unplanned orders), months and entries.

eal*.

## Pictures

One colour language everywhere, validated for colour-blind separation in light and dark: green (`--home`) for cooked
at home and groceries, tomato (`--out`) for takeaway, grey for nothing. `charts.js` draws them as SVG, no library:

- **The month** (home page): a calendar seen slightly from above, one tile per day, one thin slab per meal stacked on
  it, green when cooked, tomato for a takeaway, a small gap between slabs so they can be counted. Days ahead are
  outlined, today has a dark edge. Tap a day for what was cooked and ordered; drag sideways to turn it a little.
- **Spending** (Ledger): one slab for this month's food spending against your usual by now. The outline is the usual,
  the green and tomato parts are groceries and takeaway, the empty rest is what you kept; the legend carries the values.
- **Weeks** (Ledger): the last weeks as slim stacked columns in the same colours, tap one for its numbers; the list
  below keeps every value as text.

The streak still shows only as the level line's colour, now green like everything else about cooking.

## Type

Geist and Instrument Serif, both under the SIL Open Font License (`assets/OFL-*.txt`). There are no food icons: they
never looked right and could not cover every cuisine. Earlier looks (pixel, WoW cooking book, gothic, painted icons,
the three-direction mockups) are in `../archive`.

## On iPhone

`ios/` holds a native iPhone app that bundles these same files (offline, its own icon, data in a file the app owns,
haptics, share-sheet backups). See `ios/README.md` to install it on your own phone from Xcode. The web version also
installs to a Home Screen once hosted over HTTPS (`sw.js` keeps it working offline, `manifest.webmanifest` and the PNG
icons make it a full-screen app).

## Data

Same `cook99.v2` key as the clean version; older saves load as they are. Shelf staples from the clean version become
the ingredients of your own recipes. Export and import in Settings.
