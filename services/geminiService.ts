
import { GoogleGenAI } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  onChunk: (data: { text?: string; thought?: string }) => void,
  onComplete: (groundingChunks: any[]) => void,
  onError: (error: any) => void
) => {
  // Enhanced API Key retrieval for Vite/Browser environments
  const env = (import.meta as any).env;
  const apiKey = env.VITE_API_KEY || env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    onError(new Error("API_KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요."));
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const result = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: history,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // gemini-2.0-flash does not support thinkingConfig
        tools: [{ googleSearch: {} }],
      },
    });

    let groundingMetadata: any = null;

    for await (const chunk of result) {
      const c = chunk as any;
      const text = c.text; // Use the standard getter
      
      if (text) {
        onChunk({ text });
      }
      
      // Still attempt to capture thought if the model happens to be a thinking model
      const thoughtPart = c.candidates?.[0]?.content?.parts?.find((p: any) => p.thought);
      if (thoughtPart?.thought) {
        onChunk({ thought: thoughtPart.thought });
      }

      if (c.candidates?.[0]?.groundingMetadata) {
        groundingMetadata = c.candidates[0].groundingMetadata;
      }
    }

    const chunks = groundingMetadata?.groundingChunks || [];
    onComplete(chunks);
  } catch (error) {
    console.error("Gemini API Error:", error);
    onError(error);
  }
};
