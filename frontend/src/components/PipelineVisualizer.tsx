import React from "react";
import { CheckCircle2, Circle, Loader2, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { PipelineStage, PredictionResult } from "@/types/prediction";

interface PipelineVisualizerProps {
  currentStage: PipelineStage;
  result: PredictionResult | null;
}

interface StageCardProps {
  number: number;
  title: string;
  subtitle: string;
  isActive: boolean;
  isComplete: boolean;
  isSkipped: boolean;
  result?: {
    label: string;
    confidence: number;
  };
}

function StageCard({
  number,
  title,
  subtitle,
  isActive,
  isComplete,
  isSkipped,
  result,
}: StageCardProps) {
  const getStatusIcon = () => {
    if (isComplete) {
      return <CheckCircle2 className="w-5 h-5 text-success" />;
    }
    if (isActive) {
      return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
    if (isSkipped) {
      return <Circle className="w-5 h-5 text-muted-foreground/30" />;
    }
    return <Circle className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border transition-all duration-500",
        isActive && "border-primary bg-primary/5 shadow-lg solar-glow",
        isComplete && "border-success/50 bg-success/5",
        isSkipped && "opacity-40",
        !isActive && !isComplete && !isSkipped && "border-border bg-card/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg font-mono font-bold text-lg",
            isActive && "gradient-solar text-primary-foreground",
            isComplete && "bg-success/20 text-success",
            !isActive && !isComplete && "bg-secondary text-muted-foreground"
          )}
        >
          {number}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {getStatusIcon()}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          
          {result && (
            <div className="mt-3 p-2 rounded-lg bg-background/50 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{result.label}</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {(result.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    result.label === "Healthy" ? "bg-success" : "gradient-solar"
                  )}
                  style={{ width: `${result.confidence * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Connector({ isActive, isComplete }: { isActive: boolean; isComplete: boolean }) {
  return (
    <div className="flex items-center justify-center py-2">
      <div
        className={cn(
          "w-0.5 h-8 rounded-full transition-all duration-500",
          isComplete && "bg-success",
          isActive && "gradient-solar animate-pulse",
          !isActive && !isComplete && "bg-border"
        )}
      />
    </div>
  );
}

export function PipelineVisualizer({ currentStage, result }: PipelineVisualizerProps) {
  const stages = ["idle", "stage1", "stage2", "stage3", "complete"];
  const currentIndex = stages.indexOf(currentStage);
  
  const isHealthy = result?.stage1?.label === "Healthy";
  
  const getStage1Result = () => {
    if (!result?.stage1) return undefined;
    return {
      label: result.stage1.label,
      confidence: result.stage1.confidence,
    };
  };
  
  const getStage2Result = () => {
    if (!result?.stage2) return undefined;
    return {
      label: result.stage2.group_label,
      confidence: result.stage2.confidence,
    };
  };
  
  const getStage3Result = () => {
    if (!result?.stage3) return undefined;
    return {
      label: result.stage3.fine_label,
      confidence: result.stage3.confidence,
    };
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Analysis Pipeline</h2>
      </div>
      
      <StageCard
        number={1}
        title="Binary Classification"
        subtitle="Healthy vs Anomalous Detection"
        isActive={currentStage === "stage1"}
        isComplete={currentIndex > 1}
        isSkipped={false}
        result={getStage1Result()}
      />
      
      <Connector
        isActive={currentStage === "stage2"}
        isComplete={currentIndex > 2 && !isHealthy}
      />
      
      <StageCard
        number={2}
        title="Group Classification"
        subtitle="Anomaly Category (4 Groups)"
        isActive={currentStage === "stage2"}
        isComplete={currentIndex > 2}
        isSkipped={isHealthy}
        result={getStage2Result()}
      />
      
      <Connector
        isActive={currentStage === "stage3"}
        isComplete={currentIndex > 3 && !isHealthy}
      />
      
      <StageCard
        number={3}
        title="Fine-Grained Classification"
        subtitle="Specific Fault Type (11 Classes)"
        isActive={currentStage === "stage3"}
        isComplete={currentStage === "complete"}
        isSkipped={isHealthy}
        result={getStage3Result()}
      />
      
      {/* Healthy status banner */}
      {result && isHealthy && currentStage === "complete" && (
        <div className="mt-4 p-4 rounded-xl bg-success/10 border border-success/30 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0" />
          <div>
            <p className="font-semibold text-success">Panel Status: Healthy</p>
            <p className="text-sm text-muted-foreground">
              No faults detected. Further analysis not required.
            </p>
          </div>
        </div>
      )}
      
      {/* Fault detected banner */}
      {result && !isHealthy && currentStage === "complete" && (
        <div className="mt-4 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
          <div>
            <p className="font-semibold text-warning">Fault Detected</p>
            <p className="text-sm text-muted-foreground">
              {result.stage2?.group_label} → {result.stage3?.fine_label}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
