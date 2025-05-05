import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, FileText, UploadCloud } from 'lucide-react';
import { uploadResume } from '@/lib/api';

export default function FeedbackAutomation() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<{
    sessionId: string;
    pdfUrl: string;
    promptUrl: string;
  } | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setProcessingResult(null);
    setIsComplete(false);
    setError(null);
  };

  const processResume = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Step 1: Upload and process the resume
      const result = await uploadResume(selectedFile);
      
      // Step 2: Save the prompt to a file (this would be done on the server)
      // For now, we'll just create a URL to a static prompt file
      const promptUrl = '/api/chatgpt-prompt';
      
      setProcessingResult({
        sessionId: result.sessionId,
        pdfUrl: result.pdfUrl,
        promptUrl: promptUrl
      });
      
      setIsComplete(true);
    } catch (err) {
      console.error('Processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process resume');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-near-navy text-center">Resume Feedback Automation</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>This tool automates the feedback loop for resume processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ol className="list-decimal list-inside space-y-2">
            <li>Upload a resume file (PDF or DOCX)</li>
            <li>Process it through the Near format</li>
            <li>Review the processed resume</li>
            <li>Capture a screenshot</li>
            <li>Upload to ChatGPT with our specialized prompt</li>
            <li>Review feedback and implement improvements</li>
          </ol>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload & Process</CardTitle>
            <CardDescription>Select a resume file to process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <input
                type="file"
                id="resume-file"
                className="hidden"
                accept=".pdf,.docx,.doc"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              <label
                htmlFor="resume-file"
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer ${
                  selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {selectedFile ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm font-medium">Click to select a resume file</p>
                    <p className="text-xs text-gray-500 mt-1">PDF or DOCX (max 5MB)</p>
                  </>
                )}
              </label>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={processResume}
              disabled={!selectedFile || isProcessing}
              className="w-full bg-near-navy text-white"
            >
              {isProcessing ? (
                <>
                  <span className="mr-2">Processing...</span>
                  <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                </>
              ) : (
                'Process Resume'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results & Next Steps</CardTitle>
            <CardDescription>What to do after processing</CardDescription>
          </CardHeader>
          <CardContent>
            {!isComplete ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <FileText className="h-12 w-12 mb-2" />
                <p>Process a resume to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">1. View Processed Resume</h3>
                  <a
                    href={processingResult?.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Open Resume in New Tab
                  </a>
                </div>

                <div>
                  <h3 className="font-medium mb-2">2. Take a Screenshot</h3>
                  <p className="text-sm text-gray-600">
                    Capture the full resume using your preferred screenshot tool
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">3. Get ChatGPT Feedback</h3>
                  <a
                    href="https://chat.openai.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center mb-2"
                  >
                    Open ChatGPT
                  </a>
                  <a
                    href={processingResult?.promptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    View Feedback Prompt
                  </a>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {isComplete && (
              <Button variant="outline" onClick={handleReset} className="w-full">
                Start Over
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}