# RoamIQ demo script

Target length **2:50**. Narration is 426 words at 150 words per minute.
Subtitles with matching timecodes are in `demo-subtitles.srt`, ready to import.

Every figure below is what the app actually produced on a live run of
**Mumbai to Goa, 10 to 14 November 2026, mid-range, interests: beaches, food,
heritage**. Use that exact input and the numbers on screen will match.

---

## Before you record

1. `npm run cache` and confirm 10 entries are fresh. If `google_news` has
   expired the run costs 1 credit, which is fine, but a cold cache costs 10.
2. Do one throwaway generation to warm everything, then record within **two
   hours**. After that `google_news` expires first, then flights and hotels at
   six hours.
3. Clear `localStorage` so **My Trips** starts empty, otherwise old trips
   appear in the history shot.
4. Have a second device ready with the camera open for the QR shot.
5. Record at 1920x1080. Browser at 100% zoom, bookmarks bar hidden.
6. Generation takes about **10 seconds warm**, 18 cold. Speed that shot up.

The rules allow speeding up footage. Run the form-filling and generation waits
at 2x. Keep the clustering distances, the drag, and the QR re-route at real
speed, since those are the moments worth seeing.

---

## Shot list

| Time | On screen | Do this | Narration |
|---|---|---|---|
| 0:00 | Landing page | Hover the hero, toggle the theme once light to dark | This is RoamIQ. It plans trips from live search data, not from a language model's memory. Every price and every place you are about to see is real. |
| 0:11 | About modal | Click **About the Project**, let the seven engine badges land, close it | Seven SerpApi engines power it. Google Flights, Hotels, Maps Directions, Local, News, Travel Explore, and Maps geocoding. The model never invents a price or a place name. |
| 0:23 | Form | Type Mumbai, then Goa, dates 10 to 14 Nov, mid-range, Flight, three interest tags, click **Build My Itinerary** | Mumbai to Goa. Five days in November, mid range budget, interests set to beaches, food and heritage. Budget is not cosmetic here. It changes how flights and hotels are ranked. |
| 0:35 | Generation | Let the chain-of-thought steps tick, globe paints early | Watch the order. Real data lands first. The globe, the route, the flights. Only then does the model start writing. It is describing facts that were already verified, not generating them. |
| 0:50 | Flight Options | Scroll to the flight cards, hover the cheapest | Live fares from Google Flights. IndiGo, thirteen thousand three hundred and thirty rupees, one hour fifteen, non stop, forty three kilograms of carbon. Price insights flag this route as currently high. |
| 1:05 | Hotel Suggestions | Scroll the hotel sidebar | Real hotels at tonight's rates. Rosetum Anjuna, two thousand and twenty eight rupees a night, rated four point four. Photos and star class come straight from Google Hotels. |
| 1:16 | Where You Are Staying | Click a different hotel, show the route change, then click **I am staying somewhere else** | Here is what matters. Where you sleep anchors every route. Pick a different hotel and the whole trip re clusters instantly, with no API call. Staying somewhere we did not suggest? Check in and it uses your real coordinates. |
| 1:30 | Day routes | Scroll slowly through days 1 to 4, let the distance badges read | Days are grouped by geography before the model sees them. Distances use the Haversine formula. Clustering is capacitated greedy. Seed each day with the furthest place, pull in its nearest neighbours, and stop when the next one is over twelve kilometres away. Within a day, nearest neighbour ordering, a greedy travelling salesman approximation. K means gives unbalanced days, so I rejected it. |
| 1:52 | Day 2 Walkable badge, then drag | Point at the badge, click **Make changes**, drag a stop up one place | Old Goa comes in at a six hundred metre spread, so it earns a Walkable badge. Drag any stop and every distance recomputes on drop. Pure arithmetic, no network call. |
| 2:04 | Approve and check in | **Approve this plan**, then **Get directions** opens Maps in a new tab, back, then **I'm here** then **Done, next stop** | Approve to save it. Get directions opens real Google Maps turn by turn. I am here, then Done, next stop, and it is struck off. The trip completes itself when the last stop is checked. |
| 2:16 | My Trips | Open **My Trips**, click a status chip, change the sort, click the heart, toggle **Show favourites**, open a plan and **Cancel this trip** with a reason | Every plan lands in history. Filter by status, sort five ways, heart the ones you loved and show favourites only. Cancel, and it asks why, then keeps the trip with the reason attached. That is the accountability trail. |
| 2:33 | QR share | Click the QR icon, scan with the second device, land on `/shared`, tap **Route from my location**, show day 1 differing | Share it as a QR code. The whole plan compresses into a six hundred character URL, so there is no database and no server. Your friend scans it, and because they re anchor on their own hotel, they get a completely different route from the same places. |

---

## Numbers that will be on screen

| Field | Value |
|---|---|
| Distance | 577 km, car 10 hr 56 min, flight 1h 15m |
| Cheapest flight | IndiGo, Rs 13,330, 1h 15m, non-stop, 43 kg CO2 |
| Price insight | high against a typical range of Rs 6,500 to 11,500 |
| Top hotel | Rosetum Anjuna, Rs 2,028 per night, rated 4.4, 4-star |
| Dining | Maka Zai Goan Restaurant, Mama Miso, Bonita |
| News | 4 advisories, top source travelandleisureasia.com |

### The four days

| Day | Title the model wrote | Route | Spread |
|---|---|---|---|
| 1 | Northern Coast Forts & Panoramic Views | Sinquerim Fort, Fort Aguada, Aguada rocky Beach, Reis Magos Fort, Dona Paula | 36.3 km, 6.6 km |
| 2 | Old Goa Heritage Trail | St. Augustine Tower, Basilica of Bom Jesus, Archaeological Museum | 40.7 km, **0.6 km, Walkable** |
| 3 | Eastern Countryside Caves & Cascades | Arvalem Caves, Harvalem Waterfalls | 61 km, **0.4 km, Walkable** |
| 4 | South-East Beach Leisure | Velsao Beach, Big Foot Goa | 78.7 km, 11.2 km |

Day 2 is the shot to linger on. Three genuine landmarks inside 600 metres,
picked by geography rather than by a model guessing.

---

## Technical claims you can defend

Say these, because the code backs them up.

- **Haversine formula** for great-circle distance between coordinates.
  `haversineKm()` in `lib/itinerary-planner.js`.
- **Capacitated greedy clustering** with a 12 km radius cap, then
  **agglomerative merging** of the closest leftover pockets. `clusterIntoDays()`.
- **Nearest-neighbour heuristic** for ordering stops inside a day, the standard
  cheap approximation to the travelling salesman problem. `orderWithinDay()`.
- **Min-max normalisation** with weighted scoring to rank flights and hotels per
  budget tier. Budget weights price, luxury weights duration and penalises
  layovers. `rankFlights()` and `rankHotels()`.
- **DEFLATE plus base64url** to pack a whole itinerary into a 632 character URL,
  which is why QR sharing needs no database. `lib/trip-share.js`.
- **TTL cache persisted to disk** so a warmed plan replays without spending
  search credits. `lib/serpapi.js`.

### Do not say k-means

It is not used, and the code comment says why: plain k-means produces
geographically tight clusters but wildly unbalanced days, one with nine stops
and another with one. If you want to mention it, the honest line is that you
evaluated k-means and rejected it for that reason, which is a stronger claim
than using it.

---

## The one line worth repeating

The model never generates a price, a rating or a place name. Those come from
SerpApi and are passed to the interface verbatim. The model writes prose around
facts that have already been verified, and it is not allowed to reorder the
route it is given.
