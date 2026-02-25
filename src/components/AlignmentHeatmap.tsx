import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlignmentHeatmapProps {
  alignments: { date: string; hasReflection: boolean }[];
  timezone?: string;
}

export default function AlignmentHeatmap({ alignments, timezone = 'local' }: AlignmentHeatmapProps) {
  // pageOffset: 0 = current period, 1 = previous 12 weeks, etc.
  const [pageOffset, setPageOffset] = useState(0);

  const formatDateInTimezone = (date: Date): string => {
    if (timezone === 'local') {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else {
      return date.toLocaleDateString('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    }
  };

  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Shift the end date back by pageOffset * 84 days (12 weeks)
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - pageOffset * 84);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 83);
    startDate.setHours(0, 0, 0, 0);

    const dateMap = new Map<string, { hasAlignment: boolean; hasReflection: boolean }>();
    alignments.forEach(alignment => {
      const date = alignment.date.split('T')[0];
      dateMap.set(date, { hasAlignment: true, hasReflection: alignment.hasReflection });
    });

    const grid: Array<Array<{ date: Date; hasAlignment: boolean; hasReflection: boolean } | null>> = Array(7).fill(null).map(() => []);

    const lastSunday = new Date(endDate);
    const dayOfWeek = lastSunday.getDay();
    if (dayOfWeek !== 0) {
      lastSunday.setDate(lastSunday.getDate() - dayOfWeek);
    }

    const firstSunday = new Date(lastSunday);
    firstSunday.setDate(firstSunday.getDate() - (11 * 7));

    for (let week = 0; week < 12; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(firstSunday);
        date.setDate(firstSunday.getDate() + (week * 7) + day);
        const dateStr = formatDateInTimezone(date);
        const dayData = dateMap.get(dateStr);

        if (date >= startDate && date <= endDate) {
          grid[day][week] = {
            date,
            hasAlignment: dayData?.hasAlignment || false,
            hasReflection: dayData?.hasReflection || false
          };
        } else {
          grid[day][week] = null;
        }
      }
    }

    return grid;
  }, [alignments, timezone, pageOffset]);

  // Check if there are any alignments older than what the current page shows
  const canGoBack = useMemo(() => {
    if (alignments.length === 0) return false;
    const today = new Date();
    const oldestVisibleDate = new Date(today);
    oldestVisibleDate.setDate(oldestVisibleDate.getDate() - (pageOffset + 1) * 84);
    const oldestAlignment = alignments.reduce((oldest, a) => {
      const d = a.date.split('T')[0];
      return d < oldest ? d : oldest;
    }, alignments[0].date.split('T')[0]);
    return oldestAlignment < formatDateInTimezone(oldestVisibleDate) || pageOffset < 10;
  }, [alignments, pageOffset, timezone]);

  const getIntensityClass = (hasAlignment: boolean, hasReflection: boolean) => {
    if (hasReflection) {
      return "bg-primary hover:bg-primary/90";
    }
    if (hasAlignment) {
      return "bg-primary/40 hover:bg-primary/50";
    }
    return "border border-muted-foreground/20 hover:border-muted-foreground/40";
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Activity Calendar</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPageOffset(prev => prev + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={pageOffset === 0}
              onClick={() => setPageOffset(prev => Math.max(0, prev - 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-2">
            {/* Month labels */}
            <div className="flex gap-1">
              <div className="w-8" />
              <div className="flex-1 grid grid-cols-12 gap-1 text-xs text-muted-foreground">
                {Array(12).fill(null).map((_, weekIndex) => {
                  const firstDayInWeek = heatmapData.find(row => row[weekIndex] !== null)?.[weekIndex];
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

            {/* Calendar grid */}
            <div className="flex gap-1">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground justify-between w-8">
                <div className="h-3 flex items-center justify-start">Sun</div>
                <div className="h-3 flex items-center justify-start">Mon</div>
                <div className="h-3 flex items-center justify-start">Tue</div>
                <div className="h-3 flex items-center justify-start">Wed</div>
                <div className="h-3 flex items-center justify-start">Thu</div>
                <div className="h-3 flex items-center justify-start">Fri</div>
                <div className="h-3 flex items-center justify-start">Sat</div>
              </div>

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

                      let tooltipText = `No alignment on ${dateStr}`;
                      if (cell.hasReflection) {
                        tooltipText = `Alignment and reflection on ${dateStr}`;
                      } else if (cell.hasAlignment) {
                        tooltipText = `Alignment created on ${dateStr}`;
                      }

                      return (
                        <Tooltip key={weekIndex}>
                          <TooltipTrigger asChild>
                            <div
                              className={`aspect-square rounded-sm transition-all cursor-pointer ${getIntensityClass(cell.hasAlignment, cell.hasReflection)}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">{tooltipText}</p>
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
