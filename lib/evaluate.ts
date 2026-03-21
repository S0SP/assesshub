import { aiGradeSubjective } from "@/lib/ai";

export interface EvalSettings {
  negative_marking?: boolean;
  negative_marks_value?: number; // default 0.25
  ai_grading?: boolean;
}

export function evaluateMCQ(
  q: { points: number; correctOption: string | null },
  ans: any,
  settings?: EvalSettings
) {
  const selected = ans?.selected_option;
  const isCorrect = !!selected && selected === q.correctOption;
  let score = 0;
  if (isCorrect) {
    score = q.points;
  } else if (selected && settings?.negative_marking) {
    // Negative marking: deduct fraction of max points (never below 0 per question)
    const penalty = q.points * (settings.negative_marks_value ?? 0.25);
    score = Math.max(0, -penalty); // stored as negative contribution
    score = -penalty; // allow negative so total can reflect it
  }
  return {
    score: Math.round(score * 100) / 100,
    max_score: q.points,
    is_correct: isCorrect,
    selected_option: selected || null,
    correct_option: q.correctOption,
    negative_applied: !isCorrect && !!selected && !!settings?.negative_marking,
  };
}

export function evaluateSubjective(
  q: { points: number; keywords: any },
  ans: any
) {
  const text = (ans?.answer || "").toLowerCase().trim();
  const kws: Array<{ keyword: string; weight: number }> = Array.isArray(q.keywords) ? q.keywords : [];
  if (!text || !kws.length) {
    return { score: 0, max_score: q.points, keywords_matched: [], total_keywords: kws.length, matched_count: 0, match_percentage: 0 };
  }
  const totalW = kws.reduce((s, k) => s + (k.weight || 1), 0);
  let matchedW = 0;
  const matched: string[] = [];
  for (const kw of kws) {
    if (kw.keyword && text.includes(kw.keyword.toLowerCase().trim())) {
      matched.push(kw.keyword);
      matchedW += kw.weight || 1;
    }
  }
  const score = totalW > 0 ? Math.round((matchedW / totalW) * q.points * 100) / 100 : 0;
  return {
    score,
    max_score: q.points,
    keywords_matched: matched,
    total_keywords: kws.length,
    matched_count: matched.length,
    match_percentage: kws.length > 0 ? Math.round((matched.length / kws.length) * 1000) / 10 : 0,
  };
}

// Synchronous evaluation (used when AI grading is off)
export function evaluateAttempt(
  questions: any[],
  answers: Record<string, any>,
  settings?: EvalSettings
) {
  const evaluation: Record<string, any> = {};
  let totalScore = 0;
  const maxScore = questions.reduce((s, q) => s + q.points, 0);
  for (const q of questions) {
    const r =
      q.type === "MCQ"
        ? evaluateMCQ(q, answers[q.id] || {}, settings)
        : evaluateSubjective(q, answers[q.id] || {});
    evaluation[q.id] = r;
    totalScore += r.score;
  }
  // Clamp total to 0 (can't go below 0 overall with negative marking)
  totalScore = Math.max(0, Math.round(totalScore * 100) / 100);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
  return { evaluation, totalScore, maxScore, percentage };
}

// Async version with optional AI grading for subjective questions
export async function evaluateAttemptAsync(
  questions: any[],
  answers: Record<string, any>,
  settings?: EvalSettings
): Promise<{ evaluation: Record<string, any>; totalScore: number; maxScore: number; percentage: number }> {
  const evaluation: Record<string, any> = {};
  let totalScore = 0;
  const maxScore = questions.reduce((s: number, q: any) => s + q.points, 0);

  for (const q of questions) {
    if (q.type === "MCQ") {
      const r = evaluateMCQ(q, answers[q.id] || {}, settings);
      evaluation[q.id] = r;
      totalScore += r.score;
    } else {
      // Keyword-based base score
      const kwResult = evaluateSubjective(q, answers[q.id] || {});

      // AI grading (optional — runs only if enabled and GEMINI_API_KEY is set)
      if (settings?.ai_grading && process.env.GEMINI_API_KEY && (answers[q.id]?.answer || "").trim()) {
        try {
          const kws: string[] = Array.isArray(q.keywords)
            ? q.keywords.map((k: any) => k.keyword)
            : [];
          const aiResult = await aiGradeSubjective(
            q.text,
            answers[q.id].answer,
            q.points,
            kws,
            q.modelAnswer || undefined
          );
          // Blend: 40% keyword score + 60% AI score
          const blendedScore =
            Math.round((kwResult.score * 0.4 + Math.min(aiResult.score, q.points) * 0.6) * 100) / 100;
          evaluation[q.id] = {
            ...kwResult,
            score: blendedScore,
            ai_score: aiResult.score,
            ai_reasoning: aiResult.reasoning,
            ai_confidence: aiResult.confidence,
            grading_method: "ai_blended",
          };
          totalScore += blendedScore;
        } catch {
          // AI failed — fall back to keyword-only
          evaluation[q.id] = { ...kwResult, grading_method: "keyword_fallback" };
          totalScore += kwResult.score;
        }
      } else {
        evaluation[q.id] = { ...kwResult, grading_method: "keyword" };
        totalScore += kwResult.score;
      }
    }
  }

  totalScore = Math.max(0, Math.round(totalScore * 100) / 100);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
  return { evaluation, totalScore, maxScore, percentage };
}
