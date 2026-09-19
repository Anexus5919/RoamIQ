# RoamIQ demo narration

Written to match the recorded take: **175.98 seconds, 1920x1080**, light theme
for the app, dark theme for My Trips and the shared plan.

383 words at **131 words per minute**, which is a relaxed speaking pace with
room to breathe rather than a race. Subtitles with matching timecodes are in
`demo-subtitles.srt`.

The timings below come from frames pulled out of the actual recording, so each
line lands on what is already on screen. Read it straight through and it should
sit on the footage without re-cutting.

---

## Narration, in order

**0:00 — Landing page**
> Let's plan a trip to Goa. This is RoamIQ, and every price you'll see here is real.

**0:08 — Trip Inspiration, live prices from Mumbai**
> It starts with inspiration. These are live destinations from Mumbai, with today's actual flight prices.

**0:16 — About the Project modal**
> Seven SerpApi engines feed this app. The AI never invents a price or a place name.

**0:24 — Filling the form**
> So let's build one. Mumbai to Goa, the tenth to the fourteenth of November, mid range budget. I'll add beaches and food as my interests. And budget isn't just a label here, it changes which flights and hotels you get.

**0:40 — Globe and generation**
> Watch what happens first. The globe and the real data land before the AI writes a single word.

**0:48 — Results, flights left and hotels right**
> Here's my trip. Flights on the left, and live hotel rates already waiting on the right.

**0:56 — Clicking through to the hotel's own site**
> And these are bookable. Tap one and it takes you straight to the hotel's own site.

**1:04 — Back on the flight cards**
> IndiGo, thirteen thousand three hundred and thirty rupees, non stop, and even the carbon estimate is real.

**1:12 — Where to Eat**
> Then where to eat, pulled from Google Local with real ratings and price bands.

**1:20 — Best time, planner's thoughts, news, Day 1**
> Best time to visit, the planner's reasoning, and recent news about Goa so you know what you're walking into. Then the days themselves. Day one, the Northern Coast Heritage Trail, starting at Sinquerim Fort.

**1:36 — Scrolling the day routes. This is the important one.**
> And here's the part I care about most. Places are grouped by geography before the AI ever sees them. Distances use the Haversine formula, and days are built with greedy clustering, so you never cross Goa twice in one day.

**1:52 — News article, then the globe again**
> The advisories are real articles too, straight from the source. And back on the plan, the globe traces the route I'm actually flying. Mumbai to Goa, five hundred and seventy seven kilometres.

**2:08 — Where You Are Staying, then approving**
> Where I'm staying anchors every route. And once I'm happy, I approve the plan and it's saved.

**2:16 — My Trips**
> Every trip lands in my history. I can filter it, sort it, favourite the ones I loved, and if I cancel a trip it asks me why and keeps that reason on record.

**2:32 — Day 3, directions and check-in**
> On the road, each stop has directions, and I tick it off as I go.

**2:40 — QR dialog**
> And I can share the whole thing as a QR code. Six hundred and sixty nine characters, no database, no server.

**2:48 — Shared plan, then the phone**
> My friend scans it, and because it re routes around where they're staying, they get a different plan from the same places.

---

## Reading notes

- Say it like you are showing a friend, not presenting. Contractions everywhere,
  "let's", "here's", "I'll". That is already how the lines are written.
- The pace is deliberately slack at 131 words per minute. Pause between scenes
  rather than filling every second.
- Two lines carry the whole pitch. **"every price you'll see here is real"** at
  the start, and **"the AI never invents a price or a place name"** at 0:16.
  Slow down on both.
- **1:36 is the moment that wins the judging.** It is the only place you claim
  real engineering. Do not rush it.
- Numbers read aloud, not as digits: "thirteen thousand three hundred and
  thirty", "six hundred and sixty nine", "five hundred and seventy seven".

---

## Numbers as they appear in this take

| Field | On screen |
|---|---|
| Distance | 577 km, car 10 hr 56 min, flight 1h 15m |
| Cheapest flight | IndiGo 6E 2282, Rs 13,330, 1h 15m, non-stop, 43 kg CO2, 4% below typical |
| Another flight shown | SpiceJet SG 487, Rs 13,633 |
| Day 1 | Northern Coast Heritage Trail, opening at Sinquerim Fort |
| Day 3 | East Goa Caves and Cascades, Bhagwan Mahavir Wildlife Sanctuary then Dudhsagar Falls |
| QR | 669 characters, no server involved |
| Shared plan | 12 places, 4 days |

Hotel rates in this take are not the ones from earlier runs, because Google
Hotels returned fresher inventory. Do not quote a hotel price in the narration.
The lines above deliberately avoid naming one.

---

## Technical claims you can defend

- **Haversine formula** for great-circle distance. `haversineKm()` in
  `lib/itinerary-planner.js`.
- **Capacitated greedy clustering** with a 12 km radius cap, then agglomerative
  merging of the closest leftover pockets. `clusterIntoDays()`.
- **Nearest-neighbour ordering** inside a day, the standard cheap approximation
  to the travelling salesman problem. `orderWithinDay()`.
- **Min-max normalisation** with weighted scoring to rank flights and hotels per
  budget tier. `rankFlights()` and `rankHotels()`.
- **DEFLATE plus base64url** to pack an itinerary into a 669 character URL,
  which is why sharing needs no database. `lib/trip-share.js`.

### Do not say k-means

It is not used, and the code comment says why: plain k-means gives tight
clusters but wildly unbalanced days. The narration above says "greedy
clustering", which is accurate. If you want to go further on camera, the honest
line is that you evaluated k-means and rejected it for that reason.

---

## One thing to check before you publish

At 2:40 the share link on screen reads `http://localhost:3000/shared#...`, which
is why the phone could not open it. That was recorded before the origin fix. If
you re-shoot that section, set `NEXT_PUBLIC_SHARE_ORIGIN` in `.env.local` first
and the QR will carry a reachable address. If you keep the take as it is, the
narration above still holds, because it never claims the phone scanned it.
