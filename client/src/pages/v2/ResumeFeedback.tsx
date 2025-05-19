import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FeedbackResponse = {
  feedback: string;
  sessionId: string;
};

type ResumeDataResponse = {
  resumeData: any;
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
  const [resumeData, setResumeData] = useState<any>(null);
  const [jsonEditorValue, setJsonEditorValue] = useState("");
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [isProcessingJson, setIsProcessingJson] = useState(false);
  const [activeTab, setActiveTab] = useState("feedback");
  const { toast } = useToast();

  // Parse session ID from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("sessionId");
    const tabParam = params.get("tab");
    
    // Set the active tab based on URL parameter
    if (tabParam === "json" || tabParam === "feedback") {
      setActiveTab(tabParam);
    }
    
    if (sid) {
      setSessionId(sid);
      // Automatically fetch feedback and resume data when session ID is available
      fetchAutoFeedback(sid);
      fetchResumeData(sid);
    } else {
      toast({
        title: "Missing session ID",
        description: "Please upload a resume first to get feedback",
        variant: "destructive"
      });
    }
  }, []);
  
  // Fetch resume data for JSON editing
  const fetchResumeData = async (sid: string) => {
    if (!sid) return;
    
    setIsEditorLoading(true);
    
    try {
      const response = await fetch(`/api/v2/resume-data/${sid}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch resume data");
      }
      
      const data = await response.json();
      
      if (data.success && data.data.resumeData) {
        setResumeData(data.data.resumeData);
        setJsonEditorValue(JSON.stringify(data.data.resumeData, null, 2));
      } else {
        throw new Error("Invalid resume data format");
      }
    } catch (error: any) {
      console.error("Error fetching resume data:", error);
      toast({
        title: "Failed to load resume data",
        description: error.message || "An error occurred while fetching resume data",
        variant: "destructive"
      });
    } finally {
      setIsEditorLoading(false);
    }
  };

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
  
  // Handle JSON editor changes
  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setJsonEditorValue(value);
    }
  };
  
  // Process the edited JSON to generate a new PDF
  const processEditedJson = async () => {
    if (!sessionId || !jsonEditorValue) {
      toast({
        title: "Missing data",
        description: "Resume data or session ID is missing",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessingJson(true);
    setProcessingStatus("Generating PDF from your edited resume data...");
    
    try {
      // Parse the JSON to validate it
      let parsedJson;
      try {
        parsedJson = JSON.parse(jsonEditorValue);
      } catch (parseError) {
        toast({
          title: "Invalid JSON",
          description: "Please check the JSON format and try again",
          variant: "destructive"
        });
        return;
      }
      
      // Send the edited JSON to the server
      const response = await fetch("/api/v2/generate-from-json", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resumeData: parsedJson,
          sessionId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate PDF from edited data");
      }
      
      // Update with new session ID and PDF URL
      const newSessionId = data.data.sessionId;
      const pdfUrl = data.data.pdfUrl;
      
      setSessionId(newSessionId);
      setNewResumeUrl(pdfUrl);
      setProcessingStatus("Resume updated successfully!");
      
      toast({
        title: "Resume updated",
        description: "Your resume has been updated with your edits",
        variant: "default"
      });
    } catch (error: any) {
      console.error("Error processing edited JSON:", error);
      toast({
        title: "Processing failed",
        description: error.message || "An error occurred while processing your edits",
        variant: "destructive"
      });
      setProcessingStatus("Failed to process edited resume data.");
    } finally {
      setIsProcessingJson(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <Card className="mb-6">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Resume Processor</CardTitle>
          <CardDescription>
            Download, edit, or get feedback on your processed resume
          </CardDescription>
        </CardHeader>
        
        {newResumeUrl ? (
          <CardContent>
            <div className="flex flex-col items-center w-full py-6">
              <p className="mb-4 text-center">Your resume is ready to download!</p>
              <div className="flex gap-3 w-full justify-center">
                <Button asChild size="lg">
                  <a href={newResumeUrl} target="_blank" rel="noopener noreferrer">
                    Download Resume
                  </a>
                </Button>
                
                <Button variant="outline" onClick={() => setLocation("/")}>
                  Process Another Resume
                </Button>
              </div>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <Tabs defaultValue="feedback" className="w-full" onValueChange={setActiveTab} value={activeTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
                <TabsTrigger value="json">Edit JSON</TabsTrigger>
              </TabsList>
              
              <TabsContent value="feedback" className="mt-4">
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
                    
                    <Button 
                      onClick={implementFeedback} 
                      disabled={isLoading || isImplementing || !feedback}
                      className="w-full mt-4"
                    >
                      {isImplementing ? "Implementing Feedback..." : "Implement Feedback"}
                    </Button>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {processingStatus || "Waiting for resume data..."}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="json" className="mt-4">
                {isEditorLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">Loading resume data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-md overflow-hidden">
                      <Editor
                        height="500px"
                        defaultLanguage="json"
                        value={jsonEditorValue}
                        onChange={handleEditorChange}
                        options={{
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          fontSize: 14,
                          tabSize: 2,
                        }}
                      />
                    </div>
                    
                    <Button 
                      onClick={processEditedJson} 
                      disabled={isProcessingJson || !jsonEditorValue}
                      className="w-full mt-4"
                    >
                      {isProcessingJson ? "Processing Edits..." : "Re-Process Resume with Updates"}
                    </Button>
                    
                    {isProcessingJson && (
                      <p className="text-sm text-center text-muted-foreground mt-2">
                        {processingStatus}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
      
      <div className="text-center">
        <Button variant="outline" onClick={() => setLocation("/")}>
          Return to Home
        </Button>
      </div>
    </div>
  );
}

export default ResumeFeedback;