// /app/itinerary/page.js
'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ItineraryDisplay from '../components/ItineraryDisplay';
import WeatherDisplay from '../components/WeatherDisplay';
import TravelAnalysisDisplay from '../components/TravelAnalysisDisplay';
import HotelSuggestions from '../components/HotelSuggestions';
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

// Initial CoT steps definition
const initialCotSteps = [
  { id: 'travel', text: 'Analyzing travel logistics...', status: 'pending' },
  { id: 'dest', text: 'Gathering destination info (hotels, best time)...', status: 'pending' },
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
      let coordsExtracted = false; // Flag to track if we've shown the globe early
      let fullItineraryParsed = false; // Flag to track if we've parsed complete itinerary

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Mark all steps as done when streaming completes
          if (!fullItineraryParsed) {
            setCotSteps(prevSteps => prevSteps.map(step => ({ ...step, status: 'done' })));
          }
          console.log('✅ Stream complete');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Only update streaming text if we haven't parsed complete itinerary yet
        if (!fullItineraryParsed) {
          setStreamingText(buffer);
        }

        // Try to parse complete itinerary during streaming (not just at the end!)
        if (!fullItineraryParsed && buffer.includes('"days":') && buffer.includes('"destinationSummary":')) {
          const extractedJson = extractJson(buffer);
          if (extractedJson) {
            try {
              const parsed = JSON.parse(extractedJson);
              // Validate it's complete
              if (parsed && parsed.destinationName && parsed.fromCoords && parsed.days && parsed.days.length > 0) {
                setItinerary(parsed);
                setLayoutState('results');
                setCotSteps(initialCotSteps.map(s => ({ ...s, status: 'done' })));
                fullItineraryParsed = true;
                coordsExtracted = true; // Also set this to prevent further coordinate extraction
                console.log('✅ Complete itinerary parsed - stopping all further processing');
                // Don't break - let the stream finish naturally but we're done processing
              }
            } catch (e) {
              // Not valid yet, continue
            }
          }
        }

        // Skip all further processing if we already have complete itinerary
        if (fullItineraryParsed) {
          continue; // Just drain the stream, don't process
        }

        // Try to extract coordinates early and show results layout with globe ASAP
        if (!coordsExtracted && buffer.includes('"fromCoords"') && buffer.includes('"destinationCoords"')) {
          try {
            // Try to extract just the coordinates portion for early globe rendering
            const fromCoordsMatch = buffer.match(/"fromCoords":\s*\{[^}]+\}/);
            const destCoordsMatch = buffer.match(/"destinationCoords":\s*\{[^}]+\}/);
            const fromNameMatch = buffer.match(/"fromName":\s*"([^"]+)"/);
            const destNameMatch = buffer.match(/"destinationName":\s*"([^"]+)"/);
            
            if (fromCoordsMatch && destCoordsMatch && fromNameMatch && destNameMatch) {
              const partialItinerary = {
                fromCoords: JSON.parse(fromCoordsMatch[0].split(':')[1]),
                destinationCoords: JSON.parse(destCoordsMatch[0].split(':')[1]),
                fromName: fromNameMatch[1],
                destinationName: destNameMatch[1],
                travelAnalysis: null, // Will be filled later
                destinationSummary: null,
                days: []
              };
              
              // Show the globe immediately with just the path
              setItinerary(partialItinerary);
              setLayoutState('results');
              coordsExtracted = true;
              console.log('🌍 Globe coordinates extracted early - showing map!');
            }
          } catch (e) {
            // Coordinates not fully formed yet, continue streaming
          }
        }

        // Update CoT steps based on keywords in the stream (more responsive than waiting for valid JSON)
        setCotSteps(prevSteps => {
          // Safety check - if steps array is empty or invalid, return it as-is
          if (!prevSteps || prevSteps.length === 0) {
            return prevSteps;
          }
          
          const newSteps = JSON.parse(JSON.stringify(prevSteps)); // Deep clone
          
          // Check for travelAnalysis section
          if (buffer.includes('"travelAnalysis":')) {
            if (newSteps[0] && newSteps[0].status === 'pending') {
              newSteps[0].status = 'loading';
            }
          }
          
          // Check for destinationSummary section (travelAnalysis is complete)
          if (buffer.includes('"destinationSummary":')) {
            if (newSteps[0]) newSteps[0].status = 'done';
            if (newSteps[1] && newSteps[1].status === 'pending') {
              newSteps[1].status = 'loading';
            }
          }
          
          // Check for hotelSuggestions (more detail for destination step)
          if (buffer.includes('"hotelSuggestions":')) {
            if (newSteps[1]) {
              newSteps[1].text = 'Gathering destination info (found hotels!)';
            }
          }
          
          // Check for days array (destinationSummary is complete)
          if (buffer.includes('"days":')) {
            if (newSteps[1]) newSteps[1].status = 'done';
            if (newSteps[2] && newSteps[2].status === 'pending') {
              newSteps[2].status = 'loading';
            }
          }
          
          // Count how many days have been generated
          const dayMatches = buffer.match(/"day":\s*(\d+)/g);
          if (dayMatches && dayMatches.length > 0 && newSteps[2]) {
            const lastDayMatch = dayMatches[dayMatches.length - 1];
            const dayNum = lastDayMatch.match(/\d+/)[0];
            newSteps[2].text = `Building your plan... (Day ${dayNum})`;
            newSteps[2].status = 'loading';
          }
          
          return newSteps;
        });
      }

      // Only try final parse if we haven't already parsed during streaming
      if (!fullItineraryParsed) {
        console.log('⚠️ Itinerary was not parsed during streaming - attempting final parse');
        
        // We need to parse from the buffer we have
        // The issue is the buffer might have extra text after valid JSON
        let parsed = null;
        let parseSuccess = false;

        // Try extractJson first - it finds balanced braces
        const finalJson = extractJson(buffer);
        if (finalJson) {
          try {
            parsed = JSON.parse(finalJson);
            if (parsed && parsed.destinationName && parsed.days) {
              parseSuccess = true;
              console.log('✅ Final parse successful using extractJson');
            }
          } catch (e) {
            console.warn('Final parse: extractJson failed:', e.message);
          }
        }

        // If that failed, try regex to find the largest valid JSON
        if (!parseSuccess) {
          try {
            const jsonMatches = buffer.match(/\{(?:[^{}]|(\{(?:[^{}]|(\{[^{}]*\})*)*\}))*\}/g);
            if (jsonMatches && jsonMatches.length > 0) {
              // Sort by length and try the largest ones first
              const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
              for (const match of sortedMatches) {
                try {
                  parsed = JSON.parse(match);
                  if (parsed && parsed.destinationName && parsed.fromCoords && parsed.days) {
                    parseSuccess = true;
                    console.log('✅ Final parse successful using regex extraction');
                    break;
                  }
                } catch (e) {
                  continue; // Try next match
                }
              }
            }
          } catch (e) {
            console.warn('Final parse: Regex extraction failed:', e.message);
          }
        }

        // Update state if we got valid data
        if (parseSuccess && parsed) {
          setItinerary(parsed);
          setLayoutState('results');
          setCotSteps(initialCotSteps.map(s => ({ ...s, status: 'done' })));
          console.log('✅ Complete itinerary loaded from final parse');
        } else {
          // Final parse failed - check if we have any partial data displayed
          if (coordsExtracted) {
            console.warn('⚠️ Final parse failed but coordinates are displayed - app remains functional');
            setCotSteps(initialCotSteps.map(s => ({ ...s, status: 'done' })));
            // Don't throw error - we have something to show
          } else {
            console.error('❌ Complete failure - no data could be parsed or displayed');
            throw new Error('Unable to parse itinerary data. Please try again.');
          }
        }
      } else {
        console.log('✅ Skipping final parse - complete itinerary already loaded during streaming');
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
                        <p className="text-muted-foreground">Loading full itinerary details...</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {itinerary.destinationName && <WeatherDisplay city={itinerary.destinationName} />}
                  {itinerary.travelAnalysis && <TravelAnalysisDisplay analysis={itinerary.travelAnalysis} />}
                  {itinerary.days && itinerary.days.length > 0 && <ItineraryDisplay itinerary={itinerary} />}
                </div>
                <div className="lg:col-span-1 space-y-6">
                  {itinerary.destinationSummary?.hotelSuggestions && (
                    <HotelSuggestions hotels={itinerary.destinationSummary.hotelSuggestions} />
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