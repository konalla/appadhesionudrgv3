import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

interface DemographicsData {
  ageGroup: string;
  male: number;
  female: number;
  other: number;
}

interface DemographicsChartProps {
  data: DemographicsData[];
  malePercentage: number;
  femalePercentage: number;
  otherPercentage: number;
}

export default function DemographicsChart({ 
  data, 
  malePercentage, 
  femalePercentage,
  otherPercentage 
}: DemographicsChartProps) {
  const { t } = useTranslation();
  
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">{t('dashboard.demographics')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ageGroup" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="male" stackId="a" fill="#2C3E50" name={t('members.male')} />
              <Bar dataKey="female" stackId="a" fill="#27AE60" name={t('members.female')} />
              <Bar dataKey="other" stackId="a" fill="#E74C3C" name={t('members.other')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">{t('members.male')} ({malePercentage}%)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-secondary rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">{t('members.female')} ({femalePercentage}%)</span>
          </div>
          {otherPercentage > 0 && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#E74C3C] rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">{t('members.other')} ({otherPercentage}%)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
