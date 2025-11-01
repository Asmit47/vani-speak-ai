import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Mic, Play, Square, Volume2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: string;
  content: string;
  personality?: string;
}

const GroupDiscussion = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const [step, setStep] = useState<"setup" | "discussion" | "results">("setup");
  const [config, setConfig] = useState({
    participants: 3,
    aggression: "balanced",
    topic: "",
  });
  const [participants, setParticipants] = useState<Array<{name: string; personality: string}>>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [roundCount, setRoundCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const topics = [
    "Remote Work vs Office Work",
    "Impact of AI on Jobs",
    "Social Media Influence",
    "Education System Reform",
    "Climate Change Actions",
    "Startup Culture in India",
  ];

  const aggressionLevels = [
    { value: "polite", label: "Polite", desc: "Respectful, turn-taking" },
    { value: "balanced", label: "Balanced", desc: "Natural flow" },
    { value: "competitive", label: "Competitive", desc: "Interruptions allowed" },
  ];

  const handleStartDiscussion = async () => {
    if (!config.topic) {
      toast({
        title: "Topic Required",
        description: "Please select a discussion topic",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('group-discussion', {
        body: { 
          action: 'initialize',
          topic: config.topic,
          participants: config.participants,
          aggression: config.aggression
        }
      });

      if (error) throw error;

      setParticipants(data.participants);
      setMessages([{ role: 'system', content: `Topic: ${config.topic}` }]);
      setStep("discussion");
      
      toast({
        title: "Discussion Started",
        description: "AI participants are ready",
      });

      // First AI participant speaks
      handleAITurn(data.participants[0], []);
    } catch (error) {
      console.error('Error starting discussion:', error);
      toast({
        title: "Error",
        description: "Failed to initialize discussion",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAITurn = async (participant: {name: string; personality: string}, history: Message[]) => {
    setCurrentSpeaker(participant.name);
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('group-discussion', {
        body: { 
          action: 'respond',
          topic: config.topic,
          participant,
          history
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        role: participant.name,
        content: data.response,
        personality: participant.personality
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Speak the AI response
      await speakMessage(data.response);
      
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsProcessing(false);
      setCurrentSpeaker(null);
    }
  };

  const speakMessage = async (text: string) => {
    setIsSpeaking(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (error) throw error;

      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.play();
      });
    } catch (error) {
      console.error('Error speaking message:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleUserTurn = async () => {
    try {
      await startRecording();
      toast({
        title: "Recording",
        description: "Share your thoughts",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const handleStopUserTurn = () => {
    stopRecording();
  };

  const processUserResponse = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        const { data: transcriptData, error: transcriptError } = await supabase.functions.invoke('transcribe-speech', {
          body: { audioBase64: base64Audio }
        });

        if (transcriptError) throw transcriptError;

        const userMessage: Message = {
          role: 'You',
          content: transcriptData.text
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);

        const newRoundCount = roundCount + 1;
        setRoundCount(newRoundCount);

        if (newRoundCount >= 8) {
          // End discussion and get feedback
          await getFeedback(newMessages);
        } else {
          // Next AI participant speaks
          const nextParticipant = participants[newRoundCount % participants.length];
          await handleAITurn(nextParticipant, newMessages);
        }

        resetRecording();
      };
    } catch (error) {
      console.error('Error processing user response:', error);
      toast({
        title: "Error",
        description: "Failed to process your response",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getFeedback = async (history: Message[]) => {
    setIsProcessing(true);
    try {
      const conversationText = history
        .filter(m => m.role !== 'system')
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n');

      const { data, error } = await supabase.functions.invoke('analyze-speech', {
        body: { 
          text: conversationText,
          topic: config.topic,
          type: 'group_discussion'
        }
      });

      if (error) throw error;

      setFeedback(data.feedback);
      setStep("results");

      toast({
        title: "Discussion Complete",
        description: "Review your feedback",
      });

      await speakMessage("Group discussion complete. Here is your performance feedback.");
    } catch (error) {
      console.error('Error getting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to generate feedback",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (audioBlob && !isProcessing && step === "discussion") {
      processUserResponse();
    }
  }, [audioBlob]);

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
              <h1 className="text-xl font-bold text-foreground">Group Discussion</h1>
              <p className="text-xs text-muted-foreground">Practice with AI participants</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-24 animate-fade-in">
        {step === "setup" && (
          <>
            {/* Topic Selection */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">Discussion Topic</h3>
              <div className="space-y-3">
                {topics.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setConfig({ ...config, topic })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      config.topic === topic
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    <p className="font-medium text-foreground">{topic}</p>
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Number of Participants */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">
                AI Participants: {config.participants}
              </h3>
              <div className="flex gap-3">
                {[2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setConfig({ ...config, participants: num })}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                      config.participants === num
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    <Users className="w-6 h-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">{num} AI</p>
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Aggression Level */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">Discussion Style</h3>
              <div className="space-y-3">
                {aggressionLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setConfig({ ...config, aggression: level.value })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      config.aggression === level.value
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    <p className="font-medium text-foreground">{level.label}</p>
                    <p className="text-sm text-muted-foreground">{level.desc}</p>
                  </button>
                ))}
              </div>
            </GlassCard>

            <Button
              variant="hero"
              size="lg"
              onClick={handleStartDiscussion}
              className="w-full"
              disabled={!config.topic}
            >
              <Play className="w-5 h-5" />
              Start Discussion
            </Button>
          </>
        )}

        {step === "discussion" && participants.length > 0 && (
          <>
            {/* Topic Display */}
            <GlassCard className="text-center bg-gradient-to-r from-primary/10 to-secondary/10">
              <h3 className="text-xl font-bold text-foreground mb-2">{config.topic}</h3>
              <p className="text-sm text-muted-foreground">
                {participants.length} AI participants • {config.aggression} style
              </p>
            </GlassCard>

            {/* Discussion Feed */}
            <GlassCard className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    msg.role === 'You' 
                      ? 'bg-accent/10' 
                      : msg.role === 'system'
                      ? 'bg-muted/10'
                      : 'bg-primary/10'
                  }`}
                >
                  {msg.role !== 'system' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'You' ? 'bg-accent/20' : 'bg-primary/20'
                    }`}>
                      <Users className={`w-4 h-4 ${
                        msg.role === 'You' ? 'text-accent' : 'text-primary'
                      }`} />
                    </div>
                  )}
                  <div className="flex-1">
                    {msg.role !== 'system' && (
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-xs font-semibold ${
                          msg.role === 'You' ? 'text-accent' : 'text-primary'
                        }`}>
                          {msg.role}
                          {msg.personality && ` (${msg.personality})`}
                        </p>
                        {currentSpeaker === msg.role && isSpeaking && (
                          <Volume2 className="w-3 h-3 text-primary animate-pulse" />
                        )}
                      </div>
                    )}
                    <p className={`text-sm ${
                      msg.role === 'system' ? 'text-primary font-semibold text-center' : 'text-foreground'
                    }`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              
              {isProcessing && !currentSpeaker && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground animate-pulse">Processing...</p>
                </div>
              )}
            </GlassCard>

            {/* Your Turn Indicator */}
            {!isSpeaking && !currentSpeaker && (
              <GlassCard className="bg-gradient-to-r from-accent/20 to-primary/20 border-2 border-accent">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Your Turn</p>
                    <p className="text-xs text-muted-foreground">Share your perspective</p>
                  </div>
                  {!isRecording ? (
                    <Button 
                      variant="hero" 
                      size="lg"
                      onClick={handleUserTurn}
                      disabled={isProcessing}
                    >
                      <Mic className="w-5 h-5" />
                      Speak
                    </Button>
                  ) : (
                    <Button 
                      variant="destructive" 
                      size="lg"
                      onClick={handleStopUserTurn}
                    >
                      <Send className="w-5 h-5" />
                      Send
                    </Button>
                  )}
                </div>
              </GlassCard>
            )}

            {/* Discussion Stats */}
            <div className="grid grid-cols-3 gap-3">
              <GlassCard hover={false} className="text-center">
                <div className="text-xl font-bold text-primary">{participants.length + 1}</div>
                <p className="text-xs text-muted-foreground">Participants</p>
              </GlassCard>
              <GlassCard hover={false} className="text-center">
                <div className="text-xl font-bold text-secondary">{messages.length - 1}</div>
                <p className="text-xs text-muted-foreground">Exchanges</p>
              </GlassCard>
              <GlassCard hover={false} className="text-center">
                <div className="text-xl font-bold text-accent">{roundCount}/8</div>
                <p className="text-xs text-muted-foreground">Rounds</p>
              </GlassCard>
            </div>

            <Button
              variant="outline"
              onClick={() => getFeedback(messages)}
              className="w-full"
              disabled={isProcessing || isSpeaking}
            >
              <Square className="w-4 h-4" />
              End Discussion
            </Button>
          </>
        )}

        {step === "results" && feedback && (
          <GlassCard className="space-y-6 bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Discussion Complete!</h3>
              <p className="text-muted-foreground">Here's your performance analysis</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border">
                <h4 className="font-semibold text-foreground mb-3">Detailed Feedback</h4>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border text-center">
                  <div className="text-2xl font-bold text-primary">{participants.length + 1}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total Participants</p>
                </div>
                <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border text-center">
                  <div className="text-2xl font-bold text-secondary">{messages.filter(m => m.role === 'You').length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Your Contributions</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border">
                <h4 className="font-semibold text-foreground mb-2">Discussion Summary</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {messages.filter(m => m.role !== 'system').slice(0, 5).map((msg, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-medium text-primary">{msg.role}:</span>
                      <span className="text-muted-foreground ml-1">{msg.content.slice(0, 80)}...</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("setup");
                  setConfig({ participants: 3, aggression: "balanced", topic: "" });
                  setParticipants([]);
                  setMessages([]);
                  setRoundCount(0);
                  setFeedback(null);
                }}
                className="flex-1"
              >
                New Discussion
              </Button>
              <Button
                variant="hero"
                onClick={() => navigate("/dashboard")}
                className="flex-1"
              >
                Back to Dashboard
              </Button>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default GroupDiscussion;
