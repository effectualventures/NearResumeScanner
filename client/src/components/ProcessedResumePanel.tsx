import { useState } from 'react';
import { FiDownload, FiFile } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ChatInterface from './ChatInterface';
import { ChatMessage } from '@shared/schema';

interface ProcessedResumePanelProps {
  pdfUrl: string | null;
  isLoading: boolean;
  onDownload: () => void;
  onSendChatMessage: (message: string) => Promise<void>;
  isChatLoading: boolean;
  chatMessages: ChatMessage[];
  sessionReady: boolean;
}

export default function ProcessedResumePanel({
  pdfUrl,
  isLoading,
  onDownload,
  onSendChatMessage,
  isChatLoading,
  chatMessages,
  sessionReady
}: ProcessedResumePanelProps) {
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);

  return (
    <div className="w-full lg:w-5/12 flex flex-col gap-6">
      {/* Processed Resume View */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex items-center justify-between p-4 border-b">
          <CardTitle className="text-lg text-near-navy">Processed Resume</CardTitle>
          
          <Button
            className="bg-near-navy text-white"
            disabled={!pdfUrl || isLoading}
            onClick={onDownload}
            size="sm"
          >
            <FiDownload className="mr-2" />
            Download PDF
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 p-4 overflow-auto min-h-96 max-h-128 bg-white">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-near-blue"></div>
              </div>
              <h3 className="text-near-gray-600 font-medium mb-1">Transforming resume</h3>
              <p className="text-near-gray-400 text-sm">Enhancing content and formatting...</p>
            </div>
          ) : !pdfUrl ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="bg-near-gray-100 rounded-full p-3 mb-4">
                <FiFile className="text-near-gray-400 text-xl" />
              </div>
              <h3 className="text-near-gray-600 font-medium mb-1">No processed resume yet</h3>
              <p className="text-near-gray-400 text-sm">Upload and convert a resume to see results</p>
            </div>
          ) : (
            <div className="w-full h-full min-h-96">
              <iframe 
                src={`${pdfUrl}#toolbar=0`} 
                className="w-full h-full border-0"
                onLoad={() => setIsPdfLoaded(true)}
              />
              {!isPdfLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
                  <div className="animate-spin h-8 w-8 border-2 border-near-blue rounded-full border-t-transparent"></div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Chat Interface */}
      <ChatInterface 
        onSendMessage={onSendChatMessage}
        isLoading={isChatLoading}
        messages={chatMessages}
        disabled={!sessionReady}
      />
    </div>
  );
}