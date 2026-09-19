// /lib/itinerary-planner.js
//
// Turns a flat list of places into geographically sane day routes.
//
// A language model has no spatial reasoning, so asking it to sequence stops
// produces days that bounce across the city. Routing is a solved maths
// problem, so it is solved here and the model is handed a finished route to
// describe rather than an ordering decision to guess at.
//
// Everything in this file is pure arithmetic. No API calls, no credits.

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/** Great circle distance between two { lat, lon } points, in kilometres. */
export function haversineKm(a, b) {
  if (!a || !b) return null;
  const lat1 = Number(a.lat ?? a.latitude);
  const lon1 = Number(a.lon ?? a.longitude);
  const lat2 = Number(b.lat ?? b.latitude);
  const lon2 = Number(b.lon ?? b.longitude);

  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Compass direction from one point to another, for human readable hints. */
export function bearingLabel(from, to) {
  const d = haversineKm(from, to);
  if (d == null || d < 0.5) return 'nearby';

  const dLat = (to.lat ?? to.latitude) - (from.lat ?? from.latitude);
  const dLon = (to.lon ?? to.longitude) - (from.lon ?? from.longitude);
  const angle = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return compass[Math.round(((angle + 360) % 360) / 45) % 8];
}

function coordsOf(place) {
  const c = place?.coords || place?.gps_coordinates || place;
  const lat = Number(c?.lat ?? c?.latitude);
  const lon = Number(c?.lon ?? c?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

/** Keep only places we can actually place on a map. */
export function withCoordinates(places) {
  return (places || []).filter((p) => coordsOf(p) !== null);
}

function centroidOf(cluster) {
  const points = cluster.map(coordsOf).filter(Boolean);
  if (points.length === 0) return null;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lon: points.reduce((s, p) => s + p.lon, 0) / points.length,
  };
}

/**
 * Pick which places actually make the trip.
 *
 * A destination can return far more highly rated places than anyone can visit,
 * and forcing them all in produces days that cross an entire state. Places are
 * scored on reputation and on how far they sit from the hotel, then the best
 * `dayCount * stopsPerDay` are kept.
 */
function selectPlaces(places, limit, anchor) {
  if (places.length <= limit) return places;

  const distances = places.map((p) => haversineKm(anchor, coordsOf(p)) ?? 0);
  const maxDistance = Math.max(...distances, 1);
  const ratings = places.map((p) => (Number.isFinite(p.rating) ? p.rating : 4));
  const maxRating = Math.max(...ratings, 1);

  return places
    .map((place, i) => ({
      place,
      score: 0.6 * (ratings[i] / maxRating) + 0.4 * (1 - distances[i] / maxDistance),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.place);
}

/**
 * Group places into balanced, geographically coherent days.
 *
 * Plain k-means happily produces one day with nine stops and another with one,
 * so this uses a capacitated greedy pass instead: take the unvisited place
 * furthest from the hotel as the day's seed, then pull in its nearest
 * neighbours. A day stops growing once the next nearest place is beyond
 * `radiusKm`, which is what keeps a compact city like Varanasi tight without
 * forcing a sprawling one like Goa into 150 km days.
 *
 * That can leave more pockets than there are days, so the closest pockets are
 * then merged agglomeratively until the count matches.
 */
function clusterIntoDays(places, dayCount, stopsPerDay, anchor, radiusKm) {
  const remaining = [...places];
  let clusters = [];

  while (remaining.length > 0) {
    let seedIndex = 0;
    let seedDistance = -1;
    remaining.forEach((place, i) => {
      const distance = haversineKm(anchor, coordsOf(place)) ?? 0;
      if (distance > seedDistance) {
        seedDistance = distance;
        seedIndex = i;
      }
    });

    const seed = remaining.splice(seedIndex, 1)[0];
    const cluster = [seed];

    while (cluster.length < stopsPerDay && remaining.length > 0) {
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      remaining.forEach((place, i) => {
        const distance = haversineKm(coordsOf(seed), coordsOf(place)) ?? Infinity;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      });

      // Everything else is too far to belong to this day.
      if (nearestIndex < 0 || nearestDistance > radiusKm) break;
      cluster.push(remaining.splice(nearestIndex, 1)[0]);
    }

    clusters.push(cluster);
  }

  // Too many pockets: repeatedly fuse the two closest.
  while (clusters.length > dayCount) {
    let bestI = 0;
    let bestJ = 1;
    let bestDistance = Infinity;

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = haversineKm(centroidOf(clusters[i]), centroidOf(clusters[j])) ?? Infinity;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestI = i;
          bestJ = j;
        }
      }
    }

    clusters[bestI] = clusters[bestI].concat(clusters[bestJ]);
    clusters.splice(bestJ, 1);
  }

  // Too few pockets: split the largest until every day has something to do.
  while (clusters.length < dayCount && clusters.some((c) => c.length > 1)) {
    let largest = 0;
    clusters.forEach((c, i) => {
      if (c.length > clusters[largest].length) largest = i;
    });
    const half = Math.ceil(clusters[largest].length / 2);
    const tail = clusters[largest].slice(half);
    clusters[largest] = clusters[largest].slice(0, half);
    clusters.push(tail);
  }

  // Visit the closest pocket first and work outwards.
  clusters.sort((a, b) => {
    const da = haversineKm(anchor, centroidOf(a)) ?? 0;
    const db = haversineKm(anchor, centroidOf(b)) ?? 0;
    return da - db;
  });

  return clusters;
}

/**
 * Order one day's stops as a short walk: start at the hotel, always hop to the
 * nearest place not yet seen. A greedy nearest neighbour pass, which is the
 * standard cheap approximation for a travelling salesman route and is more
 * than good enough for three or four stops.
 */
function orderWithinDay(cluster, anchor) {
  const remaining = [...cluster];
  const ordered = [];
  let cursor = anchor;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    remaining.forEach((place, i) => {
      const distance = haversineKm(cursor, coordsOf(place)) ?? Infinity;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    });

    const next = remaining.splice(nearestIndex, 1)[0];
    ordered.push(next);
    cursor = coordsOf(next);
  }

  return ordered;
}

/**
 * Recalculate leg distances for one day after the traveller reorders stops or
 * changes where they are staying. Pure arithmetic, so it runs instantly on the
 * client every time a card is dragged.
 */
export function recomputeLegs(stops, anchor, anchorName = 'your hotel') {
  let cursor = anchor;
  let cursorName = anchorName;
  let totalKm = 0;

  const rebuilt = (stops || []).map((stop) => {
    const here = coordsOf(stop);
    const legKm = haversineKm(cursor, here) ?? 0;
    totalKm += legKm;

    const next = {
      ...stop,
      coords: here || stop.coords || null,
      leg: {
        fromName: cursorName,
        km: Math.round(legKm * 10) / 10,
        direction: bearingLabel(cursor, here),
      },
    };

    if (here) {
      cursor = here;
      cursorName = stop.name || 'previous stop';
    }
    return next;
  });

  const returnKm = haversineKm(cursor, anchor) ?? 0;
  const first = rebuilt[0]?.coords;

  return {
    stops: rebuilt,
    totalKm: Math.round((totalKm + returnKm) * 10) / 10,
    returnKm: Math.round(returnKm * 10) / 10,
    spreadKm:
      first && rebuilt.length
        ? Math.round(Math.max(0, ...rebuilt.map((s) => haversineKm(first, s.coords) ?? 0)) * 10) / 10
        : 0,
  };
}

/**
 * Build day by day routes anchored on where the traveller is sleeping.
 *
 * @param {object}   options
 * @param {Array}    options.places      Places carrying coordinates
 * @param {number}   options.dayCount    How many sightseeing days to fill
 * @param {object}   options.anchor      { lat, lon } of the hotel
 * @param {string}   options.anchorName  Label for the hotel, shown in legs
 * @param {number}   [options.stopsPerDay]
 */
export function planDayRoutes({
  places,
  dayCount,
  anchor,
  anchorName = 'your hotel',
  stopsPerDay = 3,
  radiusKm = 12,
}) {
  const usable = withCoordinates(places);
  if (usable.length === 0 || !anchor || dayCount < 1) return [];

  const perDay = Math.max(1, stopsPerDay);
  const shortlist = selectPlaces(usable, dayCount * perDay, anchor);
  const clusters = clusterIntoDays(shortlist, dayCount, perDay, anchor, radiusKm);

  return clusters.map((cluster, index) => {
    const ordered = orderWithinDay(cluster, anchor);

    let cursor = anchor;
    let cursorName = anchorName;
    let totalKm = 0;

    const stops = ordered.map((place) => {
      const here = coordsOf(place);
      const legKm = haversineKm(cursor, here) ?? 0;
      totalKm += legKm;

      const stop = {
        ...place,
        coords: here,
        leg: {
          fromName: cursorName,
          km: Math.round(legKm * 10) / 10,
          direction: bearingLabel(cursor, here),
        },
      };

      cursor = here;
      cursorName = place.name || 'previous stop';
      return stop;
    });

    const returnKm = haversineKm(cursor, anchor) ?? 0;

    return {
      day: index + 1,
      stops,
      totalKm: Math.round((totalKm + returnKm) * 10) / 10,
      returnKm: Math.round(returnKm * 10) / 10,
      // How tight the day is. A low spread means everything sits in one pocket.
      spreadKm: Math.round(
        Math.max(
          0,
          ...stops.map((s) => haversineKm(stops[0].coords, s.coords) ?? 0)
        ) * 10
      ) / 10,
    };
  });
}
