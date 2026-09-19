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

// A QR code in byte mode with medium error correction tops out near 2300
// characters, and anything past roughly 1200 gets dense enough that phone
// cameras struggle. Stop descriptions are the only large field, and they are
// also the only one the recipient can live without, so they are dropped when
// the payload would not scan.
const QR_COMFORTABLE_LIMIT = 1200;

async function encodePayload(data) {
  const json = JSON.stringify(data);
  const compressed = await deflate(json);
  if (compressed) return `z${toBase64Url(compressed)}`;
  return `r${toBase64Url(new TextEncoder().encode(json))}`;
}

/**
 * Encode a trip into the fragment of a shareable URL.
 * Returns the token plus whether the descriptions survived.
 */
export async function encodeTrip(trip) {
  const full = pack(trip);
  const withProse = await encodePayload(full);
  if (withProse.length <= QR_COMFORTABLE_LIMIT) {
    return { token: withProse, prose: true };
  }

  const { x, ...slim } = full;
  const withoutProse = await encodePayload(slim);
  return { token: withoutProse, prose: false };
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

/**
 * Full URL a QR code should point at, plus whether prose survived packing.
 *
 * The origin matters more than it looks. A QR generated on localhost encodes
 * `http://localhost:3000`, and a phone scanning that looks for a server on the
 * phone itself, so the link is dead. Set NEXT_PUBLIC_SHARE_ORIGIN to this
 * machine's LAN address, or to the deployed site, when the code has to be
 * scanned by another device.
 */
export function shareOrigin() {
  const configured = process.env.NEXT_PUBLIC_SHARE_ORIGIN;
  if (configured) return configured.replace(/\/+$/, '');
  return typeof window !== 'undefined' ? window.location.origin : '';
}

/** True when the QR would be unreachable from any device but this one. */
export function shareOriginIsLocal(origin = shareOrigin()) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(origin);
}

export async function shareUrlFor(trip, origin) {
  const { token, prose } = await encodeTrip(trip);
  const base = origin || shareOrigin();
  return { url: `${base}/shared#${token}`, prose, local: shareOriginIsLocal(base) };
}
