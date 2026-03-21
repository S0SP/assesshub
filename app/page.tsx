import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, Clock, Cpu, BarChart3, CheckCircle2 } from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    const role = (session.user as any).role;
    if (role === "SUPER_ADMIN") redirect("/admin");
    if (role === "TEACHER") redirect("/teacher");
    if (role === "TEST_TAKER") redirect("/dashboard");
  }

  const features = [
    { icon: FileText, title: "Easy Test Creation", desc: "Create MCQ and subjective questions with an intuitive step-by-step wizard with drag & drop reordering." },
    { icon: Clock, title: "Timed Assessments", desc: "Server-synced countdown timer with auto-submit on expiry and auto-save every 30 seconds." },
    { icon: Cpu, title: "Smart Evaluation", desc: "MCQs auto-graded instantly. Subjective answers scored via keyword matching with AI assistance." },
    { icon: BarChart3, title: "Detailed Analytics", desc: "Score breakdowns, question-wise analysis, and student performance tracking with manual override." },
  ];

  const steps = [
    { num: "01", title: "Create", desc: "Build your test with our intuitive editor. Add MCQs and subjective questions in minutes with AI-powered enhancement." },
    { num: "02", title: "Share", desc: "Distribute via shareable links, invite codes, or password-protected access for controlled testing." },
    { num: "03", title: "Evaluate", desc: "Get instant MCQ results and keyword-based subjective scoring with manual override capability." },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      {/* Nav */}
      <nav className="border-b border-[#E0DFDB] bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-heading font-bold text-xl tracking-tight text-[#1A2E44]">AssessHub</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="nav-link">Sign In</Link>
            <Link href="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <p className="text-xs uppercase tracking-[0.2em] text-[#5C5C59] font-medium mb-6">Assessment Platform</p>
        <h1 className="font-display text-5xl lg:text-7xl font-bold text-[#111110] tracking-tight leading-[1.05] mb-6">
          Assess.<br />Evaluate.<br />Improve.
        </h1>
        <p className="text-lg text-[#5C5C59] max-w-xl mb-10 leading-relaxed">
          The modern testing platform for educators who value simplicity and insight. Create, distribute, and evaluate assessments seamlessly.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/register" className="inline-flex items-center gap-2 btn-primary px-8 py-3.5 text-base">
            Create Free Account <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          <Link href="/login" className="btn-outline px-8 py-3.5 text-base">Sign In</Link>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-px bg-[#E0DFDB] border border-[#E0DFDB] max-w-lg">
          {[["50k+","Students"],["100+","Educators"],["4.9","Rating"]].map(([v,l])=>(
            <div key={l} className="bg-[#F7F7F5] px-6 py-5 text-center">
              <div className="font-mono text-2xl font-bold text-[#111110]">{v}</div>
              <div className="text-xs text-[#5C5C59] mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#E0DFDB] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs uppercase tracking-[0.2em] text-[#5C5C59] font-medium mb-3">Features</p>
          <h2 className="font-heading text-2xl font-bold text-[#111110] tracking-tight mb-12">Everything you need</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#E0DFDB] border border-[#E0DFDB]">
            {features.map((f,i)=>(
              <div key={i} className="bg-white p-6 hover:bg-[#F7F7F5] transition-colors duration-150">
                <f.icon className="w-5 h-5 text-[#1A2E44] mb-4" strokeWidth={1.5} />
                <h3 className="font-heading font-semibold text-[#111110] mb-2">{f.title}</h3>
                <p className="text-sm text-[#5C5C59] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#E0DFDB]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p className="text-xs uppercase tracking-[0.2em] text-[#5C5C59] font-medium mb-3">Process</p>
          <h2 className="font-heading text-2xl font-bold text-[#111110] tracking-tight mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#E0DFDB] border border-[#E0DFDB]">
            {steps.map((s,i)=>(
              <div key={i} className="bg-[#F7F7F5] p-8">
                <span className="font-mono text-4xl font-bold text-[#E0DFDB] block mb-4">{s.num}</span>
                <h3 className="font-heading font-semibold text-lg text-[#111110] mb-2">{s.title}</h3>
                <p className="text-sm text-[#5C5C59] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#E0DFDB] bg-[#1A2E44]">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display text-4xl font-bold text-white mb-4">Ready to transform your assessments?</h2>
          <p className="text-[#9BAFC4] mb-8 text-sm">Start creating tests in minutes. No credit card required.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-[#1A2E44] hover:bg-[#F7F7F5] px-8 py-3.5 text-sm font-medium transition-colors duration-150 rounded-sm">
            Get Started Free <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E0DFDB] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-[#5C5C59]">
          <span className="font-heading font-bold text-sm text-[#1A2E44]">AssessHub</span>
          <div className="flex items-center gap-6">
            <span>Privacy</span><span>Terms</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" strokeWidth={1.5} /> 2024 AssessHub</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
