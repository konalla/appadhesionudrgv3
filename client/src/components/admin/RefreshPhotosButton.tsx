import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function RefreshPhotosButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all photo-related queries
      await queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      // Clear all cached photos by refetching
      await queryClient.refetchQueries({ 
        queryKey: ['/api/members'],
        type: 'active'
      });
      
      // Trigger cache invalidation on server
      await fetch('/api/cache/invalidate', { method: 'POST' });
      
      toast({
        title: "Photos refreshed",
        description: "All member photos have been refreshed successfully.",
      });
      
      // Force page refresh to clear image cache
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error refreshing photos:', error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh photos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button 
      onClick={handleRefresh} 
      disabled={isRefreshing}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Photos'}
    </Button>
  );
}