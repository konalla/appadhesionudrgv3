import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  currentValue: number;
  previousValue: number;
  className?: string;
  reverseColors?: boolean; // For metrics where decrease is good (like error rates)
  showPercentage?: boolean;
  percentPrecision?: number;
}

export function TrendIndicator({
  currentValue,
  previousValue,
  className,
  reverseColors = false,
  showPercentage = true,
  percentPrecision = 1
}: TrendIndicatorProps) {
  const { t } = useTranslation();
  
  // If no previous value or both are 0, show neutral trend
  if (!previousValue || (currentValue === 0 && previousValue === 0)) {
    return (
      <div className={cn("flex items-center text-gray-500", className)}>
        <Minus className="h-4 w-4 mr-1" />
        <span>{t('analytics.noChange')}</span>
      </div>
    );
  }
  
  const percentChange = previousValue 
    ? ((currentValue - previousValue) / previousValue) * 100 
    : 100; // If previousValue was 0, that's a 100% increase
  
  const isIncrease = percentChange > 0;
  const isDecrease = percentChange < 0;
  
  // Determine if the trend is positive (good) or negative (bad)
  const isPositive = reverseColors 
    ? isDecrease // For metrics where decrease is good (error rates)
    : isIncrease; // For normal metrics where increase is good (registrations)
  
  const absolutePercentChange = Math.abs(percentChange).toFixed(percentPrecision);
  
  return (
    <div 
      className={cn(
        "flex items-center", 
        isPositive ? "text-green-600" : isDecrease || isIncrease ? "text-red-600" : "text-gray-500",
        className
      )}
    >
      {isIncrease ? (
        <TrendingUp className="h-4 w-4 mr-1" />
      ) : isDecrease ? (
        <TrendingDown className="h-4 w-4 mr-1" />
      ) : (
        <Minus className="h-4 w-4 mr-1" />
      )}
      
      {showPercentage && (
        <span>
          {absolutePercentChange}% {isIncrease ? t('analytics.increase') : t('analytics.decrease')}
        </span>
      )}
    </div>
  );
}