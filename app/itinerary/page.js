// /app/itinerary/page.js
'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ItineraryDisplay from '../components/ItineraryDisplay';
import WeatherDisplay from '../components/WeatherDisplay';
import TravelAnalysisDisplay from '../components/TravelAnalysisDisplay';
import HotelSuggestions from '../components/HotelSuggestions';
import FlightOptions from '../components/FlightOptions';
import LocalDining from '../components/LocalDining';
import TravelAdvisory from '../components/TravelAdvisory';
import ChainOfThoughtDisplay from '../components/ChainOfThoughtDisplay';
import GlobeDisplay from '../components/GlobeDisplay';
import { Card, CardContent } from '../components/ui/card';
import { useItinerary } from '../context/ItineraryContext';

// Helper function to extract JSON with proper brace balancing
function extractJson(text) {
  if (!text) return null;
  
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;
  
  // Count balanced braces to find the actual end of the JSON object
  let braceCount = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = firstBrace; i < text.length; i++) {
    const char = text[i];
    
    // Handle escape sequences in strings
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    // Toggle string state on quotes (ignore braces inside strings)
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    // Only count braces outside of strings
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        // When braces are balanced, we've found the end of the JSON
        if (braceCount === 0) {
          return text.substring(firstBrace, i + 1);
        }
      }
    }
  }
  
  // If we didn't find balanced braces, return null
  return null;
}

// Separates the live SerpApi payload from the streamed AI plan.
// Must match STREAM_DELIMITER in /app/api/itinerary/route.js
const STREAM_DELIMITER = '<<<ROAMIQ_LIVE_DATA_END>>>';

// Initial CoT steps definition
const initialCotSteps = [
  { id: 'travel', text: 'Searching live flights and routes...', status: 'pending' },
  { id: 'dest', text: 'Finding real hotels, places and advisories...', status: 'pending' },
  { id: 'plan', text: 'Building your day-by-day plan...', status: 'pending' },
];

function ItineraryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get state and setters from the global context
  const {
    itinerary, setItinerary,
    isLoading, setIsLoading,
    error, setError,
    streamingText, setStreamingText,
    cotSteps, setCotSteps,
    formData, setFormData
  } = useItinerary();

  const [layoutState, setLayoutState] = useState('loading');

  // Check if we have form data to process
  useEffect(() => {
    // If no form data in context, redirect to home
    if (!formData && !itinerary) {
      router.push('/');
      return;
    }

    // If we have form data but no itinerary yet, start the API call
    if (formData && !itinerary && !isLoading) {
      handleApiCall();
    }

    // If we already have an itinerary, show results
    if (itinerary) {
      setLayoutState('results');
    }
  }, [formData, itinerary]);

  const handleApiCall = async () => {
    setIsLoading(true);
    setLayoutState('loading');
    setError(null);
    setItinerary(null);
    setStreamingText('');
    setCotSteps(initialCotSteps);

    try {
      const response = await fetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        // Try to surface a helpful error message from the API instead of a generic 500
        let message = `HTTP error! status: ${response.status}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const parsed = JSON.parse(errorText);
              if (parsed?.error) {
                message = parsed.error;
              }
            } catch {
              // Not JSON, use raw text
              message = errorText;
            }
          }
        } catch {
          // Ignore secondary errors and fall back to default message
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let liveData = null; // Real SerpApi payload, sent ahead of the AI stream
      let planParsed = false; // Whether the AI day-plan has been merged in

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (!planParsed) {
            setCotSteps((prevSteps) => prevSteps.map((step) => ({ ...step, status: 'done' })));
          }
          console.log('✅ Stream complete');
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 1. Split off the live SerpApi payload that precedes the AI stream.
        //    Real flights, hotels and the globe can render before the model
        //    has produced a single token.
        if (!liveData) {
          const delimiterIndex = buffer.indexOf(STREAM_DELIMITER);
          if (delimiterIndex === -1) continue; // prelude still arriving

          try {
            liveData = JSON.parse(buffer.slice(0, delimiterIndex));
          } catch (e) {
            throw new Error('Could not read live travel data from the server.');
          }

          buffer = buffer.slice(delimiterIndex + STREAM_DELIMITER.length);

          setItinerary({ ...liveData, days: [] });
          setLayoutState('results');
          setCotSteps((prevSteps) =>
            prevSteps.map((step) =>
              step.id === 'plan' ? { ...step, status: 'loading' } : { ...step, status: 'done' }
            )
          );
          console.log('🌍 Live SerpApi data received — rendering globe, flights and hotels');
        }

        // Nothing left to do but drain the socket once the plan is in.
        if (planParsed) continue;

        setStreamingText(buffer);

        // 2. Merge the AI plan the moment it forms valid JSON.
        const extractedJson = extractJson(buffer);
        if (extractedJson) {
          try {
            const plan = JSON.parse(extractedJson);
            if (plan && Array.isArray(plan.days) && plan.days.length > 0) {
              setItinerary({
                ...liveData,
                destinationSummary: {
                  ...liveData.destinationSummary,
                  bestTimeToVisit: plan.bestTimeToVisit || 'Varies by season.',
                },
                thoughtProcess: plan.thoughtProcess || '',
                days: plan.days,
              });
              setCotSteps(initialCotSteps.map((s) => ({ ...s, status: 'done' })));
              planParsed = true;
              console.log('✅ AI plan parsed and merged with live data');
              continue;
            }
          } catch (e) {
            // Not valid yet, keep streaming
          }
        }

        // 3. Progress feedback while the days stream in.
        const dayMatches = buffer.match(/"day":\s*(\d+)/g);
        if (dayMatches && dayMatches.length > 0) {
          const dayNum = dayMatches[dayMatches.length - 1].match(/\d+/)[0];
          setCotSteps((prevSteps) =>
            prevSteps.map((step) =>
              step.id === 'plan'
                ? { ...step, text: `Building your plan... (Day ${dayNum})`, status: 'loading' }
                : step
            )
          );
        }
      }

      if (!liveData) {
        throw new Error('No travel data was received. Please try again.');
      }

      // Final attempt, for when the plan only completes as the stream closes.
      if (!planParsed) {
        console.log('⚠️ Plan not parsed during streaming - attempting final parse');

        let plan = null;
        const finalJson = extractJson(buffer);
        if (finalJson) {
          try {
            plan = JSON.parse(finalJson);
          } catch (e) {
            console.warn('Final parse failed:', e.message);
          }
        }

        if (plan && Array.isArray(plan.days) && plan.days.length > 0) {
          setItinerary({
            ...liveData,
            destinationSummary: {
              ...liveData.destinationSummary,
              bestTimeToVisit: plan.bestTimeToVisit || 'Varies by season.',
            },
            thoughtProcess: plan.thoughtProcess || '',
            days: plan.days,
          });
          console.log('✅ Complete itinerary loaded from final parse');
        } else {
          // The live data is already on screen, so degrade gracefully rather
          // than throwing away a working page.
          console.warn('⚠️ AI plan unavailable — showing live travel data only');
        }
        setCotSteps(initialCotSteps.map((s) => ({ ...s, status: 'done' })));
      }
    } catch (err) {
      console.error('Error fetching itinerary:', err);
      setError(err.message || 'Failed to generate itinerary. Please try again.');
      setLayoutState('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {layoutState === 'loading' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="min-h-[calc(100vh-12rem)] flex items-center justify-center"
        >
          <div className="w-full max-w-3xl space-y-6">
            {/* Initial Loading Spinner (before stream starts) */}
            {streamingText.length === 0 && !error && (
              <Card className="shadow-xl">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center space-y-4 py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
                    <p className="text-xl font-medium text-foreground">Starting the AI engine...</p>
                    <p className="text-sm text-muted-foreground">This may take a moment</p>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* CoT Display (during streaming) */}
            {streamingText.length > 0 && (
              <ChainOfThoughtDisplay steps={cotSteps} rawJson={streamingText} />
            )}
            
            {/* Error Message Display */}
            {error && (
              <Card className="shadow-xl">
                <CardContent className="p-8">
                  <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      )}

      {layoutState === 'results' && itinerary && (
        <div className="space-y-8">
          {/* Globe at Top - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-[500px] rounded-2xl overflow-hidden shadow-xl"
          >
            <GlobeDisplay
              fromCoords={itinerary.fromCoords}
              destinationCoords={itinerary.destinationCoords}
              fromName={itinerary.fromName}
              destinationName={itinerary.destinationName}
              distance={itinerary.travelAnalysis?.distance}
            />
          </motion.div>

          {/* Results Content */}
          <AnimatePresence>
            <motion.div
              className="max-w-7xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* Show loading message if we have partial data */}
              {(!itinerary.travelAnalysis || !itinerary.days || itinerary.days.length === 0) && (
                <div className="mb-6 text-center">
                  <Card className="shadow-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground">Writing your day-by-day plan...</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {itinerary.destinationName && <WeatherDisplay city={itinerary.destinationName} />}
                  {itinerary.travelAnalysis && <TravelAnalysisDisplay analysis={itinerary.travelAnalysis} />}
                  {itinerary.flights?.length > 0 && (
                    <FlightOptions
                      flights={itinerary.flights}
                      route={itinerary.flightRoute}
                      priceInsights={itinerary.priceInsights}
                    />
                  )}
                  {itinerary.days && itinerary.days.length > 0 && <ItineraryDisplay itinerary={itinerary} />}
                </div>
                <div className="lg:col-span-1 space-y-6">
                  {itinerary.destinationSummary?.hotelSuggestions && (
                    <HotelSuggestions hotels={itinerary.destinationSummary.hotelSuggestions} />
                  )}
                  {itinerary.dining?.length > 0 && <LocalDining places={itinerary.dining} />}
                  {itinerary.news?.length > 0 && (
                    <TravelAdvisory news={itinerary.news} destination={itinerary.destinationName} />
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {layoutState === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="min-h-[calc(100vh-12rem)] flex items-center justify-center"
        >
          <Card className="w-full max-w-2xl shadow-2xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="text-6xl">😞</div>
                <h2 className="text-2xl font-bold text-foreground">Oops! Something went wrong</h2>
                {error && (
                  <p className="text-muted-foreground">{error}</p>
                )}
                <button
                  onClick={() => router.push('/')}
                  className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Go Back Home
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default function ItineraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <ItineraryPageContent />
    </Suspense>
  );
}