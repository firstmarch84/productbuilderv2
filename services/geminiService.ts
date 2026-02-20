import { GoogleGenerativeAI } from "@google/generative-ai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  onChunk: (data: { text?: string; }) => void,
  onComplete: (groundingChunks: any[]) => void,
  onError: (error: any) => void
) => {
  // API Key is now exposed via Vite's `define` feature in vite.config.ts
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
      tools: [{ googleSearch: {} }],
    });

    const result = await model.generateContentStream({ contents: history });

    // Process the stream for text chunks as they arrive
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        onChunk({ text });
      }
    }

    // After the stream is complete, get the aggregated response for final data
    const response = await result.response;
    const groundingAttributions = response.groundingMetadata?.groundingAttributions ?? [];
    onComplete(groundingAttributions);

  } catch (error) {
    console.error("Gemini API Error:", error);
    onError(error);
  }
};
