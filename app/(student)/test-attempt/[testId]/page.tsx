"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Flag, ChevronLeft, ChevronRight, AlertTriangle, Check, Loader2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { formatTime } from "@/lib/utils";

export default function TestAttemptPage() {
  const { testId } = useParams<{ testId: string }>();
  const router = useRouter();
  const [attemptData, setAttemptData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced"|"syncing"|"error">("synced");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveRef = useRef<NodeJS.Timeout | null>(null);
  const syncRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef(answers);

  // Keep answers ref in sync for use inside intervals
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Initialize from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem(`attempt-${testId}`);
    if (!raw) { toast.error("Session expired. Please start the test again."); router.push("/dashboard"); return; }
    const data = JSON.parse(raw);
    setAttemptData(data);
    setAnswers(data.answers || {});
    const started = new Date(data.startedAt);
    const deadline = started.getTime() + data.duration * 60000;
    const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    setTimeLeft(remaining);
  }, [testId, router]);

  // Server-sync timer — every 60 seconds
  const syncTimer = useCallback(async () => {
    if (!attemptData?.attemptId) return;
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/student/attempts/${attemptData.attemptId}/remaining`);
      if (res.ok) {
        const { remainingSeconds, status } = await res.json();
        if (status === "SUBMITTED") {
          toast.info("This test was already submitted.");
          router.push(`/results/${attemptData.attemptId}`);
          return;
        }
        // Correct client drift — update if difference > 5s
        setTimeLeft(prev => {
          if (Math.abs(prev - remainingSeconds) > 5) {
            return remainingSeconds;
          }
          return prev;
        });
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
      }
    } catch {
      setSyncStatus("error");
    }
  }, [attemptData, router]);

  // Countdown tick
  useEffect(() => {
    if (!attemptData || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [attemptData]);

  // Server sync every 60s
  useEffect(() => {
    if (!attemptData) return;
    syncRef.current = setInterval(syncTimer, 60000);
    return () => clearInterval(syncRef.current!);
  }, [attemptData, syncTimer]);

  const doSave = useCallback(async () => {
    if (!attemptData) return;
    setSaving(true);
    try {
      await fetch(`/api/student/attempts/${attemptData.attemptId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersRef.current }),
      });
      setLastSaved(new Date());
    } catch { /* silent */ }
    setSaving(false);
  }, [attemptData]);

  // Auto-save every 30s
  useEffect(() => {
    if (!attemptData) return;
    saveRef.current = setInterval(doSave, 30000);
    return () => clearInterval(saveRef.current!);
  }, [attemptData, doSave]);

  const handleAutoSubmit = async () => {
    if (!attemptData) return;
    try {
      const res = await fetch(`/api/student/attempts/${attemptData.attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersRef.current }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.info("⏱ Time's up! Test submitted automatically.");
        sessionStorage.removeItem(`attempt-${testId}`);
        setTimeout(() => router.push(`/results/${attemptData.attemptId}`), 2000);
      } else {
        toast.error(data.error || "Auto-submit failed");
      }
    } catch { /* silent */ }
  };

  const handleSubmit = async () => {
    if (!attemptData || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/student/attempts/${attemptData.attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersRef.current }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Submitted! Score: ${Math.round(data.percentage)}%`);
        sessionStorage.removeItem(`attempt-${testId}`);
        router.push(`/results/${attemptData.attemptId}`);
      } else {
        toast.error(data.error || "Submission failed");
      }
    } catch {
      toast.error("Network error. Check connection and try again.");
    }
    setSubmitting(false);
  };

  if (!attemptData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]">
        <Loader2 className="w-6 h-6 animate-spin text-[#5C5C59]" />
      </div>
    );
  }

  const questions = attemptData.questions;
  const q = questions[currentQ];
  const isWarning = timeLeft < 300;
  const isCritical = timeLeft < 60;

  const answeredCount = questions.filter((qq: any) => {
    const a = answers[qq.id];
    return qq.type === "MCQ" ? !!a?.selected_option : !!(a?.answer?.trim());
  }).length;

  const progressPct = Math.round((answeredCount / Math.max(questions.length, 1)) * 100);

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col">
      {/* Progress bar */}
      <div className="progress-bar" style={{ width: `${progressPct}%` }} />

      {/* Header */}
      <header className="bg-white border-b border-[#E0DFDB] px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <h1 className="font-heading font-semibold text-[#111110] text-sm truncate max-w-xs">
            {attemptData.test?.title || "Test"}
          </h1>
          {/* Sync indicator */}
          <div title={syncStatus === "synced" ? "Timer synced with server" : syncStatus === "syncing" ? "Syncing..." : "Sync error"}>
            {syncStatus === "synced" ? (
              <Wifi className="w-3 h-3 text-green-500" strokeWidth={1.5} />
            ) : syncStatus === "syncing" ? (
              <Wifi className="w-3 h-3 text-amber-500 animate-pulse" strokeWidth={1.5} />
            ) : (
              <WifiOff className="w-3 h-3 text-[#D63229]" strokeWidth={1.5} />
            )}
          </div>
        </div>
        <div className={`font-mono text-xl font-bold tracking-widest ${isCritical ? "text-[#D63229] timer-warning" : isWarning ? "text-amber-500" : "text-[#1A2E44]"}`}>
          {formatTime(timeLeft)}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 bg-white border-r border-[#E0DFDB] p-4 hidden md:flex flex-col overflow-y-auto">
          <p className="text-xs uppercase tracking-widest text-[#5C5C59] font-medium mb-3">Questions</p>
          <div className="grid grid-cols-5 gap-1 mb-4">
            {questions.map((qq: any, i: number) => {
              const a = answers[qq.id];
              const isAns = qq.type === "MCQ" ? !!a?.selected_option : !!(a?.answer?.trim());
              let cls = "q-nav-item";
              if (i === currentQ) cls += " q-nav-current";
              else if (flagged.has(i)) cls += " q-nav-flagged";
              else if (isAns) cls += " q-nav-answered";
              else cls += " q-nav-unanswered";
              return (
                <button key={i} className={cls} onClick={() => { doSave(); setCurrentQ(i); }} title={`Q${i+1}: ${isAns ? "Answered" : "Unanswered"}${flagged.has(i) ? " (Flagged)" : ""}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="space-y-1 text-xs text-[#5C5C59] mb-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm" /><span>Answered: {answeredCount}/{questions.length}</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-400 rounded-sm" /><span>Flagged: {flagged.size}</span></div>
          </div>
          <div className="mt-auto">
            <button onClick={() => setShowSubmit(true)} className="btn-primary w-full text-center">
              Submit Test
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#5C5C59] font-medium">
                  Question {currentQ + 1} of {questions.length}
                </span>
                <span className="text-xs text-[#5C5C59] ml-3 font-mono">{q.points} pts</span>
                {q.type !== "MCQ" && (attemptData.test?.settings?.negative_marking) && (
                  <span className="text-xs text-amber-600 ml-2">(negative marking off for subjective)</span>
                )}
              </div>
              <button
                onClick={() => setFlagged(prev => { const n = new Set(prev); n.has(currentQ) ? n.delete(currentQ) : n.add(currentQ); return n; })}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-sm transition-colors ${flagged.has(currentQ) ? "bg-amber-50 border-amber-400 text-amber-700" : "border-[#E0DFDB] text-[#5C5C59] hover:border-amber-400"}`}
              >
                <Flag className="w-3 h-3" strokeWidth={1.5} />
                {flagged.has(currentQ) ? "Flagged" : "Flag"}
              </button>
            </div>

            {/* Question */}
            <div className="bg-white border border-[#E0DFDB] p-6 mb-6">
              <p className="text-lg text-[#111110] leading-relaxed">{q.text}</p>
              {q.tags?.length > 0 && (
                <div className="flex gap-1 mt-3">
                  {q.tags.map((t: string) => <span key={t} className="text-[10px] px-2 py-0.5 bg-[#F7F7F5] text-[#5C5C59] border border-[#E0DFDB]">{t}</span>)}
                </div>
              )}
            </div>

            {/* MCQ */}
            {q.type === "MCQ" ? (
              <div className="border border-[#E0DFDB]">
                {(q.options as any[]).map((opt: any, i: number) => {
                  const isSelected = answers[q.id]?.selected_option === opt.id;
                  return (
                    <button key={opt.id}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: { selected_option: opt.id } }))}
                      className={`w-full text-left p-4 border-b border-[#E0DFDB] last:border-b-0 flex items-center gap-3 transition-colors duration-100 ${isSelected ? "bg-[#1A2E44] text-white" : "bg-white hover:bg-[#F7F7F5] text-[#111110]"}`}
                    >
                      <span className={`w-7 h-7 flex items-center justify-center text-xs font-mono border rounded-sm flex-shrink-0 ${isSelected ? "border-white/30" : "border-[#E0DFDB]"}`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <textarea
                  value={answers[q.id]?.answer || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: { answer: e.target.value } }))}
                  placeholder="Type your answer here..."
                  maxLength={q.type === "SHORT_ANSWER" ? 500 : 5000}
                  className="w-full min-h-[200px] bg-white border border-[#E0DFDB] p-4 text-sm resize-none focus:ring-1 focus:ring-[#1A2E44] focus:border-[#1A2E44] outline-none rounded-sm"
                />
                <div className="text-xs text-[#5C5C59] text-right mt-1 font-mono">
                  {(answers[q.id]?.answer || "").length} / {q.type === "SHORT_ANSWER" ? 500 : 5000}
                </div>
              </div>
            )}

            {q.type === "MCQ" && answers[q.id]?.selected_option && (
              <button
                onClick={() => setAnswers(prev => ({ ...prev, [q.id]: { selected_option: null } }))}
                className="text-xs text-[#5C5C59] hover:text-[#D63229] mt-3 transition-colors"
              >
                Clear Answer
              </button>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => { doSave(); setCurrentQ(Math.max(0, currentQ - 1)); }}
                disabled={currentQ === 0}
                className="btn-outline flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.5} /> Previous
              </button>
              <div className="text-xs text-[#5C5C59]">
                {saving ? (
                  <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>
                ) : lastSaved ? (
                  <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Saved {lastSaved.toLocaleTimeString()}</span>
                ) : null}
              </div>
              {currentQ < questions.length - 1 ? (
                <button onClick={() => { doSave(); setCurrentQ(currentQ + 1); }} className="btn-primary flex items-center gap-1">
                  Next <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                </button>
              ) : (
                <button onClick={() => setShowSubmit(true)} className="btn-primary">Finish</button>
              )}
            </div>

            {/* Mobile submit */}
            <div className="md:hidden mt-6">
              <button onClick={() => setShowSubmit(true)} className="btn-primary w-full">Submit Test</button>
            </div>
          </div>
        </main>
      </div>

      {/* Submit modal */}
      {showSubmit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E0DFDB] w-full max-w-md p-6">
            <h2 className="font-heading text-lg font-bold text-[#111110] mb-4">Submit Test?</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[["Answered", `${answeredCount}/${questions.length}`], ["Unanswered", `${questions.length - answeredCount}`], ["Flagged", `${flagged.size}`], ["Time Left", formatTime(timeLeft)]].map(([l, v]) => (
                <div key={l} className="bg-[#F7F7F5] border border-[#E0DFDB] p-3">
                  <div className="text-xs text-[#5C5C59]">{l}</div>
                  <div className="font-mono font-bold text-[#111110]">{v}</div>
                </div>
              ))}
            </div>
            {(questions.length - answeredCount > 0 || flagged.size > 0) && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs mb-4">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <span>
                  You have {questions.length - answeredCount} unanswered
                  {flagged.size > 0 ? ` and ${flagged.size} flagged` : ""} questions.
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowSubmit(false)} className="btn-outline flex-1">Review</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
