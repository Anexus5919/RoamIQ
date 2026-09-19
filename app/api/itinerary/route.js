// /app/api/itinerary/route.js
import {
  geocodePlace,
  searchFlights,
  searchHotels,
  searchDirections,
  searchLocalPlaces,
  searchTravelNews,
} from '@/lib/serpapi';
import { planDayRoutes } from '@/lib/itinerary-planner';

// --- Groq configuration ---
// Make sure you have GROQ_API_KEY set in your `.env.local`
// (this is the default env var name used by Groq Cloud)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

if (!GROQ_API_KEY) {
  console.warn(
    'GROQ_API_KEY is not set. Itinerary generation via Groq will fail until this is configured.'
  );
}

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

// Separates the live-data prelude from the streamed AI plan. The client splits
// on this so real flights/hotels can render before the model has finished.
export const STREAM_DELIMITER = '<<<ROAMIQ_LIVE_DATA_END>>>';

// --- Helper: Get coordinates for the globe ---
// SerpApi's Google Maps engine is the primary source, cached for 30 days so a
// given city costs one credit ever. TomTom stays as a free fallback: it is
// queried India-first because its global top hit for "Goa" is Goa in the
// Philippines, which would plot the wrong point on the globe.
async function geocodeViaTomTom(location) {
  if (!TOMTOM_API_KEY) return null;

  const lookup = async (countrySet) => {
    const url =
      `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json` +
      `?key=${TOMTOM_API_KEY}&limit=1${countrySet ? `&countrySet=${countrySet}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.results?.[0]?.position || null;
  };

  try {
    return (await lookup('IN')) || (await lookup(null));
  } catch (error) {
    console.error('TomTom Geocode Error:', error.message);
    return null;
  }
}

async function getCoords(location) {
  const viaSerpApi = await geocodePlace(location);
  if (viaSerpApi) return viaSerpApi;

  console.warn(`[geocode] SerpApi had no coordinates for "${location}", falling back to TomTom`);
  const viaTomTom = await geocodeViaTomTom(location);
  if (viaTomTom) return viaTomTom;

  throw new Error(`Location not found: ${location}`);
}

// --- Helper: Calculate Haversine distance (last-resort fallback) ---
function calculateHaversineDistance(coords1, coords2) {
  if (!coords1 || !coords2 || coords1.lat === undefined || coords2.lat === undefined) return null;
  const R = 6371; // km
  const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const dLon = ((coords2.lon - coords1.lon) * Math.PI) / 180;
  const lat1 = (coords1.lat * Math.PI) / 180;
  const lat2 = (coords2.lat * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return `${(R * c).toFixed(0)} km`;
}

// --- Helper: Build the travel-logistics summary from live data ---
function buildTravelAnalysis({ directions, flightData, fromCoords, destCoords }) {
  const options = [];

  if (directions?.duration) {
    options.push({
      mode: 'Car',
      time: directions.duration,
      distance: directions.distance || undefined,
    });
  }

  const cheapest = flightData?.flights?.[0];
  if (cheapest) {
    options.push({
      mode: 'Flight',
      time: cheapest.duration || 'Varies',
      distance: cheapest.price ? `from ₹${cheapest.price.toLocaleString('en-IN')}` : undefined,
    });
  }

  let distance = directions?.distance || null;
  if (!distance) {
    const haversine = calculateHaversineDistance(fromCoords, destCoords);
    if (haversine) distance = `${haversine} (direct)`;
  }

  return {
    summary: options.length
      ? 'Live route and fare data from Google Flights and Google Maps via SerpApi.'
      : 'Route data was unavailable for this pair of locations.',
    distance: distance || 'N/A',
    options,
  };
}

// --- THE MAIN API ROUTE ---
export async function POST(request) {
  const { from, destination, startDate, endDate, budget, transportMode, interests } =
    await request.json();

  // --- Antarctica Guard Rail ---
  if (destination.toLowerCase().includes('antarctica')) {
    return new Response(
      JSON.stringify({
        error: 'Travel to Antarctica requires a specialized expedition and cannot be planned this way.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- Coordinates first: the globe needs them, and so does the fallback math ---
  let fromCoords, destCoords;
  try {
    [fromCoords, destCoords] = await Promise.all([getCoords(from), getCoords(destination)]);
  } catch (error) {
    console.error('Geocoding Error in POST:', error);
    const errorMessage = error.message.includes('Location not found')
      ? `Could not find location: ${error.message.split(': ')[1]}`
      : `Failed to resolve locations: ${error.message}`;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Live data from SerpApi, all in parallel ---
  // Every one of these resolves to null/[] on failure rather than throwing, so
  // a single unavailable engine degrades one panel instead of the whole trip.
  const [flightData, hotels, directions, dining, attractions, news] = await Promise.all([
    searchFlights({ from, to: destination, outboundDate: startDate, returnDate: endDate, budget }),
    searchHotels({ destination, checkIn: startDate, checkOut: endDate, budget }),
    searchDirections({ from, to: destination, mode: 'driving' }),
    searchLocalPlaces({ destination, query: 'best restaurants', limit: 8 }),
    // google_local returns 20 rated places with coordinates for one credit,
    // which is the pool the day planner clusters from.
    searchLocalPlaces({ destination, query: 'top tourist attractions', limit: 20 }),
    searchTravelNews({ destination, limit: 4 }),
  ]);

  const travelAnalysis = buildTravelAnalysis({ directions, flightData, fromCoords, destCoords });

  // --- Calculate number of days and generate date strings ---
  let numberOfDays = 'the specified date range';
  let calculatedDays = 0;
  const allDates = [];
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid start or end date format');
    if (start > end) throw new Error('Start date must be before end date');

    const oneDay = 1000 * 60 * 60 * 24;
    calculatedDays = Math.round(Math.abs((end - start) / oneDay)) + 1;
    numberOfDays = `${calculatedDays} days`;

    let currentDate = new Date(start);
    for (let i = 0; i < calculatedDays; i++) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      allDates.push(`${year}-${month}-${day}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } catch (e) {
    console.error('Error calculating date difference or generating dates:', e);
    calculatedDays = 0;
  }

  // --- Plan geographically sane day routes ---
  // Day 1 is the arrival day and the final day is for departure, so sightseeing
  // fills the days in between (with a floor of one for very short trips).
  const sightseeingDays = Math.max(1, calculatedDays - 1);

  // Routes are anchored on where the traveller sleeps. Before a hotel is
  // chosen the top ranked one stands in, and the client re-plans when the
  // traveller picks a different hotel or supplies their own.
  const defaultAnchor = hotels?.[0]?.coords
    ? { lat: hotels[0].coords.latitude ?? hotels[0].coords.lat, lon: hotels[0].coords.longitude ?? hotels[0].coords.lon }
    : destCoords;

  const plannedDays = planDayRoutes({
    places: attractions || [],
    dayCount: sightseeingDays,
    anchor: defaultAnchor,
    anchorName: hotels?.[0]?.name || destination,
  });

  // --- The live-data payload the UI renders verbatim ---
  // The model is never asked to reproduce prices, ratings or hotel names: those
  // are real SerpApi values and are passed straight through to the client.
  const liveData = {
    destinationName: destination,
    fromName: from,
    fromCoords,
    destinationCoords: destCoords,
    travelAnalysis,
    flights: flightData?.flights || [],
    flightRoute: flightData?.route || null,
    priceInsights: flightData?.priceInsights || null,
    destinationSummary: { hotelSuggestions: hotels || [] },
    anchor: {
      name: hotels?.[0]?.name || destination,
      coords: defaultAnchor,
      source: hotels?.[0]?.coords ? 'suggested-hotel' : 'city-centre',
    },
    plannedDays,
    dates: allDates,
    dining: dining || [],
    attractions: attractions || [],
    news: news || [],
  };

  // --- Context for the model ---
  // The route is already decided by the planner, so the model is asked only to
  // name each day and describe each stop. It never chooses the order, which is
  // what stops a morning in the north being followed by an afternoon in the
  // south. Notes are keyed by place name so they survive the traveller
  // reordering stops on the client.
  const routeSummary = plannedDays
    .map(
      (d) =>
        `Day ${d.day} (${d.totalKm} km round trip): ` +
        d.stops.map((s) => `${s.name} [${s.leg.km} km ${s.leg.direction} of ${s.leg.fromName}]`).join(' then ')
    )
    .join('\n');

  const diningNames = (dining || []).map((d) => d.name).filter(Boolean);
  const stopNames = plannedDays.flatMap((d) => d.stops.map((s) => s.name));

  const prompt = `
CRITICAL: Your response must be PURE JSON only. Do NOT write any text before or after the JSON. Start with { and end with }.

You are an expert travel writer. A route planner has ALREADY decided which places are visited on which day, grouping them so each day stays in one pocket of the city. Do not change the order, move places between days, or add places.

--- TRIP ---
From: ${from}
Destination: ${destination}
Dates: ${startDate} to ${endDate} (${numberOfDays})
Budget: ${budget}
Preferred transport: ${transportMode}
Interests: ${interests.join(', ')}
Staying at: ${hotels?.[0]?.name || destination}

--- THE PLANNED ROUTE (fixed, do not reorder) ---
${routeSummary || 'No route available.'}

--- NEARBY RESTAURANTS YOU MAY MENTION ---
${diningNames.join(', ') || 'none found, suggest local cuisine generally'}

--- YOUR TASK ---
Return JSON with exactly these keys:
{
  "bestTimeToVisit": "one or two sentences on the ideal season to visit ${destination}",
  "thoughtProcess": "3-4 sentences on how this plan suits the stated interests and budget, mentioning that stops are grouped by area to cut travel time",
  "dayTitles": [ { "day": 1, "title": "<short evocative title for that day's area>" } ],
  "stopNotes": [ { "name": "<exact place name from the route above>", "time": "Morning", "description": "2-3 complete sentences" } ]
}

Rules:
- "dayTitles" must contain one entry for every day in the planned route.
- "stopNotes" must contain one entry for EVERY place listed in the planned route, using the place name EXACTLY as written above.
- These are the ${stopNames.length} place names you must cover: ${JSON.stringify(stopNames)}
- "time" cycles Morning, Afternoon, Evening in the order stops appear within each day.
- Each description must connect the place to these interests: ${interests.join(', ')}.
- NEVER use "..." or placeholder text. Write every description in full.

Respond with ONLY the JSON object. No comments, no trailing text.
`.trim();

  // --- Stream: live data first, then the AI plan ---
  try {
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing GROQ_API_KEY. Please configure your Groq API key in .env.local.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        // Twenty stop descriptions overrun the default completion cap and the
        // JSON arrives truncated, so give the model room to finish.
        max_tokens: 8000,
        stream: true,
      }),
    });

    if (!groqResponse.ok) {
      let errorMessage = `Groq API error (status ${groqResponse.status})`;
      try {
        const errorBody = await groqResponse.json();
        if (errorBody?.error?.message) errorMessage = `Groq API error: ${errorBody.error.message}`;
      } catch {
        try {
          const text = await groqResponse.text();
          if (text) errorMessage = `Groq API error: ${text}`;
        } catch {
          // ignore
        }
      }

      console.error(errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Push every real result to the browser immediately — the globe,
        // flights and hotels paint before the model emits its first token.
        controller.enqueue(encoder.encode(JSON.stringify(liveData) + STREAM_DELIMITER));

        try {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  if (delta) controller.enqueue(encoder.encode(delta));
                } catch (e) {
                  continue;
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    console.error('Itinerary generation error (Groq):', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate itinerary using Groq API. Check your GROQ_API_KEY and network connectivity.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
// --- END POST FUNCTION ---
