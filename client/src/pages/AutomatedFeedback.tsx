import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { uploadResume } from '@/lib/api';

// Luis's resume file path
const LUIS_RESUME_PATH = 'Luis Chavez - Sr BDR - Player Coach (Near).pdf';

export default function AutomatedFeedback() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<{
    sessionId: string;
    pdfUrl: string;
    chatGptPrompt: string;
  } | null>(null);
  
  const [feedback, setFeedback] = useState<string>('');
  const [implementationPlan, setImplementationPlan] = useState<string>('');
  const [isImplementing, setIsImplementing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Automatically process Luis's resume when the component loads
  useEffect(() => {
    processResume();
  }, []);

  // Function to process the resume automatically
  const processResume = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setIsComplete(false);

      // First, fetch the file content using the server
      const formData = new FormData();
      
      // Use a special endpoint to process Luis's resume directly
      const response = await fetch('/api/process-luis-resume', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to process resume');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Processing failed');
      }
      
      // Get the ChatGPT prompt
      const promptResponse = await fetch('/api/chatgpt-prompt');
      if (!promptResponse.ok) {
        throw new Error('Failed to get ChatGPT prompt');
      }
      const chatGptPrompt = await promptResponse.text();
      
      setProcessingResult({
        sessionId: result.data.sessionId,
        pdfUrl: result.data.pdfUrl,
        chatGptPrompt
      });
      
    } catch (err) {
      console.error('Processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process resume');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImplementFeedback = async () => {
    if (!feedback) {
      setError('Please paste the feedback from ChatGPT before implementing changes');
      return;
    }
    
    if (!processingResult?.sessionId) {
      setError('No resume is currently being processed');
      return;
    }
    
    try {
      setIsImplementing(true);
      setError(null);
      
      const response = await fetch('/api/implement-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: processingResult.sessionId,
          feedback,
          implementationPlan: implementationPlan || undefined,
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to implement feedback');
      }
      
      // Update with the new result
      setProcessingResult(prev => ({
        ...prev!,
        sessionId: result.data.newSessionId,
        pdfUrl: result.data.pdfUrl,
      }));
      
      // Show success message
      setIsComplete(true);
      
      // Clear the feedback
      setFeedback('');
      setImplementationPlan('');
      
    } catch (err) {
      console.error('Implementation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to implement feedback');
    } finally {
      setIsImplementing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 text-near-navy text-center">Automated Resume Feedback</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Resume Preview Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Processed Resume</CardTitle>
            <CardDescription>
              {isProcessing ? 'Processing Luis Chavez resume...' : 'Luis Chavez resume in Near format'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow p-0 min-h-[24rem]">
            {isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="mb-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-near-blue"></div>
                </div>
                <h3 className="text-near-gray-600 font-medium mb-1">Processing resume</h3>
                <p className="text-near-gray-400 text-sm">Enhancing content and formatting...</p>
              </div>
            ) : processingResult ? (
              <iframe 
                src={processingResult.pdfUrl}
                className="w-full h-full min-h-[24rem] border-0"
                style={{ height: 'calc(100vh - 350px)' }}
                onError={(e) => {
                  console.error("Failed to load iframe content", e);
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="bg-near-gray-100 rounded-full p-3 mb-4">
                  <FileText className="text-near-gray-400 text-xl" />
                </div>
                <h3 className="text-near-gray-600 font-medium mb-1">No processed resume yet</h3>
                <p className="text-near-gray-400 text-sm">Click process to convert the resume</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t p-3 flex justify-between items-center">
            <Button
              onClick={processResume}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {processingResult && (
              <a
                href={processingResult.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm flex items-center"
              >
                <FileText className="h-4 w-4 mr-1" />
                Open in new tab
              </a>
            )}
          </CardFooter>
        </Card>

        {/* Feedback and Implementation Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Feedback Implementation</CardTitle>
            <CardDescription>
              Enter feedback from ChatGPT and implement changes
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isComplete && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Success</AlertTitle>
                <AlertDescription>Changes have been implemented successfully!</AlertDescription>
              </Alert>
            )}

            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">1. Get feedback using ChatGPT</h3>
              <p className="text-xs text-gray-500 mb-2">
                Upload a screenshot of the resume to ChatGPT with this prompt:
              </p>
              <div className="bg-gray-50 p-3 rounded-md text-xs max-h-32 overflow-y-auto mb-2 border">
                {processingResult?.chatGptPrompt || 'Loading prompt...'}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">2. Paste feedback from ChatGPT</h3>
              <Textarea
                placeholder="Paste the feedback from ChatGPT here..."
                className="min-h-[150px]"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">3. Implementation plan (optional)</h3>
              <Textarea
                placeholder="Add any specific implementation instructions or changes you'd like to make..."
                className="min-h-[80px]"
                value={implementationPlan}
                onChange={(e) => setImplementationPlan(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="border-t p-4">
            <Button
              onClick={handleImplementFeedback}
              disabled={isProcessing || isImplementing || !feedback}
              className="w-full bg-near-navy text-white"
            >
              {isImplementing ? (
                <>
                  <span className="mr-2">Implementing Changes...</span>
                  <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                </>
              ) : (
                'Implement Feedback'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Steps and Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Feedback Process</CardTitle>
          <CardDescription>
            This tool automates the feedback loop for resume processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li className="text-sm">Luis Chavez's resume is <span className="font-medium">automatically processed</span> through the Near format</li>
            <li className="text-sm">Take a <span className="font-medium">screenshot</span> of the processed resume</li>
            <li className="text-sm">Upload to ChatGPT with the provided <span className="font-medium">specialized prompt</span></li>
            <li className="text-sm">Paste the feedback into the textarea and add any specific implementation instructions</li>
            <li className="text-sm">Click <span className="font-medium">"Implement Feedback"</span> to apply the changes</li>
            <li className="text-sm">The resume will automatically refresh to show the new version with improvements</li>
            <li className="text-sm">Repeat the process until you're satisfied with the results</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}