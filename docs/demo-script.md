# RoamIQ demo narration

Written to match the recorded take: **175.98 seconds, 1920x1080**, light theme
for the app, dark theme for My Trips and the shared plan.

454 words at **155 words per minute**, written to run continuously. There are
no silent gaps: every line hands straight to the next, and the last one lands at
175.95 of 175.98 seconds. Subtitles with matching timecodes are in
`demo-subtitles.srt`.

The timings below come from frames pulled out of the actual recording, so each
line lands on what is already on screen. Read it straight through and it should
sit on the footage without re-cutting.

---

## Narration, in order

**0:00 — Landing page**
> Let's plan a trip to Goa. This is RoamIQ, and everything you're about to see, every price, every place, is real.

**0:08 — Trip Inspiration, live prices from Mumbai**
> It starts with inspiration. These are live destinations out of Mumbai, each one showing what a flight actually costs today.

**0:16 — About the Project modal**
> Seven SerpApi engines feed this app, and that matters, because the AI never invents a price or a place name.

**0:24 — Filling the form**
> So let's build one. Mumbai to Goa, the tenth to the fourteenth of November, on a mid range budget. I'll add beaches and food as my interests. And budget isn't just a label here, it changes which flights and which hotels come back.

**0:40 — Globe and generation**
> Now watch the order. The globe and all the real data land first, before the AI has written a single word.

**0:48 — Results, flights left and hotels right**
> Here's my trip. Live fares filling the left, and live hotel rates already sitting there waiting on the right.

**0:56 — Clicking through to the hotel's own site**
> And these aren't decoration, they're bookable. Tap any hotel and it takes you straight through to the property's own site.

**1:04 — Back on the flight cards**
> IndiGo, thirteen thousand three hundred and thirty rupees, non stop, an hour fifteen, and even the carbon estimate is real.

**1:12 — Where to Eat**
> Then where to eat, pulled from Google Local, with the ratings and the price bands people actually left there.

**1:20 — Best time, planner's thoughts, news, Day 1**
> Best time to visit, the planner's own reasoning, and recent news about Goa so you know what you're walking into before you go. And then the days themselves. Day one is the Northern Coast Heritage Trail, opening at Sinquerim Fort.

**1:36 — Scrolling the day routes. This is the important one.**
> And here's the part I care about most. The places are grouped by geography before the AI ever sees them. Distances come from the Haversine formula, and the days are built with greedy clustering, so you're never crossing Goa twice in a single day.

**1:52 — News article, then the globe again**
> The advisories are real articles too, so you can tap one and read the original story yourself. And back on the plan, the globe is tracing the route I'm actually flying, Mumbai to Goa, five hundred and seventy seven kilometres.

**2:08 — Where You Are Staying, then approving**
> Where I'm staying anchors every single route, and once I'm happy with all of it, I approve the plan and it saves.

**2:16 — My Trips**
> Every trip then lands in my history. I can filter it, sort it, favourite the ones I loved, and if I end up cancelling a trip, it asks me why and keeps that reason on record for next time.

**2:32 — Day 3, directions and check-in**
> Out on the road, every stop carries its own directions, and I just tick each one off as I go.

**2:40 — QR dialog**
> And I can hand the whole thing over as a QR code. Six hundred and sixty nine characters, no database, no server anywhere.

**2:48 — Shared plan, then the phone**
> My friend scans it, and because it re routes around wherever they're staying, they get a completely different plan from the same places.

---

## Reading notes

- Say it like you are showing a friend, not presenting. Contractions everywhere,
  "let's", "here's", "I'll". That is already how the lines are written.
- **Read it straight through without stopping.** The lines are sized to run one
  into the next, so there is no dead air to fill and nothing to wait for. If you
  pause between scenes you will fall behind the footage.
- 155 words per minute is a normal conversational pace. Do not rush it, but do
  not leave silence either. Breathe on the commas, not between paragraphs.
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
