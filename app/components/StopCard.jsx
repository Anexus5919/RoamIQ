// /app/components/StopCard.jsx
'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Clock,
  GripVertical,
  Navigation,
  MapPin,
  Check,
  CircleDot,
  Star,
} from 'lucide-react';

import { Badge } from './ui/badge';
import { Button } from './ui/button';

/**
 * Opens the traveller's real Google Maps with turn by turn navigation.
 * Cheaper and far more useful than reimplementing a map, and it works on
 * every phone without an API key.
 */
export function directionsUrl(stop, from) {
  const destination = stop.coords
    ? `${stop.coords.lat},${stop.coords.lon}`
    : encodeURIComponent(stop.name);
  const origin = from ? `&origin=${from.lat},${from.lon}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin}&travelmode=driving`;
}

export function mapUrl(stop) {
  return stop.coords
    ? `https://www.google.com/maps/search/?api=1&query=${stop.coords.lat},${stop.coords.lon}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.name)}`;
}

export default function StopCard({ stop, index, isLast, editable, onStatusChange, anchor }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: !editable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const done = stop.status === 'done';
  const arrived = stop.status === 'arrived';

  return (
    <div ref={setNodeRef} style={style} className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            done
              ? 'bg-primary text-primary-foreground'
              : arrived
              ? 'bg-primary/20'
              : 'bg-primary/10 group-hover:bg-primary/20'
          }`}
        >
          {done ? (
            <Check className="h-4 w-4" />
          ) : arrived ? (
            <CircleDot className="h-4 w-4 text-primary" />
          ) : (
            <Clock className="h-4 w-4 text-primary" />
          )}
        </div>
        {!isLast && <div className="w-0.5 h-full bg-border mt-2" />}
      </div>

      <div className={`flex-1 pb-4 ${done ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {stop.time && (
              <div className="font-semibold text-sm text-primary mb-1">{stop.time}</div>
            )}
            <h4
              className={`font-semibold text-sm ${done ? 'line-through' : ''}`}
              title={stop.name}
            >
              {stop.name}
            </h4>
          </div>

          {editable && (
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary transition-colors flex-shrink-0 p-1"
              aria-label={`Reorder ${stop.name}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {stop.leg && (
            <Badge variant="secondary">
              {stop.leg.km} km {stop.leg.direction !== 'nearby' ? stop.leg.direction : ''} from{' '}
              {stop.leg.fromName}
            </Badge>
          )}
          {stop.rating != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
              {stop.rating}
            </span>
          )}
        </div>

        {stop.description && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">{stop.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button variant="outline" size="sm" asChild>
            <a href={directionsUrl(stop, anchor)} target="_blank" rel="noopener noreferrer">
              <Navigation />
              Get directions
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={mapUrl(stop)} target="_blank" rel="noopener noreferrer">
              <MapPin />
              View on map
            </a>
          </Button>

          {onStatusChange && !done && (
            <Button
              variant={arrived ? 'default' : 'secondary'}
              size="sm"
              onClick={() => onStatusChange(stop, arrived ? 'done' : 'arrived')}
            >
              {arrived ? (
                <>
                  <Check />
                  Done, next stop
                </>
              ) : (
                <>
                  <CircleDot />
                  I&apos;m here
                </>
              )}
            </Button>
          )}
          {done && (
            <Badge variant="secondary">
              <Check className="h-3 w-3 mr-1" />
              Visited
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
