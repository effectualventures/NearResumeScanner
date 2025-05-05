/**
 * Validate a file for resume upload
 * @param file The file to validate
 * @returns An error message if invalid, or null if valid
 */
export function validateResumeFile(file: File): string | null {
  // Check file type
  const validTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  
  if (!validTypes.includes(file.type)) {
    return "Invalid file type. Please upload a PDF or DOCX file.";
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return "File size exceeds the 10MB limit.";
  }
  
  return null; // File is valid
}

/**
 * Format file size for display
 * @param bytes File size in bytes
 * @returns Formatted string (e.g., "1.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + " B";
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
}

/**
 * Create an object URL for a file
 * @param file The file to create a URL for
 * @returns Object URL
 */
export function createFileURL(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke an object URL to free memory
 * @param url The object URL to revoke
 */
export function revokeFileURL(url: string): void {
  URL.revokeObjectURL(url);
}
