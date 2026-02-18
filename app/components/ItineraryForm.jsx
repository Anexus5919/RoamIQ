// /app/components/ItineraryForm.jsx
'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRightLeft, Plane, Calendar as CalendarIcon, Wallet, Tag, Loader2, X } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function ItineraryForm({ onSubmit, isLoading }) {
  const searchParams = useSearchParams();
  const prefilledDestination = searchParams.get('destination');
  const [from, setFrom] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('Mid-range');
  const [transportMode, setTransportMode] = useState('Flight');
  const [interestPills, setInterestPills] = useState([]);
  const [interestInput, setInterestInput] = useState('');

  useEffect(() => {
    if (prefilledDestination) {
      setDestination(prefilledDestination);
    }
  }, [prefilledDestination]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    onSubmit({ 
      from, 
      destination, 
      startDate, 
      endDate, 
      budget, 
      transportMode, 
      interests: interestPills 
    });
  };

  const handleSwapLocations = () => {
    const temp = from;
    setFrom(destination);
    setDestination(temp);
  };

  const handleInterestKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmedValue = interestInput.trim();
      if (trimmedValue && !interestPills.includes(trimmedValue)) {
        setInterestPills([...interestPills, trimmedValue]);
        setInterestInput('');
      }
    } else if (e.key === 'Backspace' && !interestInput && interestPills.length > 0) {
      // Remove last pill on backspace if input is empty
      setInterestPills(interestPills.slice(0, -1));
    }
  };

  const removePill = (indexToRemove) => {
    setInterestPills(interestPills.filter((_, index) => index !== indexToRemove));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Fields with Swap */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="from" className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-muted-foreground" />
                From
              </Label>
              <Input
                id="from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="New York, USA"
                required
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSwapLocations}
              className="mb-0.5"
              aria-label="Swap locations"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>

            <div className="space-y-2">
              <Label htmlFor="destination" className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-muted-foreground rotate-45" />
                Destination
              </Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Paris, France"
                required
              />
            </div>
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Budget & Transport */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget" className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Budget
              </Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger id="budget">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Budget">Budget</SelectItem>
                  <SelectItem value="Mid-range">Mid-range</SelectItem>
                  <SelectItem value="Luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportMode" className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-muted-foreground" />
                Main Transport
              </Label>
              <Select value={transportMode} onValueChange={setTransportMode}>
                <SelectTrigger id="transportMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flight">Flight</SelectItem>
                  <SelectItem value="Train">Train</SelectItem>
                  <SelectItem value="Car">Car</SelectItem>
                  <SelectItem value="Any">Any</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Interests with Pills */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Interests
            </Label>
            <div className="min-h-[2.5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <div className="flex flex-wrap gap-2">
                {interestPills.map((pill, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-primary text-primary-foreground rounded-full px-3 py-1 text-sm font-medium"
                  >
                    <span>{pill}</span>
                    <button
                      type="button"
                      onClick={() => removePill(index)}
                      className="hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${pill}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={handleInterestKeyDown}
                  placeholder={interestPills.length === 0 ? "Type and press Enter (e.g., food, history, art)" : "Add more..."}
                  className="flex-1 min-w-[120px] outline-none bg-transparent placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Enter or comma to add an interest. At least one interest is required.
            </p>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isLoading || interestPills.length === 0} 
            className="w-full" 
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Build My Itinerary'
            )}
          </Button>
        </form>
  );
}
