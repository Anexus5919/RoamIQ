// /app/api/suggestions/route.js
import { NextResponse } from 'next/server';
import { exploreDestinations } from '@/lib/serpapi';

// Trip inspiration used to come from a hand-seeded MongoDB collection. It now
// comes from Google Travel Explore via SerpApi, so the destinations — and their
// flight prices — are live rather than static.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const originCode = (searchParams.get('from') || 'BOM').toUpperCase();

  try {
    const destinations = await exploreDestinations({ originCode, limit: 12 });
    return NextResponse.json({ origin: originCode, destinations });
  } catch (error) {
    console.error('Failed to fetch destination suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch destination suggestions' },
      { status: 500 }
    );
  }
}

// Keep results fresh rather than baked in at build time.
export const dynamic = 'force-dynamic';
