import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AlignmentHeatmapProps {
  alignments: { date: string; hasReflection: boolean }[];
}

export default function AlignmentHeatmap({ alignments }: AlignmentHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Get the last 12 weeks (84 days)
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 83); // 84 days including today
    startDate.setHours(0, 0, 0, 0); // Start of that day
    
    // Create maps for alignments and reflections
    const alignmentDates = new Map<string, boolean>(); // Has any alignment
    const reflectionDates = new Map<string, boolean>(); // Has reflection
    
    alignments.forEach(alignment => {
      const date = alignment.date.split('T')[0];
      alignmentDates.set(date, true);
      if (alignment.hasReflection) {
        reflectionDates.set(date, true);
      }
    });
    
    // Generate grid: 7 rows (days) x 12 columns (weeks)
    const grid: Array<Array<{ date: Date; hasReflection: boolean; hasAlignment: boolean } | null>> = Array(7).fill(null).map(() => []);
    
    // Start from the first Sunday before or on startDate
    const firstSunday = new Date(startDate);
    const dayOfWeek = firstSunday.getDay();
    if (dayOfWeek !== 0) {
      firstSunday.setDate(firstSunday.getDate() - dayOfWeek);
    }
    
    // Fill the grid: rows = days of week, columns = weeks
    for (let week = 0; week < 12; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(firstSunday);
        date.setDate(firstSunday.getDate() + (week * 7) + day);
        const dateStr = date.toISOString().split('T')[0];
        const hasAlignment = alignmentDates.has(dateStr);
        const hasReflection = reflectionDates.has(dateStr);
        
        // Only show dates within our range and that have alignments
        if (date >= startDate && date <= today && hasAlignment) {
          grid[day][week] = { date, hasReflection, hasAlignment };
        } else {
          grid[day][week] = null;
        }
      }
    }
    
    return grid;
  }, [alignments]);
  
  const getIntensityClass = (cell: { date: Date; hasReflection: boolean; hasAlignment: boolean } | null) => {
    if (!cell) return "";
    if (cell.hasReflection) return "bg-primary hover:bg-primary/90";
    if (cell.hasAlignment) return "bg-primary/30 hover:bg-primary/40";
    return "";
  };
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activity Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-2">
            {/* Month labels - shown at the top for each week column */}
            <div className="flex gap-1">
              <div className="w-8" /> {/* Spacer for day labels */}
              <div className="flex-1 grid grid-cols-12 gap-1 text-xs text-muted-foreground">
                {Array(12).fill(null).map((_, weekIndex) => {
                  // Find the first non-null cell in this week column
                  const firstDayInWeek = heatmapData.find(row => row[weekIndex] !== null)?.[weekIndex];
                  // Only show month label on weeks that contain the 1st of the month
                  if (firstDayInWeek) {
                    const weekDates = heatmapData.map(row => row[weekIndex]).filter(cell => cell !== null);
                    const hasFirstOfMonth = weekDates.some(cell => cell && cell.date.getDate() === 1);
                    if (hasFirstOfMonth) {
                      return (
                        <div key={weekIndex} className="text-center">
                          {months[firstDayInWeek.date.getMonth()]}
                        </div>
                      );
                    }
                  }
                  return <div key={weekIndex} />;
                })}
              </div>
            </div>
            
            {/* Calendar grid - rows are days of week, columns are weeks */}
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground justify-between w-8">
                <div className="h-3 flex items-center justify-start">Sun</div>
                <div className="h-3 flex items-center justify-start">Mon</div>
                <div className="h-3 flex items-center justify-start">Tue</div>
                <div className="h-3 flex items-center justify-start">Wed</div>
                <div className="h-3 flex items-center justify-start">Thu</div>
                <div className="h-3 flex items-center justify-start">Fri</div>
                <div className="h-3 flex items-center justify-start">Sat</div>
              </div>
              
              {/* Heatmap grid */}
              <div className="flex-1 grid grid-rows-7 gap-1">
                {heatmapData.map((dayRow, dayIndex) => (
                  <div key={dayIndex} className="grid grid-cols-12 gap-1">
                    {dayRow.map((cell, weekIndex) => {
                      if (!cell) {
                        return <div key={weekIndex} className="aspect-square" />;
                      }
                      
                      const dateStr = cell.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      });
                      
                      return (
                        <Tooltip key={weekIndex}>
                          <TooltipTrigger asChild>
                            <div
                              className={`aspect-square rounded-sm transition-all cursor-pointer ${getIntensityClass(cell)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">
                              {cell.hasReflection 
                                ? `Reflection completed on ${dateStr}` 
                                : `Alignment created on ${dateStr}`
                              }
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
