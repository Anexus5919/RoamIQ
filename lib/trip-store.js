// /lib/trip-store.js
//
// Local persistence for approved trips.
//
// The app has no sign in, so a trip belongs to the browser that planned it.
// localStorage keeps an approved plan across refreshes and restarts without
// standing up auth and a database for a single device.

const STORAGE_KEY = 'roamiq.trips.v1';

function canStore() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function readAll() {
  if (!canStore()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    // Private mode, blocked storage or corrupt JSON. An empty list is fine.
    return [];
  }
}

function writeAll(trips) {
  if (!canStore()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    return true;
  } catch {
    return false;
  }
}

export function listTrips() {
  return readAll().sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0));
}

export function getTrip(id) {
  return readAll().find((t) => t.id === id) || null;
}

/** Save or overwrite an approved trip, returning the stored record. */
export function saveTrip(trip) {
  const trips = readAll();
  const id = trip.id || `trip_${Date.now()}`;
  const record = {
    ...trip,
    id,
    approvedAt: trip.approvedAt || Date.now(),
    updatedAt: Date.now(),
  };

  const index = trips.findIndex((t) => t.id === id);
  if (index >= 0) trips[index] = record;
  else trips.push(record);

  writeAll(trips);
  return record;
}

export function deleteTrip(id) {
  writeAll(readAll().filter((t) => t.id !== id));
}

/**
 * Mark a stop as arrived at or finished.
 * `status` is one of 'pending', 'arrived', 'done'.
 */
export function setStopStatus(tripId, dayNumber, stopName, status) {
  const trip = getTrip(tripId);
  if (!trip) return null;

  const days = (trip.days || []).map((day) => {
    if (day.day !== dayNumber) return day;
    return {
      ...day,
      stops: (day.stops || []).map((stop) =>
        stop.name === stopName
          ? { ...stop, status, [status === 'arrived' ? 'arrivedAt' : 'doneAt']: Date.now() }
          : stop
      ),
    };
  });

  return saveTrip({ ...trip, days });
}

/** Replace a trip's day routes, used after the traveller reorders stops. */
export function updateTripDays(tripId, days) {
  const trip = getTrip(tripId);
  if (!trip) return null;
  return saveTrip({ ...trip, days });
}

/** Change where the traveller is staying, which re-anchors future routing. */
export function updateTripAnchor(tripId, anchor) {
  const trip = getTrip(tripId);
  if (!trip) return null;
  return saveTrip({ ...trip, anchor });
}
