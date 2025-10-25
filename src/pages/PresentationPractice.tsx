import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Play, Mic, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

const PresentationPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isRecording, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const [step, setStep] = useState<"upload" | "presenting">("upload");
  const [fileName, setFileName] = useState("");
  const [currentSlide, setCurrentSlide] = useState(1);
  const [duration, setDuration] = useState(0);
  const totalSlides = 8;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.name.endsWith(".ppt") || file.name.endsWith(".pptx")) {
        setFileName(file.name);
        toast({
          title: "File Uploaded",
          description: `${file.name} is ready for practice`,
        });
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a PDF or PPT file",
          variant: "destructive",
        });
      }
    }
  };

  const handleStartPresentation = async () => {
    if (!fileName) {
      toast({
        title: "No File Uploaded",
        description: "Please upload your presentation first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await startRecording();
      setStep("presenting");
      setDuration(0);
      toast({
        title: "Recording Started",
        description: "Present your slides confidently",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = () => {
    if (isRecording) {
      stopRecording();
    }
    setStep("upload");
    setCurrentSlide(1);
    setDuration(0);
    resetRecording();
    toast({
      title: "Session Ended",
      description: "Your presentation has been saved",
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const nextSlide = () => {
    if (currentSlide < totalSlides) setCurrentSlide(currentSlide + 1);
  };

  const prevSlide = () => {
    if (currentSlide > 1) setCurrentSlide(currentSlide - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Presentation Practice</h1>
              <p className="text-xs text-muted-foreground">Upload and practice your presentation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 pb-24 animate-fade-in">
        {step === "upload" && (
          <>
            {/* Upload Area */}
            <GlassCard className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-xl">
                <FileText className="w-10 h-10 text-white" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Upload Your Presentation</h3>
                <p className="text-muted-foreground">
                  Supported formats: PDF, PPT, PPTX
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <label className="block">
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="cursor-pointer p-8 border-2 border-dashed border-primary/50 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-all">
                    <Upload className="w-12 h-12 mx-auto mb-3 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      {fileName || "Click to upload or drag and drop"}
                    </p>
                    {fileName && (
                      <p className="text-xs text-muted-foreground mt-2">
                        File ready: {fileName}
                      </p>
                    )}
                  </div>
                </label>
              </div>

              {fileName && (
                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleStartPresentation}
                >
                  <Play className="w-5 h-5" />
                  Start Presentation
                </Button>
              )}
            </GlassCard>

            {/* Tips */}
            <GlassCard className="bg-accent/10">
              <h3 className="text-sm font-semibold text-foreground mb-3">Presentation Tips</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Maintain eye contact with your imaginary audience</li>
                <li>• Speak clearly and at a moderate pace</li>
                <li>• Use gestures to emphasize key points</li>
                <li>• Practice smooth transitions between slides</li>
              </ul>
            </GlassCard>
          </>
        )}

        {step === "presenting" && (
          <>
            {/* Slide Display Area */}
            <GlassCard className="aspect-video bg-gradient-to-br from-muted to-background/50 flex items-center justify-center relative">
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-primary/20">
                  Slide {currentSlide}
                </div>
                <p className="text-muted-foreground text-sm">
                  Your presentation slide would be displayed here
                </p>
              </div>

              {/* Slide Navigation */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <Button
                  variant="glass"
                  size="icon"
                  onClick={prevSlide}
                  disabled={currentSlide === 1}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-sm font-medium text-foreground px-4">
                  {currentSlide} / {totalSlides}
                </span>
                <Button
                  variant="glass"
                  size="icon"
                  onClick={nextSlide}
                  disabled={currentSlide === totalSlides}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </GlassCard>

            {/* Recording Controls */}
            <GlassCard className="bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {isRecording && (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg animate-pulse">
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {isRecording ? "Recording..." : "Paused"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Duration: {formatDuration(duration)}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleEndSession}
                  >
                    End Session
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Real-time Stats */}
            <div className="grid grid-cols-3 gap-4">
              <GlassCard hover={false} className="text-center">
                <div className="text-2xl font-bold text-primary">125</div>
                <p className="text-xs text-muted-foreground mt-1">Words/Min</p>
              </GlassCard>
              <GlassCard hover={false} className="text-center">
                <div className="text-2xl font-bold text-secondary">3</div>
                <p className="text-xs text-muted-foreground mt-1">Filler Words</p>
              </GlassCard>
              <GlassCard hover={false} className="text-center">
                <div className="text-2xl font-bold text-accent">5:42</div>
                <p className="text-xs text-muted-foreground mt-1">Time Elapsed</p>
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PresentationPractice;
