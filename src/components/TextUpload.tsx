import { useState, useRef } from "react";
import { FileText, Upload, Type, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import supabase from "@/lib/SupabaseClient";
import { Document, Page, pdfjs } from 'react-pdf';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface TextUploadProps {
  onTextChange: (text: string) => void;
  text: string;
  sessionId?: number | null; // optional - parent will pass this when available
}
export const TextUpload = ({
  onTextChange,
  text,
  sessionId,
}: TextUploadProps) => {
  const [activeTab, setActiveTab] = useState<"type" | "upload">("type");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  const handleFileSelect = async (file: File) => {
    if (file.type === "text/plain" || file.type === "application/pdf") {
      try {
        let content = "";

        if (file.type === "text/plain") {
          content = await file.text();
          setPdfFile(null); // Clear PDF preview if switching to text
        } else if (file.type === "application/pdf") {
          setPdfFile(file);
          setPageNumber(1);
          // For PDF, we'll show the preview but also try to extract text
          // For now, we'll set a placeholder text that indicates it's a PDF
          content = `[PDF Document: ${file.name}]`;
        }

        onTextChange(content);
        // If we already have a sessionId (voice was uploaded), save the text to DB
        if (sessionId) {
          await handleTextUpload(content, sessionId);
        } else {
          // sessionId not available yet (user may upload voice later).
          // We'll still keep text in UI (parent state), and voice upload can update DB later.
        }
        toast.success(`${file.type === "application/pdf" ? "PDF" : "Text"} file uploaded successfully!`);
        setActiveTab("type"); // Switch to text view
      } catch (error) {
        toast.error("Failed to read file");
      }
    } else {
      toast.error("Please upload a text file (.txt) or PDF");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  return (
    <div className="upload-card p-8">
      {/* Tab Navigation */}
      <div className="flex bg-muted rounded-lg p-1 mb-6">
        <Button
          variant={activeTab === "type" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("type")}
          className="flex-1 gap-2"
        >
          <Type className="w-4 h-4" />
          Type Text
        </Button>
        <Button
          variant={activeTab === "upload" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("upload")}
          className="flex-1 gap-2"
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
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={(e) => {
              // Save to DB only if we already have a sessionId
              if (sessionId) {
                const newText = (e.currentTarget as HTMLTextAreaElement).value;
                handleTextUpload(newText, sessionId);
              }
            }}
            className="min-h-[200px] bg-background-secondary border-border resize-none"
          />
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{text.length} characters</span>
            <span>~{Math.ceil(text.length / 6)} words</span>
          </div>

          {/* PDF Preview */}
          {pdfFile && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-medium text-foreground">PDF Preview</h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {pageNumber} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="pdf-preview-container border border-border rounded-lg bg-background-secondary overflow-hidden">
                <div className="flex justify-center items-center p-4 max-h-[400px] overflow-auto">
                  <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="pdf-document"
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={Math.min(600, window.innerWidth - 100)}
                      className="pdf-page shadow-lg"
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            isDragOver
              ? "border-primary bg-upload-active"
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
                Supports TXT and PDF files with preview
              </p>
            </div>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="default"
            className="mt-4"
          >
            Browse Files
          </Button>
        </div>
      )}
    </div>
  );
};
