import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  onChunk: (data: { text?: string; }) => void,
  onComplete: (groundingChunks: any[]) => void,
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
      model: MODEL_NAME, // Using 'gemini-pro'
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
    });

    // --- DIAGNOSTIC CHANGE: Use non-streaming generateContent ---
    const result = await model.generateContent({ contents: history });
    const response = result.response;
    
    // Send the full text in a single chunk
    const text = response.text();
    if (text) {
      onChunk({ text });
    }

    // Send the grounding metadata
    const groundingAttributions = response.groundingMetadata?.groundingAttributions ?? [];
    onComplete(groundingAttributions);

  } catch (error) {
    const errorMessage = (error as any)?.message 
      || "Gemini API와의 통신 중 알 수 없는 오류가 발생했습니다.";
    onError(new Error(errorMessage));
  }
};
