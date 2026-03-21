"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Users, FileText, BookOpen, BarChart3, LogOut, Plus, Copy, UserX, UserCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

interface Props {
  stats: { teachers: number; students: number; tests: number; attempts: number };
  teacherList: any[];
  invites: any[];
  adminName: string;
}

export default function AdminDashboardClient({ stats, teacherList: initialTeachers, invites: initialInvites, adminName }: Props) {
  const router = useRouter();
  const [teachers, setTeachers] = useState(initialTeachers);
  const [invites, setInvites] = useState(initialInvites);
  const [tab, setTab] = useState<"teachers"|"invites">("teachers");
  const [showInvite, setShowInvite] = useState(false);
  const [dept, setDept] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newCode, setNewCode] = useState<string|null>(null);

  const generateInvite = async () => {
    setGenerating(true);
    const res = await fetch("/api/admin/invite-teacher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department: dept || null }) });
    const data = await res.json();
    if (res.ok) { setNewCode(data.code); toast.success("Code generated!"); navigator.clipboard.writeText(data.code); router.refresh(); }
    else toast.error(data.error || "Failed");
    setGenerating(false);
  };

  const toggleTeacher = async (id: string) => {
    const res = await fetch(`/api/admin/teachers/${id}/toggle`, { method: "PUT" });
    const data = await res.json();
    if (res.ok) { setTeachers(ts => ts.map(t => t.id === id ? {...t, isActive: data.isActive} : t)); toast.success(data.isActive ? "Teacher activated" : "Teacher disabled"); }
    else toast.error("Failed");
  };

  const revokeInvite = async (code: string) => {
    const res = await fetch(`/api/admin/invites/${code}/revoke`, { method: "PUT" });
    if (res.ok) { setInvites(inv => inv.map(i => i.code === code ? {...i, status: "REVOKED"} : i)); toast.success("Invite revoked"); }
    else toast.error("Failed");
  };

  const statusBadge = (status: string) => {
    const map: Record<string,string> = { ACTIVE: "badge-green", USED: "badge-navy", EXPIRED: "badge-amber", REVOKED: "badge-red" };
    return <span className={`badge ${map[status]||"badge-gray"}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <header className="bg-white border-b border-[#E0DFDB] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#1A2E44]" strokeWidth={1.5}/>
            <span className="font-heading font-bold text-lg text-[#1A2E44] tracking-tight">AssessHub Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#5C5C59]">{adminName}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-[#5C5C59] hover:text-[#D63229] transition-colors"><LogOut className="w-4 h-4" strokeWidth={1.5}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-2xl font-bold text-[#111110] tracking-tight">Platform Overview</h1>
          <button onClick={() => { setShowInvite(true); setNewCode(null); setDept(""); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" strokeWidth={1.5}/> Invite Teacher
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[#E0DFDB] mb-8">
          {[{label:"Teachers",value:stats.teachers,icon:Users},{label:"Tests",value:stats.tests,icon:FileText},{label:"Students",value:stats.students,icon:BookOpen},{label:"Attempts",value:stats.attempts,icon:BarChart3}].map((s,i)=>(
            <div key={i} className="stat-box border-b md:border-b-0">
              <div className="flex items-center gap-2 text-[#5C5C59] mb-1"><s.icon className="w-4 h-4" strokeWidth={1.5}/><span className="text-xs uppercase tracking-wider">{s.label}</span></div>
              <div className="font-mono text-2xl font-bold text-[#111110]">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E0DFDB] mb-4">
          {(["teachers","invites"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`tab-btn ${tab===t?"tab-active":"tab-inactive"}`}>
              {t==="teachers"?"Teachers":"Invites"}
            </button>
          ))}
        </div>

        {tab === "teachers" && (
          <div className="bg-white border border-[#E0DFDB]">
            {teachers.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#5C5C59]">No teachers yet. Invite one to get started.</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#E0DFDB] bg-[#F7F7F5]">
                  {["Teacher","Department","Tests","Status",""].map(h=><th key={h} className="text-left px-5 py-3 text-xs text-[#5C5C59] uppercase tracking-wider">{h}</th>)}
                </tr></thead>
                <tbody>
                  {teachers.map(t=>(
                    <tr key={t.id} className="border-b border-[#E0DFDB] last:border-b-0">
                      <td className="px-5 py-3"><div className="font-medium text-[#111110]">{t.name}</div><div className="text-xs text-[#5C5C59]">{t.email}</div></td>
                      <td className="px-5 py-3 text-[#5C5C59]">{t.department||"-"}</td>
                      <td className="px-5 py-3 font-mono">{t.testsCount}</td>
                      <td className="px-5 py-3"><span className={`badge ${t.isActive?"badge-green":"badge-red"}`}>{t.isActive?"Active":"Disabled"}</span></td>
                      <td className="px-5 py-3">
                        <button onClick={()=>toggleTeacher(t.id)} className={`text-xs font-medium flex items-center gap-1 ${t.isActive?"text-[#D63229]":"text-green-600"}`}>
                          {t.isActive?<><UserX className="w-3 h-3"/>Disable</>:<><UserCheck className="w-3 h-3"/>Enable</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "invites" && (
          <div className="bg-white border border-[#E0DFDB]">
            {invites.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#5C5C59]">No invites generated yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#E0DFDB] bg-[#F7F7F5]">
                  {["Code","Department","Expires","Status",""].map(h=><th key={h} className="text-left px-5 py-3 text-xs text-[#5C5C59] uppercase tracking-wider">{h}</th>)}
                </tr></thead>
                <tbody>
                  {invites.map(inv=>(
                    <tr key={inv.id} className="border-b border-[#E0DFDB] last:border-b-0">
                      <td className="px-5 py-3 font-mono text-xs">{inv.code}</td>
                      <td className="px-5 py-3 text-[#5C5C59]">{inv.department||"-"}</td>
                      <td className="px-5 py-3 text-xs text-[#5C5C59]">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3">{statusBadge(inv.status)}</td>
                      <td className="px-5 py-3 flex gap-2">
                        <button onClick={()=>{navigator.clipboard.writeText(inv.code);toast.success("Copied!");}} className="text-[#5C5C59] hover:text-[#111110]"><Copy className="w-3.5 h-3.5"/></button>
                        {inv.status==="ACTIVE"&&<button onClick={()=>revokeInvite(inv.code)} className="text-xs text-[#D63229]">Revoke</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E0DFDB] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-[#111110]">Invite New Teacher</h2>
              <button onClick={()=>setShowInvite(false)} className="text-[#5C5C59] hover:text-[#111110]"><X className="w-4 h-4"/></button>
            </div>
            {!newCode ? (<>
              <div className="mb-4">
                <label className="label">Department (optional)</label>
                <input value={dept} onChange={e=>setDept(e.target.value)} placeholder="e.g. Computer Science" className="input-base"/>
                <p className="text-xs text-[#5C5C59] mt-2">Code expires in 7 days and is single-use.</p>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={()=>setShowInvite(false)} className="btn-outline">Cancel</button>
                <button onClick={generateInvite} disabled={generating} className="btn-primary flex items-center gap-2">
                  {generating?<Loader2 className="w-4 h-4 animate-spin"/>:null} Generate Code
                </button>
              </div>
            </>) : (
              <div>
                <p className="text-sm text-[#5C5C59] mb-3">Code generated and copied to clipboard!</p>
                <div className="bg-[#F7F7F5] border border-[#E0DFDB] p-4 font-mono text-xl text-center text-[#1A2E44] mb-4">{newCode}</div>
                <button onClick={()=>{navigator.clipboard.writeText(newCode);toast.success("Copied!");}} className="btn-outline w-full flex items-center justify-center gap-2 mb-3">
                  <Copy className="w-4 h-4" strokeWidth={1.5}/> Copy Code
                </button>
                <button onClick={()=>setShowInvite(false)} className="btn-primary w-full">Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
