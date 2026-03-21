"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, LogOut, FileText, Users, BarChart3, Eye, Share2, Trash2, Copy, Archive, Clock } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

const statusColors: Record<string,string> = { DRAFT:"badge-amber", PUBLISHED:"badge-green", ARCHIVED:"badge-gray", CLOSED:"badge-red" };

export default function TeacherDashboardClient({ tests: initialTests, stats, userName }: { tests: any[]; stats: any; userName: string }) {
  const router = useRouter();
  const [tests, setTests] = useState(initialTests);
  const [tab, setTab] = useState("all");

  const act = async (url: string, method = "POST") => {
    const res = await fetch(url, { method });
    if (!res.ok) { const d = await res.json(); toast.error(d.error||"Failed"); return false; }
    return true;
  };

  const deleteTest = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    if (await act(`/api/teacher/tests/${id}`, "DELETE")) { setTests(ts=>ts.filter(t=>t.id!==id)); toast.success("Deleted"); }
  };
  const publishTest = async (id: string) => {
    if (await act(`/api/teacher/tests/${id}/publish`)) { setTests(ts=>ts.map(t=>t.id===id?{...t,status:"PUBLISHED"}:t)); toast.success("Published!"); }
  };
  const archiveTest = async (id: string) => {
    if (await act(`/api/teacher/tests/${id}/archive`)) { setTests(ts=>ts.map(t=>t.id===id?{...t,status:"ARCHIVED"}:t)); toast.success("Archived"); }
  };
  const duplicateTest = async (id: string) => {
    const res = await fetch(`/api/teacher/tests/${id}/duplicate`, { method: "POST" });
    if (res.ok) { const d=await res.json(); router.push(`/teacher/tests/${d.id}/edit`); toast.success("Duplicated"); }
    else toast.error("Failed");
  };

  const filtered = tab==="all" ? tests : tests.filter(t=>t.status===tab.toUpperCase());

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <header className="bg-white border-b border-[#E0DFDB] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-heading font-bold text-lg text-[#1A2E44] tracking-tight">AssessHub</span>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link href="/teacher" className="text-[#1A2E44] font-medium">Dashboard</Link>
              <Link href="/teacher/tests/create" className="nav-link">Create Test</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#5C5C59]">{userName}</span>
            <button onClick={()=>signOut({callbackUrl:"/"})} className="text-[#5C5C59] hover:text-[#D63229] transition-colors"><LogOut className="w-4 h-4" strokeWidth={1.5}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="font-heading text-2xl font-bold text-[#111110] tracking-tight">Teacher Dashboard</h1><p className="text-sm text-[#5C5C59]">Manage your tests and view results</p></div>
          <Link href="/teacher/tests/create" className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" strokeWidth={1.5}/>Create Test</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border border-[#E0DFDB] mb-8">
          {[{label:"Total Tests",value:stats.totalTests,icon:FileText},{label:"Published",value:stats.publishedTests,icon:Eye},{label:"Avg Score",value:`${stats.avgScore}%`,icon:BarChart3},{label:"Total Tests",value:stats.totalTests,icon:Users}].map((s,i)=>(
            <div key={i} className="stat-box border-b md:border-b-0">
              <div className="flex items-center gap-2 text-[#5C5C59] mb-1"><s.icon className="w-4 h-4" strokeWidth={1.5}/><span className="text-xs uppercase tracking-wider">{s.label}</span></div>
              <div className="font-mono text-2xl font-bold text-[#111110]">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex border-b border-[#E0DFDB] mb-4">
          {["all","draft","published","archived"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`tab-btn ${tab===t?"tab-active":"tab-inactive"}`}>
              {t.charAt(0).toUpperCase()+t.slice(1)} {t!=="all"&&<span className="text-xs ml-1">({tests.filter(x=>t==="all"||x.status===t.toUpperCase()).length})</span>}
            </button>
          ))}
        </div>

        {filtered.length===0 ? (
          <div className="py-12 text-center bg-white border border-[#E0DFDB]">
            <FileText className="w-8 h-8 mx-auto mb-3 text-[#E0DFDB]" strokeWidth={1.5}/>
            <p className="text-sm text-[#5C5C59] mb-3">No tests found</p>
            <Link href="/teacher/tests/create" className="btn-primary inline-block">Create Your First Test</Link>
          </div>
        ) : (
          <div className="border border-[#E0DFDB]">
            <table className="w-full">
              <thead><tr className="bg-[#F7F7F5] border-b border-[#E0DFDB]">
                {["Test","Status","Questions","Attempts","Actions"].map(h=><th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#5C5C59] uppercase tracking-wider">{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map(test=>(
                  <tr key={test.id} className="bg-white border-b border-[#E0DFDB] last:border-b-0">
                    <td className="px-5 py-3">
                      <div className="font-medium text-sm text-[#111110]">{test.title}</div>
                      <div className="text-xs text-[#5C5C59] flex items-center gap-2 mt-0.5"><Clock className="w-3 h-3" strokeWidth={1.5}/>{test.duration}m <span className="text-[#E0DFDB]">|</span> {test.totalPoints}pts</div>
                    </td>
                    <td className="px-5 py-3"><span className={`badge ${statusColors[test.status]||"badge-gray"}`}>{test.status}</span></td>
                    <td className="px-5 py-3 font-mono text-sm">{test.questionsCount}</td>
                    <td className="px-5 py-3 font-mono text-sm">{test.attemptsCount||0}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {test.status==="DRAFT"&&<>
                          <Link href={`/teacher/tests/${test.id}/edit`}><button className="text-xs text-[#5C5C59] hover:text-[#111110] px-2 py-1 border border-[#E0DFDB] rounded-sm">Edit</button></Link>
                          <button onClick={()=>publishTest(test.id)} className="text-xs text-green-700 hover:text-green-800 px-2 py-1 border border-[#E0DFDB] rounded-sm">Publish</button>
                          <button onClick={()=>deleteTest(test.id)} className="text-[#D63229] hover:text-red-700 p-1"><Trash2 className="w-3.5 h-3.5"/></button>
                        </>}
                        {test.status==="PUBLISHED"&&<>
                          <Link href={`/teacher/tests/${test.id}/results`}><button className="text-xs text-[#5C5C59] hover:text-[#111110] px-2 py-1 border border-[#E0DFDB] rounded-sm">Results</button></Link>
                          <Link href={`/teacher/tests/${test.id}/share`}><button className="text-[#5C5C59] hover:text-[#111110] p-1"><Share2 className="w-3.5 h-3.5"/></button></Link>
                          <button onClick={()=>archiveTest(test.id)} className="text-[#5C5C59] hover:text-[#111110] p-1"><Archive className="w-3.5 h-3.5"/></button>
                        </>}
                        <button onClick={()=>duplicateTest(test.id)} className="text-[#5C5C59] hover:text-[#111110] p-1"><Copy className="w-3.5 h-3.5"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
