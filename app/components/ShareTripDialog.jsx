// /app/components/ShareTripDialog.jsx
'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { shareUrlFor } from '@/lib/trip-share';

/**
 * Shows a QR code carrying the whole plan.
 *
 * There is no scanner to build: a phone's normal camera app opens the link
 * directly. The plan travels inside the URL, so nothing is stored on a server.
 */
export default function ShareTripDialog({ trip, onClose }) {
  const [url, setUrl] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const link = await shareUrlFor(trip);
        if (cancelled) return;
        setUrl(link);

        const image = await QRCode.toDataURL(link, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' },
        });
        if (!cancelled) setDataUrl(image);
      } catch (e) {
        if (!cancelled) {
          setError(
            e?.message?.includes('too big')
              ? 'This plan is too large to fit in a QR code. Copy the link instead.'
              : 'Could not build the share code.'
          );
          }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trip]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Select the link and copy it manually.');
    }
  };

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
            <QrCode className="h-5 w-5 text-primary" />
            Share this plan
          </CardTitle>
          <CardDescription>
            Your friend scans this with their camera. The plan re-routes around wherever they are
            staying.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : !dataUrl ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Building your code...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-lg border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dataUrl}
                  alt={`QR code for the trip to ${trip.destinationName}`}
                  className="h-56 w-56"
                />
              </div>
              <Badge variant="secondary">{url.length} characters, no server involved</Badge>
            </div>
          )}

          {url && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Or send the link</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground truncate flex-1 font-mono" title={url}>
                    {url}
                  </p>
                  <Button variant="outline" size="sm" onClick={copyLink} className="flex-shrink-0">
                    {copied ? <Check /> : <Copy />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
