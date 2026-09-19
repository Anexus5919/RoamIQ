// /app/suggestions/page.jsx
import Link from 'next/link';
import { Compass } from 'lucide-react';
import SuggestionCard from '../components/SuggestionCard';
import { Badge } from '../components/ui/badge';
import { exploreDestinations } from '@/lib/serpapi';

// Popular Indian origin airports. Picking one re-runs Google Travel Explore
// for that city, so prices and dates are always live.
const ORIGINS = [
  { code: 'BOM', city: 'Mumbai' },
  { code: 'DEL', city: 'Delhi' },
  { code: 'BLR', city: 'Bengaluru' },
  { code: 'MAA', city: 'Chennai' },
  { code: 'HYD', city: 'Hyderabad' },
  { code: 'CCU', city: 'Kolkata' },
];

export default async function SuggestionsPage({ searchParams }) {
  const params = await searchParams;
  const originCode = (params?.from || 'BOM').toUpperCase();
  const origin = ORIGINS.find((o) => o.code === originCode) || ORIGINS[0];

  const destinations = await exploreDestinations({ originCode: origin.code, limit: 12 });

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Compass className="h-10 w-10 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">
            Trip Inspiration
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Live destinations and real flight prices from {origin.city}, updated as fares move
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground font-medium mr-1">Flying from</span>
        {ORIGINS.map((o) => (
          <Link key={o.code} href={`/suggestions?from=${o.code}`}>
            <Badge
              variant={o.code === origin.code ? 'default' : 'secondary'}
              className="cursor-pointer"
            >
              {o.city}
            </Badge>
          </Link>
        ))}
      </div>

      {destinations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No destinations available right now. Please try another departure city.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((destination) => (
            <SuggestionCard
              key={`${destination.name}-${destination.airportCode}`}
              suggestion={destination}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Ensure dynamic fetching if deploying
export const dynamic = 'force-dynamic';
