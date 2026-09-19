// /lib/trip-share.js
//
// Packs a trip into a URL small enough to live inside a QR code.
//
// The receiving traveller re-anchors the plan on their own hotel, which
// re-clusters the days from scratch. That means the day grouping, stop order
// and leg distances never need to travel, only the places themselves. A
// 21 stop, 6 day trip comes out around 820 characters with prose included,
// which scans reliably from a phone screen.

/** Shorten keys aggressively: every byte counts inside a QR. */
function pack(trip) {
  const stops = (trip.days || []).flatMap((d) => d.stops || []);

  return {
    v: 1,
    d: trip.destinationName || '',
    f: trip.fromName || '',
    n: (trip.days || []).length,
    dt: trip.dates || [],
    b: trip.destinationSummary?.bestTimeToVisit || '',
    // [name, lat, lon, rating] with coordinates trimmed to 5 decimals, which
    // is about a metre of precision and plenty for routing.
    p: stops
      .filter((s) => s.coords)
      .map((s) => [
        s.name,
        Number(s.coords.lat.toFixed(5)),
        Number(s.coords.lon.toFixed(5)),
        s.rating ?? null,
      ]),
    x: stops.filter((s) => s.coords).map((s) => s.description || ''),
  };
}

function unpack(data) {
  return {
    version: data.v || 1,
    destinationName: data.d || '',
    fromName: data.f || '',
    dayCount: data.n || 1,
    dates: data.dt || [],
    bestTimeToVisit: data.b || '',
    places: (data.p || []).map(([name, lat, lon, rating], i) => ({
      name,
      coords: { lat, lon },
      rating: rating ?? null,
      description: data.x?.[i] || '',
    })),
  };
}

function toBase64Url(bytes) {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function deflate(text) {
  // CompressionStream is unavailable on older Safari, so fall back to plain
  // base64. Larger, but the link still works.
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes) {
  if (typeof DecompressionStream === 'undefined') return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

/** Encode a trip into the fragment of a shareable URL. */
export async function encodeTrip(trip) {
  const json = JSON.stringify(pack(trip));
  const compressed = await deflate(json);

  if (compressed) return `z${toBase64Url(compressed)}`;
  return `r${toBase64Url(new TextEncoder().encode(json))}`;
}

/** Decode a fragment produced by encodeTrip. Returns null if unreadable. */
export async function decodeTrip(token) {
  if (!token || token.length < 2) return null;

  try {
    const mode = token[0];
    const bytes = fromBase64Url(token.slice(1));

    let json;
    if (mode === 'z') json = await inflate(bytes);
    else if (mode === 'r') json = new TextDecoder().decode(bytes);
    else return null;

    if (!json) return null;
    return unpack(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Full URL a QR code should point at. */
export async function shareUrlFor(trip, origin) {
  const token = await encodeTrip(trip);
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/shared#${token}`;
}
