import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function UploadResume() {
  const [file, setFile] = useState<File | null>(null);
  const [enhancedFormat, setEnhancedFormat] = useState(false);
  const [includeAdditionalExp, setIncludeAdditionalExp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [sessionId, setSessionId] = useState("");
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
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
          <CardTitle className="text-2xl font-bold">Enhanced Resume Processor (v2)</CardTitle>
          <CardDescription>
            Upload your resume to transform it into the Near format with improved precision and formatting
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
          <CardFooter className="flex flex-col items-center">
            <p className="mb-2 text-sm text-center">Your resume has been processed and is ready to download!</p>
            <div className="flex gap-2">
              <Button asChild>
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                  Download Resume
                </a>
              </Button>
              
              <Button variant="outline" asChild>
                <a href={`/v2/feedback?sessionId=${sessionId}`}>
                  Get AI Feedback
                </a>
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default UploadResume;