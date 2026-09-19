// /app/components/DayRoutePlanner.jsx
'use client';

import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Calendar, Route, Hotel } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import StopCard from './StopCard';
import { recomputeLegs } from '@/lib/itinerary-planner';

/**
 * Renders the planned day routes, optionally letting the traveller drag stops
 * into a different order or onto a different day. Distances recalculate on
 * every drop, so the plan always reflects the real walk.
 */
export default function DayRoutePlanner({
  days,
  anchor,
  anchorName,
  editable = false,
  onChange,
  onStatusChange,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dayIds = useMemo(
    () => (days || []).map((d) => (d.stops || []).map((s) => s.id)),
    [days]
  );

  if (!days || days.length === 0) return null;

  function findStop(id) {
    for (let d = 0; d < days.length; d++) {
      const i = (days[d].stops || []).findIndex((s) => s.id === id);
      if (i >= 0) return { dayIndex: d, stopIndex: i };
    }
    return null;
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id || !onChange) return;

    const source = findStop(active.id);
    const target = findStop(over.id);
    if (!source || !target) return;

    const next = days.map((d) => ({ ...d, stops: [...(d.stops || [])] }));
    const [moved] = next[source.dayIndex].stops.splice(source.stopIndex, 1);
    next[target.dayIndex].stops.splice(target.stopIndex, 0, moved);

    // Legs are only meaningful relative to the hotel, so recalculate both the
    // day the stop left and the day it landed on.
    const touched = new Set([source.dayIndex, target.dayIndex]);
    touched.forEach((i) => {
      const recomputed = recomputeLegs(next[i].stops, anchor, anchorName);
      next[i] = { ...next[i], ...recomputed };
    });

    onChange(next);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        {days.map((day, dayIndex) => (
          <Card key={day.day} className="overflow-hidden">
            <CardHeader className="bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
                  {day.day}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl">{day.title || `Day ${day.day}`}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    {day.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {day.date}
                      </span>
                    )}
                    {day.totalKm != null && (
                      <span className="flex items-center gap-1">
                        <Route className="h-3 w-3" />
                        {day.totalKm} km round trip
                      </span>
                    )}
                  </CardDescription>
                </div>
                {day.spreadKm != null && day.spreadKm <= 2 && (
                  <Badge variant="secondary" className="flex-shrink-0">
                    Walkable
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <SortableContext items={dayIds[dayIndex]} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {(day.stops || []).map((stop, stopIndex) => (
                    <StopCard
                      key={stop.id}
                      stop={stop}
                      index={stopIndex}
                      isLast={stopIndex === day.stops.length - 1}
                      editable={editable}
                      onStatusChange={onStatusChange}
                      anchor={anchor}
                    />
                  ))}
                </div>
              </SortableContext>

              {day.returnKm != null && day.returnKm > 0 && (
                <div className="flex items-center gap-2 pt-2 mt-2 border-t text-xs text-muted-foreground">
                  <Hotel className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {day.returnKm} km back to {anchorName || 'your hotel'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </DndContext>
  );
}
