// /app/api/itinerary/route.js
import { getJson } from 'serpapi';

// --- Groq configuration ---
// Make sure you have GROQ_API_KEY set in your `.env.local`
// (this is the default env var name used by Groq Cloud)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

if (!GROQ_API_KEY) {
  console.warn(
    'GROQ_API_KEY is not set. Itinerary generation via Groq will fail until this is configured.'
  );
}

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

// --- Helper: Format seconds to hours/minutes ---
function formatTravelTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} hours ${minutes} mins`;
}

// --- Helper: Get coordinates from TomTom ---
async function getCoords(location) {
  if (!TOMTOM_API_KEY) throw new Error('TomTom API key is missing');
  const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json?key=${TOMTOM_API_KEY}&limit=1`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to geocode location: ${location}`);
    const data = await response.json();
    if (!data.results || data.results.length === 0) throw new Error(`Location not found: ${location}`);
    return data.results[0].position; // { lat, lon }
  } catch (error) {
    console.error('TomTom Geocode Error:', error.message);
    throw error;
  }
}

// --- Helper: Calculate Haversine distance ---
function calculateHaversineDistance(coords1, coords2) {
  if (!coords1 || !coords2 || coords1.lat === undefined || coords2.lat === undefined) return null;
  const R = 6371; // km
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLon = (coords2.lon - coords1.lon) * Math.PI / 180;
  const lat1 = coords1.lat * Math.PI / 180;
  const lat2 = coords2.lat * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return `${distance.toFixed(0)} km`;
}

// --- Helper: Fetch REAL travel data ---
async function getTravelData(from, destination, preFetchedFromCoords, preFetchedDestCoords) {
  const options = [];
  let overallDistance = "N/A";
  let fromCoords = preFetchedFromCoords;
  let destCoords = preFetchedDestCoords;

  // 1. Ensure Coords (fetch if needed)
  try {
      if (!fromCoords || !destCoords) {
          console.warn("Coordinates not pre-fetched for getTravelData, fetching now...");
          [fromCoords, destCoords] = await Promise.all([ getCoords(from), getCoords(destination) ]);
      }
  } catch (error) {
      console.error("Coordinate Fetching Error within getTravelData:", error.message);
      // Try SerpApi distance as only resort if coords fail here
      try {
          if (SERPAPI_API_KEY) {
              const distanceSearch = await getJson({ api_key: SERPAPI_API_KEY, q: `distance from ${from} to ${destination}`, gl: 'us', hl: 'en' });
              if (distanceSearch.answer_box?.answer) {
                   overallDistance = distanceSearch.answer_box.answer;
              }
          }
      } catch (searchError) {
          console.error("SerpApi distance fallback failed:", searchError.message);
      }
      // Flight info might still work
      try {
         if (SERPAPI_API_KEY) {
           const flightSearch = await getJson({ api_key: SERPAPI_API_KEY, q: `flight time from ${from} to ${destination}`, gl: 'us', hl: 'en' });
           if (flightSearch.answer_box?.duration) options.push({ mode: 'Flight', time: flightSearch.answer_box.duration });
           else if (flightSearch.answer_box?.snippet) options.push({ mode: 'Flight', time: flightSearch.answer_box.snippet });
         }
      } catch (flightError) { console.error("SerpApi flight fallback failed:", flightError.message); }
      return { options, distance: overallDistance }; // Return early
  }

  // 2. TomTom routing
  try {
    if (fromCoords && destCoords) {
        const coordsString = `${fromCoords.lat},${fromCoords.lon}:${destCoords.lat},${destCoords.lon}`;
        const carUrl = `https://api.tomtom.com/routing/1/calculateRoute/${coordsString}/json?key=${TOMTOM_API_KEY}&travelMode=car`;
        const busUrl = `https://api.tomtom.com/routing/1/calculateRoute/${coordsString}/json?key=${TOMTOM_API_KEY}&travelMode=bus`;

        const [carResponse, busResponse] = await Promise.allSettled([ fetch(carUrl), fetch(busUrl) ]);

        if (carResponse.status === 'fulfilled' && carResponse.value.ok) {
          const data = await carResponse.value.json();
          if (data.routes?.length > 0) {
            const route = data.routes[0].summary;
            const distanceKm = `${(route.lengthInMeters / 1000).toFixed(0)} km`;
            options.push({ mode: 'Car', time: formatTravelTime(route.travelTimeInSeconds), distance: distanceKm });
            overallDistance = distanceKm;
          }
        }

        if (busResponse.status === 'fulfilled' && busResponse.value.ok) {
          const data = await busResponse.value.json();
          if (data.routes?.length > 0) {
            const route = data.routes[0].summary;
            const distanceKm = `${(route.lengthInMeters / 1000).toFixed(0)} km`;
            options.push({ mode: 'Bus/Train (Public)', time: formatTravelTime(route.travelTimeInSeconds), distance: distanceKm });
            if (overallDistance === "N/A") overallDistance = distanceKm;
          }
        }
    }
  } catch (error) { console.error("TomTom Routing Error:", error.message); }

  // 3. SerpApi Flight Info
  try {
    if (!SERPAPI_API_KEY) throw new Error('SerpApi key is missing');
    const flightQuery = `flight time from ${from} to ${destination}`;
    const flightSearch = await getJson({ api_key: SERPAPI_API_KEY, q: flightQuery, gl: 'us', hl: 'en' });

    if (flightSearch.answer_box?.duration) options.push({ mode: 'Flight', time: flightSearch.answer_box.duration });
    else if (flightSearch.answer_box?.snippet) options.push({ mode: 'Flight', time: flightSearch.answer_box.snippet });
    else if (options.length === 0 && fromCoords && destCoords) { // Guess flight needed
         const distKmStr = calculateHaversineDistance(fromCoords, destCoords);
         if (distKmStr && parseInt(distKmStr.split(' ')[0], 10) > 1000) {
            options.push({ mode: 'Flight', time: "Varies (check airlines)" });
         }
    }
  } catch (error) { console.error("SerpApi Flight Error:", error.message); }

  // 4. Fallback Distance Calculation
  if (overallDistance === "N/A") {
    try {
      if (!SERPAPI_API_KEY) throw new Error('SerpApi key is missing');
      const distanceQuery = `distance between ${from} and ${destination}`;
      const distanceSearch = await getJson({ api_key: SERPAPI_API_KEY, q: distanceQuery, gl: 'us', hl: 'en' });
      if (distanceSearch.answer_box?.answer) {
        overallDistance = distanceSearch.answer_box.answer;
      } else { // Haversine if SerpApi fails
        const haversineDist = calculateHaversineDistance(fromCoords, destCoords);
        if (haversineDist) overallDistance = haversineDist + " (direct)";
      }
    } catch (error) { // Final Haversine fallback
      console.error("Distance Fallback Error:", error.message);
       const haversineDist = calculateHaversineDistance(fromCoords, destCoords);
       if (haversineDist) { overallDistance = haversineDist + " (direct)"; }
    }
  }

  return { options, distance: overallDistance };
}

// --- Helper: Fetch REAL destination info ---
async function getDestinationInfo(destination, budget) {
    try {
      if (!SERPAPI_API_KEY) throw new Error('SerpApi key is missing');
      let budgetSearchTerm = "";
      if (budget.toLowerCase() === 'luxury') { budgetSearchTerm = "luxury 5 star hotels"; }
      else if (budget.toLowerCase() === 'mid-range') { budgetSearchTerm = "best 3 star and 4 star hotels"; }
      else { budgetSearchTerm = "low cost 3 star hotels"; }
      const attractionsQuery = `top attractions in ${destination}`;
      const hotelsQuery = `${budgetSearchTerm} in ${destination}`;
      const bestTimeQuery = `when is the best time to visit ${destination}`;
      const [attractionsSearch, hotelsSearch, bestTimeSearch] = await Promise.all([
        getJson({ api_key: SERPAPI_API_KEY, q: attractionsQuery, gl: 'us', hl: 'en' }),
        // Local results are very sensitive to geo context; provide `location` to improve consistency.
        getJson({ api_key: SERPAPI_API_KEY, q: hotelsQuery, gl: 'us', hl: 'en', location: destination, num: 6, tbm: 'lcl' }),
        getJson({ api_key: SERPAPI_API_KEY, q: bestTimeQuery, gl: 'us', hl: 'en' }),
      ]);
      const highlights = attractionsSearch.knowledge_graph?.tourist_attractions?.map(a => a.name) || attractionsSearch.top_sights?.sights?.map(s => s.title) || [];
      let hotels = [];
      
      // Try to get hotels from local_results first (best quality - has photos, ratings, addresses)
      if (hotelsSearch?.local_results?.length) {
        hotels = hotelsSearch.local_results.slice(0, 6).map(h => ({
          name: String(h.title || h.name || 'Hotel').trim(),
          address: String(h.address || h.vicinity || '').trim(),
          photo: (h.thumbnail || h.thumbnail_image || h.image || null),
          rating: (typeof h.rating === 'number') ? h.rating : null,
          link: (h.website || h.link || null),
        })).filter(h => h.name && h.name !== 'Hotel');
      }

      // Fallback 1: Try Google Maps search if local_results failed
      if (hotels.length === 0) {
        try {
          const hotelsMaps = await getJson({
            api_key: SERPAPI_API_KEY,
            engine: 'google_maps',
            q: `${budgetSearchTerm} ${destination}`,
            type: 'search',
          });

          if (hotelsMaps?.local_results?.length) {
            hotels = hotelsMaps.local_results.slice(0, 6).map(h => ({
              name: String(h.title || h.name || 'Hotel').trim(),
              address: String(h.address || h.vicinity || '').trim(),
              photo: (h.thumbnail || h.thumbnail_image || h.image || null),
              rating: (typeof h.rating === 'number') ? h.rating : null,
              link: (h.website || h.link || null),
            })).filter(h => h.name && h.name !== 'Hotel');
          }
        } catch (mapsError) {
          console.warn('Google Maps hotel search failed:', mapsError.message);
        }
      }

      // Fallback 2: Try a simpler query without tbm=lcl
      if (hotels.length === 0) {
        try {
          const hotelsSimple = await getJson({
            api_key: SERPAPI_API_KEY,
            q: `hotels in ${destination}`,
            gl: 'us',
            hl: 'en',
            location: destination,
            num: 6,
          });

          if (hotelsSimple?.local_results?.length) {
            hotels = hotelsSimple.local_results.slice(0, 6).map(h => ({
              name: String(h.title || h.name || 'Hotel').trim(),
              address: String(h.address || h.vicinity || '').trim(),
              photo: (h.thumbnail || h.thumbnail_image || h.image || null),
              rating: (typeof h.rating === 'number') ? h.rating : null,
              link: (h.website || h.link || null),
            })).filter(h => h.name && h.name !== 'Hotel');
          }
        } catch (simpleError) {
          console.warn('Simple hotel search failed:', simpleError.message);
        }
      }

      // Log what we found for debugging
      if (hotels.length > 0) {
        console.log(`✅ Found ${hotels.length} hotels for ${destination}:`, hotels.map(h => ({ name: h.name, hasPhoto: !!h.photo, hasLink: !!h.link })));
      } else {
        console.warn(`⚠️ No hotels found for ${destination} - tried multiple search methods`);
      }
      const bestTime = bestTimeSearch.answer_box?.snippet || bestTimeSearch.answer_box?.answer || (bestTimeSearch.organic_results && bestTimeSearch.organic_results[0].snippet) || "Varies by season.";
      return { highlights, hotels, bestTime };
    } catch (error) {
      console.error('SerpApi Error:', error);
      return { highlights: [], hotels: [], bestTime: "N/A (Error fetching details)" };
    }
}


// --- THE MAIN API ROUTE ---
export async function POST(request) {
    const { from, destination, startDate, endDate, budget, transportMode, interests } = await request.json();

    // --- Antarctica Guard Rail ---
    if (destination.toLowerCase().includes('antarctica')) {
      return new Response( JSON.stringify({ error: 'Travel to Antarctica requires a specialized expedition and cannot be planned this way.' }), { status: 400, headers: { 'Content-Type': 'application/json' } } );
    }

    // --- Fetch Data in Parallel ---
    let travelData, destinationInfo, fromCoords, destCoords;
    try {
      [fromCoords, destCoords] = await Promise.all([ getCoords(from), getCoords(destination) ]);
      [travelData, destinationInfo] = await Promise.all([ getTravelData(from, destination, fromCoords, destCoords), getDestinationInfo(destination, budget) ]);
    } catch (error) {
      console.error("API Data Fetching Error in POST:", error);
      const errorMessage = error.message.includes("Location not found") ? `Could not find location: ${error.message.split(': ')[1]}` : `Failed to fetch required API data: ${error.message}`;
      return new Response( JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // --- Calculate number of days and generate date strings ---
    let numberOfDays = 'the specified date range';
    let calculatedDays = 0;
    const allDates = []; // Array to hold YYYY-MM-DD date strings
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) { throw new Error("Invalid start or end date format"); }
        if (start > end) { throw new Error("Start date must be before end date"); }

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
        console.error("Error calculating date difference or generating dates:", e);
        calculatedDays = 0; // Indicate failure
    }

    // --- Build the Prompt for the AI ---
    const prompt = `
      CRITICAL: Your response must be PURE JSON only. Do NOT write any text like "Here is the itinerary" or any explanations before or after the JSON. Start immediately with { and end with }. Nothing else.
      
      You are an expert travel planner. You MUST use the provided REAL-WORLD DATA to create a detailed, practical, and inspiring itinerary. Do not invent information.

      --- USER PREFERENCES ---
      - From: ${from}
      - Destination: ${destination}
      - Dates: ${startDate} to ${endDate} (Total: ${numberOfDays})
      - Budget: ${budget}
      - Preferred Transport: ${transportMode}
      - Interests: ${interests.join(', ')}

      --- REAL-WORLD DATA ---
      1. Travel Options:
         - Distance: ${travelData.distance}
         - Options: ${JSON.stringify(travelData.options)}
      2. Destination Info:
         - Top Highlights: ${destinationInfo.highlights.join(', ') || 'N/A'}
         - Best Time to Visit: ${destinationInfo.bestTime}
         - Suggested ${budget} Hotels: ${JSON.stringify(destinationInfo.hotels)}
      3. Coordinates:
         - Origin (${from}): ${JSON.stringify(fromCoords)}
         - Destination (${destination}): ${JSON.stringify(destCoords)}
      ${calculatedDays > 0 ? `4. Specific Dates To Plan For: ${JSON.stringify(allDates)}` : ''}

      --- YOUR TASK ---
      1. Create "travelAnalysis". Use "Travel Options" data.
      2. Create "destinationSummary". Pass "bestTimeToVisit" and "hotelSuggestions" data.
      3. Create "thoughtProcess".
      4. **MANDATORY REQUIREMENT: Create a complete day-by-day "days" array covering THE ENTIRE DURATION from ${startDate} to ${endDate}. This means you MUST generate exactly ${numberOfDays} objects in the "days" array, one for each date provided in the 'Specific Dates To Plan For' data. Do not stop early. Use the provided dates.**
      5. For each day object, include a unique 'day' number (1, 2, 3,... up to ${calculatedDays > 0 ? calculatedDays : 'the end date'}), the corresponding 'date' string from the 'Specific Dates To Plan For' data (if available, otherwise calculate it), a 'title', and an 'activities' array.
      6. Each 'activities' array MUST include detailed entries for "Morning", "Afternoon", and "Evening".
      7. Add 1-2 sentence "description" for each activity explaining relevance to interests: ${interests.join(', ')}.
      8. Weave in "Top Highlights" naturally.

      --- JSON-ONLY RESPONSE ---
      Respond ONLY with a valid JSON object. No text before or after the JSON. Do NOT include any comments in the JSON output. Ensure ALL string values are in double quotes (""). Check your final JSON for validity before outputting.
      
      CRITICAL RULES:
      1. The JSON must NOT contain any comments like // or /* */
      2. Pure JSON only - nothing before the opening { and nothing after the closing }
      3. Do NOT add any explanations, notes, or text after the JSON ends
      4. Your response should start with { and end with } - nothing else
      
      {
        "destinationName": "${destination}",
        "fromName": "${from}",
        "fromCoords": ${JSON.stringify(fromCoords)},
        "destinationCoords": ${JSON.stringify(destCoords)},
        "travelAnalysis": {
          "summary": "Based on real data, here are the travel options...",
          "distance": "${travelData.distance}",
          "options": ${JSON.stringify(travelData.options)}
        },
        "destinationSummary": {
          "bestTimeToVisit": "${destinationInfo.bestTime}",
          "hotelSuggestions": ${JSON.stringify(destinationInfo.hotels)}
        },
        "thoughtProcess": "Comprehensive analysis of the travel requirements and itinerary planning considerations",
        "days": [
          {
            "day": 1,
            "date": "${calculatedDays > 0 ? allDates[0] : startDate}",
            "title": "Travel and Arrival",
            "activities": [
              { "time": "Morning/Afternoon", "description": "Travel from ${from} to ${destination} via [Logical Mode from data]. Estimated time: [Time string]." },
              { "time": "Evening", "description": "Arrive in ${destination}, check into hotel (Suggestion: ${destinationInfo.hotels.length > 0 ? destinationInfo.hotels[0].name : `a ${budget} hotel`}) and have dinner." }
            ]
          },
          {
             "day": 2,
             "date": "${calculatedDays > 1 ? allDates[1] : '[Calculate YYYY-MM-DD for Day 2]'}",
             "title": "Exploring ${destination}",
             "activities": [
               { "time": "Morning", "description": "Visit [specific attraction from Top Highlights]. Detailed description of why this fits the ${interests.join(', ')} interests." },
               { "time": "Afternoon", "description": "Explore [another attraction]. Full description of activities and relevance to traveler interests." },
               { "time": "Evening", "description": "Dinner at local restaurant and evening activity. Complete details about the experience." }
             ]
           }
        ]
      }
      
      IMPORTANT INSTRUCTIONS FOR DAYS ARRAY:
      - Generate EXACTLY ${numberOfDays} day objects (Day 1 through Day ${calculatedDays > 0 ? calculatedDays : 'N'})
      - Use the exact dates from 'Specific Dates To Plan For' data for each day's "date" field
      - Each day MUST have 3 activities: Morning, Afternoon, and Evening
      - NEVER use "..." or placeholder text - write full, detailed descriptions for EVERY activity
      - Each activity description must be 2-3 complete sentences explaining what to do and why it matches the traveler's interests
      - Incorporate the Top Highlights naturally across different days
      - Continue generating ALL days until you reach ${endDate} - do not stop early
      
      FINAL REMINDER: Output ONLY the JSON object. Do NOT add any text, explanations, or commentary before { or after }. Your entire response must be valid JSON that can be parsed directly.
    `;
    // --- **** END OF PROMPT FIX **** ---


    // --- Call Groq with streaming to support Chain of Thoughts (CoT) feature ---
    try {
      if (!GROQ_API_KEY) {
        return new Response(
          JSON.stringify({
            error:
              'Missing GROQ_API_KEY. Please configure your Groq API key in .env.local.',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const groqResponse = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            stream: true, // Enable streaming for CoT feature
          }),
        }
      );

      if (!groqResponse.ok) {
        let errorMessage = `Groq API error (status ${groqResponse.status})`;
        try {
          const errorBody = await groqResponse.json();
          if (errorBody?.error?.message) {
            errorMessage = `Groq API error: ${errorBody.error.message}`;
          }
        } catch {
          // Fallback to raw text if JSON parsing fails
          try {
            const text = await groqResponse.text();
            if (text) {
              errorMessage = `Groq API error: ${text}`;
            }
          } catch {
            // ignore
          }
        }

        console.error(errorMessage);
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Convert Groq's Server-Sent Events stream to a ReadableStream
      const encoder = new TextEncoder();
      const reader = groqResponse.body.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                break;
              }

              // Decode the chunk
              buffer += decoder.decode(value, { stream: true });
              
              // Process complete lines (SSE format: "data: {...}\n\n")
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6); // Remove "data: " prefix
                  
                  if (data === '[DONE]') {
                    controller.close();
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    // Extract content delta from Groq's streaming format
                    const delta = parsed.choices?.[0]?.delta?.content || '';
                    if (delta) {
                      controller.enqueue(encoder.encode(delta));
                    }
                  } catch (e) {
                    // Skip invalid JSON lines (like empty "data: " lines)
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
          error:
            'Failed to generate itinerary using Groq API. Check your GROQ_API_KEY and network connectivity.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
}
// --- END POST FUNCTION ---
// --- NO OTHER EXPORTS ---