// /lib/serpapi.js
// Centralised SerpApi client for RoamIQ.
//
// Every live-data feature in the app funnels through here so that we get:
//   1. One place that knows how to talk to SerpApi (engines, params, errors)
//   2. A TTL cache — the free plan allows 250 searches/month, and a single
//      itinerary costs ~5-7 credits, so repeat lookups must not hit the wire
//   3. Consistent, already-shaped results that the UI can render directly
//
// The cache lives on globalThis so it survives Next.js dev hot-reloads.

import { getJson } from 'serpapi';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const API_KEY = process.env.SERPAPI_API_KEY;

if (!API_KEY) {
  console.warn('SERPAPI_API_KEY is not set. Live travel data will be unavailable.');
}

// --- TTL cache -------------------------------------------------------------
// Two layers: an in-process Map for speed, backed by JSON files on disk so a
// warmed cache survives server restarts. On the free plan a rebuilt cache costs
// real search credits, so persistence is worth the few lines.

const store = globalThis.__roamiqSerpCache || (globalThis.__roamiqSerpCache = new Map());

// Locally this sits in the project so a warmed cache survives restarts. On a
// serverless host the project directory is read-only, so fall back to the
// writable temp dir — the cache is then per-instance, which still helps.
const CACHE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'roamiq-serpapi-cache')
  : path.join(process.cwd(), '.serpapi-cache');

function cacheFile(key) {
  return path.join(CACHE_DIR, crypto.createHash('sha1').update(key).digest('hex') + '.json');
}

// Pull existing entries off disk once per process.
function hydrate() {
  if (globalThis.__roamiqSerpHydrated) return;
  globalThis.__roamiqSerpHydrated = true;

  try {
    if (!fs.existsSync(CACHE_DIR)) return;
    let loaded = 0;
    for (const file of fs.readdirSync(CACHE_DIR)) {
      if (!file.endsWith('.json')) continue;
      try {
        const entry = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
        if (entry?.key && entry.expires > Date.now()) {
          store.set(entry.key, { value: entry.value, expires: entry.expires });
          loaded++;
        }
      } catch {
        // A corrupt file just means one cache miss; ignore it.
      }
    }
    if (loaded) console.log(`[serpapi] restored ${loaded} cached searches from disk`);
  } catch (error) {
    console.warn('[serpapi] could not read cache directory:', error.message);
  }
}

function persist(key, entry, label) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(
      cacheFile(key),
      JSON.stringify({ key, label, value: entry.value, expires: entry.expires })
    );
  } catch (error) {
    // Caching is an optimisation; never fail a request over it.
    console.warn('[serpapi] could not write cache entry:', error.message);
  }
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// How long each kind of lookup stays fresh. Airport codes effectively never
// change; flight prices do, so they get a short window.
export const TTL = {
  AIRPORT: 30 * DAY,
  FLIGHTS: 6 * HOUR,
  HOTELS: 6 * HOUR,
  DIRECTIONS: 7 * DAY,
  PLACES: 3 * DAY,
  NEWS: 2 * HOUR,
  EXPLORE: 12 * HOUR,
  CURRENCY: 1 * HOUR,
};

function cacheKey(params) {
  const { api_key, ...rest } = params;
  return JSON.stringify(Object.keys(rest).sort().map((k) => [k, rest[k]]));
}

/**
 * Run a SerpApi search, served from cache when possible.
 * Returns `null` instead of throwing so a single failed engine never takes
 * down the whole itinerary — callers treat live data as best-effort.
 */
async function search(params, ttl) {
  if (!API_KEY) return null;

  hydrate();

  const key = cacheKey(params);
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    console.log(`[serpapi] cache HIT  ${params.engine} (0 credits)`);
    return hit.value;
  }

  try {
    console.log(`[serpapi] cache MISS ${params.engine} — spending 1 credit`);
    const json = await getJson({ ...params, api_key: API_KEY });

    if (json?.error) {
      console.warn(`[serpapi] ${params.engine} returned an error: ${json.error}`);
      return null;
    }

    const entry = { value: json, expires: Date.now() + ttl };
    store.set(key, entry);
    persist(key, entry, `${params.engine} ${params.q || params.departure_id || ''}`.trim());
    return json;
  } catch (error) {
    console.error(`[serpapi] ${params.engine} request failed:`, error.message);
    return null;
  }
}

// --- Helpers ---------------------------------------------------------------

function toISODate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatMinutes(mins) {
  if (!Number.isFinite(mins)) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

// --- Google Maps geocoding -------------------------------------------------

/**
 * Resolve a place name to coordinates for the 3D globe.
 *
 * `google_maps` with `type=search` returns a single `place_results` entry for
 * a city query, carrying gps_coordinates. Cached for 30 days — a city's
 * location does not move, so this costs one credit per city, ever.
 *
 * Returns { lat, lon } to match the shape the rest of the app expects.
 */
export async function geocodePlace(place) {
  if (!place) return null;

  const json = await search(
    { engine: 'google_maps', q: place, type: 'search', hl: 'en', gl: 'in' },
    TTL.AIRPORT
  );

  const coords =
    json?.place_results?.gps_coordinates || json?.local_results?.[0]?.gps_coordinates || null;

  if (!Number.isFinite(coords?.latitude) || !Number.isFinite(coords?.longitude)) return null;

  return { lat: coords.latitude, lon: coords.longitude };
}

// --- Google Flights Autocomplete ------------------------------------------

/**
 * Resolve a free-text place ("Mumbai", "Goa") to its primary IATA airport code.
 * Google Flights needs codes, users type city names.
 */
export async function resolveAirportCode(place) {
  if (!place) return null;

  const json = await search(
    { engine: 'google_flights_autocomplete', q: place },
    TTL.AIRPORT
  );

  const suggestions = json?.suggestions || [];
  for (const s of suggestions) {
    const airport = s.airports?.[0];
    if (airport?.id) {
      return { code: airport.id, airportName: airport.name, cityName: s.name };
    }
  }
  return null;
}

// --- Budget profiles -------------------------------------------------------

/**
 * How much each budget tier cares about money versus time and convenience.
 * `timeWeight` is the share of the ranking score driven by trip duration, so
 * the remainder is driven by price. `stopPenalty` is added per layover.
 *
 * Budget travellers take the slow cheap flight; luxury travellers pay to go
 * direct. Ranking happens on results already fetched, so tuning these costs
 * no extra searches.
 */
const BUDGET_PROFILE = {
  budget: { label: 'Budget', timeWeight: 0.15, stopPenalty: 0.03, hotelPriceWeight: 0.8 },
  'mid-range': { label: 'Mid-range', timeWeight: 0.4, stopPenalty: 0.1, hotelPriceWeight: 0.5 },
  luxury: { label: 'Luxury', timeWeight: 0.75, stopPenalty: 0.3, hotelPriceWeight: 0.15 },
};

function profileFor(budget) {
  return BUDGET_PROFILE[String(budget || '').toLowerCase()] || BUDGET_PROFILE['mid-range'];
}

/** Scale values to 0..1 so price (₹thousands) and duration (minutes) compare fairly. */
function normalise(values) {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return () => 0.5;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return () => 0;
  return (v) => (Number.isFinite(v) ? (v - min) / (max - min) : 1);
}

/** Order flights by how well they suit the budget tier. Exported for testing. */
export function rankFlights(flights, budget, limit = 6) {
  const profile = profileFor(budget);
  const priceScale = normalise(flights.map((f) => f.price));
  const timeScale = normalise(flights.map((f) => f.durationMinutes));

  return flights
    .map((f) => ({
      ...f,
      _score:
        priceScale(f.price) * (1 - profile.timeWeight) +
        timeScale(f.durationMinutes) * profile.timeWeight +
        f.stops * profile.stopPenalty,
    }))
    .sort((a, b) => a._score - b._score)
    .slice(0, limit)
    .map(({ _score, ...f }) => f);
}

/** Order hotels by how well they suit the budget tier. Exported for testing. */
export function rankHotels(hotels, budget, limit = 6) {
  const profile = profileFor(budget);
  const priceScale = normalise(hotels.map((h) => h.rateValue));
  const priceWeight = profile.hotelPriceWeight;

  return hotels
    .map((h) => ({
      ...h,
      _score:
        priceScale(h.rateValue) * priceWeight +
        (1 - (Number.isFinite(h.rating) ? h.rating : 3.5) / 5) * (1 - priceWeight),
    }))
    .sort((a, b) => a._score - b._score)
    .slice(0, limit)
    .map(({ _score, ...h }) => h);
}

// --- Google Flights --------------------------------------------------------

/**
 * Real flights with airline, price, duration, stops and carbon estimates.
 * Results are ranked against the traveller's stated budget.
 */
export async function searchFlights({ from, to, outboundDate, returnDate, budget = 'mid-range', currency = 'INR' }) {
  const [origin, destination] = await Promise.all([
    resolveAirportCode(from),
    resolveAirportCode(to),
  ]);

  if (!origin || !destination || origin.code === destination.code) return null;

  const outbound = toISODate(outboundDate);
  const inbound = toISODate(returnDate);
  if (!outbound) return null;

  const params = {
    engine: 'google_flights',
    departure_id: origin.code,
    arrival_id: destination.code,
    outbound_date: outbound,
    currency,
    hl: 'en',
    gl: 'in',
  };

  // type 1 = round trip (needs return_date), type 2 = one way
  if (inbound && inbound > outbound) {
    params.type = 1;
    params.return_date = inbound;
  } else {
    params.type = 2;
  }

  const json = await search(params, TTL.FLIGHTS);
  if (!json) return null;

  const raw = [...(json.best_flights || []), ...(json.other_flights || [])];
  if (raw.length === 0) return null;

  const mapped = raw.map((option) => {
    const legs = option.flights || [];
    const firstLeg = legs[0] || {};
    const lastLeg = legs[legs.length - 1] || {};

    return {
      airline: firstLeg.airline || 'Multiple airlines',
      airlineLogo: option.airline_logo || firstLeg.airline_logo || null,
      flightNumber: firstLeg.flight_number || null,
      price: Number.isFinite(option.price) ? option.price : null,
      currency,
      duration: formatMinutes(option.total_duration),
      durationMinutes: Number.isFinite(option.total_duration) ? option.total_duration : null,
      stops: Math.max(legs.length - 1, 0),
      travelClass: firstLeg.travel_class || null,
      departure: {
        code: firstLeg.departure_airport?.id || origin.code,
        time: firstLeg.departure_airport?.time || null,
      },
      arrival: {
        code: lastLeg.arrival_airport?.id || destination.code,
        time: lastLeg.arrival_airport?.time || null,
      },
      // Grams -> kg, so the UI can show a meaningful sustainability signal
      carbonKg: Number.isFinite(option.carbon_emissions?.this_flight)
        ? Math.round(option.carbon_emissions.this_flight / 1000)
        : null,
      carbonVsTypicalPercent: Number.isFinite(option.carbon_emissions?.difference_percent)
        ? option.carbon_emissions.difference_percent
        : null,
      layovers: legs.slice(0, -1).map((l) => l.arrival_airport?.id).filter(Boolean),
    };
  });

  // Rank against the traveller's budget, then keep the best six.
  const flights = rankFlights(mapped, budget);

  return {
    route: { from: origin, to: destination },
    budget: profileFor(budget).label,
    flights,
    priceInsights: json.price_insights
      ? {
          lowest: json.price_insights.lowest_price ?? null,
          typical: json.price_insights.typical_price_range ?? null,
          level: json.price_insights.price_level ?? null,
        }
      : null,
  };
}

// --- Google Hotels ---------------------------------------------------------

const BUDGET_QUERY = {
  luxury: '5 star luxury hotels',
  'mid-range': '4 star hotels',
  budget: 'budget hotels',
};

/**
 * Real hotels with nightly rates, star class, ratings, amenities and photos.
 * Replaces the previous three-tier `tbm=lcl` / maps / plain-search fallback chain.
 */
export async function searchHotels({ destination, checkIn, checkOut, budget = 'mid-range', currency = 'INR' }) {
  if (!destination) return null;

  const inDate = toISODate(checkIn);
  // Google Hotels requires check-out to be strictly after check-in.
  let outDate = toISODate(checkOut);
  if (!inDate) return null;
  if (!outDate || outDate <= inDate) {
    const next = new Date(inDate);
    next.setDate(next.getDate() + 1);
    outDate = toISODate(next);
  }

  const descriptor = BUDGET_QUERY[String(budget).toLowerCase()] || BUDGET_QUERY['mid-range'];

  const json = await search(
    {
      engine: 'google_hotels',
      q: `${descriptor} in ${destination}`,
      check_in_date: inDate,
      check_out_date: outDate,
      adults: 2,
      currency,
      gl: 'in',
      hl: 'en',
    },
    TTL.HOTELS
  );

  const properties = json?.properties || [];
  if (properties.length === 0) return [];

  const mapped = properties.map((p) => ({
    name: p.name || 'Hotel',
    description: p.description || '',
    link: p.link || null,
    photo: p.images?.[0]?.thumbnail || null,
    rating: Number.isFinite(p.overall_rating) ? p.overall_rating : null,
    reviews: Number.isFinite(p.reviews) ? p.reviews : null,
    hotelClass: p.hotel_class || null,
    ratePerNight: p.rate_per_night?.lowest || null,
    rateValue: Number.isFinite(p.rate_per_night?.extracted_lowest)
      ? p.rate_per_night.extracted_lowest
      : null,
    totalRate: p.total_rate?.lowest || null,
    deal: p.deal || null,
    amenities: (p.amenities || []).slice(0, 4),
    coords: p.gps_coordinates || null,
  }));

  // Budget travellers want the cheapest bed that is still decent; luxury
  // travellers want the best-rated property and barely weigh the rate.
  return rankHotels(mapped, budget);
}

// --- Google Maps Directions ------------------------------------------------

const TRAVEL_MODE = { driving: 0, cycling: 1, transit: 2, walking: 3 };

/**
 * Ground travel options. Replaces the TomTom routing calls, which also removes
 * a third-party dependency from the stack.
 */
export async function searchDirections({ from, to, mode = 'driving' }) {
  if (!from || !to) return null;

  const json = await search(
    {
      engine: 'google_maps_directions',
      start_addr: from,
      end_addr: to,
      travel_mode: TRAVEL_MODE[mode] ?? 0,
      hl: 'en',
      gl: 'in',
    },
    TTL.DIRECTIONS
  );

  const routes = json?.directions || [];
  if (routes.length === 0) return null;

  const best = routes[0];
  // `distance` comes back in metres.
  const km = Number.isFinite(best.distance) ? Math.round(best.distance / 1000) : null;

  return {
    mode,
    duration: best.formatted_duration || null,
    distanceKm: km,
    distance: km ? `${km.toLocaleString('en-IN')} km` : null,
    via: best.via || best.title || null,
  };
}

// --- Google Local ----------------------------------------------------------

/** Real, rated places (restaurants, cafés, attractions) at the destination. */
export async function searchLocalPlaces({ destination, query = 'best restaurants', limit = 6 }) {
  if (!destination) return [];

  const json = await search(
    {
      engine: 'google_local',
      q: `${query} in ${destination}`,
      location: `${destination}, India`,
      hl: 'en',
      gl: 'in',
    },
    TTL.PLACES
  );

  const results = json?.local_results || [];
  return results.slice(0, limit).map((r) => ({
    name: r.title || 'Place',
    type: r.type || null,
    rating: Number.isFinite(r.rating) ? r.rating : null,
    reviews: Number.isFinite(r.reviews) ? r.reviews : null,
    description: r.description || null,
    address: r.address || null,
    photo: r.thumbnail || null,
    price: r.price || null,
    link: r.links?.website || r.website || null,
  }));
}

// --- Google News -----------------------------------------------------------

/** Recent news for a destination — surfaced as a travel advisory panel. */
export async function searchTravelNews({ destination, limit = 4 }) {
  if (!destination) return [];

  const json = await search(
    { engine: 'google_news', q: `${destination} travel advisory tourism`, hl: 'en', gl: 'in' },
    TTL.NEWS
  );

  const results = json?.news_results || [];
  return results
    .filter((n) => n.title && n.link)
    .slice(0, limit)
    .map((n) => ({
      title: n.title,
      link: n.link,
      source: n.source?.name || null,
      sourceIcon: n.source?.icon || null,
      date: n.date || null,
      thumbnail: n.thumbnail || null,
    }));
}

// --- Google Travel Explore -------------------------------------------------

/**
 * Destination discovery from an origin airport, with live flight prices.
 * This is what powers the Trip Inspiration page.
 */
export async function exploreDestinations({ originCode = 'BOM', limit = 12, currency = 'INR' }) {
  const json = await search(
    { engine: 'google_travel_explore', departure_id: originCode, currency, hl: 'en', gl: 'in' },
    TTL.EXPLORE
  );

  const destinations = json?.destinations || [];
  return destinations
    .filter((d) => d.name && d.thumbnail)
    .slice(0, limit)
    .map((d) => ({
      name: d.name,
      country: d.country || null,
      image: d.thumbnail,
      airportCode: d.destination_airport?.code || null,
      flightPrice: Number.isFinite(d.flight_price) ? d.flight_price : null,
      currency,
      flightDuration: formatMinutes(d.flight_duration),
      stops: Number.isFinite(d.number_of_stops) ? d.number_of_stops : null,
      airline: d.airline || null,
      startDate: d.start_date || null,
      endDate: d.end_date || null,
      coords: d.gps_coordinates || null,
      link: d.link || null,
    }));
}

// --- Google Finance --------------------------------------------------------

/** Live FX rate, used when the trip crosses a currency boundary. */
export async function getExchangeRate(pair = 'INR-USD') {
  const json = await search({ engine: 'google_finance', q: pair, hl: 'en' }, TTL.CURRENCY);
  const price = json?.summary?.price;
  return Number.isFinite(price) ? { pair, rate: price } : null;
}

export const __cache = store;
