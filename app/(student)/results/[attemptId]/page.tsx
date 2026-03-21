import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Check, X, Minus } from "lucide-react";

export default async function ResultPage({ params }: { params: { attemptId: string } }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "TEST_TAKER") redirect("/login");
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: params.attemptId },
    include: { test: { include: { questions: { orderBy: { order: "asc" } } } }, user: { select: { id: true } } },
  });
  if (!attempt || attempt.userId !== (session.user as any).id) redirect("/dashboard");
  const { test, evaluation } = attempt as any;
  const ev: Record<string, any> = evaluation || {};
  const questions = test.questions;
  const mcqQs = questions.filter((q: any) => q.type === "MCQ");
  const subjQs = questions.filter((q: any) => q.type !== "MCQ");
  const mcqScore = mcqQs.reduce((s: number, q: any) => s + (ev[q.id]?.score || 0), 0);
  const subjScore = subjQs.reduce((s: number, q: any) => s + (ev[q.id]?.score || 0), 0);

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <header className="bg-white border-b border-[#E0DFDB]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="text-[#5C5C59] hover:text-[#111110]"><ArrowLeft className="w-4 h-4" strokeWidth={1.5}/></Link>
          <span className="font-heading font-semibold text-sm text-[#111110]">Results</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Score card */}
        <div className="bg-white border border-[#E0DFDB] p-8 mb-6">
          <h1 className="font-heading text-xl font-bold text-[#111110] mb-1">{test.title}</h1>
          <p className="text-xs text-[#5C5C59] mb-6">Submitted {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "N/A"}</p>
          <div className="flex items-center gap-8">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#E0DFDB" strokeWidth="6"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke={attempt.percentage >= 70 ? "#22C55E" : attempt.percentage >= 40 ? "#F59E0B" : "#D63229"} strokeWidth="6" strokeDasharray={`${attempt.percentage * 2.64} 264`} strokeLinecap="butt"/>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-mono text-xl font-bold text-[#111110]">{Math.round(attempt.percentage)}%</span>
            </div>
            <div>
              <div className="text-sm text-[#5C5C59]">Your Score</div>
              <div className="font-mono text-2xl font-bold text-[#111110]">{Math.round(attempt.totalScore)} / {attempt.maxScore}</div>
              <div className="text-xs text-[#5C5C59] mt-1">Time: {Math.floor(attempt.timeTakenSeconds / 60)}m {attempt.timeTakenSeconds % 60}s</div>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white border border-[#E0DFDB] mb-6">
          <div className="px-6 py-4 border-b border-[#E0DFDB]"><h2 className="font-heading font-semibold text-sm text-[#111110]">Score Breakdown</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#E0DFDB]">{["Section","Score","Questions"].map(h=><th key={h} className="text-left px-6 py-3 text-xs text-[#5C5C59] uppercase tracking-wider font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {mcqQs.length > 0 && <tr className="border-b border-[#E0DFDB]"><td className="px-6 py-3 text-[#111110]">Objective (MCQ)</td><td className="px-6 py-3 font-mono">{Math.round(mcqScore)}/{mcqQs.reduce((s: number,q: any)=>s+q.points,0)}</td><td className="px-6 py-3">{mcqQs.length}</td></tr>}
              {subjQs.length > 0 && <tr className="border-b border-[#E0DFDB]"><td className="px-6 py-3 text-[#111110]">Subjective</td><td className="px-6 py-3 font-mono">{subjScore.toFixed(1)}/{subjQs.reduce((s: number,q: any)=>s+q.points,0)}</td><td className="px-6 py-3">{subjQs.length}</td></tr>}
              <tr className="bg-[#F7F7F5]"><td className="px-6 py-3 font-semibold text-[#111110]">Total</td><td className="px-6 py-3 font-mono font-bold">{Math.round(attempt.totalScore)}/{attempt.maxScore}</td><td className="px-6 py-3">{questions.length}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Q-by-Q */}
        <div className="border border-[#E0DFDB]">
          {questions.map((q: any, i: number) => {
            const qev = ev[q.id] || {};
            const ans = (attempt.answers as any)?.[q.id] || {};
            return (
              <div key={q.id} className="bg-white border-b border-[#E0DFDB] last:border-b-0 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#5C5C59] font-mono">Q{i+1}</span>
                    <span className="badge badge-navy">{q.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {q.type === "MCQ" && (qev.is_correct ? <Check className="w-4 h-4 text-green-500" strokeWidth={2}/> : ans.selected_option ? <X className="w-4 h-4 text-[#D63229]" strokeWidth={2}/> : <Minus className="w-4 h-4 text-[#5C5C59]" strokeWidth={2}/>)}
                    <span className="font-mono text-sm font-bold text-[#111110]">{qev.score ?? 0}/{q.points}</span>
                  </div>
                </div>
                <p className="text-sm text-[#111110] mb-3">{q.text}</p>
                {q.type === "MCQ" && (
                  <div className="space-y-1.5 mb-3">
                    {(q.options || []).map((opt: any) => {
                      const isSel = ans.selected_option === opt.id, isRight = q.correctOption === opt.id;
                      return <div key={opt.id} className={`text-sm px-3 py-2 border ${isRight ? "bg-green-50 border-green-300" : isSel && !isRight ? "bg-red-50 border-red-300" : "border-[#E0DFDB]"}`}>
                        <span className="font-mono text-xs mr-2">{opt.id.toUpperCase()}.</span>{opt.text}
                        {isRight && <Check className="inline w-3 h-3 ml-2 text-green-600" strokeWidth={2}/>}
                        {isSel && !isRight && <X className="inline w-3 h-3 ml-2 text-[#D63229]" strokeWidth={2}/>}
                      </div>;
                    })}
                  </div>
                )}
                {q.type !== "MCQ" && (
                  <div className="mb-3">
                    <p className="text-xs uppercase tracking-wider text-[#5C5C59] mb-1">Your Answer</p>
                    <div className="text-sm bg-[#F7F7F5] border border-[#E0DFDB] p-3 mb-2">{ans.answer || <span className="italic text-[#5C5C59]">No answer provided</span>}</div>
                    {qev.keywords_matched !== undefined && <div className="flex flex-wrap gap-1">{(q.keywords || []).map((kw: any) => <span key={kw.keyword} className={`text-[10px] px-2 py-0.5 border ${qev.keywords_matched?.includes(kw.keyword) ? "bg-green-50 border-green-300 text-green-700" : "bg-red-50 border-red-300 text-[#D63229]"}`}>{kw.keyword}</span>)}</div>}
                    {qev.manual_feedback && <div className="mt-2 text-sm text-[#1A2E44] bg-blue-50 border border-blue-200 p-2"><span className="font-semibold text-xs">Feedback: </span>{qev.manual_feedback}</div>}
                  </div>
                )}
                {q.explanation && <div className="text-xs text-[#5C5C59] bg-[#F7F7F5] border border-[#E0DFDB] p-3"><span className="font-semibold">Explanation:</span> {q.explanation}</div>}
              </div>
            );
          })}
        </div>
        <div className="mt-6"><Link href="/dashboard" className="btn-outline inline-flex items-center gap-2"><ArrowLeft className="w-4 h-4" strokeWidth={1.5}/>Back to Dashboard</Link></div>
      </main>
    </div>
  );
}
