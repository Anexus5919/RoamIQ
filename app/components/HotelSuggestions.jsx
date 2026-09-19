// /app/components/HotelSuggestions.jsx
import Image from 'next/image';
import { Hotel, MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import StarRating from './StarRating';

const placeholderSvg =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect width="96" height="96" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EHotel%3C/text%3E%3C/svg%3E';

export default function HotelSuggestions({ hotels }) {
  if (!hotels || hotels.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            Hotel Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hotel suggestions available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hotel className="h-5 w-5 text-primary" />
          Hotel Suggestions
        </CardTitle>
        <CardDescription>Live nightly rates from Google Hotels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hotels.map((hotel, index) => {
          const hotelName =
            typeof hotel?.name === 'string' && hotel.name.trim() !== '' ? hotel.name : 'Hotel';
          const hotelAddress = typeof hotel?.address === 'string' ? hotel.address : '';
          const fallbackSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
            hotelName + ' ' + (hotelAddress || '')
          )}`;
          const finalUrl =
            typeof hotel?.link === 'string' && hotel.link.trim() !== ''
              ? hotel.link
              : fallbackSearchUrl;
          const photoSrc =
            typeof hotel?.photo === 'string' && hotel.photo.trim() !== '' ? hotel.photo : null;

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
                      src={photoSrc || placeholderSvg}
                      alt={`${hotelName} hotel`}
                      fill
                      className="object-cover"
                      unoptimized={true}
                    />
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-semibold text-sm truncate group-hover:text-primary transition-colors"
                        title={hotelName}
                      >
                        {hotelName}
                      </h3>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                    </div>

                    {hotel.rating && (
                      <div className="mt-1">
                        <StarRating rating={hotel.rating} reviews={hotel.reviews} />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {hotel.ratePerNight && (
                        <span className="text-sm font-bold text-primary">
                          {hotel.ratePerNight}
                          <span className="text-xs font-normal text-muted-foreground">
                            {' '}
                            / night
                          </span>
                        </span>
                      )}
                      {hotel.deal && <Badge variant="secondary">{hotel.deal}</Badge>}
                    </div>

                    {hotel.hotelClass && (
                      <p className="text-xs text-muted-foreground mt-1">{hotel.hotelClass}</p>
                    )}

                    {hotelAddress && (
                      <div className="flex items-start gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground truncate" title={hotelAddress}>
                          {hotelAddress}
                        </p>
                      </div>
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
