import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  onChunk: (data: { text?: string; }) => void,
  onComplete: () => void, // Removed groundingChunks from parameters
  onError: (error: any) => void
) => {
  const apiKey = import.meta.env.VITE_API_KEY;

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    onError(new Error("API 키가 설정되지 않았습니다. Cloudflare Pages 환경 변수에서 VITE_API_KEY를 설정했는지 확인하세요."));
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
      // --- CRITICAL FIX: Removing the `tools` property entirely ---
      // tools: [{ googleSearch: {} }], 
    });

    // --- Re-enable streaming now that the conflicting tool is removed ---
    const result = await model.generateContentStream({ contents: history });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        onChunk({ text });
      }
    }
    
    // Signal completion without grounding data
    onComplete();

  } catch (error) {
    const errorMessage = (error as any)?.message 
      || "Gemini API와의 통신 중 알 수 없는 오류가 발생했습니다.";
    onError(new Error(errorMessage));
  }
};
