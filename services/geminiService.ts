
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  onChunk: (data: { text?: string; thought?: string }) => void,
  onComplete: (groundingChunks: any[]) => void,
  onError: (error: any) => void
) => {
  // Vite exposes variables starting with VITE_ to the client
  const env = (import.meta as any).env;
  const apiKey = env.VITE_API_KEY || env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    onError(new Error("API Key가 설정되지 않았습니다. 환경 변수(VITE_API_KEY)를 확인해주세요."));
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
      // Google Search tool can be restricted depending on region or key type
      tools: [{ googleSearch: {} }],
    });

    const result = await model.generateContentStream({ contents: history });

    let groundingMetadata: any = null;

    for await (const chunk of result.stream) {
      // Catch potential errors within the stream (like safety filters)
      try {
        const text = chunk.text();
        if (text) {
          onChunk({ text });
        }
      } catch (e) {
        console.warn("Chunk processing warning:", e);
      }

      if (chunk.groundingMetadata) {
        groundingMetadata = chunk.groundingMetadata;
      }
    }

    const chunks = groundingMetadata?.groundingAttributions || [];
    onComplete(chunks);
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    // Pass the actual error message back to the UI for debugging
    const errorMessage = error?.message || "Gemini API와의 통신 중 알 수 없는 오류가 발생했습니다.";
    onError(new Error(errorMessage));
  }
};
