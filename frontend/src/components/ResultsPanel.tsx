import React from "react";
import { 
  Zap, 
  TrendingUp, 
  Clock, 
  Layers, 
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PredictionResult, ANOMALY_GROUPS, FAULT_CLASSES } from "@/types/prediction";

interface ResultsPanelProps {
  result: PredictionResult | null;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "border-border bg-card/50",
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    danger: "border-destructive/30 bg-destructive/5",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };

  return (
    <div className={cn("p-4 rounded-xl border", variantStyles[variant])}>
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className={cn("w-4 h-4", iconStyles[variant])} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subValue && (
        <p className="text-sm text-muted-foreground mt-1">{subValue}</p>
      )}
    </div>
  );
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  if (!result) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="p-4 rounded-2xl bg-secondary/50">
            <Layers className="w-8 h-8" />
          </div>
          <div>
            <p className="font-medium text-foreground">No Results Yet</p>
            <p className="text-sm mt-1">Upload an image to start analysis</p>
          </div>
        </div>
      </div>
    );
  }

  const isHealthy = result.stage1.label === "Healthy";
  const groupInfo = result.stage2 
    ? ANOMALY_GROUPS.find(g => g.label === result.stage2?.group_label)
    : null;
  const faultInfo = result.stage3
    ? FAULT_CLASSES.find(f => result.stage3?.fine_label === f.label)
    : null;

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Analysis Results
        </h2>
        <span className="text-xs font-mono text-muted-foreground">
          {new Date(result.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* Preview Image */}
      {result.imageUrl && (
        <div className="relative h-48 rounded-lg overflow-hidden bg-black/20">
          <img
            src={result.imageUrl}
            alt="Analyzed PV panel"
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 right-2">
            {isHealthy ? (
              <div className="px-2 py-1 rounded-full bg-success/90 text-success-foreground text-xs font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Healthy
              </div>
            ) : (
              <div className="px-2 py-1 rounded-full bg-warning/90 text-warning-foreground text-xs font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Anomalous
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Stage 1 Confidence"
          value={`${(result.stage1.confidence * 100).toFixed(1)}%`}
          variant={isHealthy ? "success" : "warning"}
        />
        
        {result.stage2 && (
          <StatCard
            icon={Layers}
            label="Group Confidence"
            value={`${(result.stage2.confidence * 100).toFixed(1)}%`}
            variant="warning"
          />
        )}
        
        {result.stage3 && (
          <StatCard
            icon={AlertCircle}
            label="Fault Confidence"
            value={`${(result.stage3.confidence * 100).toFixed(1)}%`}
            variant="danger"
          />
        )}
        
        <StatCard
          icon={Clock}
          label="Stages Run"
          value={isHealthy ? "1" : "3"}
          subValue={isHealthy ? "Healthy detected" : "Full pipeline"}
        />
      </div>

      {/* Detailed Breakdown */}
      {!isHealthy && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Info className="w-4 h-4" />
            Fault Details
          </h3>
          
          <div className="space-y-2">
            {groupInfo && (
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Anomaly Group
                </p>
                <p className="font-semibold text-foreground">{groupInfo.label}</p>
                <p className="text-sm text-muted-foreground">{groupInfo.description}</p>
              </div>
            )}
            
            {faultInfo && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Specific Fault
                </p>
                <p className="font-semibold text-foreground">{faultInfo.label}</p>
                <p className="text-sm text-muted-foreground">{faultInfo.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
