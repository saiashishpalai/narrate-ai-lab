import { useState, useRef } from "react";
import { FileText, Upload, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import supabase from "@/lib/SupabaseClient";

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

  const handleFileSelect = async (file: File) => {
    if (file.type === "text/plain" || file.type === "application/pdf") {
      try {
        let content = "";

        if (file.type === "text/plain") {
          content = await file.text();
        } else {
          // For PDF, we'd need a proper parser in a real app
          toast.error(
            "PDF parsing not implemented in this demo. Please copy and paste your text."
          );
          return;
        }

        onTextChange(content);
        // If we already have a sessionId (voice was uploaded), save the text to DB
        if (sessionId) {
          await handleTextUpload(content, sessionId);
        } else {
          // sessionId not available yet (user may upload voice later).
          // We'll still keep text in UI (parent state), and voice upload can update DB later.
        }
        toast.success("Text file uploaded successfully!");
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
                Supports TXT files (PDF parsing coming soon)
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
