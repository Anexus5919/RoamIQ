// /app/components/TravelAdvisory.jsx
import { Newspaper, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Separator } from './ui/separator';

export default function TravelAdvisory({ news, destination }) {
  if (!news || news.length === 0) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          Before You Go
        </CardTitle>
        <CardDescription>
          {destination
            ? `Recent coverage about ${destination}, fetched live from Google News.`
            : 'Recent coverage fetched live from Google News.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {news.map((item, index) => (
          <div key={index}>
            {index > 0 && <Separator className="mb-3" />}
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {item.sourceIcon && (
                  <img
                    src={item.sourceIcon}
                    alt={item.source || 'source'}
                    className="h-4 w-4 rounded-sm flex-shrink-0 object-contain"
                  />
                )}
                {item.source && (
                  <span className="text-xs text-muted-foreground truncate">{item.source}</span>
                )}
                {item.date && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">· {item.date}</span>
                )}
              </div>
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
