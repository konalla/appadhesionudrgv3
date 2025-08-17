import { useTranslation } from 'react-i18next';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';

interface ProgressChartProps {
  data: Array<{
    period: string;
    actual: number;
    target?: number;
  }>;
  className?: string;
  targetLineLabel?: string;
}

/**
 * ProgressChart component for displaying registration progress with targets
 * Shows a bar chart with actual values and target reference lines
 */
export function ProgressChart({
  data,
  className,
  targetLineLabel
}: ProgressChartProps) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-gray-400", className)}>
        {t('common.noData')}
      </div>
    );
  }

  // Check if targets are defined
  const hasTargets = data.some(item => item.target !== undefined);
  
  // Find the maximum value for scaling
  const maxActual = Math.max(...data.map(item => item.actual));
  const maxTarget = hasTargets 
    ? Math.max(...data.map(item => item.target || 0))
    : 0;
  const maxY = Math.max(maxActual, maxTarget) * 1.1; // Add 10% margin on top
  
  const getBar = (entry: any) => {
    // Determine bar color based on progress compared to target
    if (!entry.target) return '#2563EB'; // Default blue if no target
    
    if (entry.actual >= entry.target) {
      return '#22C55E'; // Green if reached/exceeded target
    } else if (entry.actual >= entry.target * 0.8) {
      return '#EAB308'; // Yellow if close to target (80%+)
    } else {
      return '#EF4444'; // Red if far from target
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const actual = payload[0].value;
      const target = payload[1]?.value;
      
      let percentOfTarget = '';
      if (target) {
        const percent = Math.round((actual / target) * 100);
        percentOfTarget = `(${percent}% ${t('analytics.progress.ofTarget')})`;
      }
      
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium">{label}</p>
          <p className="text-primary">{t('analytics.progress.actual')}: {actual} {percentOfTarget}</p>
          {target && (
            <p className="text-secondary">{t('analytics.progress.target')}: {target}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis domain={[0, maxY]} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="actual" 
            name={t('analytics.progress.registrations')} 
            fill="#2563EB" 
            radius={[4, 4, 0, 0]}
            fillOpacity={0.8}
            barSize={30}
            animationDuration={1000}
            isAnimationActive={true}
          />
          
          {/* Show individual target lines for each bar */}
          {hasTargets && data.map((entry, index) => {
            if (entry.target) {
              return (
                <ReferenceLine
                  key={`target-${index}`}
                  segment={[
                    { x: entry.period, y: 0 },
                    { x: entry.period, y: entry.target }
                  ]}
                  stroke="#16A34A"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  ifOverflow="extendDomain"
                />
              );
            }
            return null;
          })}
          
          {/* Note: Second Bar is only rendered when we don't have targets
              The Bar component can't have a dynamic fill function, so we avoid using it when hasTargets is true */}
          {!hasTargets && (
            <Bar 
              dataKey="actual" 
              name={t('analytics.progress.registrations')} 
              radius={[4, 4, 0, 0]}
              fillOpacity={0.8}
              barSize={30}
              fill="#2563EB"
              animationDuration={1000}
              isAnimationActive={true}
            />
          )}
          
          {targetLineLabel && (
            <ReferenceLine 
              y={maxTarget} 
              label={{
                value: targetLineLabel,
                position: 'insideTopRight',
                fill: '#16A34A'
              }} 
              stroke="#16A34A" 
              strokeDasharray="3 3" 
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}