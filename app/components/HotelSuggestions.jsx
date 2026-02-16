// /app/components/HotelSuggestions.jsx
import Image from 'next/image';
import { Hotel, Star, MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const StarRating = ({ rating }) => {
  if (!rating) return null;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars
                ? 'fill-yellow-400 text-yellow-400'
                : i === fullStars && hasHalfStar
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-muted text-muted'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground ml-1">({rating})</span>
    </div>
  );
};

export default function HotelSuggestions({ hotels }) {
  if (!hotels || hotels.length === 0) {
    return (
      <Card className="sticky top-24 shadow-lg">
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
    <Card className="sticky top-24 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hotel className="h-5 w-5 text-primary" />
          Hotel Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hotels.map((hotel, index) => {
          const hotelName = (typeof hotel?.name === 'string' && hotel.name.trim() !== '') ? hotel.name : 'Hotel';
          const hotelAddress = (typeof hotel?.address === 'string') ? hotel.address : '';
          const fallbackSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(hotelName + " " + (hotelAddress || ''))}`;
          const finalUrl = (typeof hotel?.link === 'string' && hotel.link.trim() !== '') ? hotel.link : fallbackSearchUrl;
          const photoSrc = (typeof hotel?.photo === 'string' && hotel.photo.trim() !== '') ? hotel.photo : null;
          const placeholderSvg =
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect width="96" height="96" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3EHotel%3C/text%3E%3C/svg%3E';
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
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors" title={hotelName}>
                        {hotelName}
                      </h3>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                    </div>
                    {hotel.rating && (
                      <div className="mt-1">
                        <StarRating rating={hotel.rating} />
                      </div>
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