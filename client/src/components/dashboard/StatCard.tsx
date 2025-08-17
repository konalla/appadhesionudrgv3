import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SparklineChart } from '@/components/analytics/SparklineChart';
import { TrendIndicator } from '@/components/analytics/TrendIndicator';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple';
  sparklineData?: number[];
  currentValue?: number;
  previousValue?: number;
  showTrend?: boolean;
  onClick?: () => void;
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  change, 
  color = 'blue',
  sparklineData,
  currentValue,
  previousValue,
  showTrend = false,
  onClick
}: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue-100 text-primary',
    green: 'bg-green-100 text-secondary',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""} onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-gray-500 text-sm">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            
            {/* Show trend indicator if showTrend is true and we have both values */}
            {showTrend && currentValue !== undefined && previousValue !== undefined && (
              <div className="mt-1">
                <TrendIndicator 
                  currentValue={currentValue} 
                  previousValue={previousValue}
                  className="text-xs"
                />
              </div>
            )}
            
            {/* Show classic change display if showTrend is false */}
            {!showTrend && change && (
              <div className="mt-1">
                <p className="text-green-600 text-sm flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                  <span>{change}</span>
                </p>
              </div>
            )}
          </div>
          
          <div className={cn('p-3 rounded-full', colorMap[color])}>
            {icon}
          </div>
        </div>
        
        {/* Show sparkline chart if data is provided */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4">
            <SparklineChart 
              data={sparklineData} 
              height={30}
              showSpots={false}
              color={
                color === 'blue' ? '#2563EB' : 
                color === 'green' ? '#22C55E' : 
                color === 'yellow' ? '#EAB308' : 
                '#8B5CF6' // purple
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
