import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HeatMapChart } from '@/components/analytics/HeatMapChart';
import { ProgressChart } from '@/components/analytics/ProgressChart';
import { ActivityHeatMap } from '@/components/analytics/ActivityHeatMap';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Page } from '../components/layout/Page';

export default function AnalyticsVisualizations() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('density');
  
  // Define types for our data
  interface RegionDataItem {
    name: string;
    memberCount: number;
    percentage: number;
  }
  
  interface ProgressDataItem {
    period: string;
    actual: number;
    target: number;
  }
  
  interface ActivityDataItem {
    hour: number;
    dayOfWeek: number;
    count: number;
  }
  
  // API calls to get the required data
  const { data: regionData, isLoading: isLoadingRegions } = useQuery<RegionDataItem[]>({
    queryKey: ['/api/statistics/regions'],
    enabled: user?.role === 'system_admin' || user?.role === 'sysadmin',
  });
  
  const { data: progressData, isLoading: isLoadingProgress } = useQuery<ProgressDataItem[]>({
    queryKey: ['/api/statistics/progress'],
    enabled: user?.role === 'system_admin' || user?.role === 'sysadmin',
  });
  
  const { data: activityData, isLoading: isLoadingActivity } = useQuery<ActivityDataItem[]>({
    queryKey: ['/api/statistics/activity'],
    enabled: user?.role === 'system_admin' || user?.role === 'sysadmin',
  });
  
  // Define the transformations
  interface HeatMapDataItem {
    name: string;
    value: number;
    percentage: number;
  }
  
  interface ProgressChartDataItem {
    period: string;
    actual: number;
    target: number;
  }
  
  interface ActivityHeatMapDataItem {
    hour: number;
    dayOfWeek: number;
    count: number;
  }
  
  // Transform data for the region density heatmap
  const transformedRegionData: HeatMapDataItem[] = regionData ? regionData.map((item) => {
    return {
      name: item.name,
      value: item.memberCount,
      percentage: item.percentage
    };
  }) : [];
  
  // Transform data for the progress chart
  const transformedProgressData: ProgressChartDataItem[] = progressData ? progressData.map((item) => {
    return {
      period: item.period,
      actual: item.actual,
      target: item.target
    };
  }) : [];
  
  // Progress chart will show target line for overall target
  const targetLineLabel = progressData && progressData.length > 0 
    ? t('analytics.progress.target') 
    : undefined;
  
  // Transform data for the activity heat map
  const transformedActivityData: ActivityHeatMapDataItem[] = activityData ? activityData.map((item) => {
    return {
      hour: item.hour,
      dayOfWeek: item.dayOfWeek,
      count: item.count
    };
  }) : [];
  
  return (
    <Page
      title={t('analytics.title')}
      description={t('analytics.subtitle')}
      backLink="/analytics"
      backLinkText={t('common.back')}
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="density">{t('analytics.heatmap.title')}</TabsTrigger>
            <TabsTrigger value="progress">{t('analytics.progress.title')}</TabsTrigger>
            <TabsTrigger value="activity">{t('analytics.activity.title')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="density" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.heatmap.title')}</CardTitle>
                <CardDescription>{t('analytics.heatmap.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRegions ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center">
                        <Skeleton className="h-4 w-[100px] mr-4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <HeatMapChart data={transformedRegionData} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="progress" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.progress.title')}</CardTitle>
                <CardDescription>{t('analytics.progress.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProgress ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ProgressChart 
                    data={transformedProgressData} 
                    targetLineLabel={targetLineLabel} 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.activity.title')}</CardTitle>
                <CardDescription>{t('analytics.activity.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingActivity ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ActivityHeatMap data={transformedActivityData} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  );
}