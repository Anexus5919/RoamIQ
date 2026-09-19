// /app/components/StarRating.jsx
// Shared so hotels, restaurants and attractions all render ratings identically.
import { Star } from 'lucide-react';

export default function StarRating({ rating, reviews }) {
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
      <span className="text-xs text-muted-foreground ml-1">
        ({rating}
        {reviews ? ` · ${reviews.toLocaleString('en-IN')}` : ''})
      </span>
    </div>
  );
}
