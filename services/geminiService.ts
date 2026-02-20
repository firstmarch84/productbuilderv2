import { MODEL_NAME, SYSTEM_INSTRUCTION } from "../constants";

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:streamGenerateContent`;

// FINAL BATTLE: Direct fetch to the v1beta streaming API, bypassing SDK and cache issues.
export const chatWithGemini = async (
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  onChunk: (data: { text?: string }) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) => {
  const apiKey = import.meta.env.VITE_API_KEY;

  if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
    return onError(new Error("API 키가 설정되지 않았습니다. Cloudflare 환경 변수를 확인하세요."));
  }

  try {
    const requestBody = {
      contents: history,
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey, // Using the header you discovered
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}. 응답: ${errorText}`);
    }

    // Manually read and parse the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      // Google's streaming format often sends data in chunks that may not be complete JSON objects.
      // We look for the start of the data `[
` and try to parse what we have.
      if (buffer.startsWith('[')) {
          try {
            // It's not valid JSON yet, just the start of an array
            // We need to process line by line as they come in
            let lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last, potentially incomplete line

            for(const line of lines) {
                if (line.includes('"text"')) {
                    const cleanedLine = line.replace(/,$/, '').trim();
                    const json = JSON.parse(cleanedLine);
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        onChunk({ text });
                    }
                }
            }

          } catch (e) {
            // Incomplete JSON, wait for more data
          }
      }
    }

    onComplete();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Gemini API (Fetch Stream) Error:", errorMessage);
    // FIXED: Changed template literal to simple string concatenation for build tool compatibility.
    onError(new Error('Gemini 스트리밍 API 통신 중 오류가 발생했습니다: ' + errorMessage));
  }
};
