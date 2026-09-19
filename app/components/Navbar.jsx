// /app/components/Navbar.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, Info, X, Github, Linkedin, Mail, PlusCircle } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import { useItinerary } from '../context/ItineraryContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

export default function Navbar() {
  const pathname = usePathname();
  const { setItinerary, setStreamingText, setError, setCotSteps, setFormData } = useItinerary();
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Determine colors based on current page
  const isMainPage = pathname === '/';
  const isSuggestionsPage = pathname === '/suggestions';
  const isItineraryPage = pathname === '/itinerary';
  
  // Main page: white colors, Suggestions page: blue colors, Others: default
  const logoColor = isMainPage ? 'text-white' : (isSuggestionsPage ? 'text-blue-500' : 'text-blue-400');
  const textColor = isMainPage ? 'text-white' : (isSuggestionsPage ? 'text-foreground' : 'text-foreground');
  const buttonTextColor = isMainPage ? 'text-white hover:text-white/80' : (isSuggestionsPage ? 'text-foreground hover:text-foreground/80' : 'text-foreground');
  const iconColor = isMainPage ? 'text-white' : 'text-foreground';
  
  // Apply glass effect for pages with scrolling (suggestions and itinerary), transparent for main page
  const navbarBg = isMainPage 
    ? 'bg-background/0' 
    : (isSuggestionsPage || isItineraryPage)
    ? 'bg-background/80 backdrop-blur-xl border-b border-border/40'
    : 'bg-background/0';

  const handleLogoClick = () => {
    setItinerary(null);
    setStreamingText('');
    setError(null);
    setCotSteps([]); // Reset to empty array - itinerary page will reinitialize with proper steps
    setFormData(null);
  };

  const handlePlanNewTrip = () => {
    // Clear all itinerary data
    setItinerary(null);
    setStreamingText('');
    setError(null);
    setCotSteps([]);
    setFormData(null);
    // Navigate to home page
    window.location.href = '/';
  };

  return (
    <>
      <nav className={`sticky top-0 z-50 w-full ${navbarBg}`}>
        <div className="container flex h-16 items-center">
          <Link 
            href="/" 
            onClick={handleLogoClick} 
            className="mr-6 flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <Plane className={`h-6 w-6 ${logoColor}`} />
            <span className={`hidden font-bold text-xl sm:inline-block ${textColor}`}>
              RoamIQ
            </span>
          </Link>
          
          <div className="flex flex-1 items-center justify-end space-x-4">
            {/* Show "Plan a New Trip" button only on itinerary page */}
            {isItineraryPage && (
              <Button
                variant="default"
                size="sm"
                onClick={handlePlanNewTrip}
                className="text-sm font-medium flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline-block">Plan a New Trip</span>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAboutModal(true)}
              className={`text-sm font-medium flex items-center gap-2 hover:bg-transparent ${buttonTextColor}`}
            >
              <Info className={`h-4 w-4 ${iconColor}`} />
              <span className="hidden sm:inline-block">About the Project</span>
            </Button>
            <ThemeSwitcher isMainPage={isMainPage} iconColor={iconColor} />
          </div>
        </div>
      </nav>

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAboutModal(false)}>
          <Card className="w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={() => setShowAboutModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="text-2xl font-bold">
                About the Project
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Description */}
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  RoamIQ is a travel planning platform built on live search data. Real flight
                  fares, hotel rates, restaurants and destination news are fetched from SerpApi
                  first; an AI model then writes a day-by-day plan around those verified facts.
                  Every price and place name you see is real — the model never invents them.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Google Flights',
                    'Google Hotels',
                    'Maps Directions',
                    'Google Local',
                    'Google News',
                    'Travel Explore',
                  ].map((engine) => (
                    <Badge key={engine} variant="secondary">
                      {engine}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Six SerpApi engines power the live data in this app.
                </p>
              </div>

              {/* Developer Info */}
              <div className="space-y-3 pt-2 border-t">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Developed by</h3>
                  <p className="text-lg font-bold">Adarsh Singh</p>
                </div>

                {/* Source Code */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Source Code</h3>
                  <a 
                    href="https://github.com/Anexus5919/RoamIQ" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    <Github className="h-4 w-4" />
                    <span className="text-sm font-medium">github.com/Anexus5919/RoamIQ</span>
                  </a>
                </div>

                {/* Developed For */}
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-1">Built for</h3>
                  <p className="text-base font-semibold">SerpApi India Hackathon 2026</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Travel &amp; Local Discovery track
                  </p>
                </div>
              </div>

              {/* Social Links */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">Social Links</h3>
                <div className="flex gap-4">
                  <a 
                    href="https://www.linkedin.com/in/anexus/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a 
                    href="https://github.com/Anexus5919" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-900 text-white transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a 
                    href="mailto:anexus5919@gmail.com"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                    aria-label="Email"
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}