// /app/components/ItineraryDisplay.jsx
import { Calendar, Clock, Sparkles, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Separator } from './ui/separator';

export default function ItineraryDisplay({ itinerary, children }) {
  if (!itinerary) return null;

  const { destinationName, destinationSummary, thoughtProcess } = itinerary;

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center space-y-4">
        <CardTitle className="text-3xl md:text-4xl bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">
          Your Trip to {destinationName}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Best Time to Visit - Prominent Display */}
        {destinationSummary?.bestTimeToVisit && (
          <Card className="border-l-4 border-primary bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    Best Time to Visit
                    <Sparkles className="h-4 w-4 text-primary" />
                  </h3>
                  <p className="text-base text-foreground leading-relaxed">
                    {destinationSummary.bestTimeToVisit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {thoughtProcess && (
          <Card className="border-l-4 border-primary bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">AI Planner's Thoughts</h4>
                  <p className="text-sm text-muted-foreground italic">{thoughtProcess}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {children}

      </CardContent>
    </Card>
  );
}