// /app/components/SuggestionCard.jsx
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Plane, Clock } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

function formatDateRange(start, end) {
  if (!start) return null;
  const opts = { day: 'numeric', month: 'short' };
  const from = new Date(start).toLocaleDateString('en-IN', opts);
  if (!end) return from;
  const to = new Date(end).toLocaleDateString('en-IN', opts);
  return `${from} – ${to}`;
}

export default function SuggestionCard({ suggestion }) {
  const {
    name,
    country,
    image,
    airportCode,
    flightPrice,
    flightDuration,
    stops,
    airline,
    startDate,
    endDate,
  } = suggestion;

  const dateRange = formatDateRange(startDate, endDate);

  return (
    <Link
      href={{ pathname: '/', query: { destination: name } }}
      className="block group"
    >
      <Card className="overflow-hidden transition-shadow duration-300 hover:shadow-xl h-full flex flex-col">
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={image}
            alt={`View of ${name}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            unoptimized={true}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

          {flightPrice != null && (
            <div className="absolute top-3 right-3">
              <Badge className="shadow-md">
                from ₹{flightPrice.toLocaleString('en-IN')}
              </Badge>
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-2xl font-bold text-white drop-shadow-lg">{name}</h3>
            {country && (
              <p className="text-sm text-white/90 drop-shadow">
                {country}
                {airportCode ? ` · ${airportCode}` : ''}
              </p>
            )}
          </div>
        </div>

        <CardContent className="flex-1 p-4 space-y-3">
          {dateRange && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">Best dates found</span>
              </div>
              <p className="text-sm pl-5 leading-relaxed">{dateRange}</p>
            </div>
          )}

          {flightDuration && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium">Flight time</span>
              </div>
              <p className="text-sm pl-5 leading-relaxed">
                {flightDuration}
                {stops != null && (
                  <span className="text-muted-foreground">
                    {' '}
                    · {stops === 0 ? 'non-stop' : stops === 1 ? '1 stop' : `${stops} stops`}
                  </span>
                )}
              </p>
            </div>
          )}

          {airline && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Airlines</h4>
              </div>
              <p className="text-sm pl-6 text-muted-foreground leading-relaxed">{airline}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
