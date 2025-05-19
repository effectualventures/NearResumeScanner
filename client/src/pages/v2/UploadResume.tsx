import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Editor from "@monaco-editor/react";

export function UploadResume() {
  const [file, setFile] = useState<File | null>(null);
  const [enhancedFormat, setEnhancedFormat] = useState(false);
  const [includeAdditionalExp, setIncludeAdditionalExp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [sessionId, setSessionId] = useState("");
  
  // JSON Editor state
  const [jsonValue, setJsonValue] = useState("");
  const [jsonEditorLoading, setJsonEditorLoading] = useState(false);
  const [regeneratingJson, setRegeneratingJson] = useState(false);
  const [jsonError, setJsonError] = useState("");
  const [resumeData, setResumeData] = useState<any>(null);
  
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Fetch resume data for JSON editing
  const fetchResumeData = async (sid: string) => {
    if (!sid) return;
    
    setJsonEditorLoading(true);
    setJsonError("");
    
    try {
      const response = await fetch(`/api/v2/resume-data/${sid}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch resume data");
      }
      
      const data = await response.json();
      
      if (data.success && data.data.resumeData) {
        setResumeData(data.data.resumeData);
        setJsonValue(JSON.stringify(data.data.resumeData, null, 2));
      } else {
        throw new Error("Invalid resume data format");
      }
    } catch (error: any) {
      console.error("Error fetching resume data:", error);
      setJsonError(error.message || "An error occurred while fetching resume data");
    } finally {
      setJsonEditorLoading(false);
    }
  };
  
  // Process edited JSON to regenerate PDF
  const regenerateFromJson = async () => {
    if (!sessionId || !jsonValue) {
      toast({
        title: "Missing data",
        description: "Resume data or session ID is missing",
        variant: "destructive"
      });
      return;
    }
    
    setRegeneratingJson(true);
    setProcessingStatus("Generating PDF from your edited resume data...");
    setJsonError("");
    
    try {
      // Parse the JSON to validate it
      let parsedJson;
      try {
        parsedJson = JSON.parse(jsonValue);
      } catch (parseError) {
        setJsonError("Invalid JSON format. Please check your edits and try again.");
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
      setSessionId(newSessionId);
      setResumeUrl(data.data.pdfUrl);
      setProcessingStatus("Resume updated successfully!");
      
      toast({
        title: "Resume updated",
        description: "Your resume has been updated with your edits",
        variant: "default"
      });
    } catch (error: any) {
      console.error("Error processing edited JSON:", error);
      setJsonError(error.message || "Failed to process your edits");
      toast({
        title: "Processing failed",
        description: error.message || "An error occurred while processing your edits",
        variant: "destructive"
      });
    } finally {
      setRegeneratingJson(false);
    }
  };
  
  // Handle JSON editor changes
  const handleJsonChange = (value: string | undefined) => {
    if (value) {
      setJsonValue(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a resume file to upload",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    setProcessingStatus("Uploading resume...");
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("enhancedFormat", enhancedFormat.toString());
      formData.append("includeAdditionalExp", includeAdditionalExp.toString());
      
      // Call our enhanced v2 API endpoint
      const response = await fetch("/api/v2/convert", {
        method: "POST",
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to process resume");
      }
      
      // Set the PDF URL and session ID for future use
      setResumeUrl(data.data.pdfUrl);
      setSessionId(data.data.sessionId);
      
      // Fetch the resume JSON data for editing
      fetchResumeData(data.data.sessionId);
      
      toast({
        title: "Resume processed successfully",
        description: "Your resume has been processed and formatted according to Near standards",
        variant: "default"
      });
      
      setProcessingStatus("Resume processed successfully!");
    } catch (error: any) {
      console.error("Error processing resume:", error);
      toast({
        title: "Processing failed",
        description: error.message || "An error occurred while processing your resume",
        variant: "destructive"
      });
      setProcessingStatus("Failed to process resume.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl py-10">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Near Resume Processor</CardTitle>
          <CardDescription>
            Upload your resume to transform it into the Near format with professional polish and standardized metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-6">
              <div className="space-y-2">
                <Label htmlFor="resume">Resume File</Label>
                <input
                  id="resume"
                  type="file"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  accept=".pdf,.doc,.docx"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="enhanced" 
                    checked={enhancedFormat}
                    onCheckedChange={(checked) => setEnhancedFormat(checked === true)} 
                    disabled={isLoading}
                  />
                  <Label htmlFor="enhanced">Use enhanced 2-page format (for 10+ years of experience)</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="additional-exp" 
                    checked={includeAdditionalExp}
                    onCheckedChange={(checked) => setIncludeAdditionalExp(checked === true)} 
                    disabled={isLoading}
                  />
                  <Label htmlFor="additional-exp">Include "Additional Experience" section (volunteer work, etc.)</Label>
                </div>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={isLoading || !file}
            >
              {isLoading ? "Processing..." : "Process Resume"}
            </Button>
          </form>
          
          {processingStatus && (
            <div className="mt-4 text-center text-sm">
              {processingStatus}
            </div>
          )}
        </CardContent>
        
        {resumeUrl && (
          <CardFooter className="flex flex-col w-full">
            <div className="text-center mb-6">
              <p className="mb-4 text-sm">Your resume has been processed and is ready to download!</p>
              <div className="flex gap-3 justify-center">
                <Button asChild>
                  <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                    Download Resume
                  </a>
                </Button>
                
                <Button variant="outline" asChild>
                  <a href={`/feedback?sessionId=${sessionId}`}>
                    Get AI Feedback
                  </a>
                </Button>
              </div>
            </div>
            
            {/* JSON Editor */}
            <div className="border rounded-md p-5 bg-muted/20 w-full mt-2">
              <h3 className="text-lg font-medium mb-3">Edit Resume JSON</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Make direct edits to the resume data below to customize your resume.
                Click "Re-Process Resume" when you're done to generate an updated PDF.
              </p>
              
              {jsonEditorLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Loading resume data...</p>
                </div>
              ) : (
                <>
                  <div className="border rounded-md overflow-hidden mb-4 bg-background">
                    <Editor
                      height="400px"
                      defaultLanguage="json"
                      value={jsonValue}
                      onChange={handleJsonChange}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        tabSize: 2,
                      }}
                    />
                  </div>
                  
                  <Button 
                    onClick={regenerateFromJson} 
                    disabled={regeneratingJson}
                    className="w-full"
                  >
                    {regeneratingJson ? 
                      "Processing Resume with Updates..." : 
                      "Re-Process Resume with Updates"}
                  </Button>
                  
                  {jsonError && (
                    <p className="text-sm text-red-500 mt-2">
                      {jsonError}
                    </p>
                  )}
                  
                  {regeneratingJson && (
                    <p className="text-sm text-center text-muted-foreground mt-2">
                      {processingStatus}
                    </p>
                  )}
                </>
              )}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default UploadResume;