"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, FileText, Target, LogOut, Search, BookOpen, Award, ChevronDown, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

const CATEGORIES = ["All","General","Programming","Mathematics","Science","Chemistry","Physics","English","History","Other"];

export default function StudentDashboardClient({
  tests: initialTests, results, userName, pagination: initialPagination
}: {
  tests: any[]; results: any[]; userName: string;
  pagination: { hasMore: boolean; nextCursor: string | null }
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"tests" | "results">("tests");
  const [tests, setTests] = useState(initialTests);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [starting, setStarting] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);

  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length) : null;

  const fetchTests = useCallback(async (params: { cursor?: string; search?: string; category?: string; append?: boolean }) => {
    const qp = new URLSearchParams();
    if (params.cursor) qp.set("cursor", params.cursor);
    if (params.search) qp.set("search", params.search);
    if (params.category && params.category !== "All") qp.set("category", params.category);
    const res = await fetch(`/api/student/tests?${qp}`);
    return res.json();
  }, []);

  const handleSearch = async (val: string) => {
    setSearch(val);
    setSearching(true);
    const data = await fetchTests({ search: val, category: category === "All" ? "" : category });
    setTests(data.tests);
    setPagination(data.pagination);
    setSearching(false);
  };

  const handleCategory = async (cat: string) => {
    setCategory(cat);
    setSearching(true);
    const data = await fetchTests({ search, category: cat === "All" ? "" : cat });
    setTests(data.tests);
    setPagination(data.pagination);
    setSearching(false);
  };

  const loadMore = async () => {
    if (!pagination.hasMore || !pagination.nextCursor) return;
    setLoadingMore(true);
    const data = await fetchTests({ cursor: pagination.nextCursor, search, category: category === "All" ? "" : category });
    setTests(prev => [...prev, ...data.tests]);
    setPagination(data.pagination);
    setLoadingMore(false);
  };

  const attemptTest = async (test: any) => {
    // Always go to start API — it handles resume, re-attempt, and fresh start
    if (test.userAttempt?.status === "IN_PROGRESS") { router.push(`/test-attempt/${test.id}`); return; }
    if (test.accessType === "PASSWORD_PROTECTED") {
      const pw = prompt("Enter test password:");
      if (!pw) return;
      setStarting(test.id);
      const res = await fetch(`/api/student/tests/${test.id}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testPassword: pw }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Incorrect password"); setStarting(null); return; }
      sessionStorage.setItem(`attempt-${test.id}`, JSON.stringify(data));
      router.push(`/test-attempt/${test.id}`);
      setStarting(null);
      return;
    }
    setStarting(test.id);
    const res = await fetch(`/api/student/tests/${test.id}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Failed to start test"); setStarting(null); return; }
    sessionStorage.setItem(`attempt-${test.id}`, JSON.stringify(data));
    router.push(`/test-attempt/${test.id}`);
    setStarting(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <header className="bg-white border-b border-[#E0DFDB] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-heading font-bold text-lg text-[#1A2E44] tracking-tight">AssessHub</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#5C5C59]">{userName}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-[#5C5C59] hover:text-[#D63229] transition-colors">
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-bold text-[#111110] tracking-tight mb-1">Welcome, {userName}</h1>
          <p className="text-sm text-[#5C5C59]">Browse available tests and view your results</p>
        </div>

        <div className="grid grid-cols-3 border border-[#E0DFDB] mb-8">
          {[{ icon: BookOpen, label: "Available", value: tests.filter(t => !t.userAttempt).length + (pagination.hasMore ? "+" : "") },
            { icon: Award, label: "Completed", value: results.length },
            { icon: Target, label: "Avg Score", value: avgScore ? `${avgScore}%` : "--" }].map((s, i) => (
            <div key={i} className="stat-box border-b-0">
              <div className="flex items-center gap-2 text-[#5C5C59] mb-1"><s.icon className="w-4 h-4" strokeWidth={1.5} /><span className="text-xs uppercase tracking-wider">{s.label}</span></div>
              <div className="font-mono text-2xl font-bold text-[#111110]">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex border-b border-[#E0DFDB] mb-6">
          {(["tests", "results"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? "tab-active" : "tab-inactive"}`}>
              {t === "tests" ? "Available Tests" : "My Results"}
            </button>
          ))}
        </div>

        {tab === "tests" && (
          <>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C5C59]" strokeWidth={1.5} />
                <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search tests..." className="input-base pl-9" />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#5C5C59]" />}
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5C5C59] pointer-events-none" strokeWidth={1.5} />
                <select value={category} onChange={e => handleCategory(e.target.value)} className="input-base pl-9 pr-8 appearance-none cursor-pointer w-auto">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {tests.length === 0 ? (
              <div className="py-12 text-center bg-white border border-[#E0DFDB]">
                <FileText className="w-8 h-8 mx-auto mb-3 text-[#E0DFDB]" strokeWidth={1.5} />
                <p className="text-sm text-[#5C5C59]">{search || category !== "All" ? "No tests match your filters" : "No tests available"}</p>
              </div>
            ) : (
              <>
                <div className="border border-[#E0DFDB]">
                  {tests.map(test => (
                    <div key={test.id} className="bg-white p-5 border-b border-[#E0DFDB] last:border-b-0 flex items-center justify-between hover:bg-[#F7F7F5] transition-colors">
                      <div className="flex-1 mr-4">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-heading font-semibold text-[#111110]">{test.title}</h3>
                          <span className="badge badge-navy">{test.category}</span>
                          {test.accessType === "PASSWORD_PROTECTED" && <span className="badge badge-amber">🔒 Protected</span>}
                        </div>
                        <p className="text-xs text-[#5C5C59] mb-2">By {test.createdByName}</p>
                        <div className="flex items-center gap-4 text-xs text-[#5C5C59]">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={1.5} />{test.duration} min</span>
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" strokeWidth={1.5} />{test.questionsCount} Qs</span>
                          <span className="flex items-center gap-1"><Target className="w-3 h-3" strokeWidth={1.5} />{test.totalPoints} pts</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {test.userAttempt?.status === "SUBMITTED" ? (
                          <div className="text-right space-y-1">
                            <div className={`font-mono text-lg font-bold ${test.userAttempt.percentage >= 70 ? "text-green-600" : test.userAttempt.percentage >= 40 ? "text-amber-600" : "text-[#D63229]"}`}>
                              {Math.round(test.userAttempt.percentage)}%
                            </div>
                            <Link href={`/results/${test.userAttempt.id}`} className="text-xs text-[#1A2E44] hover:underline block">View Results</Link>
                            {(test.settings as any)?.allow_multiple_attempts && (
                              <button onClick={() => attemptTest(test)} disabled={starting === test.id}
                                className="text-xs text-[#5C5C59] hover:text-[#1A2E44] border border-[#E0DFDB] px-2 py-1 rounded-sm transition-colors flex items-center gap-1 ml-auto">
                                {starting === test.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Re-attempt
                              </button>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => attemptTest(test)} disabled={starting === test.id}
                            className={`btn-primary flex items-center gap-1.5 ${test.userAttempt?.status === "IN_PROGRESS" ? "bg-amber-500 hover:bg-amber-600" : ""}`}>
                            {starting === test.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            {test.userAttempt?.status === "IN_PROGRESS" ? "Resume" : "Start Test"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {pagination.hasMore && (
                  <div className="mt-4 text-center">
                    <button onClick={loadMore} disabled={loadingMore} className="btn-outline flex items-center gap-2 mx-auto">
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                      Load More Tests
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "results" && (
          results.length === 0 ? (
            <div className="py-12 text-center bg-white border border-[#E0DFDB]">
              <Award className="w-8 h-8 mx-auto mb-3 text-[#E0DFDB]" strokeWidth={1.5} />
              <p className="text-sm text-[#5C5C59]">No results yet. Take a test to see your scores here.</p>
            </div>
          ) : (
            <div className="border border-[#E0DFDB]">
              <table className="w-full text-sm">
                <thead><tr className="bg-[#F7F7F5] border-b border-[#E0DFDB]">
                  {["Test", "Score", "Time", "Date", ""].map(h => <th key={h} className="text-left px-5 py-3 text-xs text-[#5C5C59] uppercase tracking-wider font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id} className="bg-white border-b border-[#E0DFDB] last:border-b-0 hover:bg-[#F7F7F5] transition-colors">
                      <td className="px-5 py-3 font-medium text-[#111110]">{r.testTitle}</td>
                      <td className="px-5 py-3">
                        <span className={`font-mono font-bold ${r.percentage >= 70 ? "text-green-600" : r.percentage >= 40 ? "text-amber-600" : "text-[#D63229]"}`}>
                          {Math.round(r.percentage)}%
                        </span>
                        <span className="text-xs text-[#5C5C59] ml-1">({Math.round(r.totalScore)}/{r.maxScore})</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{Math.floor(r.timeTakenSeconds / 60)}m{r.timeTakenSeconds % 60}s</td>
                      <td className="px-5 py-3 text-xs text-[#5C5C59]">{new Date(r.submittedAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <Link href={`/results/${r.id}`} className="text-xs text-[#1A2E44] hover:underline font-medium">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>
    </div>
  );
}
