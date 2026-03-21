"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, FileText, Target, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export default function PublicTestLandingClient({ test, existingAttempt, isLoggedIn, userRole }: { test: any; existingAttempt: any; isLoggedIn: boolean; userRole?: string }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [testPassword, setTestPassword] = useState("");

  const handleStart = async () => {
    if (!isLoggedIn) { router.push(`/login?callbackUrl=/test/${test.shareCode}`); return; }
    if (userRole !== "TEST_TAKER") { toast.error("Only students can take tests"); return; }
    setStarting(true);
    const body: any = {};
    if (test.accessType === "INVITE_ONLY") body.invite_code = inviteCode;
    if (test.accessType === "PASSWORD_PROTECTED") body.testPassword = testPassword;
    const res = await fetch(`/api/student/tests/${test.id}/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { sessionStorage.setItem(`attempt-${test.id}`, JSON.stringify(data)); router.push(`/test-attempt/${test.id}`); }
    else { toast.error(data.error || "Failed"); }
    setStarting(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <nav className="border-b border-[#E0DFDB] bg-white/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-heading font-bold text-lg text-[#1A2E44] tracking-tight">AssessHub</span>
          {isLoggedIn ? <Link href={userRole==="TEACHER"?"/teacher":userRole==="SUPER_ADMIN"?"/admin":"/dashboard"} className="nav-link">Dashboard</Link> : <Link href="/login" className="nav-link">Sign In</Link>}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white border border-[#E0DFDB] p-8">
          <h1 className="font-heading text-2xl font-bold text-[#111110] tracking-tight mb-1">{test.title}</h1>
          <p className="text-sm text-[#5C5C59] mb-6">Created by {test.createdByName}</p>

          <div className="flex gap-6 mb-6">
            <div className="flex items-center gap-1.5 text-sm text-[#5C5C59]"><Clock className="w-4 h-4" strokeWidth={1.5}/>{test.duration} min</div>
            <div className="flex items-center gap-1.5 text-sm text-[#5C5C59]"><FileText className="w-4 h-4" strokeWidth={1.5}/>{test.questions.length} questions</div>
            <div className="flex items-center gap-1.5 text-sm text-[#5C5C59]"><Target className="w-4 h-4" strokeWidth={1.5}/>{test.totalPoints} points</div>
          </div>

          {test.description && <p className="text-sm text-[#5C5C59] mb-6 leading-relaxed">{test.description}</p>}

          {test.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">{test.tags.map((t: string)=><span key={t} className="badge badge-navy">{t}</span>)}</div>
          )}

          <div className="border-t border-[#E0DFDB] pt-6 mb-6">
            <h3 className="font-heading font-semibold text-sm text-[#111110] mb-3">Instructions</h3>
            <ul className="space-y-1.5 text-sm text-[#5C5C59] list-none">
              <li>• Contains {test.mcqCount} MCQs and {test.subjectiveCount} subjective questions</li>
              <li>• You have <strong>{test.duration} minutes</strong> to complete the test</li>
              <li>• Timer cannot be paused once started</li>
              <li>• Answers are auto-saved every 30 seconds</li>
              {!(test.settings?.allow_multiple_attempts) && <li>• Only one attempt allowed</li>}
            </ul>
          </div>

          {test.accessType === "INVITE_ONLY" && (
            <div className="mb-4"><label className="label">Invite Code *</label><input value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="TEST-XXXX-XX" className="input-base font-mono"/></div>
          )}
          {test.accessType === "PASSWORD_PROTECTED" && (
            <div className="mb-4"><label className="label">Test Password *</label><input type="password" value={testPassword} onChange={e=>setTestPassword(e.target.value)} placeholder="Enter password" className="input-base"/></div>
          )}

          {existingAttempt?.status === "SUBMITTED" ? (
            <div className="bg-green-50 border border-green-200 p-4 text-center">
              <p className="text-sm text-green-800 font-medium mb-2">✅ You have completed this test</p>
              <p className="text-lg font-mono font-bold text-green-700 mb-3">{Math.round(existingAttempt.percentage)}%</p>
              <Link href={`/results/${existingAttempt.id}`} className="btn-primary">View Results</Link>
            </div>
          ) : !isLoggedIn ? (
            <div className="bg-[#F7F7F5] border border-[#E0DFDB] p-4 text-center">
              <p className="text-sm text-[#5C5C59] mb-3">You need to sign in before starting</p>
              <div className="flex gap-3 justify-center">
                <Link href={`/login?callbackUrl=/test/${test.shareCode}`} className="btn-primary">Sign In</Link>
                <Link href="/register" className="btn-outline">Register</Link>
              </div>
            </div>
          ) : userRole !== "TEST_TAKER" ? (
            <div className="bg-amber-50 border border-amber-200 p-4 text-center text-sm text-amber-800">Only students can take tests.</div>
          ) : (
            <button onClick={handleStart} disabled={starting} className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base">
              {starting?<Loader2 className="w-4 h-4 animate-spin"/>:test.accessType==="INVITE_ONLY"?<Lock className="w-4 h-4" strokeWidth={1.5}/>:null}
              {starting?"Starting...":"Start Test"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
