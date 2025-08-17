import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, TrendingUp, UserCheck, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';

// Define the expected types for our API responses
interface Statistics {
  totalMembers: number;
  membersByRegion: Record<string, number>;
  membersByGender: Record<string, number>;
  membersByAge: Record<string, number>;
  membersByVoterCard: Record<string, number>;
}

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  registrationDate: string;
  hasVoterCard: string;
  [key: string]: any;
}

export default function AdminWelcomeCard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const currentTime = new Date();
  const currentHour = currentTime.getHours();

  // Fetch statistics for insights
  const { data: stats } = useQuery<Statistics>({
    queryKey: ['/api/statistics'],
  });

  // Fetch members for additional insights
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });

  // Get greeting based on time of day
  const getTimeGreeting = () => {
    if (currentHour < 12) return t('dashboard.welcome.morning');
    if (currentHour < 18) return t('dashboard.welcome.afternoon');
    return t('dashboard.welcome.evening');
  };

  // Get today's date in localized format
  const today = formatDate(new Date());

  // Calculate insights
  const totalMembers = stats?.totalMembers || 0;
  const recentMembers = members.filter((m) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(m.registrationDate) >= thirtyDaysAgo;
  }).length;

  const pendingVoterCards = members.filter((m) => m.hasVoterCard === 'processing').length;
  
  // Get highest growth region (if any members exist)
  let highestGrowthRegion = { name: '', count: 0 };
  if (stats?.membersByRegion && Object.keys(stats.membersByRegion).length > 0) {
    const regions = Object.entries(stats.membersByRegion)
      .map(([name, count]) => ({ name, count: Number(count) }))
      .sort((a, b) => b.count - a.count);
    
    if (regions.length > 0) {
      highestGrowthRegion = regions[0];
    }
  }

  // Get random insight to display (we'll rotate these)
  const getRandomInsight = () => {
    const insights = [
      {
        icon: <TrendingUp className="h-5 w-5 text-green-500" />,
        text: t('dashboard.welcome.insights.growth', { count: recentMembers, percent: totalMembers > 0 ? Math.round((recentMembers / totalMembers) * 100) : 0 })
      },
      {
        icon: <UserCheck className="h-5 w-5 text-blue-500" />,
        text: t('dashboard.welcome.insights.voterCards', { count: pendingVoterCards })
      },
      {
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
        text: t('dashboard.welcome.insights.region', { region: highestGrowthRegion.name, count: highestGrowthRegion.count })
      }
    ];
    
    // Filter out insights that don't have meaningful data
    const validInsights = insights.filter(insight => {
      if (insight.text.includes('0') && !insight.text.includes('%')) return false;
      if (insight.text.includes('undefined')) return false;
      return true;
    });
    
    return validInsights.length > 0 
      ? validInsights[Math.floor(Math.random() * validInsights.length)]
      : { 
          icon: <TrendingUp className="h-5 w-5 text-gray-500" />, 
          text: t('dashboard.welcome.insights.noData')
        };
  };

  const randomInsight = getRandomInsight();

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-background">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-medium flex items-center justify-between">
          <span>
            {getTimeGreeting()}, {user?.name || t('dashboard.welcome.admin')}
          </span>
          <Clock className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span>{today}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm md:text-base text-foreground/90">
            {t('dashboard.welcome.message')}
          </p>
          
          <div className="flex items-start gap-2 bg-muted/50 p-3 rounded-md mt-3">
            {randomInsight.icon}
            <p className="text-sm flex-1">{randomInsight.text}</p>
          </div>
          
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="bg-primary/10 px-3 py-1.5 rounded-md text-sm font-medium">
              {t('dashboard.welcome.stats.total')}: {totalMembers}
            </div>
            <div className="bg-green-500/10 px-3 py-1.5 rounded-md text-sm font-medium">
              {t('dashboard.welcome.stats.new')}: {recentMembers}
            </div>
            <div className="bg-blue-500/10 px-3 py-1.5 rounded-md text-sm font-medium">
              {t('dashboard.welcome.stats.regions')}: {Object.keys(stats?.membersByRegion || {}).length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}