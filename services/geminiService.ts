
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

export const chatWithGemini = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  onChunk: (text: string) => void,
  onComplete: (groundingChunks: any[]) => void,
  onError: (error: any) => void
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    let fullText = '';
    let groundingMetadata: any = null;

    for await (const chunk of stream) {
      const c = chunk as GenerateContentResponse;
      const text = c.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
      
      // Attempt to capture grounding metadata from any chunk that might contain it
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
