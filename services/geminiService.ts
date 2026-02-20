
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  onChunk: (data: { text?: string; thought?: string }) => void,
  onComplete: (groundingChunks: any[]) => void,
  onError: (error: any) => void
) => {
  // Enhanced API Key retrieval for Vite/Browser environments
  const env = (import.meta as any).env;
  const apiKey = env.VITE_API_KEY || env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    onError(new Error("API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요."));
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [{ googleSearch: {} }],
  });

  try {
    const result = await model.generateContentStream({ contents: history });

    let groundingMetadata: any = null;

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        onChunk({ text });
      }

      if (chunk.groundingMetadata) {
        groundingMetadata = chunk.groundingMetadata;
      }
    }

    const chunks = groundingMetadata?.groundingAttributions || [];
    onComplete(chunks);
  } catch (error) {
    console.error("Gemini API Error:", error);
    onError(error);
  }
};
