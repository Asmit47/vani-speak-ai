import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Mic, Play, Square, Volume2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";

const MockInterview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const [step, setStep] = useState<"setup" | "interview" | "results">("setup");
  const [config, setConfig] = useState({
    role: "",
    difficulty: "medium",
    type: "behavioral",
  });
  const [questions, setQuestions] = useState<Array<{ question: string; category: string }>>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const jobRoles = [
    "Software Engineer",
    "Product Manager",
    "Data Analyst",
    "Marketing Manager",
    "Sales Executive",
    "HR Professional",
  ];

  const difficulties = ["easy", "medium", "hard"];
  const interviewTypes = ["behavioral", "technical", "situational", "general"];

  const handleStartInterview = async () => {
    if (!config.role) {
      toast({
        title: "Role Required",
        description: "Please select a job role",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingQuestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('mock-interview', {
        body: {
          role: config.role,
          difficulty: config.difficulty,
          type: config.type,
          action: 'generate_questions'
        }
      });

      if (error) throw error;

      setQuestions(data.questions);
      setStep("interview");
      toast({
        title: "Interview Started",
        description: "Listen to the first question",
      });

      // Speak first question
      await speakQuestion(data.questions[0].question);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate questions",
        variant: "destructive",
      });
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const speakQuestion = async (question: string) => {
    setIsSpeaking(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text: question }
      });

      if (error) throw error;

      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      await new Promise((resolve) => {
        audio.onended = resolve;
        audio.play();
      });
    } catch (error) {
      console.error('Error speaking question:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleStartAnswer = async () => {
    try {
      await startRecording();
      toast({
        title: "Recording",
        description: "Answer the question clearly",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const handleStopAnswer = () => {
    stopRecording();
  };

  const processAnswer = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        
        const { data: transcriptData, error } = await supabase.functions.invoke('transcribe-speech', {
          body: { audioBase64: base64Audio }
        });

        if (error) throw error;

        const newAnswers = [...answers, transcriptData.text];
        setAnswers(newAnswers);

        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          await speakQuestion(questions[currentQuestionIndex + 1].question);
          toast({
            title: "Next Question",
            description: "Listen and answer",
          });
        } else {
          // All questions answered, get feedback
          await getFeedback(newAnswers);
        }

        resetRecording();
      };
    } catch (error) {
      console.error('Error processing answer:', error);
      toast({
        title: "Error",
        description: "Failed to process answer",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getFeedback = async (allAnswers: string[]) => {
    setIsProcessing(true);
    try {
      const qaList = questions.map((q, i) => `Q${i + 1}: ${q.question}\nA${i + 1}: ${allAnswers[i]}`).join('\n\n');

      const { data, error } = await supabase.functions.invoke('analyze-speech', {
        body: { 
          text: qaList,
          topic: config.role,
          type: 'interview'
        }
      });

      if (error) throw error;

      setFeedback(data.feedback);
      setStep("results");

      toast({
        title: "Interview Complete",
        description: "Review your feedback",
      });

      // Speak feedback summary
      await speakQuestion("Interview complete. Here is your performance summary.");
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
    if (audioBlob && !isProcessing && step === "interview") {
      processAnswer();
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
              <h1 className="text-xl font-bold text-foreground">Mock Interview</h1>
              <p className="text-xs text-muted-foreground">Practice with AI interviewer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-24 animate-fade-in">
        {step === "setup" && (
          <>
            {/* Job Role Selection */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">Select Job Role</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {jobRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => setConfig({ ...config, role })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      config.role === role
                        ? "border-primary bg-primary/10 shadow-lg scale-105"
                        : "border-border bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    <Briefcase className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-foreground">{role}</p>
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Difficulty Level */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">Difficulty Level</h3>
              <div className="flex gap-3">
                {difficulties.map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfig({ ...config, difficulty: level })}
                    className={`flex-1 px-4 py-3 rounded-xl border-2 capitalize transition-all ${
                      config.difficulty === level
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Interview Type */}
            <GlassCard>
              <h3 className="text-lg font-semibold text-foreground mb-4">Interview Type</h3>
              <div className="grid grid-cols-2 gap-3">
                {interviewTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setConfig({ ...config, type })}
                    className={`px-4 py-3 rounded-xl border-2 capitalize transition-all ${
                      config.type === type
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border bg-white/40 hover:bg-white/60"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </GlassCard>

            <Button
              variant="hero"
              size="lg"
              onClick={handleStartInterview}
              className="w-full"
              disabled={!config.role || isLoadingQuestions}
            >
              <Play className="w-5 h-5" />
              {isLoadingQuestions ? "Generating Questions..." : "Start Interview"}
            </Button>
          </>
        )}

        {step === "interview" && questions.length > 0 && (
          <>
            {/* Interview Configuration Display */}
            <GlassCard className="bg-gradient-to-r from-primary/10 to-secondary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Interviewing for</p>
                  <h3 className="text-xl font-bold text-foreground">{config.role}</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground capitalize">{config.type}</p>
                  <p className="text-xs text-muted-foreground capitalize">{config.difficulty} difficulty</p>
                </div>
              </div>
            </GlassCard>

            {/* Question Display */}
            <GlassCard className="text-center space-y-6">
              <div className="space-y-4 animate-fade-in">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center shadow-xl">
                  {isSpeaking ? (
                    <Volume2 className="w-10 h-10 text-white animate-pulse" />
                  ) : (
                    <Briefcase className="w-10 h-10 text-white" />
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed">
                    {questions[currentQuestionIndex]?.question || "Loading question..."}
                  </p>
                  {isSpeaking && (
                    <p className="text-xs text-primary">🔊 Speaking question...</p>
                  )}
                </div>
              </div>

              {isRecording && (
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl animate-pulse">
                      <Mic className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary blur-xl opacity-50 animate-glow" />
                  </div>
                </div>
              )}

              <Button
                variant={isRecording ? "destructive" : "hero"}
                size="lg"
                onClick={isRecording ? handleStopAnswer : handleStartAnswer}
                disabled={isProcessing || isSpeaking}
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5" />
                    Stop Answer
                  </>
                ) : isProcessing ? (
                  "Processing..."
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Start Answer
                  </>
                )}
              </Button>
            </GlassCard>

            {/* Progress */}
            <GlassCard hover={false}>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-foreground">
                    {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </GlassCard>
          </>
        )}

        {step === "results" && feedback && (
          <GlassCard className="space-y-6 bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Interview Complete!</h3>
              <p className="text-muted-foreground">Here's your performance summary</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border">
                <h4 className="font-semibold text-foreground mb-3">Detailed Feedback</h4>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-border">
                <h4 className="font-semibold text-foreground mb-2">Your Answers</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {answers.map((answer, index) => (
                    <div key={index} className="text-xs">
                      <p className="text-primary font-medium">Q{index + 1}: {questions[index]?.question}</p>
                      <p className="text-muted-foreground mt-1">A: {answer}</p>
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
                  setConfig({ role: "", difficulty: "medium", type: "behavioral" });
                  setQuestions([]);
                  setAnswers([]);
                  setCurrentQuestionIndex(0);
                  setFeedback(null);
                }}
                className="flex-1"
              >
                Try Another Role
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

export default MockInterview;
