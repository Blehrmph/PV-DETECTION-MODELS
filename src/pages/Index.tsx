import React, { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Play, RotateCcw, History } from "lucide-react";
import { Header } from "@/components/Header";
import { ImageUploader } from "@/components/ImageUploader";
import { PipelineVisualizer } from "@/components/PipelineVisualizer";
import { ResultsPanel } from "@/components/ResultsPanel";
import { HistoryList } from "@/components/HistoryList";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { checkBackendHealth, predictImage } from "@/services/apiService";
import { PredictionResult, PipelineStage } from "@/types/prediction";

type BackendStatus = "unknown" | "loading" | "ready" | "error";

const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<PipelineStage>("idle");
  const [currentResult, setCurrentResult] = useState<PredictionResult | null>(null);
  const [history, setHistory] = useState<PredictionResult[]>([]);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("unknown");
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const lastStatusRef = useRef<BackendStatus>("unknown");
  const [showReadyBanner, setShowReadyBanner] = useState(false);
  const readyTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const pollHealth = async () => {
      const health = await checkBackendHealth();
      if (cancelled) {
        return;
      }

      let nextStatus: BackendStatus = "error";
      if (health.status === "ok") {
        nextStatus = "ready";
      } else if (health.status === "loading") {
        nextStatus = "loading";
      }

      setBackendStatus(nextStatus);
      setBackendMessage(health.message ?? null);

      if (nextStatus !== lastStatusRef.current) {
        if (nextStatus === "ready") {
          setShowReadyBanner(true);
          if (readyTimeoutRef.current) {
            window.clearTimeout(readyTimeoutRef.current);
          }
          readyTimeoutRef.current = window.setTimeout(() => {
            setShowReadyBanner(false);
          }, 6000);
        } else {
          setShowReadyBanner(false);
        }
        lastStatusRef.current = nextStatus;
      }

      const nextDelay = nextStatus === "ready" ? 30000 : 5000;
      timeoutId = window.setTimeout(pollHealth, nextDelay);
    };

    pollHealth();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (readyTimeoutRef.current) {
        window.clearTimeout(readyTimeoutRef.current);
      }
    };
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    setSelectedImage(file);
    setCurrentResult(null);
    setCurrentStage("idle");
    setSelectedHistoryIndex(null);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedImage(null);
    setCurrentResult(null);
    setCurrentStage("idle");
    setSelectedHistoryIndex(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }

    setIsProcessing(true);
    setCurrentStage("stage1");
    setSelectedHistoryIndex(null);

    try {
      const health = await checkBackendHealth();
      if (health.status !== "ok") {
        toast.error(health.message || "Backend not reachable");
        setCurrentStage("idle");
        return;
      }

      const result = await predictImage(selectedImage);

      if (result.stage1.label === "Anomalous") {
        setCurrentStage("stage2");
        await new Promise((resolve) => setTimeout(resolve, 150));
        setCurrentStage("stage3");
      }

      setCurrentStage("complete");
      setCurrentResult(result);
      setHistory((prev) => [result, ...prev.slice(0, 9)]);

      if (result.stage1.label === "Healthy") {
        toast.success("Analysis Complete: Panel is Healthy");
      } else {
        toast.warning(`Anomaly Detected: ${result.stage3?.fine_label || "Unknown fault"}`);
      }
    } catch (error) {
      toast.error("Analysis failed. Please try again.");
      setCurrentStage("idle");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage]);

  const handleHistorySelect = useCallback((result: PredictionResult) => {
    setCurrentResult(result);
    setCurrentStage("complete");
    const index = history.findIndex((h) => h.timestamp === result.timestamp);
    setSelectedHistoryIndex(index);
  }, [history]);

  return (
    <>
      <Helmet>
        <title>PV Fault Detector - AI-Powered Solar Panel Analysis</title>
        <meta
          name="description"
          content="Detect faults in photovoltaic solar panels using a 3-stage deep learning pipeline. Upload images for instant analysis."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        {/* Background decorations */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full gradient-solar opacity-5 blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full gradient-tech opacity-5 blur-3xl" />
        </div>

        <main className="container mx-auto px-4 py-8 relative z-10">
          {backendStatus !== "unknown" && (
            <div className="mb-6">
              {backendStatus === "loading" && (
                <div className="glass-card p-4">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-foreground">
                      Models are loading. This can take a few minutes.
                    </p>
                    {backendMessage && (
                      <p className="text-xs text-muted-foreground">{backendMessage}</p>
                    )}
                  </div>
                  <Progress value={60} className="h-2 mt-3 animate-pulse" />
                </div>
              )}

              {backendStatus === "ready" && showReadyBanner && (
                <div className="glass-card p-4 border border-emerald-500/20">
                  <p className="text-sm font-medium text-emerald-500">
                    Models loaded successfully. Ready for inference.
                  </p>
                </div>
              )}

              {backendStatus === "error" && (
                <div className="glass-card p-4 border border-destructive/40">
                  <p className="text-sm font-medium text-destructive">
                    Backend not ready.
                  </p>
                  {backendMessage && (
                    <p className="text-xs text-muted-foreground mt-1">{backendMessage}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hero Section */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-gradient-solar">Photovoltaic</span>{" "}
              <span className="text-foreground">Fault Detection</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload a PV panel image and let our 3-stage deep learning pipeline
              analyze it for defects with precise fault classification.
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Upload & Controls */}
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  Image Input
                </h2>
                
                <ImageUploader
                  onImageSelect={handleImageSelect}
                  isProcessing={isProcessing}
                  selectedImage={selectedImage}
                  onClear={handleClear}
                />

                <div className="flex gap-3 mt-4">
                  <Button
                    variant="solar"
                    size="lg"
                    className="flex-1"
                    onClick={handleAnalyze}
                    disabled={!selectedImage || isProcessing}
                  >
                    {isProcessing ? "Analyzing..." : "Analyze Panel"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleClear}
                    disabled={isProcessing}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* History */}
              <div className="glass-card p-6">
                <HistoryList
                  history={history}
                  onSelect={handleHistorySelect}
                  selectedIndex={selectedHistoryIndex}
                />
              </div>
            </div>

            {/* Center Column - Pipeline */}
            <div className="lg:col-span-1">
              <div className="glass-card p-6 h-full">
                <PipelineVisualizer
                  currentStage={currentStage}
                  result={currentResult}
                />
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-1">
              <ResultsPanel result={currentResult} />
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Stage 1: Binary Detection",
                description: "Classifies input as Healthy or Anomalous using a binary classification model.",
                model: "stage1_model.pth",
              },
              {
                title: "Stage 2: Group Classification",
                description: "Categorizes anomalies into 4 groups: Hotspot, Obstruction, Cell-Defect, Electrical-Fault.",
                model: "stage2_model.pth",
              },
              {
                title: "Stage 3: Fine-Grained Analysis",
                description: "Identifies the specific fault type among 11 possible classifications.",
                model: "stage3_model.pth",
              },
            ].map((stage, index) => (
              <div
                key={index}
                className="glass-card p-6 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg gradient-solar flex items-center justify-center text-primary-foreground font-bold">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-foreground">{stage.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {stage.description}
                </p>
                <code className="text-xs font-mono px-2 py-1 rounded bg-secondary text-muted-foreground">
                  {stage.model}
                </code>
              </div>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-16 py-6">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>
              PV Fault Detection System • 3-Stage Deep Learning Pipeline •{" "}
              <span className="text-primary">Connect your FastAPI backend to enable real inference</span>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
