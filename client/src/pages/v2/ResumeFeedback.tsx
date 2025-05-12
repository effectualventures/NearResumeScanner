import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type FeedbackResponse = {
  feedback: string;
  sessionId: string;
};

export function ResumeFeedback() {
  const [location, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [customFeedback, setCustomFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [newResumeUrl, setNewResumeUrl] = useState("");
  const { toast } = useToast();

  // Parse session ID from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("sessionId");
    
    if (sid) {
      setSessionId(sid);
      // Automatically fetch feedback when session ID is available
      fetchAutoFeedback(sid);
    } else {
      toast({
        title: "Missing session ID",
        description: "Please upload a resume first to get feedback",
        variant: "destructive"
      });
    }
  }, []);

  const fetchAutoFeedback = async (sid: string) => {
    if (!sid) return;
    
    setIsLoading(true);
    setProcessingStatus("Generating AI feedback for your resume...");
    
    try {
      const response = await fetch(`/api/v2/auto-feedback/${sid}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate feedback");
      }
      
      setFeedback(data.data.feedback);
      setProcessingStatus("AI feedback generated successfully!");
    } catch (error: any) {
      console.error("Error generating feedback:", error);
      toast({
        title: "Feedback generation failed",
        description: error.message || "An error occurred while generating feedback",
        variant: "destructive"
      });
      setProcessingStatus("Failed to generate feedback.");
    } finally {
      setIsLoading(false);
    }
  };

  const implementFeedback = async () => {
    if (!sessionId) return;
    
    // Use either custom feedback if provided, or the auto-generated feedback
    const feedbackToImplement = customFeedback.trim() || feedback;
    
    if (!feedbackToImplement) {
      toast({
        title: "No feedback to implement",
        description: "Please wait for the AI feedback to be generated or enter your own feedback",
        variant: "destructive"
      });
      return;
    }
    
    setIsImplementing(true);
    setProcessingStatus("Implementing feedback to your resume...");
    
    try {
      const response = await fetch("/api/v2/implement-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sessionId,
          feedback: feedbackToImplement
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to implement feedback");
      }
      
      // Get the new session ID and PDF URL
      const newSessionId = data.data.newSessionId;
      const pdfUrl = data.data.pdfUrl;
      
      setNewResumeUrl(pdfUrl);
      setProcessingStatus("Feedback implemented successfully!");
      
      toast({
        title: "Feedback implemented",
        description: "Your resume has been updated based on the feedback",
        variant: "default"
      });
    } catch (error: any) {
      console.error("Error implementing feedback:", error);
      toast({
        title: "Implementation failed",
        description: error.message || "An error occurred while implementing feedback",
        variant: "destructive"
      });
      setProcessingStatus("Failed to implement feedback.");
    } finally {
      setIsImplementing(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <Card className="mb-6">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Resume Feedback (v2)</CardTitle>
          <CardDescription>
            Get AI feedback on your processed resume and implement improvements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">{processingStatus}</p>
            </div>
          ) : feedback ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">AI Feedback</h3>
                <div className="mt-2 rounded-md border p-4 whitespace-pre-wrap">
                  {feedback}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Custom Feedback (Optional)</h3>
                <Textarea
                  placeholder="Enter your own feedback or edit the AI suggestions..."
                  className="min-h-[150px]"
                  value={customFeedback}
                  onChange={(e) => setCustomFeedback(e.target.value)}
                  disabled={isImplementing}
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {processingStatus || "Waiting for resume data..."}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col items-center">
          {!newResumeUrl ? (
            <Button 
              onClick={implementFeedback} 
              disabled={isLoading || isImplementing || !feedback}
              className="w-full"
            >
              {isImplementing ? "Implementing Feedback..." : "Implement Feedback"}
            </Button>
          ) : (
            <div className="flex flex-col items-center w-full">
              <p className="mb-4 text-sm text-center">Your improved resume is ready to download!</p>
              <div className="flex gap-2 w-full justify-center">
                <Button asChild>
                  <a href={newResumeUrl} target="_blank" rel="noopener noreferrer">
                    Download Improved Resume
                  </a>
                </Button>
                
                <Button variant="outline" onClick={() => setLocation("/v2/upload")}>
                  Process Another Resume
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
      
      <div className="text-center">
        <Button variant="outline" onClick={() => setLocation("/v2/upload")}>
          Return to Upload Page
        </Button>
      </div>
    </div>
  );
}

export default ResumeFeedback;