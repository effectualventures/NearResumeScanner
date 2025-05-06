import { useState, useRef, DragEvent, ChangeEvent, useEffect } from 'react';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { validateResumeFile, formatFileSize } from '@/lib/fileUtils';
import { useToast } from '@/hooks/use-toast';

interface UploadPanelProps {
  onFileUpload: (file: File) => void;
  onProcessClick: () => void;
  isProcessing: boolean;
  progress: number;
  selectedFile: File | null;
  onRemoveFile: () => void;
  detailedFormat?: boolean;
  onDetailedFormatChange?: (useDetailed: boolean) => void;
}

export default function UploadPanel({
  onFileUpload,
  onProcessClick,
  isProcessing,
  progress,
  selectedFile,
  onRemoveFile,
  detailedFormat: propDetailedFormat,
  onDetailedFormatChange
}: UploadPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Settings states
  const [anonymizeLastName, setAnonymizeLastName] = useState(true);
  const [convertCurrencies, setConvertCurrencies] = useState(true);
  const [addLogo, setAddLogo] = useState(true);
  const [detailedFormat, setDetailedFormat] = useState(propDetailedFormat || false);
  
  // Sync the detailed format state with parent component
  useEffect(() => {
    if (propDetailedFormat !== undefined && propDetailedFormat !== detailedFormat) {
      setDetailedFormat(propDetailedFormat);
    }
  }, [propDetailedFormat]);
  
  // Notify parent when detailed format changes
  useEffect(() => {
    if (onDetailedFormatChange) {
      onDetailedFormatChange(detailedFormat);
    }
  }, [detailedFormat, onDetailedFormatChange]);
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };
  
  const handleFile = (file: File) => {
    const error = validateResumeFile(file);
    
    if (error) {
      toast({
        title: "Invalid File",
        description: error,
        variant: "destructive"
      });
      return;
    }
    
    onFileUpload(file);
  };
  
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="w-full lg:w-1/4 bg-white rounded-lg shadow-md p-5">
      <h2 className="text-lg font-medium text-near-navy mb-4">Upload Resume</h2>
      
      {/* File Upload Area */}
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed ${
            isDragging ? 'border-near-blue bg-blue-50' : 'border-near-gray-300'
          } rounded-lg p-8 text-center transition-colors hover:border-near-blue cursor-pointer mb-6`}
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <FiUpload className="mx-auto text-near-gray-400 text-3xl mb-3" />
          <p className="text-near-gray-600 mb-2">Drag & drop resume file here</p>
          <p className="text-near-gray-400 text-sm">or click to browse</p>
          <p className="text-near-gray-400 text-xs mt-2">PDF, DOCX (max 10MB)</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.docx"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="bg-near-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <FiFile className="text-near-blue text-xl mr-3 mt-1" />
            <div className="flex-1">
              <p className="font-medium text-near-gray-800 truncate">
                {selectedFile.name}
              </p>
              <p className="text-near-gray-500 text-sm">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              className="text-near-gray-500 hover:text-near-error"
              onClick={onRemoveFile}
              disabled={isProcessing}
            >
              <FiX />
            </button>
          </div>
        </div>
      )}
      
      {/* Process Button */}
      <Button
        className="w-full bg-near-blue text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
        disabled={!selectedFile || isProcessing}
        onClick={onProcessClick}
      >
        Convert Resume
      </Button>
      
      {/* Processing State */}
      {isProcessing && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-near-gray-700">Processing...</span>
            <span className="text-sm text-near-gray-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full h-2.5" />
          <p className="text-xs text-near-gray-500 mt-2">This may take up to 25 seconds</p>
        </div>
      )}
      
      {/* Settings */}
      <div className="mt-8">
        <h3 className="text-sm font-medium text-near-gray-700 mb-3">Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="anonymize" 
              checked={anonymizeLastName} 
              onCheckedChange={() => setAnonymizeLastName(!anonymizeLastName)} 
            />
            <label htmlFor="anonymize" className="text-sm text-near-gray-600 cursor-pointer">
              Anonymize last name
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="currency" 
              checked={convertCurrencies} 
              onCheckedChange={() => setConvertCurrencies(!convertCurrencies)} 
            />
            <label htmlFor="currency" className="text-sm text-near-gray-600 cursor-pointer">
              Convert currencies to USD
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="logo" 
              checked={addLogo} 
              onCheckedChange={() => setAddLogo(!addLogo)} 
            />
            <label htmlFor="logo" className="text-sm text-near-gray-600 cursor-pointer">
              Add Near logo to footer
            </label>
          </div>
          
          <div className="flex items-start space-x-2">
            <Checkbox 
              id="detailed" 
              checked={detailedFormat} 
              onCheckedChange={() => setDetailedFormat(!detailedFormat)} 
              className="mt-0.5"
            />
            <div>
              <label htmlFor="detailed" className="text-sm text-near-gray-600 cursor-pointer font-semibold">
                Detailed format (for 10+ years experience)
              </label>
              <p className="text-xs text-near-gray-500 mt-0.5">
                Creates a comprehensive two-page resume with detailed bullet points, extensive 
                metrics, and complete work history. Recommended for senior professionals with 15+ years experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
