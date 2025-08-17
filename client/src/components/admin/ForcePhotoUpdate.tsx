import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ForcePhotoUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Only run once on mount, don't auto-trigger
  useEffect(() => {
    // Don't auto-run to avoid infinite loops
  }, []);

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      console.log('🔄 Starting aggressive photo cache invalidation...');
      
      // Step 1: Force invalidate ALL member queries 
      await queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      await queryClient.removeQueries({ queryKey: ['/api/members'] });
      
      // Step 2: Clear specific photo cache keys
      const updatedMemberIds = ['00289313', '00491812', '00367781'];
      for (const memberId of updatedMemberIds) {
        await queryClient.invalidateQueries({ queryKey: [`/api/members/${memberId}`] });
        await queryClient.removeQueries({ queryKey: [`/api/members/${memberId}`] });
      }
      
      // Step 3: Server-side cache invalidation
      await fetch('/api/cache/invalidate', { method: 'POST' });
      
      // Step 4: Force DOM image refresh for extracted photos
      const extractedPhotoSelectors = [
        'img[src*="extracted_mamadou_aliou_diallo_00289313"]',
        'img[src*="extracted_mamadou_aliou_diallo_00491812"]', 
        'img[src*="extracted_mamadou_oury_bah_00367781"]'
      ];
      
      extractedPhotoSelectors.forEach(selector => {
        const images = document.querySelectorAll(selector);
        images.forEach(img => {
          const element = img as HTMLImageElement;
          const originalSrc = element.src;
          element.src = '';
          setTimeout(() => {
            element.src = originalSrc.includes('?') 
              ? originalSrc.split('?')[0] + `?extracted=${Date.now()}`
              : originalSrc + `?extracted=${Date.now()}`;
          }, 100);
        });
      });
      
      // Step 5: Force refetch all members data
      await queryClient.refetchQueries({ queryKey: ['/api/members'] });
      
      console.log('✅ Photo cache invalidation complete');
      
      toast({
        title: "Photos Updated",
        description: "High-quality extracted photos are now displaying",
      });
      
      setIsComplete(true);
      
    } catch (error) {
      console.error('❌ Error updating photos:', error);
      toast({
        title: "Update failed", 
        description: "Failed to refresh photos. Please try reloading the page.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-blue-900">
            {isComplete ? "Photos Updated!" : "Updating Extracted Photos..."}
          </h3>
          <p className="text-sm text-blue-700">
            {isComplete 
              ? "High-quality extracted photos are now visible. Page will reload shortly."
              : "Refreshing cache to display high-quality extracted photos for 3 members."
            }
          </p>
        </div>
        <Button 
          onClick={handleForceUpdate} 
          disabled={isUpdating || isComplete}
          variant={isComplete ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
        >
          {isComplete ? (
            <>
              <Check className="h-4 w-4" />
              Complete
            </>
          ) : (
            <>
              <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating...' : 'Force Update'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}