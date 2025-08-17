import { queryClient } from "@/lib/queryClient";

export async function forcePhotoRefresh() {
  // Clear all member-related queries to force fresh data fetch
  await queryClient.invalidateQueries({ queryKey: ['/api/members'] });
  await queryClient.refetchQueries({ queryKey: ['/api/members'] });
  
  // Clear browser image cache for specific updated members
  const updatedMembers = ['00289313', '00491812', '00367781'];
  updatedMembers.forEach(membershipId => {
    // Clear any cached images for these members
    const images = document.querySelectorAll(`img[src*="${membershipId}"]`);
    images.forEach(img => {
      const element = img as HTMLImageElement;
      const currentSrc = element.src;
      element.src = '';
      // Force reload with cache buster
      setTimeout(() => {
        element.src = currentSrc.includes('?') 
          ? currentSrc.split('?')[0] + `?v=${Date.now()}`
          : currentSrc + `?v=${Date.now()}`;
      }, 100);
    });
  });
  
  console.log('🔄 Photo refresh complete for extracted photos');
}

// Manual refresh only - no auto-trigger to avoid loops
export { forcePhotoRefresh };