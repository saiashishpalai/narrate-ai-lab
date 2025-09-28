import { useState, useEffect } from "react";
import { VoiceUpload } from "@/components/VoiceUpload";
import { TextUpload } from "@/components/TextUpload";
import { AudioPlayer } from "@/components/AudioPlayer";
import { GenerateButton } from "@/components/GenerateButton";
import { toast } from "sonner";
import supabase from "@/lib/SupabaseClient";

const Index = () => {
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string>("");
  const [isVoiceValid, setIsVoiceValid] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [storyText, setStoryText] = useState<string>("");
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [voiceUploadError, setVoiceUploadError] = useState<string | null>(null);
  const [textUploadError, setTextUploadError] = useState<string | null>(null);
  
  // Feature flag for new flow - set to true to test new architecture
  const USE_NEW_FLOW = true; //IMPORTANT: Set to true to test new architecture

  // Monitor internet connection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // If we have a file selected but upload failed due to no internet, show a retry message
      if (voiceFile && voiceUploadError === "No internet connection") {
        toast.info("Internet connection restored. You can try uploading again.");
      }
      if (pdfFile && textUploadError === "No internet connection") {
        toast.info("Internet connection restored. You can try uploading again.");
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      // If user goes offline while we have a file selected, update the error state
      if (voiceFile && !isVoiceValid) {
        setVoiceUploadError("No internet connection");
      }
      if (pdfFile && !storyText.trim()) {
        setTextUploadError("No internet connection");
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [voiceFile, isVoiceValid, voiceUploadError, pdfFile, storyText, textUploadError]);

  // Upload voice file to Supabase Storage and store public URL
  const handleVoiceFileSelect = async (file: File | null) => {
    setVoiceFile(file);
    setVoiceUrl("");
    setSessionId(null);
    setIsVoiceValid(false); // Reset validation state
    setVoiceUploadError(null); // Clear previous errors

    if (!file) return;

    // Check internet connection first
    if (!isOnline) {
      setVoiceUploadError("No internet connection");
      toast.error("No internet connection. Please check your network and try again.");
      return;
    }

    try {
      // FIX 1: Remove the "voices/" prefix to avoid double "voices/voices/" path
      const filePath = `${Date.now()}-${file.name}`;

      const { data, error } = await supabase.storage
        .from("voice-samples")
        .upload(filePath, file);

      if (error) {
        // Check if it's a network error
        if (error.message?.includes('fetch') || error.message?.includes('network') || !navigator.onLine) {
          setVoiceUploadError("No internet connection");
          toast.error("No internet connection. Please check your network and try again.");
        } else {
          setVoiceUploadError("Upload failed");
          toast.error("Failed to upload voice file");
        }
        console.error("Upload error:", error);
        return;
      }

      // FIX 2: Use the correct destructuring syntax for getPublicUrl
      const {
        data: { publicUrl },
      } = supabase.storage.from("voice-samples").getPublicUrl(filePath);

      setVoiceUrl(publicUrl);

      // NEW FLOW: Don't create session until user clicks Generate
      if (!USE_NEW_FLOW) {
        // OLD FLOW: Create session immediately on voice upload
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert([
            {
              voice_path: filePath, // Store path, not full URL
              pdf_path: null, // PDF will be added later if uploaded
              status: "uploaded",
            },
          ])
          .select("id")
          .single();

        if (sessionError) {
          toast.error("Failed to create session");
          console.error("Session error:", sessionError);
        } else if (sessionData && sessionData.id) {
          setSessionId(
            typeof sessionData.id === "string"
              ? parseInt(sessionData.id, 10)
              : sessionData.id
          );
          setIsVoiceValid(true);
          toast.success("Voice file uploaded successfully!");
        }
      } else {
        // NEW FLOW: Just store file path, no session creation yet
        setVoiceFile(file);
        setIsVoiceValid(true);
        toast.success("Voice file uploaded successfully! Now add your text and click Generate.");
      }
    } catch (err) {
      // Check if it's a network error
      if (err instanceof TypeError && err.message?.includes('fetch')) {
        setVoiceUploadError("No internet connection");
        toast.error("No internet connection. Please check your network and try again.");
      } else {
        setVoiceUploadError("Upload failed");
        toast.error("Failed to upload voice file");
      }
      console.error("Upload exception:", err);
    }
  };

  // Handle PDF upload from TextUpload component
  const handlePdfUpload = (file: File | null, pdfUrl: string) => {
    setTextUploadError(null); // Clear previous errors
    
    if (file && pdfUrl) {
      // Check internet connection first
      if (!isOnline) {
        setTextUploadError("No internet connection");
        toast.error("No internet connection. Please check your network and try again.");
        return;
      }
      
      setPdfFile(file);
      setPdfUrl(pdfUrl);
      toast.success("PDF uploaded successfully! Text will be extracted during generation.");
    } else {
      // Clear PDF data when file is null
      setPdfFile(null);
      setPdfUrl("");
    }
  };

  // Helper function to determine text status
  const getTextStatus = () => {
    if (storyText.length > 1500) {
      return { status: 'error', text: 'Character limit exceeded', color: 'text-red-500', dot: 'bg-red-500' };
    }
    if (textUploadError === "No internet connection") {
      return { status: 'error', text: 'No Internet Connection', color: 'text-red-500', dot: 'bg-red-500' };
    }
    if (storyText.trim() || pdfFile) {
      return { status: 'ready', text: 'Ready', color: 'text-green-500', dot: 'bg-green-500' };
    }
    return { status: 'required', text: 'Required', color: 'text-muted-foreground', dot: 'bg-muted-foreground' };
  };

  const handleGenerate = async () => {
    if (!voiceUrl || !storyText.trim()) {
      toast.error("Please upload a voice sample and provide story text");
      return;
    }

    if (!USE_NEW_FLOW && !sessionId) {
      toast.error("No active session found");
      return;
    }

    setIsGenerating(true);
    let currentSessionId = sessionId;
    try {

      if (USE_NEW_FLOW) {
        // NEW FLOW: Create session only when generating
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .insert([
            {
              voice_path: voiceFile?.name ? `${Date.now()}-${voiceFile.name}` : null,
              pdf_path: pdfFile?.name ? `pdf-${Date.now()}-${pdfFile.name}` : null,
              story_text: storyText,
              status: "processing",
            },
          ])
          .select("id")
          .single();

        if (sessionError) {
          toast.error("Failed to create session");
          console.error("Session creation error:", sessionError);
          return;
        }

        currentSessionId = sessionData.id;
        setSessionId(currentSessionId);
      } else {
        // OLD FLOW: Update existing session status to processing
        await supabase
          .from("sessions")
          .update({
            status: "processing",
            story_text: storyText,
          })
          .eq("id", sessionId);
      }

      // Use the public URL from Supabase Storage
      const n8nWebhookUrl =
        import.meta.env.VITE_N8N_WEBHOOK_URL ||
        "http://localhost:5678/webhook-test/generate-audio";

      const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voiceUrl, // this is the public URL from Supabase
            text: storyText,
            pdfUrl: pdfUrl || null, // PDF URL for text extraction
            sessionId: currentSessionId, // Include sessionId for both flows
          }),
        });

      if (!response.ok) throw new Error("Failed to generate audio");

      const result = await response.json();
      const audioUrl = result.audioUrl || "";

      setGeneratedAudio(audioUrl);

      // Update session with generated audio and completion status
      await supabase
        .from("sessions")
        .update({
          generated_audio_path: audioUrl,
          status: "completed",
        })
        .eq("id", currentSessionId);

      toast.success("Audio generated successfully!");
    } catch (err) {
      // Update session status to failed on error
      if (currentSessionId) {
        await supabase
          .from("sessions")
          .update({ status: "failed" })
          .eq("id", currentSessionId);
      }

      toast.error("Failed to generate audio");
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16 animate-fade-up pt-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary-glow to-secondary-glow bg-clip-text text-transparent mb-4 leading-[1.7] pb-2">
            Voice Cloning Studio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Turn your storybooks into audio in your own voice.
          </p>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Section */}
          <div className="grid md:grid-cols-2 gap-8">
            <VoiceUpload
              onFileSelect={handleVoiceFileSelect}
              selectedFile={voiceFile}
              onSessionCreated={setSessionId}
            />
            <TextUpload
              onTextChange={setStoryText}
              text={storyText}
              sessionId={sessionId}
              onPdfUpload={handlePdfUpload}
              onTextUploadError={setTextUploadError}
            />
          </div>

          {/* Generate Button */}
          <div className="text-center space-y-3">
            {/* Status Indicator */}
            {!isGenerating && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  isVoiceValid ? 'bg-green-500' : voiceFile ? 'bg-red-500' : 'bg-muted-foreground'
                }`}></div>
                <span className={`${
                  isVoiceValid ? 'text-green-500' : voiceFile ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {
                    isVoiceValid ? 'Voice Sample Ready' : 
                    voiceFile && voiceUploadError === "No internet connection" ? 'No Internet Connection' :
                    voiceFile && voiceUploadError === "Upload failed" ? 'Upload Failed' :
                    voiceFile ? 'Invalid Size' : 'Voice Sample Required'
                  }
                </span>
                <span className="text-muted-foreground">•</span>
                <div className={`w-2 h-2 rounded-full ${getTextStatus().dot}`}></div>
                <span className={getTextStatus().color}>
                  {textUploadError === "No internet connection" ? getTextStatus().text : `Text Content ${getTextStatus().text}`}
                </span>
              </div>
            )}
            
            <GenerateButton
              onClick={handleGenerate}
              isGenerating={isGenerating}
              disabled={!isVoiceValid || (storyText.length > 1500) || (!storyText.trim() && !pdfFile)}
            />
          </div>

          {/* Audio Player */}
          {generatedAudio && (
            <div className="animate-fade-up">
              <AudioPlayer audioUrl={generatedAudio} />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-20 text-muted-foreground">
          <p className="text-sm">
            Built using modern AI tech stacks — A Portfolio MVP by Sai Ashish
            Palai
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
