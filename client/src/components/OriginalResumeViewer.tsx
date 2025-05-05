import { useState, useEffect } from "react";
import { FiFile } from "react-icons/fi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface OriginalResumeViewerProps {
  fileUrl: string | null;
  extractedText: string | null;
  isLoading: boolean;
}

export default function OriginalResumeViewer({
  fileUrl,
  extractedText,
  isLoading,
}: OriginalResumeViewerProps) {
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);

  useEffect(() => {
    if (fileUrl) {
      setIsPdfLoaded(false);
    }
  }, [fileUrl]);

  return (
    <Card className="w-full lg:w-1/3 flex flex-col">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-lg text-near-navy">Original Resume</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 overflow-auto min-h-96 max-h-128 bg-near-gray-50">
        {isLoading ? (
          <div className="space-y-3 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : !fileUrl ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="bg-near-gray-100 rounded-full p-3 mb-4">
              <FiFile className="text-near-gray-400 text-xl" />
            </div>
            <h3 className="text-near-gray-600 font-medium mb-1">No file selected</h3>
            <p className="text-near-gray-400 text-sm">Upload a resume to begin</p>
          </div>
        ) : fileUrl.endsWith('.pdf') ? (
          <div className="w-full h-full min-h-96">
            <iframe 
              src={`${fileUrl}#toolbar=0`} 
              className="w-full h-full border-0"
              onLoad={() => setIsPdfLoaded(true)}
            />
            {!isPdfLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
                <div className="animate-spin h-8 w-8 border-2 border-near-blue rounded-full border-t-transparent"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="prose max-w-none">
            {extractedText ? (
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                {extractedText}
              </pre>
            ) : (
              <div className="text-center text-near-gray-500 mt-8">
                Document preview not available
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
