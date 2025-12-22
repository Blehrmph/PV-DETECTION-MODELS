const runtimeEnv =
  typeof window !== "undefined" && (window as { __ENV__?: Record<string, string> }).__ENV__
    ? (window as { __ENV__?: Record<string, string> }).__ENV__
    : undefined;
const envApiUrl = runtimeEnv?.VITE_API_URL || import.meta.env.VITE_API_URL;
export const API_URL = envApiUrl && envApiUrl.length > 0 ? envApiUrl : undefined;
