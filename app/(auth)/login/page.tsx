"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Step 1: validate credentials without any redirect
      const check = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!check.ok) {
        const data = await check.json();
        setError(data.error || "Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      // Step 2: credentials valid — create session via NextAuth
      await signIn("credentials", { email, password, redirect: false });
      toast.success("Welcome back!");
      const redirect = params.get("callbackUrl") || "/";
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A2E44] flex-col justify-between p-12">
        <Link href="/" className="font-heading font-bold text-xl text-white tracking-tight">AssessHub</Link>
        <div>
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">Empowering educators<br />with smarter assessments</h2>
          <p className="text-[#9BAFC4] text-sm leading-relaxed max-w-md">Create, distribute, and evaluate tests seamlessly. Join thousands of educators who trust AssessHub.</p>
        </div>
        <div className="flex gap-10 text-white">
          {[["50k+","Students"],["100+","Educators"],["4.9","Rating"]].map(([v,l])=>(
            <div key={l}><div className="font-mono text-2xl font-bold">{v}</div><div className="text-xs text-[#9BAFC4] mt-1">{l}</div></div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F7F7F5]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Link href="/" className="font-heading font-bold text-xl text-[#1A2E44] tracking-tight">AssessHub</Link>
          </div>
          <h1 className="font-heading text-2xl font-bold text-[#111110] tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm text-[#5C5C59] mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-sm text-sm text-red-700 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input type="email" required value={email} onChange={e=>{setEmail(e.target.value);setError("");}} placeholder="email@example.com" className="input-base" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={show?"text":"password"} required value={password} onChange={e=>{setPassword(e.target.value);setError("");}} placeholder="Your password" className="input-base pr-10" />
                <button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5C59] hover:text-[#111110]">
                  {show?<EyeOff className="w-4 h-4" strokeWidth={1.5}/>:<Eye className="w-4 h-4" strokeWidth={1.5}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
              {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<ArrowRight className="w-4 h-4" strokeWidth={1.5}/>}
              {loading?"Signing in...":"Sign In"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-white border border-[#E0DFDB] rounded-sm text-xs text-[#5C5C59] space-y-1">
            <p className="font-medium text-[#111110] text-sm mb-2">Demo Credentials</p>
            <p>Admin: admin@assesshub.com / Admin@123</p>
          </div>

          <p className="mt-6 text-center text-sm text-[#5C5C59]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#1A2E44] font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
