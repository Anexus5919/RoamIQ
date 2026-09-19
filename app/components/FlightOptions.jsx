// /app/components/FlightOptions.jsx
import { Plane, Leaf, ArrowRight, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';

function formatTime(value) {
  if (!value) return null;
  // SerpApi returns "2026-10-15 05:00"
  const parts = String(value).split(' ');
  return parts.length > 1 ? parts[1] : value;
}

function stopsLabel(stops) {
  if (stops === 0) return 'Non-stop';
  if (stops === 1) return '1 stop';
  return `${stops} stops`;
}

export default function FlightOptions({ flights, route, priceInsights }) {
  if (!flights || flights.length === 0) return null;

  const cheapest = Math.min(...flights.map((f) => f.price ?? Infinity));

  return (
    <Card className="shadow-lg border-l-4 border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-primary" />
          Flight Options
        </CardTitle>
        <CardDescription>
          {route?.from?.code && route?.to?.code
            ? `Live fares from ${route.from.code} to ${route.to.code}, via Google Flights.`
            : 'Live fares via Google Flights.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {flights.map((flight, index) => {
          const isCheapest = flight.price != null && flight.price === cheapest;

          return (
            <Card
              key={index}
              className="overflow-hidden transition-all hover:shadow-md hover:scale-[1.02]"
            >
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {flight.airlineLogo && (
                      <img
                        src={flight.airlineLogo}
                        alt={flight.airline}
                        className="h-6 w-6 flex-shrink-0 object-contain"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" title={flight.airline}>
                        {flight.airline}
                      </p>
                      {flight.flightNumber && (
                        <p className="text-xs text-muted-foreground">{flight.flightNumber}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {flight.price != null && (
                      <p className="font-bold text-base text-primary">
                        ₹{flight.price.toLocaleString('en-IN')}
                      </p>
                    )}
                    {isCheapest && (
                      <Badge variant="secondary" className="mt-1">
                        Cheapest
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{flight.departure?.code}</span>
                  {formatTime(flight.departure?.time) && (
                    <span className="text-muted-foreground text-xs">
                      {formatTime(flight.departure.time)}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">{flight.arrival?.code}</span>
                  {formatTime(flight.arrival?.time) && (
                    <span className="text-muted-foreground text-xs">
                      {formatTime(flight.arrival.time)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {flight.duration && <Badge variant="secondary">{flight.duration}</Badge>}
                  <Badge variant="secondary">{stopsLabel(flight.stops)}</Badge>
                  {flight.travelClass && <Badge variant="secondary">{flight.travelClass}</Badge>}
                  {flight.carbonKg != null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Leaf className="h-3 w-3 flex-shrink-0" />
                      {flight.carbonKg} kg CO₂
                      {flight.carbonVsTypicalPercent < 0 && (
                        <span className="text-primary font-medium">
                          ({flight.carbonVsTypicalPercent}% vs typical)
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {priceInsights?.lowest != null && (
          <div className="flex items-start gap-2 pt-1">
            <TrendingDown className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Lowest fare seen on this route is{' '}
              <span className="font-medium text-foreground">
                ₹{priceInsights.lowest.toLocaleString('en-IN')}
              </span>
              {priceInsights.level ? ` — prices are currently ${priceInsights.level}.` : '.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
