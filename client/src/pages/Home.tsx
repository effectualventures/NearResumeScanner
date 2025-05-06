import { useState, useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import UploadPanel from '@/components/UploadPanel';
import ProcessedResumePanel from '@/components/ProcessedResumePanel';
import ErrorModal from '@/components/ui/ErrorModal';
import { useToast } from '@/hooks/use-toast';
import { uploadResume, sendChatMessage, getChatHistory, downloadResume } from '@/lib/api';
import { createFileURL, revokeFileURL } from '@/lib/fileUtils';
import { ChatMessage } from '@shared/schema';

export default function Home() {
  const { toast } = useToast();
  
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [detailedFormat, setDetailedFormat] = useState<boolean>(false);
  
  // Processing state
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Chat state
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Error modal state
  const [errorModal, setErrorModal] = useState({
    show: false,
    title: '',
    message: ''
  });
  
  // Clean up file URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (fileUrl) {
        revokeFileURL(fileUrl);
      }
    };
  }, [fileUrl]);
  
  // Simulate progress during processing
  useEffect(() => {
    let progressInterval: number | null = null;
    
    if (isProcessing) {
      setProcessProgress(0);
      let progress = 0;
      
      progressInterval = window.setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 95) progress = 95; // Cap at 95% until complete
        setProcessProgress(progress);
      }, 1000);
    } else if (progressInterval) {
      clearInterval(progressInterval);
      setProcessProgress(100);
    }
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isProcessing]);
  
  // Handle file selection
  const handleFileUpload = (file: File) => {
    // Clean up previous file URL if exists
    if (fileUrl) {
      revokeFileURL(fileUrl);
    }
    
    setSelectedFile(file);
    setFileUrl(createFileURL(file));
    setExtractedText(null); // Reset extracted text
  };
  
  // Handle file removal
  const handleRemoveFile = () => {
    if (fileUrl) {
      revokeFileURL(fileUrl);
    }
    
    setSelectedFile(null);
    setFileUrl(null);
    setExtractedText(null);
  };
  
  // Handle process button click
  const handleProcessClick = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setIsProcessing(true);
    
    try {
      // Upload and process the file
      const result = await uploadResume(selectedFile);
      
      // Set session data
      setSessionId(result.sessionId);
      setPdfUrl(result.pdfUrl);
      
      // Get initial chat messages
      const messages = await getChatHistory(result.sessionId);
      setChatMessages(messages);
      
      // Show success toast
      toast({
        title: "Processing Complete",
        description: "Your resume has been transformed successfully",
      });
    } catch (error) {
      console.error('Error processing resume:', error);
      
      // Show error modal
      setErrorModal({
        show: true,
        title: 'Processing Error',
        message: error.message || 'Failed to process resume. Please try again.'
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };
  
  // Handle chat message
  const handleSendChatMessage = async (message: string) => {
    if (!sessionId) return;
    
    setIsChatLoading(true);
    
    try {
      // Add user message to chat
      const userMessage: ChatMessage = {
        id: Math.random(), // Temporary ID
        sessionId,
        isUser: true,
        message,
        createdAt: new Date()
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      
      // Send message to API
      const result = await sendChatMessage(sessionId, message);
      
      // Update PDF URL with new version
      setPdfUrl(result.pdfUrl);
      
      // Get updated chat messages
      const updatedMessages = await getChatHistory(sessionId);
      setChatMessages(updatedMessages);
      
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      toast({
        title: 'Chat Error',
        description: error.message || 'Failed to process your message',
        variant: 'destructive'
      });
    } finally {
      setIsChatLoading(false);
    }
  };
  
  // Handle download button click
  const handleDownload = () => {
    if (!sessionId) return;
    
    try {
      downloadResume(sessionId);
      
      toast({
        title: 'Download Started',
        description: 'Your resume PDF is downloading'
      });
    } catch (error) {
      console.error('Error downloading resume:', error);
      
      toast({
        title: 'Download Error',
        description: error.message || 'Failed to download resume',
        variant: 'destructive'
      });
    }
  };
  
  // Close error modal
  const closeErrorModal = () => {
    setErrorModal({ ...errorModal, show: false });
  };
  
  return (
    <div className="bg-near-light min-h-screen flex flex-col">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          <UploadPanel
            onFileUpload={handleFileUpload}
            onProcessClick={handleProcessClick}
            isProcessing={isProcessing}
            progress={processProgress}
            selectedFile={selectedFile}
            onRemoveFile={handleRemoveFile}
          />
          
          <ProcessedResumePanel
            pdfUrl={pdfUrl}
            isLoading={isProcessing}
            onDownload={handleDownload}
            onSendChatMessage={handleSendChatMessage}
            isChatLoading={isChatLoading}
            chatMessages={chatMessages}
            sessionReady={!!sessionId}
          />
        </div>
      </main>
      
      <ErrorModal
        open={errorModal.show}
        onClose={closeErrorModal}
        title={errorModal.title}
        message={errorModal.message}
      />
    </div>
  );
}
