import React from "react";
import { Sun, Zap, Activity } from "lucide-react";

export function Header() {
  return (
    <header className="w-full border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 gradient-solar blur-lg opacity-50" />
            <div className="relative p-2 rounded-xl gradient-solar">
              <Sun className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              PV Fault Detector
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              AI-Powered Solar Panel Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
            <Activity className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-medium text-success">System Online</span>
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono">3-Stage Pipeline</span>
          </div>
        </div>
      </div>
    </header>
  );
}
