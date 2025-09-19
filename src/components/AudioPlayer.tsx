import { useState, useRef, useEffect } from "react";
import { Play, Pause, Download, Volume2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
  audioUrl: string;
}

export const AudioPlayer = ({ audioUrl }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (values: number[]) => {
    const newTime = values[0];
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (isPlaying) {
        audioRef.current.play();
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'generated-voice-audio.wav';
    link.click();
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="upload-card p-8">
      <audio ref={audioRef} src={audioUrl} />
      
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-2">Generated Audio</h3>
        <p className="text-muted-foreground">Your story in your voice</p>
      </div>

      {/* Waveform Visualization (Mock) */}
      <div className="mb-6 p-4 bg-player-bg rounded-lg">
        <div className="flex items-center justify-center h-16 gap-1">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 bg-waveform-secondary rounded-full transition-all duration-150 ${
                currentTime > 0 && i < (currentTime / duration) * 50
                  ? 'bg-waveform-primary h-12'
                  : 'h-2'
              }`}
              style={{
                height: `${Math.random() * 40 + 8}px`,
                backgroundColor: currentTime > 0 && i < (currentTime / duration) * 50
                  ? 'hsl(var(--waveform-primary))'
                  : 'hsl(var(--waveform-secondary))'
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          disabled={isLoading}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRestart}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>

        <Button
          onClick={togglePlayback}
          disabled={isLoading}
          size="lg"
          className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary hover:from-primary-glow hover:to-secondary-glow"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground"
        >
          <Download className="w-5 h-5" />
        </Button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-muted-foreground" />
        <Slider
          value={[volume]}
          max={100}
          step={1}
          onValueChange={(values) => setVolume(values[0])}
          className="flex-1 max-w-32"
        />
        <span className="text-sm text-muted-foreground w-8">{volume}%</span>
      </div>
    </div>
  );
};