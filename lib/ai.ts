import { GoogleGenerativeAI } from "@google/generative-ai";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenerativeAI(key);
}

async function ask(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;

  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("Gemini API Error:", err);
    throw new Error("Gemini request failed");
  }

  const data = await res.json();

  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch { return fallback; }
}

export async function enhanceQuestion(text: string, type: string, subject?: string) {
  const prompt = `You are an expert educator. Improve this ${type} question${subject ? ` about ${subject}` : ""}:
"${text}"
Return ONLY valid JSON (no markdown): { "enhanced": "improved question", "variants": ["alt1","alt2"], "explanation": "what improved" }`;
  const raw = await ask(prompt);
  return parseJSON(raw, { enhanced: text, variants: [], explanation: "" });
}

export async function generateKeywords(questionText: string, modelAnswer?: string) {
  const prompt = `Extract scoring keywords for this question:
Q: "${questionText}"${modelAnswer ? `\nModel Answer: "${modelAnswer}"` : ""}
Return ONLY a JSON array: [{"keyword":"term","weight":0.8},...] — 3-8 keywords, weights 0.1-1.0`;
  const raw = await ask(prompt);
  return parseJSON<Array<{ keyword: string; weight: number }>>(raw, []);
}

export async function aiGradeSubjective(questionText: string, studentAnswer: string, maxPoints: number, keywords: string[], modelAnswer?: string) {
  const prompt = `Grade this student answer objectively:
Q: "${questionText}"
Max Points: ${maxPoints}
Key Concepts: ${keywords.join(", ")}
${modelAnswer ? `Model Answer: "${modelAnswer}"` : ""}
Student Answer: "${studentAnswer}"
Return ONLY JSON: {"score":number,"reasoning":"1-2 sentences","confidence":number}`;
  const raw = await ask(prompt);
  return parseJSON(raw, { score: 0, reasoning: "Evaluation failed", confidence: 0 });
}

export async function voiceToQuestion(transcript: string): Promise<string> {
  const prompt = `Convert this voice transcript into a clear, well-formatted assessment question. Fix grammar, remove filler words, make it precise.
Transcript: "${transcript}"
Return ONLY the improved question text.`;
  return ask(prompt);
}
