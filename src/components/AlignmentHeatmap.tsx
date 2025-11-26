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
    
    // Create a map of dates to reflection status
    const dateMap = new Map<string, boolean>();
    alignments.forEach(alignment => {
      const date = alignment.date.split('T')[0];
      dateMap.set(date, alignment.hasReflection);
    });
    
    // Generate grid: 7 rows (days) x 12 columns (weeks)
    const grid: Array<Array<{ date: Date; hasReflection: boolean } | null>> = Array(7).fill(null).map(() => []);
    
    // Start from the most recent Sunday (or today if today is Sunday)
    const lastSunday = new Date(today);
    const dayOfWeek = lastSunday.getDay();
    if (dayOfWeek !== 0) {
      lastSunday.setDate(lastSunday.getDate() - dayOfWeek);
    }
    
    // Calculate the first Sunday (12 weeks back from last Sunday)
    const firstSunday = new Date(lastSunday);
    firstSunday.setDate(firstSunday.getDate() - (11 * 7));
    
    // Fill the grid: rows = days of week, columns = weeks
    for (let week = 0; week < 12; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(firstSunday);
        date.setDate(firstSunday.getDate() + (week * 7) + day);
        const dateStr = date.toISOString().split('T')[0];
        const hasAlignment = dateMap.has(dateStr);
        const hasReflection = dateMap.get(dateStr) || false;
        
        // Only show dates that have alignments and are within range
        if (hasAlignment && date >= startDate && date <= today) {
          grid[day][week] = { date, hasReflection };
        } else if (date <= today) {
          // Show empty cells for dates without alignments but within range
          grid[day][week] = null;
        } else {
          grid[day][week] = null;
        }
      }
    }
    
    return grid;
  }, [alignments]);
  
  const getIntensityClass = (hasReflection: boolean) => {
    if (hasReflection) {
      return "bg-primary hover:bg-primary/90"; // Dark purple for days with reflections
    }
    return "bg-primary/40 hover:bg-primary/50"; // Light purple for days with alignments only
  };
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Activity Calendar</CardTitle>
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
                  // Only show month label if it's the first week of that month or first column
                  const prevWeekFirstDay = weekIndex > 0 ? heatmapData.find(row => row[weekIndex - 1] !== null)?.[weekIndex - 1] : null;
                  const showLabel = firstDayInWeek && (
                    weekIndex === 0 || 
                    !prevWeekFirstDay || 
                    prevWeekFirstDay.date.getMonth() !== firstDayInWeek.date.getMonth()
                  );
                  
                  if (showLabel) {
                    return (
                      <div key={weekIndex} className="text-center">
                        {months[firstDayInWeek.date.getMonth()]}
                      </div>
                    );
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
                              className={`aspect-square rounded-sm transition-all cursor-pointer ${getIntensityClass(cell.hasReflection)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">
                              {cell.hasReflection 
                                ? `Reflection completed on ${dateStr}` 
                                : `No reflection on ${dateStr}`
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
