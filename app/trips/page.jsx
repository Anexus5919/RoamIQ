// /app/trips/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Luggage, MapPin, Calendar, Hotel, Trash2, Route, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import DayRoutePlanner from '../components/DayRoutePlanner';
import { listTrips, deleteTrip, setStopStatus } from '@/lib/trip-store';

function formatRange(dates) {
  if (!dates || dates.length === 0) return null;
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const first = new Date(dates[0]).toLocaleDateString('en-IN', opts);
  const last = new Date(dates[dates.length - 1]).toLocaleDateString('en-IN', opts);
  return dates.length === 1 ? first : `${first} to ${last}`;
}

function progressOf(trip) {
  const stops = (trip.days || []).flatMap((d) => d.stops || []);
  const done = stops.filter((s) => s.status === 'done').length;
  return { done, total: stops.length };
}

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // localStorage is only available in the browser, so read after mount.
  useEffect(() => {
    setTrips(listTrips());
    setLoaded(true);
  }, []);

  const handleStatusChange = (tripId) => (stop, status) => {
    const day = trips
      .find((t) => t.id === tripId)
      ?.days.find((d) => (d.stops || []).some((s) => s.id === stop.id));
    if (!day) return;

    setStopStatus(tripId, day.day, stop.name, status);
    setTrips(listTrips());
  };

  const handleDelete = (id) => {
    deleteTrip(id);
    setTrips(listTrips());
    if (openId === id) setOpenId(null);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Luggage className="h-10 w-10 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">
            My Trips
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Your approved plans, ready to follow stop by stop
        </p>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : trips.length === 0 ? (
        <Card className="shadow-lg max-w-2xl mx-auto">
          <CardContent className="p-12 text-center space-y-4">
            <Luggage className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">No approved trips yet</h2>
              <p className="text-muted-foreground">
                Plan an itinerary and approve it, and it will be waiting here.
              </p>
            </div>
            <Button asChild>
              <Link href="/">Plan a trip</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 max-w-5xl mx-auto">
          {trips.map((trip, index) => {
            const { done, total } = progressOf(trip);
            const open = openId === trip.id;

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card className="shadow-lg border-l-4 border-primary">
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          {trip.fromName} to {trip.destinationName}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                          {formatRange(trip.dates) && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatRange(trip.dates)}
                            </span>
                          )}
                          {trip.anchor?.name && (
                            <span className="flex items-center gap-1">
                              <Hotel className="h-3 w-3" />
                              {trip.anchor.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Route className="h-3 w-3" />
                            {trip.days?.length || 0} days planned
                          </span>
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={done === total && total > 0 ? 'default' : 'secondary'}>
                          {done === total && total > 0 ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </>
                          ) : (
                            `${done} of ${total} stops visited`
                          )}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOpenId(open ? null : trip.id)}
                        >
                          {open ? 'Hide plan' : 'Open plan'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete trip"
                          onClick={() => handleDelete(trip.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  {open && (
                    <CardContent className="space-y-4">
                      <Separator />
                      <DayRoutePlanner
                        days={trip.days}
                        anchor={trip.anchor?.coords}
                        anchorName={trip.anchor?.name}
                        editable={false}
                        onStatusChange={handleStatusChange(trip.id)}
                      />
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
