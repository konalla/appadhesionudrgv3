import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, TrendingDown, Users, MapPin, Percent, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Insight = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  type: "info" | "success" | "warning" | "danger" | "neutral";
};

interface AutomatedInsightsProps {
  members: any[];
  membersByRegion: Record<string, number>;
  membersByGender: { male: number; female: number; other: number };
  historicalData: Array<{ month: string; registrations: number }>;
}

export function AutomatedInsights({
  members,
  membersByRegion,
  membersByGender,
  historicalData
}: AutomatedInsightsProps) {
  const { t } = useTranslation();
  
  const insights: Insight[] = [];
  
  // Calculer les insights seulement si nous avons des données
  if (members && members.length > 0) {
    // Analyse de tendance d'inscription
    if (historicalData && historicalData.length >= 2) {
      const currentMonth = historicalData[historicalData.length - 1];
      const previousMonth = historicalData[historicalData.length - 2];
      
      if (currentMonth && previousMonth) {
        const change = currentMonth.registrations - previousMonth.registrations;
        const percentChange = previousMonth.registrations === 0 
          ? (currentMonth.registrations > 0 ? 100 : 0)
          : Math.round((change / previousMonth.registrations) * 100);
        
        if (percentChange !== 0) {
          insights.push({
            id: "registration-trend",
            icon: percentChange > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />,
            title: t('analytics.insights.registrationTrend'),
            description: t('analytics.insights.registrationChange', {
              change: Math.abs(percentChange),
              direction: percentChange > 0 ? t('analytics.insights.increase') : t('analytics.insights.decrease'),
              current: currentMonth.month,
              previous: previousMonth.month
            }),
            type: percentChange > 0 ? "success" : "warning"
          });
        }
      }
    }
    
    // Analyse de distribution par genre
    if (membersByGender) {
      const total = membersByGender.male + membersByGender.female + (membersByGender.other || 0);
      if (total > 0) {
        const malePercent = Math.round((membersByGender.male / total) * 100);
        const femalePercent = Math.round((membersByGender.female / total) * 100);
        
        if (Math.abs(malePercent - femalePercent) > 20) { // Déséquilibre significatif
          insights.push({
            id: "gender-imbalance",
            icon: <Users className="h-5 w-5" />,
            title: t('analytics.insights.genderDistribution'),
            description: t('analytics.insights.genderImbalance', {
              majority: malePercent > femalePercent ? t('members.male') : t('members.female'),
              percent: Math.max(malePercent, femalePercent)
            }),
            type: "info"
          });
        }
      }
    }
    
    // Analyse de concentration régionale
    if (membersByRegion && Object.keys(membersByRegion).length > 0) {
      const regions = Object.entries(membersByRegion);
      const totalMembers = regions.reduce((sum, [_, count]) => sum + count, 0);
      
      // Trouver la région avec le plus de membres
      const sortedRegions = [...regions].sort((a, b) => b[1] - a[1]);
      const topRegion = sortedRegions[0];
      
      if (topRegion && totalMembers > 0) {
        const topRegionPercent = Math.round((topRegion[1] / totalMembers) * 100);
        
        if (topRegionPercent > 40) { // Concentration significative
          insights.push({
            id: "regional-concentration",
            icon: <MapPin className="h-5 w-5" />,
            title: t('analytics.insights.regionalDistribution'),
            description: t('analytics.insights.regionConcentration', {
              region: topRegion[0],
              percent: topRegionPercent
            }),
            type: "info"
          });
        }
      }
      
      // Régions avec peu de membres
      const regionsWithFewMembers = sortedRegions
        .filter(([_, count]) => count <= 2)
        .map(([name, _]) => name);
      
      if (regionsWithFewMembers.length > 0 && regionsWithFewMembers.length <= 3) {
        insights.push({
          id: "underrepresented-regions",
          icon: <Activity className="h-5 w-5" />,
          title: t('analytics.insights.underrepresentedRegions'),
          description: t('analytics.insights.regionsNeedAttention', {
            regions: regionsWithFewMembers.join(', ')
          }),
          type: "warning"
        });
      }
    }
    
    // Insight pour les récentes inscriptions
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const recentRegistrations = members.filter((member: any) => {
      return new Date(member.registrationDate) >= lastWeek;
    }).length;
    
    if (recentRegistrations > 0) {
      insights.push({
        id: "recent-registrations",
        icon: <Lightbulb className="h-5 w-5" />,
        title: t('analytics.insights.recentActivity'),
        description: t('analytics.insights.newRegistrations', {
          count: recentRegistrations,
          period: t('analytics.pastWeek')
        }),
        type: "success"
      });
    }
  }
  
  // Si aucun insight, afficher un message par défaut
  if (insights.length === 0) {
    insights.push({
      id: "no-insights",
      icon: <Lightbulb className="h-5 w-5" />,
      title: t('analytics.insights.noInsightsTitle'),
      description: t('analytics.insights.noInsightsDescription'),
      type: "neutral"
    });
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          {t('analytics.insights.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight) => (
            <div 
              key={insight.id}
              className={cn(
                "p-4 rounded-lg flex items-start gap-3",
                {
                  "bg-blue-50 text-blue-800": insight.type === "info",
                  "bg-green-50 text-green-800": insight.type === "success",
                  "bg-yellow-50 text-yellow-800": insight.type === "warning",
                  "bg-red-50 text-red-800": insight.type === "danger",
                  "bg-gray-50 text-gray-800": insight.type === "neutral",
                }
              )}
            >
              <div className={cn(
                "rounded-full p-2 flex-shrink-0",
                {
                  "bg-blue-100": insight.type === "info",
                  "bg-green-100": insight.type === "success",
                  "bg-yellow-100": insight.type === "warning",
                  "bg-red-100": insight.type === "danger",
                  "bg-gray-100": insight.type === "neutral",
                }
              )}>
                {insight.icon}
              </div>
              <div>
                <h4 className="font-medium">{insight.title}</h4>
                <p className={cn(
                  "text-sm mt-1",
                  {
                    "text-blue-600": insight.type === "info",
                    "text-green-600": insight.type === "success",
                    "text-yellow-600": insight.type === "warning",
                    "text-red-600": insight.type === "danger",
                    "text-gray-600": insight.type === "neutral",
                  }
                )}>{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}