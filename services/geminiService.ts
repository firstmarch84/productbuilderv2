
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  onChunk: (data: { text?: string; thought?: string }) => void,
  onComplete: (groundingChunks: any[]) => void,
  onError: (error: any) => void,
  signal?: AbortSignal // Add support for cancellation
) => {
  // Robust API Key retrieval for various environments (Vite, Next.js, etc.)
  let apiKey = '';
  try {
    const env = (import.meta as any).env || {};
    apiKey = env.VITE_API_KEY || env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
  } catch (e) {
    // Ignore error if import.meta is not available
  }
  
  // Fallback to process.env if available (Node.js/Server-side)
  if (!apiKey && typeof process !== 'undefined' && process.env) {
    apiKey = process.env.VITE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  }

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    console.error("API Key missing. Checked VITE_API_KEY, GEMINI_API_KEY.");
    onError(new Error("API Key가 설정되지 않았습니다. 환경 변수(VITE_API_KEY)를 확인해주세요."));
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
      // Tools configuration
      tools: [{ googleSearch: {} }],
    });

    // Check if already aborted
    if (signal?.aborted) return;

    const result = await model.generateContentStream({ contents: history });

    let groundingMetadata: any = null;

    for await (const chunk of result.stream) {
      // Respect abort signal during streaming
      if (signal?.aborted) return;

      try {
        const text = chunk.text();
        if (text) {
          onChunk({ text });
        }
      } catch (e) {
        // chunk.text() might throw if the chunk implies a safety block or finish reason without text
        console.warn("Chunk processing warning (likely safety or finish reason):", e);
      }

      if (chunk.groundingMetadata) {
        groundingMetadata = chunk.groundingMetadata;
      }
    }

    const chunks = groundingMetadata?.groundingAttributions || [];
    onComplete(chunks);
  } catch (error: any) {
    // Ignore errors if aborted
    if (signal?.aborted) return;

    console.error("Gemini API Error Details:", error);
    
    // Provide user-friendly error messages based on common issues
    let errorMessage = error?.message || "Gemini API와의 통신 중 알 수 없는 오류가 발생했습니다.";
    
    if (errorMessage.includes("API key not valid")) {
      errorMessage = "API Key가 유효하지 않습니다. 설정을 확인해주세요.";
    } else if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests")) {
      errorMessage = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    } else if (errorMessage.includes("Safety")) {
      errorMessage = "안전 정책에 의해 답변이 차단되었습니다. 다른 질문을 시도해주세요.";
    }

    onError(new Error(errorMessage));
  }
};
