// /app/components/LocalDining.jsx
import Image from 'next/image';
import { UtensilsCrossed, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import StarRating from './StarRating';

const placeholderSvg =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect width="96" height="96" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="11"%3EPlace%3C/text%3E%3C/svg%3E';

export default function LocalDining({ places }) {
  if (!places || places.length === 0) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          Where to Eat
        </CardTitle>
        <CardDescription>Highly rated spots pulled live from Google Local.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {places.map((place, index) => {
          const fallbackSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
            `${place.name} ${place.address || ''}`
          )}`;
          const finalUrl = place.link || fallbackSearchUrl;

          return (
            <a
              href={finalUrl}
              target="_blank"
              rel="noopener noreferrer"
              key={index}
              className="block group"
            >
              <Card className="overflow-hidden transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer">
                <div className="flex">
                  <div className="relative w-24 h-24 flex-shrink-0 bg-muted">
                    <Image
                      src={place.photo || placeholderSvg}
                      alt={place.name}
                      fill
                      className="object-cover"
                      unoptimized={true}
                    />
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-semibold text-sm truncate group-hover:text-primary transition-colors"
                        title={place.name}
                      >
                        {place.name}
                      </h3>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                    </div>

                    {place.rating != null && (
                      <div className="mt-1">
                        <StarRating rating={place.rating} reviews={place.reviews} />
                      </div>
                    )}

                    {place.price && (
                      <div className="mt-1.5">
                        <Badge variant="secondary">{place.price}</Badge>
                      </div>
                    )}

                    {place.type && (
                      <p className="text-xs text-muted-foreground truncate mt-1" title={place.type}>
                        {place.type}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </a>
          );
        })}
      </CardContent>
    </Card>
  );
}
