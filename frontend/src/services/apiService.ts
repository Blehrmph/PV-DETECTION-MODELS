import { PredictionResult, Stage1Result, Stage2Result, Stage3Result } from "@/types/prediction";
import { API_URL } from "@/config/api";

// API Configuration
const fallbackOrigin =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost:8000";
const baseUrl = (API_URL || fallbackOrigin).replace(/\/+$/, "");
const API_BASE_URL = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;

type ApiPrediction = {
  stage1: Stage1Result;
  stage2?: Stage2Result | null;
  stage3?: Stage3Result | null;
  error?: string;
};

/**
 * Check if the backend API is healthy and reachable.
 */
export async function checkBackendHealth(): Promise<{ status: string; message?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Backend health check failed:", error);
    return { status: "error", message: "Backend not reachable" };
  }
}

/**
 * Send an image to the backend for prediction.
 * Returns the full 3-stage prediction result.
 */
export async function predictImage(file: File): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Prediction failed: ${error}`);
  }

  const data = await response.json();

  // Transform backend response to frontend format
  return {
    stage1: data.stage1 as Stage1Result,
    stage2: data.stage2 as Stage2Result | undefined,
    stage3: data.stage3 as Stage3Result | undefined,
    timestamp: new Date().toISOString(),
    imageUrl: URL.createObjectURL(file),
  };
}

/**
 * Send multiple images to the backend for batch prediction.
 */
export async function predictBatch(files: File[]): Promise<PredictionResult[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(`${API_BASE_URL}/predict-batch`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Batch prediction failed: ${error}`);
  }

  const dataArray = (await response.json()) as ApiPrediction[];

  // Transform backend responses to frontend format
  return dataArray.map((data, index) => ({
    stage1: data.stage1,
    stage2: data.stage2 ?? undefined,
    stage3: data.stage3 ?? undefined,
    timestamp: new Date().toISOString(),
    imageUrl: URL.createObjectURL(files[index]),
  }));
}
