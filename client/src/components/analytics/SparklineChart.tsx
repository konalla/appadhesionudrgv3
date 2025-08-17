import { cn } from '@/lib/utils';

interface SparklineChartProps {
  data: number[];
  color?: string;
  height?: number;
  limit?: number;
  className?: string;
  showSpots?: boolean;
  showReferenceLine?: boolean;
  spotColor?: string;
  spotSize?: number;
  referenceLineType?: 'mean' | 'avg' | 'min' | 'max' | 'median';
  referenceLineColor?: string;
}

// Simplified mini-chart for showing trends
export function SparklineChart({
  data,
  color = "#2563EB", // Default primary blue color
  height = 40,
  limit = 20,
  className,
  showSpots = true,
  showReferenceLine = true,
  spotColor = "#2563EB",
  spotSize = 3,
  referenceLineType = 'mean',
  referenceLineColor = 'rgba(37, 99, 235, 0.2)'
}: SparklineChartProps) {
  
  // If we have no data or empty array, render a placeholder
  if (!data || data.length === 0) {
    return <div className={cn("w-full h-8", className)}></div>;
  }
  
  // If we have more data points than the limit, slice the array
  const chartData = data.length > limit 
    ? data.slice(data.length - limit) 
    : data;
  
  // Find min and max values to scale the chart
  const minValue = Math.min(...chartData);
  const maxValue = Math.max(...chartData);
  const range = maxValue - minValue || 1;
  
  // Calculate the point positions
  const points = chartData.map((value, index) => {
    const x = (index / (chartData.length - 1)) * 100;
    const y = 100 - ((value - minValue) / range) * 90; // Leave some margin
    return `${x},${y}`;
  }).join(' ');
  
  // Draw a simple SVG polyline
  return (
    <div className={cn("w-full", className)}>
      <svg width="100%" height={height} preserveAspectRatio="none" viewBox="0 0 100 100">
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        
        {/* Reference line (mean) if enabled */}
        {showReferenceLine && (
          <line
            x1="0"
            y1={100 - ((chartData.reduce((a, b) => a + b, 0) / chartData.length - minValue) / range) * 90}
            x2="100"
            y2={100 - ((chartData.reduce((a, b) => a + b, 0) / chartData.length - minValue) / range) * 90}
            stroke={referenceLineColor}
            strokeWidth="1"
            strokeDasharray="2,2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        
        {/* Spots if enabled */}
        {showSpots && chartData.map((value, index) => {
          const x = (index / (chartData.length - 1)) * 100;
          const y = 100 - ((value - minValue) / range) * 90;
          
          // Only show first, last and highest/lowest points
          const isEndpoint = index === 0 || index === chartData.length - 1;
          const isHighestPoint = value === maxValue;
          const isLowestPoint = value === minValue;
          
          if (isEndpoint || isHighestPoint || isLowestPoint) {
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={spotSize}
                fill={spotColor}
              />
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}