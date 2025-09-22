import { useRef, useState } from "react";
import { Upload, Mic, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import supabase from "@/lib/SupabaseClient";


interface VoiceUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  onSessionCreated?: (id: number) => void; // new optional callback
}

export const VoiceUpload = ({
  onFileSelect,
  selectedFile,
  onSessionCreated,
}: VoiceUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith("audio/")) {
      onFileSelect(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      toast.success("Voice sample uploaded successfully!");
    } else {
      toast.error("Please upload an audio file (MP3, WAV, etc.)");
    }
  };
  const handleFileUpload = async (file: File) => {
    // 1. Upload to storage
    const { data, error } = await supabase.storage
      .from("voices")
      .upload(`voices/${Date.now()}-${file.name}`, file);

    if (error) {
      console.error("Upload error:", error.message);
      return;
    }

    // 2. Insert into sessions and return id
    const { data: insertData, error: insertError } = await supabase
      .from("sessions")
      .insert([{ voice_path: data.path, status: "uploaded" }])
      .select("id")
      .single();

    if (insertError) {
      console.error("DB insert error:", insertError);
    } else if (insertData && insertData.id) {
      // Supabase may return id as string (int8/bigint) or number
      const newSessionId = typeof insertData.id === "string" ? parseInt(insertData.id, 10) : insertData.id;
      // If parent expects string, remove parseInt above and pass as string
      if (onSessionCreated) onSessionCreated(newSessionId);
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

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="upload-card p-8">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragOver
            ? "border-primary bg-upload-active"
            : selectedFile
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
          accept="audio/*"
          onChange={(e) =>
            e.target.files?.[0] && handleFileSelect(e.target.files[0])
          }
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Voice Sample Ready
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {selectedFile.name}
              </p>

              {audioUrl && (
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePlayback}
                    className="text-primary hover:text-primary-glow"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isPlaying ? "Pause" : "Preview"}
                  </Button>
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handleAudioEnded}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Upload Voice Sample
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Drop your audio file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports MP3, WAV, M4A (max 10MB)
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant={selectedFile ? "secondary" : "default"}
          className="mt-4"
        >
          {selectedFile ? "Change File" : "Browse Files"}
        </Button>
      </div>
    </div>
  );
};
