import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface RegionData {
  name: string;
  percentage: number;
}

interface RegionalDistributionProps {
  data: RegionData[];
  showAllRegions: boolean;
  onViewAllClick: () => void;
}

export default function RegionalDistribution({ 
  data, 
  showAllRegions = false,
  onViewAllClick
}: RegionalDistributionProps) {
  const { t } = useTranslation();
  // Limit the data displayed if not showing all regions
  const displayData = showAllRegions ? data : data.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">{t('dashboard.regionalDistribution')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayData.map((region, index) => (
            <div className="flex items-center" key={index}>
              <div className="w-24 text-sm font-medium text-gray-600">{region.name}</div>
              <div className="flex-1">
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary rounded-full" 
                    style={{ width: `${region.percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-12 text-right text-sm font-medium text-gray-600">
                {region.percentage}%
              </div>
            </div>
          ))}
        </div>
        
        {!showAllRegions && data.length > 5 && (
          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              className="text-primary text-sm font-semibold"
              onClick={onViewAllClick}
            >
              {t('dashboard.viewAllRegions')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
