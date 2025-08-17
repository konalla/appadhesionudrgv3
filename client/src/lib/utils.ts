import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to display in a user-friendly format
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Calculate percentage change between two values
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number(((current - previous) / previous * 100).toFixed(1));
}

// Generate data for sparkline charts from monthly data
export function generateSparklineData(data: Array<{month: string, registrations: number}>): number[] {
  if (!data || data.length === 0) {
    return [0]; // Return a default value to avoid empty array issues
  }
  return data.map(item => item.registrations);
}

// Transform statistics data for charts
export function transformAgeData(ageData: Record<string, number>, genderData: Record<string, number>) {
  // Create data for the demographics chart
  const demographicsData = Object.entries(ageData).map(([ageGroup, total]) => {
    // Calculate gender distribution within each age group
    // This is simplified - in a real app, you'd have more precise data
    const malePercentage = genderData.male / (genderData.male + genderData.female + (genderData.other || 0));
    const femalePercentage = genderData.female / (genderData.male + genderData.female + (genderData.other || 0));
    const otherPercentage = (genderData.other || 0) / (genderData.male + genderData.female + (genderData.other || 0));
    
    return {
      ageGroup,
      male: Math.round(total * malePercentage),
      female: Math.round(total * femalePercentage),
      other: Math.round(total * otherPercentage)
    };
  });
  
  return demographicsData;
}

// Transform region data for charts
export function transformRegionData(regionData: Record<string, number>, totalMembers: number) {
  // Create data for the regional distribution chart
  return Object.entries(regionData).map(([name, count]) => ({
    name,
    percentage: calculatePercentage(count, totalMembers)
  })).sort((a, b) => b.percentage - a.percentage);
}

/**
 * Get localized name based on current language
 * If English is selected and the English name is available, return it
 * Otherwise return the default French name
 */
export function getLocalizedName(
  defaultName: string, 
  englishName: string | null | undefined,
  currentLanguage: string
): string {
  if (currentLanguage === 'en' && englishName) {
    return englishName;
  }
  return defaultName;
}
