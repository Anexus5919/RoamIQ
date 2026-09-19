// /app/components/CancelTripDialog.jsx
'use client';

import { useState } from 'react';
import { X, CircleSlash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CANCEL_REASONS } from '@/lib/trip-store';

/**
 * Cancelling asks why. A cancelled trip stays in history with its reason
 * attached, which is the whole point of keeping the list.
 */
export default function CancelTripDialog({ trip, onCancel, onClose }) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [note, setNote] = useState('');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <CircleSlash className="h-5 w-5 text-primary" />
            Cancel this trip
          </CardTitle>
          <CardDescription>
            {trip.fromName} to {trip.destinationName}. It stays in your history with the reason.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Why are you cancelling?</Label>
            <div className="flex flex-wrap gap-2">
              {CANCEL_REASONS.map((option) => (
                <button key={option} type="button" onClick={() => setReason(option)}>
                  <Badge
                    variant={reason === option ? 'default' : 'secondary'}
                    className="cursor-pointer"
                  >
                    {option}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-note">Anything to add? (optional)</Label>
            <Input
              id="cancel-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A short note for your own records"
              maxLength={200}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Keep the trip
            </Button>
            <Button variant="destructive" onClick={() => onCancel(reason, note.trim())}>
              <CircleSlash />
              Cancel trip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
