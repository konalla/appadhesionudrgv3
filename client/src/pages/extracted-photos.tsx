import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileImage, File } from "lucide-react";

interface ExtractedPhoto {
  name: string;
  size: number;
  url: string;
  type: string;
  modified: string;
}

export default function ExtractedPhotosPage() {
  const { data: photosData, isLoading } = useQuery<{ files: ExtractedPhoto[] }>({
    queryKey: ["/api/extracted-photos"],
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const photos = photosData?.files || [];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Extracted Photos</h1>
        <p className="text-gray-600 mt-2">
          Profile pictures extracted for UDRG members
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((file) => (
          <Card key={file.name} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {file.type === '.jpg' || file.type === '.jpeg' || file.type === '.png' ? (
                  <FileImage className="h-4 w-4 text-blue-600" />
                ) : (
                  <File className="h-4 w-4 text-gray-600" />
                )}
                <span className="truncate">{file.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <div>Size: {formatFileSize(file.size)}</div>
                  <div>Type: {file.type || 'Unknown'}</div>
                </div>
                
                {(file.type === '.jpg' || file.type === '.jpeg' || file.type === '.png') && (
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <Button
                  onClick={() => downloadFile(file.url, file.name)}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="text-center py-12">
          <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
          <p className="text-gray-600">No extracted photos are available at this time.</p>
        </div>
      )}
    </div>
  );
}