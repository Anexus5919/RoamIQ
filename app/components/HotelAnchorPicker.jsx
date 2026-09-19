// /app/components/HotelAnchorPicker.jsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Hotel, MapPinned, Check, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import StarRating from './StarRating';

const placeholderSvg =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect width="96" height="96" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EHotel%3C/text%3E%3C/svg%3E';

/**
 * Where the traveller sleeps is the anchor every day route is measured from,
 * so changing it re-plans the trip.
 *
 * Someone staying at a place the app never suggested can pick "somewhere else"
 * and, once they have actually arrived, capture their real coordinates from
 * the browser. Capturing on arrival rather than at planning time is the point:
 * that is when the device is standing at the hotel.
 */
export default function HotelAnchorPicker({ hotels, anchor, onAnchorChange }) {
  const [mode, setMode] = useState(anchor?.source === 'own-location' ? 'other' : 'suggested');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const captureMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('This browser cannot share a location.');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onAnchorChange({
          name: 'Where you are staying',
          coords: { lat: position.coords.latitude, lon: position.coords.longitude },
          source: 'own-location',
          accuracyM: Math.round(position.coords.accuracy),
        });
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow it in your browser to use this.'
            : 'Could not read your location. Try again once you are at the hotel.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const isSelected = (hotel) => anchor?.source !== 'own-location' && anchor?.name === hotel.name;

  return (
    <Card className="shadow-lg border-l-4 border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hotel className="h-5 w-5 text-primary" />
          Where You Are Staying
        </CardTitle>
        <CardDescription>
          Every day route starts and ends here, so changing it re-plans your days.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {mode === 'suggested' &&
          (hotels || []).map((hotel, index) => {
            const selected = isSelected(hotel);
            return (
              <button
                key={index}
                type="button"
                onClick={() =>
                  hotel.coords &&
                  onAnchorChange({
                    name: hotel.name,
                    coords: {
                      lat: hotel.coords.latitude ?? hotel.coords.lat,
                      lon: hotel.coords.longitude ?? hotel.coords.lon,
                    },
                    source: 'suggested-hotel',
                  })
                }
                disabled={!hotel.coords}
                className="block w-full text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Card
                  className={`overflow-hidden transition-all hover:shadow-md ${
                    selected ? 'ring-2 ring-primary' : 'hover:scale-[1.02] cursor-pointer'
                  }`}
                >
                  <div className="flex">
                    <div className="relative w-24 h-24 flex-shrink-0 bg-muted">
                      <Image
                        src={hotel.photo || placeholderSvg}
                        alt={hotel.name}
                        fill
                        className="object-cover"
                        unoptimized={true}
                      />
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className="font-semibold text-sm truncate group-hover:text-primary transition-colors"
                          title={hotel.name}
                        >
                          {hotel.name}
                        </h3>
                        {selected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>

                      {hotel.rating && (
                        <div className="mt-1">
                          <StarRating rating={hotel.rating} reviews={hotel.reviews} />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {hotel.ratePerNight && (
                          <span className="text-sm font-bold text-primary">
                            {hotel.ratePerNight}
                            <span className="text-xs font-normal text-muted-foreground"> / night</span>
                          </span>
                        )}
                        {selected && <Badge variant="secondary">Routing from here</Badge>}
                      </div>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}

        <Separator />

        {mode === 'suggested' ? (
          <Button variant="outline" className="w-full" onClick={() => setMode('other')}>
            <MapPinned />
            I am staying somewhere else
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPinned className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Once you have reached your hotel, tap below and RoamIQ will use your current
                position as the anchor for every day route.
              </p>
            </div>

            {anchor?.source === 'own-location' && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  <Check className="h-3 w-3 mr-1" />
                  Using your location
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {anchor.coords.lat.toFixed(4)}, {anchor.coords.lon.toFixed(4)}
                  {anchor.accuracyM ? ` (±${anchor.accuracyM} m)` : ''}
                </span>
              </div>
            )}

            {locationError && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{locationError}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={captureMyLocation} disabled={locating}>
                {locating ? <Loader2 className="animate-spin" /> : <Check />}
                {locating ? 'Reading location...' : 'I have checked in here'}
              </Button>
              <Button variant="ghost" onClick={() => setMode('suggested')}>
                Back to suggestions
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
