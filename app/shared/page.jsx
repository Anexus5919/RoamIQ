// /app/shared/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Share2,
  MapPinned,
  Loader2,
  AlertCircle,
  Check,
  BookmarkPlus,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import DayRoutePlanner from '../components/DayRoutePlanner';
import { decodeTrip } from '@/lib/trip-share';
import { planDayRoutes } from '@/lib/itinerary-planner';
import { saveTrip } from '@/lib/trip-store';

const DEFAULT_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];

/** Average the shared places to stand in for the city centre. */
function centroidOf(places) {
  if (!places || places.length === 0) return null;
  const sum = places.reduce(
    (acc, p) => ({ lat: acc.lat + p.coords.lat, lon: acc.lon + p.coords.lon }),
    { lat: 0, lon: 0 }
  );
  return { lat: sum.lat / places.length, lon: sum.lon / places.length };
}

/** Rebuild the day routes around wherever the recipient is staying. */
function buildFor(shared, anchor, anchorName) {
  const notes = new Map(shared.places.map((p) => [p.name, p.description]));

  return planDayRoutes({
    places: shared.places,
    dayCount: shared.dayCount || 1,
    anchor,
    anchorName,
  }).map((day) => ({
    ...day,
    date: shared.dates?.[day.day] || null,
    title: `Day ${day.day}`,
    stops: (day.stops || []).map((stop, index) => ({
      ...stop,
      id: `s${day.day}-${index}-${stop.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      time: DEFAULT_TIMES[index] || 'Later',
      description: notes.get(stop.name) || '',
      status: 'pending',
    })),
  }));
}

export default function SharedTripPage() {
  const [shared, setShared] = useState(null);
  const [days, setDays] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [anchorName, setAnchorName] = useState('the city centre');
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [savedId, setSavedId] = useState(null);

  // The plan travels in the URL fragment, which never reaches a server.
  useEffect(() => {
    (async () => {
      const token = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
      if (!token) {
        setError('This link does not contain a plan. Ask for the QR code again.');
        return;
      }

      const decoded = await decodeTrip(token);
      if (!decoded || decoded.places.length === 0) {
        setError('This plan could not be read. The link may be incomplete.');
        return;
      }

      const centre = centroidOf(decoded.places);
      setShared(decoded);
      setAnchor(centre);
      setDays(buildFor(decoded, centre, 'the city centre'));
    })();
  }, []);

  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('This browser cannot share a location.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const mine = { lat: position.coords.latitude, lon: position.coords.longitude };
        setLocating(false);
        setAnchor(mine);
        setAnchorName('where you are staying');
        setDays(buildFor(shared, mine, 'where you are staying'));
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied, so the plan is centred on the city instead.'
            : 'Could not read your location, so the plan is centred on the city instead.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const saveToMyTrips = () => {
    const record = saveTrip({
      destinationName: shared.destinationName,
      fromName: shared.fromName || 'Shared plan',
      dates: shared.dates,
      anchor: { name: anchorName, coords: anchor, source: 'shared' },
      days,
      destinationSummary: { bestTimeToVisit: shared.bestTimeToVisit },
    });
    setSavedId(record.id);
  };

  if (error && !shared) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error}</p>
            <Button asChild>
              <Link href="/">Plan your own trip</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shared || !days) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Share2 className="h-10 w-10 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">
            {shared.destinationName}
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          A plan someone shared with you, re-routed around {anchorName}
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="shadow-lg border-l-4 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinned className="h-5 w-5 text-primary" />
                Make it yours
              </CardTitle>
              <CardDescription>
                The days regroup around wherever you are staying, so you get a different route from
                the person who sent this.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{shared.places.length} places</Badge>
                <Badge variant="secondary">{days.length} days</Badge>
                {anchorName !== 'the city centre' && (
                  <Badge>
                    <Check className="h-3 w-3 mr-1" />
                    Routed from your location
                  </Badge>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={useMyLocation} disabled={locating}>
                  {locating ? <Loader2 className="animate-spin" /> : <MapPinned />}
                  {locating ? 'Reading location...' : 'Route from my location'}
                </Button>
                <Button variant={savedId ? 'secondary' : 'outline'} onClick={saveToMyTrips} disabled={!!savedId}>
                  {savedId ? <Check /> : <BookmarkPlus />}
                  {savedId ? 'Saved to your trips' : 'Save to my trips'}
                </Button>
                {savedId && (
                  <Button variant="ghost" asChild>
                    <Link href="/trips">Open My Trips</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {shared.bestTimeToVisit && (
          <Card className="border-l-4 border-primary bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    Best Time to Visit
                    <Sparkles className="h-4 w-4 text-primary" />
                  </h3>
                  <p className="text-base text-foreground leading-relaxed">
                    {shared.bestTimeToVisit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        <DayRoutePlanner days={days} anchor={anchor} anchorName={anchorName} editable={false} />
      </div>
    </div>
  );
}
