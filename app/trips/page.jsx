// /app/trips/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Luggage,
  MapPin,
  Calendar,
  Hotel,
  Trash2,
  Route,
  CheckCircle2,
  Heart,
  QrCode,
  CircleSlash,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import DayRoutePlanner from '../components/DayRoutePlanner';
import ShareTripDialog from '../components/ShareTripDialog';
import CancelTripDialog from '../components/CancelTripDialog';
import {
  listTrips,
  deleteTrip,
  setStopStatus,
  toggleFavourite,
  cancelTrip,
  reinstateTrip,
  progressOf,
  historyStats,
  TRIP_STATUS,
} from '@/lib/trip-store';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: TRIP_STATUS.APPROVED, label: 'Upcoming' },
  { id: TRIP_STATUS.ACTIVE, label: 'In progress' },
  { id: TRIP_STATUS.COMPLETED, label: 'Completed' },
  { id: TRIP_STATUS.CANCELLED, label: 'Cancelled' },
];

const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'destination', label: 'Destination A to Z' },
  { id: 'stops', label: 'Most stops' },
  { id: 'progress', label: 'Furthest along' },
];

const STATUS_LABEL = {
  [TRIP_STATUS.APPROVED]: 'Upcoming',
  [TRIP_STATUS.ACTIVE]: 'In progress',
  [TRIP_STATUS.COMPLETED]: 'Completed',
  [TRIP_STATUS.CANCELLED]: 'Cancelled',
};

function formatRange(dates) {
  if (!dates || dates.length === 0) return null;
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const first = new Date(dates[0]).toLocaleDateString('en-IN', opts);
  const last = new Date(dates[dates.length - 1]).toLocaleDateString('en-IN', opts);
  return dates.length === 1 ? first : `${first} to ${last}`;
}

export default function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [sharing, setSharing] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  // localStorage is only available in the browser, so read after mount.
  useEffect(() => {
    setTrips(listTrips());
    setLoaded(true);
  }, []);

  const refresh = () => setTrips(listTrips());
  const stats = useMemo(() => historyStats(trips), [trips]);

  const visible = useMemo(() => {
    let rows = trips;
    if (favouritesOnly) rows = rows.filter((t) => t.favourite);
    if (filter !== 'all') rows = rows.filter((t) => t.status === filter);

    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return (a.approvedAt || 0) - (b.approvedAt || 0);
        case 'destination':
          return String(a.destinationName).localeCompare(String(b.destinationName));
        case 'stops':
          return progressOf(b).total - progressOf(a).total;
        case 'progress': {
          const pa = progressOf(a);
          const pb = progressOf(b);
          return (pb.total ? pb.done / pb.total : 0) - (pa.total ? pa.done / pa.total : 0);
        }
        default:
          return (b.approvedAt || 0) - (a.approvedAt || 0);
      }
    });
    return sorted;
  }, [trips, filter, sort, favouritesOnly]);

  const handleStatusChange = (tripId) => (stop, status) => {
    const trip = trips.find((t) => t.id === tripId);
    const day = trip?.days.find((d) => (d.stops || []).some((s) => s.id === stop.id));
    if (!day) return;
    setStopStatus(tripId, day.day, stop.name, status);
    refresh();
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
          Every plan you have made, how it went, and why the ones you dropped were dropped
        </p>
      </div>

      {loaded && trips.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-6 text-center">
            {[
              { value: stats.total, label: 'planned' },
              { value: stats.completed, label: 'completed' },
              { value: stats.active, label: 'in progress' },
              { value: stats.cancelled, label: 'cancelled' },
              { value: stats.favourites, label: 'favourites' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFilter(f.id)}>
                <Badge variant={filter === f.id ? 'default' : 'secondary'} className="cursor-pointer">
                  {f.label}
                </Badge>
              </button>
            ))}

            <Button
              variant={favouritesOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFavouritesOnly((v) => !v)}
            >
              <Heart className={favouritesOnly ? 'fill-current' : ''} />
              Show favourites
            </Button>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[190px]">
                <ArrowUpDown className="h-4 w-4 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {!loaded ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : trips.length === 0 ? (
        <Card className="shadow-lg max-w-2xl mx-auto">
          <CardContent className="p-12 text-center space-y-4">
            <Luggage className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">No trips yet</h2>
              <p className="text-muted-foreground">
                Plan an itinerary and approve it, and it will be waiting here.
              </p>
            </div>
            <Button asChild>
              <Link href="/">Plan a trip</Link>
            </Button>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="shadow-lg max-w-2xl mx-auto">
          <CardContent className="p-12 text-center space-y-2">
            <p className="font-semibold">Nothing matches these filters</p>
            <p className="text-sm text-muted-foreground">
              Try a different status, or turn off the favourites filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 max-w-5xl mx-auto">
          {visible.map((trip, index) => {
            const { done, total } = progressOf(trip);
            const open = openId === trip.id;
            const cancelled = trip.status === TRIP_STATUS.CANCELLED;

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05 }}
              >
                <Card className={`shadow-lg border-l-4 border-primary ${cancelled ? 'opacity-75' : ''}`}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className={cancelled ? 'line-through' : ''}>
                            {trip.fromName} to {trip.destinationName}
                          </span>
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
                            {trip.days?.length || 0} days
                          </span>
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={trip.status === TRIP_STATUS.COMPLETED ? 'default' : 'secondary'}>
                          {trip.status === TRIP_STATUS.COMPLETED && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {STATUS_LABEL[trip.status] || 'Upcoming'}
                        </Badge>
                        {!cancelled && total > 0 && (
                          <Badge variant="secondary">
                            {done} of {total} stops
                          </Badge>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={trip.favourite ? 'Remove from favourites' : 'Add to favourites'}
                          onClick={() => {
                            toggleFavourite(trip.id);
                            refresh();
                          }}
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              trip.favourite ? 'fill-primary text-primary' : 'text-muted-foreground'
                            }`}
                          />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Share trip"
                          onClick={() => setSharing(trip)}
                        >
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                        </Button>

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
                          onClick={() => {
                            deleteTrip(trip.id);
                            refresh();
                            if (openId === trip.id) setOpenId(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>

                    {cancelled && trip.cancellation && (
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Badge variant="secondary">
                          <CircleSlash className="h-3 w-3 mr-1" />
                          {trip.cancellation.reason}
                        </Badge>
                        {trip.cancellation.note && (
                          <span className="text-xs text-muted-foreground">
                            {trip.cancellation.note}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            reinstateTrip(trip.id);
                            refresh();
                          }}
                        >
                          <RotateCcw />
                          Reinstate
                        </Button>
                      </div>
                    )}
                  </CardHeader>

                  {open && (
                    <CardContent className="space-y-4">
                      <Separator />
                      <DayRoutePlanner
                        days={trip.days}
                        anchor={trip.anchor?.coords}
                        anchorName={trip.anchor?.name}
                        editable={false}
                        onStatusChange={cancelled ? null : handleStatusChange(trip.id)}
                      />
                      {!cancelled && (
                        <div className="flex justify-end pt-2">
                          <Button variant="outline" size="sm" onClick={() => setCancelling(trip)}>
                            <CircleSlash />
                            Cancel this trip
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {sharing && <ShareTripDialog trip={sharing} onClose={() => setSharing(null)} />}
      {cancelling && (
        <CancelTripDialog
          trip={cancelling}
          onClose={() => setCancelling(null)}
          onCancel={(reason, note) => {
            cancelTrip(cancelling.id, reason, note);
            setCancelling(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
