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
    
    // Generate all dates for the last 12 weeks
    const weeks: Array<Array<{ date: Date; count: number }>> = [];
    let currentWeek: Array<{ date: Date; count: number }> = [];
    
    for (let i = 0; i < 84; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const count = dateMap.get(dateStr) || 0;
      
      currentWeek.push({ date, count });
      
      if (date.getDay() === 6 || i === 83) { // Saturday or last day
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    
    return weeks;
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
            {/* Weekday labels */}
            <div className="flex gap-1">
              <div className="w-8" /> {/* Spacer for alignment */}
              <div className="flex-1 grid grid-cols-12 gap-1 text-xs text-muted-foreground">
                {heatmapData.map((week, weekIndex) => {
                  const firstDay = week[0];
                  if (firstDay && firstDay.date.getDate() <= 7) {
                    return (
                      <div key={weekIndex} className="text-center">
                        {months[firstDay.date.getMonth()]}
                      </div>
                    );
                  }
                  return <div key={weekIndex} />;
                })}
              </div>
            </div>
            
            {/* Calendar grid */}
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 text-xs text-muted-foreground justify-around pr-1">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>
              
              {/* Heatmap */}
              <div className="flex-1 grid grid-cols-12 gap-1">
                {heatmapData.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => {
                      const dateStr = day.date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      });
                      
                      return (
                        <Tooltip key={dayIndex}>
                          <TooltipTrigger asChild>
                            <div
                              className={`aspect-square rounded-sm transition-all ${getIntensityClass(day.count)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">
                              {day.count === 0 
                                ? `No alignments on ${dateStr}` 
                                : `${day.count} alignment${day.count > 1 ? 's' : ''} on ${dateStr}`
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
