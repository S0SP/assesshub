"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Eye, Check, X, Loader2, ChevronDown, Sparkles, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function TestResultsClient({
  test, questions, attempts: initialAttempts, stats, pagination: initialPagination
}: {
  test: any; questions: any[]; attempts: any[];
  stats: any; pagination: { hasMore: boolean; nextCursor: string | null; total: number }
}) {
  const [attempts, setAttempts] = useState(initialAttempts);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("submittedAt");
  const [order, setOrder] = useState("desc");
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [reviewing, setReviewing] = useState<any>(null);
  const [overrideQ, setOverrideQ] = useState<any>(null);
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideFeedback, setOverrideFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAttempts = useCallback(async (params: {
    cursor?: string; search?: string; sort?: string; order?: string; append?: boolean
  }) => {
    const qp = new URLSearchParams();
    if (params.cursor) qp.set("cursor", params.cursor);
    if (params.search) qp.set("search", params.search);
    if (params.sort) qp.set("sort", params.sort);
    if (params.order) qp.set("order", params.order);
    const res = await fetch(`/api/teacher/tests/${test.id}/results?${qp}`);
    const data = await res.json();
    return data;
  }, [test.id]);

  const handleSearch = async (val: string) => {
    setSearch(val);
    setSearching(true);
    const data = await fetchAttempts({ search: val, sort: sortBy, order });
    setAttempts(data.attempts);
    setPagination(data.pagination);
    setSearching(false);
  };

  const handleSort = async (col: string) => {
    const newOrder = col === sortBy && order === "desc" ? "asc" : "desc";
    setSortBy(col); setOrder(newOrder);
    const data = await fetchAttempts({ search, sort: col, order: newOrder });
    setAttempts(data.attempts);
    setPagination(data.pagination);
  };

  const loadMore = async () => {
    if (!pagination.hasMore || !pagination.nextCursor) return;
    setLoadingMore(true);
    const data = await fetchAttempts({ cursor: pagination.nextCursor, search, sort: sortBy, order });
    setAttempts(prev => [...prev, ...data.attempts]);
    setPagination(data.pagination);
    setLoadingMore(false);
  };

  const submitOverride = async () => {
    if (!overrideQ || !reviewing) return;
    setSaving(true);
    const res = await fetch(`/api/teacher/results/${reviewing.id}/override/${overrideQ.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: Number(overrideScore), feedback: overrideFeedback }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Score updated");
      const newEval = { ...(reviewing.evaluation || {}), [overrideQ.id]: { ...(reviewing.evaluation?.[overrideQ.id] || {}), score: Number(overrideScore), manual_feedback: overrideFeedback, overridden: true } };
      const updated = { ...reviewing, totalScore: data.totalScore, percentage: data.percentage, evaluation: newEval };
      setReviewing(updated);
      setAttempts(prev => prev.map(a => a.id === reviewing.id ? { ...a, totalScore: data.totalScore, percentage: data.percentage } : a));
      setOverrideQ(null);
    } else toast.error(data.error || "Failed");
    setSaving(false);
  };

  const SortBtn = ({ col, label }: { col: string; label: string }) => (
    <button onClick={() => handleSort(col)} className="flex items-center gap-1 group">
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortBy === col ? "text-[#1A2E44]" : "text-[#C5C5C0] group-hover:text-[#5C5C59]"}`} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <header className="bg-white border-b border-[#E0DFDB]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/teacher" className="text-[#5C5C59] hover:text-[#111110]"><ArrowLeft className="w-4 h-4" strokeWidth={1.5} /></Link>
          <span className="font-heading font-semibold text-sm text-[#111110]">Results: {test.title}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 border border-[#E0DFDB] mb-8">
          {[["Attempts", stats.total], ["Average", `${stats.avg}%`], ["Highest", `${Math.round(stats.highest)}%`], ["Lowest", `${Math.round(stats.lowest)}%`]].map(([l, v]) => (
            <div key={String(l)} className="stat-box border-b-0">
              <div className="text-xs text-[#5C5C59] uppercase tracking-wider mb-1">{l}</div>
              <div className="font-mono text-2xl font-bold text-[#111110]">{v}</div>
            </div>
          ))}
        </div>

        {/* Score distribution bar */}
        {stats.total > 0 && (
          <div className="bg-white border border-[#E0DFDB] p-5 mb-6">
            <p className="text-xs text-[#5C5C59] uppercase tracking-wider mb-3">Score Distribution</p>
            {[["0–40%", 0, 40, "bg-[#D63229]"], ["40–60%", 40, 60, "bg-amber-400"], ["60–80%", 60, 80, "bg-amber-300"], ["80–100%", 80, 100, "bg-green-500"]].map(([label, min, max, color]) => {
              const count = attempts.filter(a => a.percentage >= (min as number) && a.percentage < (max as number)).length;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={String(label)} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-[#5C5C59] w-16 flex-shrink-0">{label}</span>
                  <div className="flex-1 bg-[#F7F7F5] h-4 border border-[#E0DFDB]">
                    <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono text-[#5C5C59] w-16 text-right">{count} students</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C5C59]" strokeWidth={1.5} />
          <input
            value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search students by name or email..."
            className="input-base pl-9"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#5C5C59]" />}
        </div>

        <div className="bg-white border border-[#E0DFDB]">
          {attempts.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#5C5C59]">
              {search ? "No students match your search" : "No attempts yet"}
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E0DFDB] bg-[#F7F7F5]">
                    <th className="text-left px-5 py-3 text-xs text-[#5C5C59] uppercase tracking-wider">#</th>
                    <th className="text-left px-5 py-3 text-xs text-[#5C5C59] uppercase tracking-wider">Student</th>
                    <th className="text-left px-5 py-3 text-xs text-[#5C5C59] uppercase tracking-wider">
                      <SortBtn col="percentage" label="Score" />
                    </th>
                    <th className="text-left px-5 py-3 text-xs text-[#5C5C59] uppercase tracking-wider">Time</th>
                    <th className="text-left px-5 py-3 text-xs text-[#5C5C59] uppercase tracking-wider">
                      <SortBtn col="submittedAt" label="Submitted" />
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a, i) => (
                    <tr key={a.id} className="border-b border-[#E0DFDB] last:border-b-0 hover:bg-[#F7F7F5] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-[#5C5C59]">{i + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-[#111110]">{a.userName}</div>
                        <div className="text-xs text-[#5C5C59]">{a.userEmail}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`font-mono font-bold ${a.percentage >= 70 ? "text-green-600" : a.percentage >= 40 ? "text-amber-600" : "text-[#D63229]"}`}>
                          {Math.round(a.percentage)}%
                        </span>
                        <span className="text-xs text-[#5C5C59] ml-1">({Math.round(a.totalScore)}/{a.maxScore})</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{Math.floor(a.timeTakenSeconds / 60)}m{a.timeTakenSeconds % 60}s</td>
                      <td className="px-5 py-3 text-xs text-[#5C5C59]">{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => setReviewing(a)} className="text-xs text-[#1A2E44] hover:underline flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" strokeWidth={1.5} /> Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Load More */}
              {pagination.hasMore && (
                <div className="border-t border-[#E0DFDB] px-5 py-3 flex items-center justify-between">
                  <span className="text-xs text-[#5C5C59]">Showing {attempts.length} of {pagination.total} attempts</span>
                  <button onClick={loadMore} disabled={loadingMore} className="btn-outline flex items-center gap-2 py-2">
                    {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    Load More
                  </button>
                </div>
              )}
              {!pagination.hasMore && attempts.length > 0 && (
                <div className="border-t border-[#E0DFDB] px-5 py-3">
                  <span className="text-xs text-[#5C5C59]">Showing all {pagination.total} attempts</span>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-[#E0DFDB] w-full max-w-3xl my-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0DFDB] flex-shrink-0">
              <div>
                <h2 className="font-heading font-semibold text-[#111110]">Review: {reviewing.userName}</h2>
                <p className="text-xs text-[#5C5C59]">
                  Score: {Math.round(reviewing.totalScore)}/{reviewing.maxScore} — {Math.round(reviewing.percentage)}%
                </p>
              </div>
              <button onClick={() => setReviewing(null)} className="text-[#5C5C59] hover:text-[#111110] text-lg">✕</button>
            </div>
            {/* Release banner when show_results_immediately is OFF */}
            {reviewing && !(test.settings as any)?.show_results_immediately && !(reviewing.evaluation?._released) && (
              <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-800">Results hidden from student</p>
                  <p className="text-xs text-amber-700 mt-0.5">Reviewing this attempt will automatically release results to the student.</p>
                </div>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-1 rounded-sm font-medium whitespace-nowrap ml-3">Auto-released on open</span>
              </div>
            )}
            {reviewing && reviewing.evaluation?._released && !(test.settings as any)?.show_results_immediately && (
              <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-sm">
                <p className="text-xs font-medium text-green-800">✓ Results released to student</p>
                <p className="text-xs text-green-700 mt-0.5">Released on {reviewing.evaluation._releasedAt ? new Date(reviewing.evaluation._releasedAt).toLocaleString() : "review"}</p>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {questions.map((q, i) => {
                const ev = (reviewing.evaluation || {})[q.id] || {};
                const ans = (reviewing.answers || {})[q.id] || {};
                return (
                  <div key={q.id} className="border border-[#E0DFDB] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#5C5C59]">Q{i + 1}</span>
                        <span className="badge badge-navy">{q.type}</span>
                        {ev.overridden && <span className="badge badge-amber">Overridden</span>}
                        {ev.grading_method === "ai_blended" && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-sm">
                            <Sparkles className="w-2.5 h-2.5" /> AI Graded
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-sm font-bold">{ev.score ?? 0}/{q.points}</span>
                    </div>
                    <p className="text-sm text-[#111110] mb-2">{q.text}</p>
                    {q.type === "MCQ" ? (
                      <div className="text-sm flex gap-4 items-center">
                        <span>Selected: <strong>{ans.selected_option?.toUpperCase() || "None"}</strong></span>
                        <span>Correct: <strong>{q.correctOption?.toUpperCase()}</strong></span>
                        {ev.negative_applied && <span className="text-[#D63229] text-xs font-mono">−{(ev.max_score * 0.25).toFixed(2)} pts</span>}
                        {ev.is_correct ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-[#D63229]" />}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#5C5C59] mb-1">Student&apos;s Answer</p>
                        <div className="text-sm bg-[#F7F7F5] border border-[#E0DFDB] p-2 mb-2">
                          {ans.answer || <span className="italic text-[#5C5C59]">No answer</span>}
                        </div>
                        {ev.keywords_matched !== undefined && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(q.keywords || []).map((kw: any) => (
                              <span key={kw.keyword} className={`text-[10px] px-2 py-0.5 border ${ev.keywords_matched?.includes(kw.keyword) ? "bg-green-50 border-green-300 text-green-700" : "bg-red-50 border-red-300 text-[#D63229]"}`}>
                                {kw.keyword} (w:{kw.weight})
                              </span>
                            ))}
                          </div>
                        )}
                        {ev.ai_reasoning && (
                          <div className="mb-2 text-xs bg-purple-50 border border-purple-200 p-2 rounded-sm">
                            <span className="font-semibold text-purple-700">AI Reasoning: </span>
                            <span className="text-purple-800">{ev.ai_reasoning}</span>
                            <span className="ml-2 text-purple-500">(confidence: {Math.round((ev.ai_confidence || 0) * 100)}%)</span>
                          </div>
                        )}
                        {ev.manual_feedback && (
                          <div className="mb-2 text-xs text-[#1A2E44] bg-blue-50 border border-blue-200 p-2">
                            <span className="font-semibold">Feedback: </span>{ev.manual_feedback}
                          </div>
                        )}
                        <button
                          onClick={() => { setOverrideQ(q); setOverrideScore(String(ev.score ?? 0)); setOverrideFeedback(ev.manual_feedback || ""); }}
                          className="text-xs border border-[#E0DFDB] px-3 py-1.5 text-[#5C5C59] hover:border-[#1A2E44] hover:text-[#111110] rounded-sm transition-colors"
                        >
                          Override Score
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideQ && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white border border-[#E0DFDB] w-full max-w-md p-6">
            <h2 className="font-heading font-semibold text-[#111110] mb-1">Override Score</h2>
            <p className="text-xs text-[#5C5C59] mb-4 line-clamp-2">{overrideQ.text}</p>
            <div className="space-y-4">
              <div>
                <label className="label">New Score (0 – {overrideQ.points})</label>
                <input type="number" value={overrideScore} onChange={e => setOverrideScore(e.target.value)} min={0} max={overrideQ.points} step={0.5} className="input-base" />
              </div>
              <div>
                <label className="label">Feedback for student (optional)</label>
                <textarea value={overrideFeedback} onChange={e => setOverrideFeedback(e.target.value)} placeholder="e.g. Good attempt, but missed key concept X" rows={3} className="w-full bg-white border border-[#E0DFDB] rounded-sm p-3 text-sm focus:ring-1 focus:ring-[#1A2E44] focus:border-[#1A2E44] outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setOverrideQ(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={submitOverride} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
