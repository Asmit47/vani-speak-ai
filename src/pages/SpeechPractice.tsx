import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Square, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SpeechPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");

  const suggestedTopics = [
    "My Career Goals",
    "Favorite Hobby",
    "A Challenge I Overcame",
    "Technology and Future",
    "Work-Life Balance",
    "Leadership Experience",
  ];

  const handleStartRecording = () => {
    if (!selectedTopic && !customTopic) {
      toast({
        title: "Topic Required",
        description: "Please select or enter a topic first",
        variant: "destructive",
      });
      return;
    }
    setIsRecording(true);
    toast({
      title: "Recording Started",
      description: "Speak clearly about your chosen topic",
    });
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    toast({
      title: "Recording Stopped",
      description: "Analyzing your speech...",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Speech Practice</h1>
              <p className="text-xs text-muted-foreground">Practice speaking on any topic</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-24 animate-fade-in">
        {/* Topic Selection */}
        {!isRecording && (
          <>
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">Choose Your Topic</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {suggestedTopics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => {
                      setSelectedTopic(topic);
                      setCustomTopic("");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedTopic === topic
                        ? "border-primary bg-primary/10 shadow-lg scale-105"
                        : "border-border bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground">{topic}</p>
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">Or Enter Custom Topic</h3>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  setSelectedTopic(null);
                }}
                placeholder="Type your topic here..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </GlassCard>
          </>
        )}

        {/* Recording Interface */}
        <GlassCard className="text-center space-y-6 bg-gradient-to-br from-primary/5 to-secondary/5">
          {isRecording && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-2xl font-bold text-foreground">
                {selectedTopic || customTopic}
              </h3>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl animate-pulse">
                    <Mic className="w-16 h-16 text-white" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary blur-xl opacity-50 animate-glow" />
                </div>
              </div>
              <p className="text-muted-foreground">Listening to your speech...</p>
            </div>
          )}

          {!isRecording && (selectedTopic || customTopic) && (
            <div className="space-y-4 animate-scale-in">
              <Sparkles className="w-12 h-12 mx-auto text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Ready to Practice</h3>
              <p className="text-muted-foreground">
                Topic: <span className="font-semibold text-foreground">{selectedTopic || customTopic}</span>
              </p>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-4">
            {!isRecording ? (
              <Button
                variant="hero"
                size="lg"
                onClick={handleStartRecording}
                disabled={!selectedTopic && !customTopic}
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="lg"
                onClick={handleStopRecording}
              >
                <Square className="w-5 h-5" />
                Stop Recording
              </Button>
            )}
          </div>
        </GlassCard>

        {/* Tips */}
        {!isRecording && (
          <GlassCard className="bg-accent/10">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Tips for Better Practice
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Speak clearly and at a natural pace</li>
              <li>• Structure your thoughts before speaking</li>
              <li>• Try to speak for at least 2-3 minutes</li>
              <li>• Practice in a quiet environment</li>
            </ul>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default SpeechPractice;
