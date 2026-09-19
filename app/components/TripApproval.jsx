// /app/components/TripApproval.jsx
'use client';

import Link from 'next/link';
import { CheckCircle2, Pencil, Save, BookmarkCheck, GripVertical } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

/**
 * The gate between a proposed plan and a saved one.
 *
 * Nothing is stored until the traveller approves it, and an approved trip can
 * be unlocked again for edits at any point, including mid trip.
 */
export default function TripApproval({ editable, approved, savedId, onEdit, onApprove, onSave }) {
  if (approved && !editable) {
    return (
      <Card className="shadow-lg border-l-4 border-primary bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <BookmarkCheck className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">Trip approved and saved</p>
                <p className="text-xs text-muted-foreground">
                  Check off stops as you go, or reopen it to make changes.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil />
                Edit plan
              </Button>
              {savedId && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/trips">My trips</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-l-4 border-primary">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <GripVertical className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm">
                {editable ? 'Editing your plan' : 'Review your plan'}
              </p>
              <p className="text-xs text-muted-foreground">
                {editable
                  ? 'Drag any stop to reorder it or move it to another day. Distances update as you go.'
                  : 'Stops are grouped by area to keep each day close together.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editable ? (
              <>
                <Badge variant="secondary">Unsaved changes</Badge>
                <Button size="sm" onClick={onSave}>
                  <Save />
                  Done editing
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil />
                  Make changes
                </Button>
                <Button size="sm" onClick={onApprove}>
                  <CheckCircle2 />
                  Approve this plan
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
