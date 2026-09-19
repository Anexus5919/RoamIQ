// /lib/trip-store.js
//
// Local persistence for planned trips and their history.
//
// The app has no sign in, so a trip belongs to the browser that planned it.
// localStorage keeps plans across refreshes and restarts without standing up
// auth and a database for a single device. Sharing happens through a QR code
// that carries the plan itself, so no server is needed for that either.

const STORAGE_KEY = 'roamiq.trips.v1';

/** A trip moves through these states, and history records how it ended. */
export const TRIP_STATUS = {
  APPROVED: 'approved',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const CANCEL_REASONS = [
  'Plans changed',
  'Trip postponed',
  'Budget did not work out',
  'Weather or travel conditions',
  'Health or personal reasons',
  'Booked something else',
  'Other',
];

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

/** Save or overwrite a trip, returning the stored record. */
export function saveTrip(trip) {
  const trips = readAll();
  const id = trip.id || `trip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record = {
    status: TRIP_STATUS.APPROVED,
    favourite: false,
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

/** Count how far through a trip the traveller is. */
export function progressOf(trip) {
  const stops = (trip?.days || []).flatMap((d) => d.stops || []);
  const done = stops.filter((s) => s.status === 'done').length;
  return { done, total: stops.length };
}

/**
 * Mark a stop as arrived at or finished.
 * A trip becomes active on the first check in, and completes itself once
 * every stop is done, so history fills in without the traveller maintaining it.
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

  const next = { ...trip, days };
  const { done, total } = progressOf(next);

  if (total > 0 && done === total) {
    next.status = TRIP_STATUS.COMPLETED;
    next.completedAt = Date.now();
  } else if (trip.status === TRIP_STATUS.APPROVED) {
    next.status = TRIP_STATUS.ACTIVE;
    next.startedAt = trip.startedAt || Date.now();
  }

  return saveTrip(next);
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

/**
 * Cancel a trip with a reason. Cancelled trips stay in history rather than
 * being deleted, which is the point of keeping an accountability list.
 */
export function cancelTrip(tripId, reason, note = '') {
  const trip = getTrip(tripId);
  if (!trip) return null;
  return saveTrip({
    ...trip,
    status: TRIP_STATUS.CANCELLED,
    cancellation: { reason, note, at: Date.now() },
  });
}

/** Undo a cancellation, putting the trip back in play. */
export function reinstateTrip(tripId) {
  const trip = getTrip(tripId);
  if (!trip) return null;
  const { cancellation, ...rest } = trip;
  const { done, total } = progressOf(trip);
  return saveTrip({
    ...rest,
    status: done > 0 && done === total ? TRIP_STATUS.COMPLETED : done > 0 ? TRIP_STATUS.ACTIVE : TRIP_STATUS.APPROVED,
  });
}

/** Mark a trip finished even if some stops were skipped. */
export function completeTrip(tripId) {
  const trip = getTrip(tripId);
  if (!trip) return null;
  return saveTrip({ ...trip, status: TRIP_STATUS.COMPLETED, completedAt: Date.now() });
}

export function toggleFavourite(tripId) {
  const trip = getTrip(tripId);
  if (!trip) return null;
  return saveTrip({ ...trip, favourite: !trip.favourite });
}

/** Aggregate counts for the history summary. */
export function historyStats(trips) {
  return {
    total: trips.length,
    completed: trips.filter((t) => t.status === TRIP_STATUS.COMPLETED).length,
    cancelled: trips.filter((t) => t.status === TRIP_STATUS.CANCELLED).length,
    active: trips.filter((t) => t.status === TRIP_STATUS.ACTIVE).length,
    favourites: trips.filter((t) => t.favourite).length,
  };
}
