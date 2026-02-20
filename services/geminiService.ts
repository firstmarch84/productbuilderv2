
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  onChunk: (data: { text?: string; thought?: string }) => void,
  onComplete: (groundingChunks: any[]) => void,
  onError: (error: any) => void
) => {
  // Use VITE_API_KEY for browser compatibility
  const apiKey = (import.meta as any).env.VITE_API_KEY || (import.meta as any).env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: history,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 32768 },
        tools: [{ googleSearch: {} }],
      },
    });

    let groundingMetadata: any = null;

    for await (const chunk of stream) {
      const c = chunk as any; // Using any as SDK types for thought are still evolving
      
      const parts = c.candidates?.[0]?.content?.parts || [];
      
      let textChunk = '';
      let thoughtChunk = '';

      for (const part of parts) {
        if (part.text) {
          textChunk += part.text;
        }
        if (part.thought) {
          thoughtChunk += part.thought;
        }
      }

      if (textChunk || thoughtChunk) {
        onChunk({ text: textChunk, thought: thoughtChunk });
      }
      
      // Attempt to capture grounding metadata
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
