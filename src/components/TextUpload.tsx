import { useState, useRef } from "react";
import { FileText, Upload, Type, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import supabase from "@/lib/SupabaseClient";

interface TextUploadProps {
  onTextChange: (text: string) => void;
  text: string;
  sessionId?: number | null;
  onPdfUpload?: (file: File, pdfUrl: string) => void;
}

export const TextUpload = ({
  onTextChange,
  text,
  sessionId,
  onPdfUpload,
}: TextUploadProps) => {
  const [activeTab, setActiveTab] = useState<"type" | "upload">("type");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedPdf, setUploadedPdf] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<"type" | "upload" | null>(null);

  const handleFileSelect = async (file: File) => {
    if (file.type === "text/plain" || file.type === "application/pdf") {
      // File size validation (max 1MB)
      const maxSize = 1024 * 1024; // 1MB in bytes
      if (file.size > maxSize) {
        toast.error(`File size must be less than 1MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }
      
      // Clear any existing PDF when selecting a new file
      if (uploadedPdf) {
        setUploadedPdf(null);
      }
      try {
        if (file.type === "text/plain") {
          // Handle TXT files - read content directly
          const content = await file.text();
          onTextChange(content);
          
          // If we already have a sessionId (voice was uploaded), save the text to DB
          if (sessionId) {
            await handleTextUpload(content, sessionId);
          }
          
          toast.success("Text file uploaded successfully!");
          // Stay in upload tab to show the ready state
        } else if (file.type === "application/pdf") {
          // Handle PDF files - upload to Supabase Storage
          if (!onPdfUpload) {
            toast.error("PDF upload not configured");
            return;
          }
          
          // Set uploading state
          setIsUploading(true);
          
          const filePath = `pdf-${Date.now()}-${file.name}`;
          
          const { data, error } = await supabase.storage
            .from("pdf-samples")
            .upload(filePath, file);
          
          if (error) {
            toast.error("Failed to upload PDF file");
            console.error("PDF upload error:", error);
            setIsUploading(false);
            return;
          }
          
          // Get public URL for the PDF
          const {
            data: { publicUrl },
          } = supabase.storage.from("pdf-samples").getPublicUrl(filePath);
          
          // Store PDF data for preview
          setUploadedPdf({ file, url: publicUrl });
          
          // Call parent callback with file and URL
          onPdfUpload(file, publicUrl);
          
          // Clear uploading state and show success
          setIsUploading(false);
          toast.success("PDF uploaded successfully! Text will be extracted during generation.");
          // Stay in upload tab to show the ready state
        }
      } catch (error) {
        toast.error("Failed to process file");
        console.error("File processing error:", error);
        setIsUploading(false);
      }
    } else {
      toast.error("Please upload a text file (.txt) or PDF");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isUploading) {
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleTextUpload = async (text: string, sessionId: number) => {
    const { error } = await supabase
      .from("sessions")
      .update({ story_text: text })
      .eq("id", sessionId);

    if (error) {
      console.error("Text upload error:", error.message);
    }
  };

  // Handle tab switching with confirmation
  const handleTabSwitch = (newTab: "type" | "upload") => {
    if (isUploading) return; // Don't allow switching during upload
    
    // Check if there's existing content that would be lost
    const hasContent = (newTab === "type" && uploadedPdf) || (newTab === "upload" && text.trim());
    
    if (hasContent) {
      setPendingTab(newTab);
      setShowConfirmDialog(true);
    } else {
      setActiveTab(newTab);
    }
  };

  // Confirm tab switch and clear content
  const confirmTabSwitch = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      
      // Clear the content that's being switched away from
      if (pendingTab === "type") {
        // Switching to type, clear uploaded PDF
        setUploadedPdf(null);
        if (onPdfUpload) {
          onPdfUpload(null as any, "");
        }
      } else {
        // Switching to upload, clear typed text
        onTextChange("");
      }
    }
    
    setShowConfirmDialog(false);
    setPendingTab(null);
  };

  // Cancel tab switch
  const cancelTabSwitch = () => {
    setShowConfirmDialog(false);
    setPendingTab(null);
  };

  return (
    <div className="upload-card p-8">
      {/* Tab Navigation */}
      <div className="flex bg-muted rounded-lg p-1 mb-6">
        <Button
          variant={activeTab === "type" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleTabSwitch("type")}
          className="flex-1 gap-2"
          disabled={isUploading}
        >
          <Type className="w-4 h-4" />
          Type Text
        </Button>
        <Button
          variant={activeTab === "upload" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleTabSwitch("upload")}
          className="flex-1 gap-2"
          disabled={isUploading}
        >
          <Upload className="w-4 h-4" />
          Upload File
        </Button>
      </div>

      {activeTab === "type" ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Story Text</h3>
          <Textarea
            placeholder="Paste or type your story here... This text will be converted to audio using your voice sample."
            value={text}
            onChange={(e) => {
              const newText = e.target.value;
              if (newText.length <= 1500) {
                onTextChange(newText);
              }
            }}
            onBlur={(e) => {
              // Save to DB only if we already have a sessionId
              if (sessionId) {
                const newText = (e.currentTarget as HTMLTextAreaElement).value;
                handleTextUpload(newText, sessionId);
              }
            }}
            className="min-h-[200px] bg-background-secondary border-border resize-none"
            maxLength={1500}
          />
          <div className="flex justify-between items-center text-sm">
            <span className={`${text.length > 1500 ? 'text-red-500' : text.length > 1350 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
              {text.length}/1500 characters
            </span>
            {text.length > 1500 && (
              <span className="text-red-500 text-xs">
                Character limit exceeded
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            isUploading
              ? "border-primary/50 bg-upload-hover"
              : isDragOver
              ? "border-primary bg-upload-active"
              : uploadedPdf || text
              ? "border-primary/50 bg-upload-hover"
              : "border-upload-border hover:border-upload-border hover:bg-upload-hover"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf"
            onChange={(e) =>
              e.target.files?.[0] && handleFileSelect(e.target.files[0])
            }
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Uploading PDF
                </h3>
                <p className="text-muted-foreground text-sm">
                  Please wait while your file is being uploaded...
                </p>
              </div>
            </div>
          ) : uploadedPdf || text ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Text File Ready
                </h3>
                {uploadedPdf ? (
                  <>
                    <p className="text-muted-foreground text-sm mb-2">
                      {uploadedPdf.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {(uploadedPdf.file.size / 1024 / 1024).toFixed(2)} MB • PDF
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm mb-4">
                    Text content ready ({text.length} characters)
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Text will be extracted during generation.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Upload Text File
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Drop your text file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports TXT files and PDF files (max 1MB)
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant={uploadedPdf || text ? "secondary" : "default"}
            className="mt-4"
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : uploadedPdf || text ? "Replace File" : "Browse Files"}
          </Button>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Input Method</AlertDialogTitle>
            <AlertDialogDescription>
              Switching input method will remove your current file/text. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTabSwitch}>No, Keep Current</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTabSwitch}>Yes, Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};