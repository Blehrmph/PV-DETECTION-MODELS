export interface Stage1Result {
  label: "Healthy" | "Anomalous";
  confidence: number;
}

export interface Stage2Result {
  group_label: string;
  confidence: number;
}

export interface Stage3Result {
  fine_label: string;
  confidence: number;
}

export interface PredictionResult {
  stage1: Stage1Result;
  stage2?: Stage2Result;
  stage3?: Stage3Result;
  timestamp: string;
  imageUrl?: string;
  error?: string;
}

export type PipelineStage = "idle" | "stage1" | "stage2" | "stage3" | "complete";

export const ANOMALY_GROUPS = [
  { id: "hotspot", label: "Hotspot", description: "Thermal anomalies in cells" },
  { id: "obstruction", label: "Obstruction", description: "External blocking elements" },
  { id: "cell_defect", label: "Cell-Defect", description: "Physical cell damage" },
  { id: "electrical_fault", label: "Electrical-Fault", description: "Electrical system issues" },
] as const;

export const FAULT_CLASSES = [
  // Hotspot group
  { id: 1, label: "Hot-Spot-Multi", description: "Multiple hot spots detected", group: "hotspot" },
  { id: 2, label: "Hot-Spot", description: "Single hot spot detected", group: "hotspot" },
  // Obstruction group
  { id: 3, label: "Soiling", description: "Dirt or dust accumulation", group: "obstruction" },
  { id: 4, label: "Vegetation", description: "Plant growth obstruction", group: "obstruction" },
  { id: 5, label: "Shadowing", description: "External shadow coverage", group: "obstruction" },
  // Cell-Defect group
  { id: 6, label: "Cracking", description: "Cell surface cracks", group: "cell_defect" },
  { id: 7, label: "Cell", description: "Single cell defect", group: "cell_defect" },
  { id: 8, label: "Cell-Multi", description: "Multiple cell defects", group: "cell_defect" },
  // Electrical-Fault group
  { id: 9, label: "Diode", description: "Single diode failure", group: "electrical_fault" },
  { id: 10, label: "Diode-Multi", description: "Multiple diode failures", group: "electrical_fault" },
  { id: 11, label: "Offline-Module", description: "Module offline/disconnected", group: "electrical_fault" },
] as const;
