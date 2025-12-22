import React from "react";
import { Clock, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PredictionResult } from "@/types/prediction";

interface HistoryListProps {
  history: PredictionResult[];
  onSelect: (result: PredictionResult) => void;
  selectedIndex: number | null;
}

export function HistoryList({ history, onSelect, selectedIndex }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No analysis history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4" />
        Recent Analyses ({history.length})
      </h3>
      
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
        {history.map((result, index) => {
          const isHealthy = result.stage1.label === "Healthy";
          const isSelected = selectedIndex === index;
          
          return (
            <button
              key={result.timestamp}
              onClick={() => onSelect(result)}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all duration-200 group",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-card/30 hover:border-border hover:bg-card/50"
              )}
            >
              <div className="flex items-center gap-3">
                {result.imageUrl && (
                  <div className="w-10 h-10 rounded-md overflow-hidden bg-black/20 flex-shrink-0">
                    <img
                      src={result.imageUrl}
                      alt="Analysis preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {isHealthy ? (
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {isHealthy ? "Healthy" : result.stage3?.fine_label || "Anomalous"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(result.timestamp).toLocaleString()}
                  </p>
                </div>
                
                <ChevronRight className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  isSelected && "text-primary",
                  "group-hover:translate-x-0.5"
                )} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
