import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send, Download, RotateCcw, Pencil as PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { processLuisResume, getAutoFeedback, implementFeedback } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function AutomatedFeedback() {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isImplementing, setIsImplementing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Process Luis's resume automatically
  const processResume = async () => {
    setIsLoading(true);
    try {
      const result = await processLuisResume();
      setSessionId(result.sessionId);
      setPdfUrl(result.pdfUrl);
      toast({
        title: "Resume processed",
        description: "The resume has been processed successfully.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error processing resume:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process resume",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch auto feedback when sessionId is available
  const fetchFeedback = async () => {
    if (!sessionId) return null;
    
    try {
      const result = await getAutoFeedback(sessionId);
      setFeedback(result);
      return result;
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get automated feedback",
        variant: "destructive",
        duration: 5000,
      });
      return null;
    }
  };

  // Implement the feedback
  const handleImplementFeedback = async () => {
    if (!sessionId || !feedback) return;
    
    setIsImplementing(true);
    try {
      const result = await implementFeedback(sessionId, feedback);
      
      // Update the UI with the new session and PDF
      setSessionId(result.newSessionId);
      setPdfUrl(result.pdfUrl);
      
      // Scroll to the top of the resume preview to show changes
      const previewElement = document.querySelector('.resume-preview');
      if (previewElement) {
        previewElement.scrollTop = 0;
      }
      
      // Set a success message
      setFeedback("✅ Feedback successfully implemented!\n\nThe resume has been updated with your suggestions. You can now see the changes in the preview panel on the left.\n\nIf you want to make additional edits, click the Reset button and start again.");
      
      toast({
        title: "Changes Applied Successfully! 🎉",
        description: "Your feedback has been implemented and the resume has been updated. Check the preview to see the improvements.",
        duration: 8000,
        variant: "default",
      });
    } catch (error) {
      console.error("Error implementing feedback:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to implement feedback",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsImplementing(false);
    }
  };

  // Auto-fetch feedback when sessionId changes
  useEffect(() => {
    if (sessionId) {
      fetchFeedback();
    }
  }, [sessionId]);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Automated Resume Feedback</h1>
        <p className="text-muted-foreground mb-4">
          This page demonstrates automated resume processing and feedback generation.
        </p>
        
        {!sessionId && (
          <Button onClick={processResume} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Process Resume"
            )}
          </Button>
        )}
      </div>

      {sessionId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Resume Preview */}
          <div className="h-[800px] flex flex-col">
            <Card className="flex-1 overflow-hidden">
              <CardHeader>
                <CardTitle>Processed Resume</CardTitle>
                <CardDescription>Near format resume</CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-full">
                {pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full border-0 resume-preview"
                    title="Processed Resume"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex justify-between mt-4 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSessionId(null);
                  setPdfUrl(null);
                  setFeedback(null);
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              
              {pdfUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(pdfUrl, "_blank")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>

          {/* Feedback Panel */}
          <div className="h-[800px] flex flex-col">
            <Card className="flex-1">
              <CardHeader>
                <CardTitle>AI-Generated Feedback</CardTitle>
                <CardDescription>
                  Automated analysis of the resume based on Near standards
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(100%-5rem)]">
                <ScrollArea className="h-full pr-4">
                  {!feedback ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                      <p className="text-blue-700 font-medium text-center">
                        Generating AI feedback for your resume...<br />
                        <span className="text-sm text-blue-500">This usually takes 15-20 seconds</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                        <p className="text-sm font-medium text-yellow-800 flex items-center">
                          <PencilIcon className="h-4 w-4 mr-2" />
                          You can edit this feedback before implementing it
                        </p>
                      </div>
                      <textarea
                        className="w-full h-full min-h-[550px] p-4 border border-blue-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="AI-generated feedback will appear here. You can edit it before implementing."
                      />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
            <div className="mt-4">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                size="lg"
                onClick={handleImplementFeedback}
                disabled={!feedback || isImplementing}
              >
                {isImplementing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span className="text-lg">Implementing Feedback...</span>
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    <span className="text-lg">Implement Feedback</span>
                  </>
                )}
              </Button>
              
              <Alert className={`mt-4 ${isImplementing ? 'bg-blue-50 border-blue-200' : ''}`}>
                <AlertDescription className="flex items-center">
                  {isImplementing ? (
                    <>
                      <div className="mr-2 bg-blue-100 p-1 rounded-full">
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      </div>
                      <span className="text-blue-700 font-medium">
                        Processing your feedback and updating the resume. This may take a moment...
                      </span>
                    </>
                  ) : (
                    <>
                      Click "Implement Feedback" to apply the AI suggestions automatically.
                      The feedback will be processed using OpenAI and the resume will be updated.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}