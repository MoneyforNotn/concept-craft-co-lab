import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AlignmentHeatmapProps {
  alignments: { date: string }[];
}

export default function AlignmentHeatmap({ alignments }: AlignmentHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Get the last 12 weeks (84 days)
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 83); // 84 days including today
    
    // Create a map of dates to alignment counts
    const dateMap = new Map<string, number>();
    alignments.forEach(alignment => {
      const date = alignment.date.split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });
    
    // Generate grid: 7 rows (days) x 12 columns (weeks)
    const grid: Array<Array<{ date: Date; count: number } | null>> = Array(7).fill(null).map(() => []);
    
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
        const count = dateMap.get(dateStr) || 0;
        
        // Only show dates within our range
        if (date >= startDate && date <= today) {
          grid[day][week] = { date, count };
        } else {
          grid[day][week] = null;
        }
      }
    }
    
    return grid;
  }, [alignments]);
  
  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-muted/30 hover:bg-muted/40";
    if (count === 1) return "bg-primary/30 hover:bg-primary/40";
    if (count === 2) return "bg-primary/60 hover:bg-primary/70";
    return "bg-primary hover:bg-primary/90";
  };
  
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  return (
    <Card>
      <CardHeader>
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
                  if (firstDayInWeek && firstDayInWeek.date.getDate() <= 7) {
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
              <div className="flex flex-col gap-1 text-xs text-muted-foreground justify-start">
                <div className="h-3 flex items-center">Sun</div>
                <div className="h-3 flex items-center">Mon</div>
                <div className="h-3 flex items-center">Tue</div>
                <div className="h-3 flex items-center">Wed</div>
                <div className="h-3 flex items-center">Thu</div>
                <div className="h-3 flex items-center">Fri</div>
                <div className="h-3 flex items-center">Sat</div>
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
                              className={`aspect-square rounded-sm transition-all cursor-pointer ${getIntensityClass(cell.count)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">
                              {cell.count === 0 
                                ? `No alignments on ${dateStr}` 
                                : `${cell.count} alignment${cell.count > 1 ? 's' : ''} on ${dateStr}`
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
            
            {/* Legend */}
            <div className="flex items-center gap-2 justify-end text-xs text-muted-foreground pt-2">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-muted/30" />
                <div className="w-3 h-3 rounded-sm bg-primary/30" />
                <div className="w-3 h-3 rounded-sm bg-primary/60" />
                <div className="w-3 h-3 rounded-sm bg-primary" />
              </div>
              <span>More</span>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
