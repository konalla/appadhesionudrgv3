import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  Select, 
  SelectContent, 
  SelectTrigger, 
  SelectValue, 
  SelectItem
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ActivityData {
  hour: number;
  dayOfWeek: number;
  count: number;
}

interface ActivityHeatMapProps {
  data: ActivityData[];
  className?: string;
}

/**
 * ActivityHeatMap component for displaying times with most activity (registrations)
 * Shows a heatmap grid of days and hours for when most registrations occur
 */
export function ActivityHeatMap({
  data,
  className
}: ActivityHeatMapProps) {
  const { t } = useTranslation();
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');
  const [view, setView] = useState<'week' | 'day' | 'hour'>('week');
  
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-gray-400", className)}>
        {t('common.noData')}
      </div>
    );
  }
  
  // Get maximum activity count for color scaling
  const maxCount = Math.max(...data.map(item => item.count));
  
  // Day labels for the heatmap
  const dayLabels = [
    t('days.monday'),
    t('days.tuesday'),
    t('days.wednesday'),
    t('days.thursday'),
    t('days.friday'),
    t('days.saturday'),
    t('days.sunday')
  ];
  
  // Format hour based on selected time format
  const formatHour = (hour: number) => {
    if (timeFormat === '12h') {
      const h = hour % 12 || 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      return `${h} ${ampm}`;
    }
    return `${hour.toString().padStart(2, '0')}:00`;
  };
  
  // Generate the week view heatmap (days x hours)
  const renderWeekHeatMap = () => {
    // Create a 7x24 grid (days x hours) filled with activity counts
    const grid: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
    
    // Fill the grid with activity data
    data.forEach(item => {
      const day = item.dayOfWeek;
      const hour = item.hour;
      grid[day][hour] = item.count;
    });
    
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Hour labels on top */}
          <div className="flex">
            <div className="w-20"></div> {/* Empty space for day labels */}
            {Array.from({ length: 24 }).map((_, hour) => (
              <div 
                key={hour}
                className="flex-1 text-xs text-center text-gray-500 py-1"
              >
                {hour % 2 === 0 && formatHour(hour)}
              </div>
            ))}
          </div>
          
          {/* Heatmap grid */}
          {grid.map((hours, dayIndex) => (
            <div key={dayIndex} className="flex">
              {/* Day label */}
              <div className="w-20 text-sm font-medium flex items-center py-1">
                {dayLabels[dayIndex]}
              </div>
              
              {/* Hour cells */}
              {hours.map((count, hourIndex) => {
                // Calculate color intensity
                const intensity = maxCount > 0 ? count / maxCount : 0;
                const bgColor = `rgba(37, 99, 235, ${intensity.toFixed(2)})`;
                const textColor = intensity > 0.5 ? 'text-white' : 'text-gray-700';
                
                return (
                  <div 
                    key={hourIndex}
                    className={cn(
                      "flex-1 aspect-square border border-gray-100 flex items-center justify-center text-xs font-medium transition-colors",
                      textColor
                    )}
                    style={{ backgroundColor: bgColor }}
                    title={`${dayLabels[dayIndex]} ${formatHour(hourIndex)}: ${count} ${t('analytics.activity.registrations')}`}
                  >
                    {count > 0 && count}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Generate top active days bar chart
  const renderDayActivity = () => {
    // Calculate total registrations per day
    const dayTotals = Array(7).fill(0);
    data.forEach(item => {
      dayTotals[item.dayOfWeek] += item.count;
    });
    
    // Find the day with maximum registrations
    const maxDayRegistrations = Math.max(...dayTotals);
    
    return (
      <div className="pt-2">
        {dayTotals.map((count, dayIndex) => {
          const percentage = maxDayRegistrations > 0 
            ? Math.round((count / maxDayRegistrations) * 100) 
            : 0;
          
          return (
            <div key={dayIndex} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{dayLabels[dayIndex]}</span>
                <span className="text-gray-500">{count} {t('analytics.activity.registrations')}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Generate top active hours bar chart
  const renderHourActivity = () => {
    // Calculate total registrations per hour
    const hourTotals = Array(24).fill(0);
    data.forEach(item => {
      hourTotals[item.hour] += item.count;
    });
    
    // Find the hour with maximum registrations
    const maxHourRegistrations = Math.max(...hourTotals);
    
    // Create time blocks for better visualization
    const timeBlocks = [
      { label: t('analytics.activity.earlyMorning'), hours: [5, 6, 7, 8] },
      { label: t('analytics.activity.morning'), hours: [9, 10, 11] },
      { label: t('analytics.activity.noon'), hours: [12, 13] },
      { label: t('analytics.activity.afternoon'), hours: [14, 15, 16, 17] },
      { label: t('analytics.activity.evening'), hours: [18, 19, 20] },
      { label: t('analytics.activity.night'), hours: [21, 22, 23, 0, 1, 2, 3, 4] }
    ];
    
    // Calculate totals for each time block
    const blockTotals = timeBlocks.map(block => {
      const total = block.hours.reduce((sum, hour) => sum + hourTotals[hour], 0);
      return {
        label: block.label,
        total,
        hours: block.hours.map(hour => ({ hour, count: hourTotals[hour] }))
      };
    });
    
    // Find the block with maximum registrations
    const maxBlockRegistrations = Math.max(...blockTotals.map(block => block.total));
    
    return (
      <div className="pt-2">
        {blockTotals.map((block, index) => {
          const percentage = maxBlockRegistrations > 0 
            ? Math.round((block.total / maxBlockRegistrations) * 100) 
            : 0;
          
          return (
            <div key={index} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{block.label}</span>
                <span className="text-gray-500">{block.total} {t('analytics.activity.registrations')}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              {/* Show detailed hours for this block */}
              <div className="grid grid-cols-4 gap-2">
                {block.hours.map(({ hour, count }) => (
                  <div 
                    key={hour} 
                    className="text-xs text-gray-500 flex items-center"
                    title={`${formatHour(hour)}: ${count} ${t('analytics.activity.registrations')}`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full bg-primary mr-1"
                      style={{ 
                        opacity: maxHourRegistrations > 0 ? count / maxHourRegistrations : 0.1 
                      }}
                    />
                    {formatHour(hour)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  
  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex justify-between mb-4">
        <Tabs 
          defaultValue="week" 
          className="w-[300px]"
          onValueChange={(value) => setView(value as any)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="week">{t('analytics.activity.weekView')}</TabsTrigger>
            <TabsTrigger value="day">{t('analytics.activity.dayView')}</TabsTrigger>
            <TabsTrigger value="hour">{t('analytics.activity.hourView')}</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Select 
          value={timeFormat} 
          onValueChange={(value) => setTimeFormat(value as '12h' | '24h')}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder={t('analytics.activity.timeFormat')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24h</SelectItem>
            <SelectItem value="12h">12h</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Content based on view */}
      <div className="mt-2">
        {view === 'week' && renderWeekHeatMap()}
        {view === 'day' && renderDayActivity()}
        {view === 'hour' && renderHourActivity()}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-end text-xs text-gray-500">
        <div className="w-20 h-2 bg-gradient-to-r from-blue-50 to-blue-600 rounded mr-2"></div>
        <span>{t('analytics.activity.lowActivity')}</span>
        <span className="mx-1">→</span>
        <span>{t('analytics.activity.highActivity')}</span>
      </div>
    </div>
  );
}