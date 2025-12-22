import { PredictionResult, Stage1Result, Stage2Result, Stage3Result } from "@/types/prediction";

// Simulates network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Group to faults mapping
const GROUP_FAULT_MAPPING: Record<string, string[]> = {
  "Hotspot": ["Hot-Spot-Multi", "Hot-Spot"],
  "Obstruction": ["Soiling", "Vegetation", "Shadowing"],
  "Cell-Defect": ["Cracking", "Cell", "Cell-Multi"],
  "Electrical-Fault": ["Diode", "Diode-Multi", "Offline-Module"],
};

const GROUPS = ["Hotspot", "Obstruction", "Cell-Defect", "Electrical-Fault"];

// Mock Stage 1: Binary classification (Healthy vs Anomalous)
export async function runStage1(imageFile: File): Promise<Stage1Result> {
  await delay(800 + Math.random() * 400);
  
  // 70% chance of being anomalous for demo purposes
  const isAnomalous = Math.random() < 0.7;
  
  return {
    label: isAnomalous ? "Anomalous" : "Healthy",
    confidence: 0.85 + Math.random() * 0.14,
  };
}

// Mock Stage 2: Grouped anomaly classification (4 groups)
export async function runStage2(imageFile: File): Promise<Stage2Result> {
  await delay(600 + Math.random() * 300);
  
  const randomGroup = GROUPS[Math.floor(Math.random() * GROUPS.length)];
  
  return {
    group_label: randomGroup,
    confidence: 0.80 + Math.random() * 0.18,
  };
}

// Mock Stage 3: Fine-grained classification (11 classes)
export async function runStage3(imageFile: File, groupLabel: string): Promise<Stage3Result> {
  await delay(700 + Math.random() * 350);
  
  const faultRange = GROUP_FAULT_MAPPING[groupLabel] || ["Hot-Spot"];
  const randomFault = faultRange[Math.floor(Math.random() * faultRange.length)];
  
  return {
    fine_label: randomFault,
    confidence: 0.75 + Math.random() * 0.22,
  };
}

// Full pipeline prediction
export async function runFullPrediction(
  imageFile: File,
  onStageComplete?: (stage: number, result: Stage1Result | Stage2Result | Stage3Result) => void
): Promise<PredictionResult> {
  // Stage 1
  const stage1Result = await runStage1(imageFile);
  onStageComplete?.(1, stage1Result);
  
  const result: PredictionResult = {
    stage1: stage1Result,
    timestamp: new Date().toISOString(),
    imageUrl: URL.createObjectURL(imageFile),
  };
  
  // If Healthy, stop here
  if (stage1Result.label === "Healthy") {
    return result;
  }
  
  // Stage 2
  const stage2Result = await runStage2(imageFile);
  onStageComplete?.(2, stage2Result);
  result.stage2 = stage2Result;
  
  // Stage 3
  const stage3Result = await runStage3(imageFile, stage2Result.group_label);
  onStageComplete?.(3, stage3Result);
  result.stage3 = stage3Result;
  
  return result;
}

// Health check (simulates backend health endpoint)
export async function checkHealth(): Promise<{ status: string }> {
  await delay(200);
  return { status: "ok" };
}
