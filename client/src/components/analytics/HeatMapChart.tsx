import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface HeatMapChartProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  maxValue?: number;
  className?: string;
}

/**
 * HeatMapChart component for displaying density of members by region
 * Implements a simple heat map with color gradient based on member density
 */
export function HeatMapChart({
  data,
  maxValue,
  className
}: HeatMapChartProps) {
  const { t } = useTranslation();
  
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-gray-400", className)}>
        {t('common.noData')}
      </div>
    );
  }
  
  // Find the maximum value if not provided
  const max = maxValue || Math.max(...data.map(item => item.value));
  
  // Sort data by value in descending order
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  return (
    <div className={cn("grid gap-2", className)}>
      {sortedData.map((item, index) => {
        // Calculate color intensity based on value relative to max
        const intensity = max > 0 ? (item.value / max) : 0;
        // Blend between blue (low) and primary (high) based on intensity
        const bgColor = `rgba(59, 130, 246, ${0.1 + intensity * 0.8})`;
        const textColor = intensity > 0.6 ? 'text-white' : 'text-gray-700';
        
        return (
          <div key={item.name} className="flex items-center">
            <div className="w-40 mr-3 text-sm truncate">{item.name}</div>
            <div className="flex-1 flex items-center">
              <div
                className={cn("h-8 rounded flex items-center justify-between px-3", textColor)}
                style={{
                  width: `${Math.max(5, item.percentage)}%`,
                  backgroundColor: bgColor,
                  transition: 'width 1s ease-out'
                }}
              >
                <span className="text-sm font-medium">
                  {item.value}
                </span>
              </div>
            </div>
            <div className="w-16 text-right text-sm text-gray-500">
              {item.percentage}%
            </div>
          </div>
        );
      })}
      
      {/* Add a legend for the heat map */}
      <div className="mt-2 flex items-center justify-end text-xs text-gray-500">
        <div className="w-16 h-2 bg-gradient-to-r from-blue-200 to-blue-600 rounded mr-2"></div>
        <span>{t('analytics.heatmap.lowDensity')}</span>
        <span className="mx-1">→</span>
        <span>{t('analytics.heatmap.highDensity')}</span>
      </div>
    </div>
  );
}