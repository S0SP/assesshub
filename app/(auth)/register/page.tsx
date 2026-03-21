"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Check, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const preCode = params.get("code") || "";
  const [role, setRole] = useState("TEST_TAKER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState(preCode);
  const [department, setDepartment] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const checks = { len: password.length >= 8, upper: /[A-Z]/.test(password), num: /[0-9]/.test(password), special: /[!@#$%^&*]/.test(password) };
  const strength = Object.values(checks).filter(Boolean).length;
  const pwMatch = password === confirm && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checks.len || !checks.upper || !checks.num) { toast.error("Password doesn't meet requirements"); return; }
    if (!pwMatch) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role, inviteCode: inviteCode || undefined, department: department || undefined }) });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || "Registration failed"); setLoading(false); return; }
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    if (signInRes?.ok) {
      toast.success(`Welcome, ${name}!`);
      router.push(data.role === "TEACHER" ? "/teacher" : data.role === "SUPER_ADMIN" ? "/admin" : "/dashboard");
      router.refresh();
    }
    setLoading(false);
  };

  const PwCheck = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-1 text-xs ${ok ? "text-green-600" : "text-[#5C5C59]"}`}>
      {ok ? <Check className="w-3 h-3"/> : <X className="w-3 h-3"/>} {label}
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A2E44] flex-col justify-between p-12">
        <Link href="/" className="font-heading font-bold text-xl text-white tracking-tight">AssessHub</Link>
        <div>
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">Join the modern<br />assessment platform</h2>
          <p className="text-[#9BAFC4] text-sm leading-relaxed max-w-md">Whether you're an educator or a student, AssessHub makes testing simple, fair, and insightful.</p>
        </div>
        <div/>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F7F7F5] overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="lg:hidden mb-8"><Link href="/" className="font-heading font-bold text-xl text-[#1A2E44] tracking-tight">AssessHub</Link></div>
          <h1 className="font-heading text-2xl font-bold text-[#111110] tracking-tight mb-1">Create your account</h1>
          <p className="text-sm text-[#5C5C59] mb-6">Get started in under a minute</p>

          <div className="flex border border-[#E0DFDB] mb-6 rounded-sm overflow-hidden">
            {[["TEST_TAKER","Student"],["TEACHER","Teacher"]].map(([v,l])=>(
              <button key={v} type="button" onClick={()=>setRole(v)} className={`flex-1 py-2.5 text-sm font-medium transition-colors duration-150 ${role===v?"bg-[#1A2E44] text-white":"bg-white text-[#5C5C59] hover:bg-[#F7F7F5]"}`}>{l}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">Full Name</label><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" className="input-base"/></div>
            <div><label className="label">Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" className="input-base"/></div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={show?"text":"password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create password" className="input-base pr-10"/>
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5C59]">{show?<EyeOff className="w-4 h-4" strokeWidth={1.5}/>:<Eye className="w-4 h-4" strokeWidth={1.5}/>}</button>
              </div>
              {password && <div className="mt-2 space-y-1">
                <div className="flex gap-1">{[1,2,3,4].map(i=><div key={i} className={`h-1 flex-1 rounded-full ${i<=strength?strength<=2?"bg-[#D63229]":strength===3?"bg-amber-500":"bg-green-500":"bg-[#E0DFDB]"}`}/>)}</div>
                <div className="grid grid-cols-2 gap-1"><PwCheck ok={checks.len} label="8+ chars"/><PwCheck ok={checks.upper} label="Uppercase"/><PwCheck ok={checks.num} label="Number"/><PwCheck ok={checks.special} label="Special char"/></div>
              </div>}
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm password" className="input-base"/>
              {confirm && !pwMatch && <p className="text-xs text-[#D63229] mt-1">Passwords don't match</p>}
            </div>
            {role === "TEACHER" && <>
              <div><label className="label">Teacher Invite Code *</label><input required value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="TCH-2024-XXXXXX" className="input-base font-mono"/></div>
              <div><label className="label">Department</label><input value={department} onChange={e=>setDepartment(e.target.value)} placeholder="e.g. Computer Science" className="input-base"/></div>
            </>}
            {role === "TEST_TAKER" && <div><label className="label">Invite Code (optional)</label><input value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="TEST-XXXX-XX" className="input-base font-mono"/></div>}
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-2">
              {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<ArrowRight className="w-4 h-4" strokeWidth={1.5}/>}
              {loading?"Creating...":"Create Account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[#5C5C59]">Already have an account?{" "}<Link href="/login" className="text-[#1A2E44] font-medium hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
