"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Plus, Trash2, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function TestShareClient({ test, codes: initialCodes }: { test: any; codes: any[] }) {
  const [codes, setCodes] = useState(initialCodes);
  const [maxUses, setMaxUses] = useState(50);
  const [expiresIn, setExpiresIn] = useState(7);
  const [label, setLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/test/${test.shareCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCode = async () => {
    setGenerating(true);
    const res = await fetch(`/api/teacher/tests/${test.id}/invite-codes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maxUses, expiresInDays: expiresIn, label: label || null }) });
    const data = await res.json();
    if (res.ok) { setCodes(prev => [data, ...prev]); setLabel(""); toast.success("Code generated!"); }
    else toast.error(data.error || "Failed");
    setGenerating(false);
  };

  const revokeCode = async (code: string) => {
    const res = await fetch(`/api/teacher/invite-codes/${code}/revoke`, { method: "PUT" });
    if (res.ok) { setCodes(prev => prev.map(c => c.code === code ? {...c, status: "REVOKED"} : c)); toast.success("Code revoked"); }
    else toast.error("Failed");
  };

  const statusBadge = (s: string) => {
    const map: Record<string,string> = { ACTIVE:"badge-green", EXHAUSTED:"badge-gray", EXPIRED:"badge-amber", REVOKED:"badge-red" };
    return <span className={`badge ${map[s]||"badge-gray"}`}>{s}</span>;
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <header className="bg-white border-b border-[#E0DFDB]">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/teacher" className="text-[#5C5C59] hover:text-[#111110]"><ArrowLeft className="w-4 h-4" strokeWidth={1.5}/></Link>
          <span className="font-heading font-semibold text-sm text-[#111110]">Share: {test.title}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Direct Link */}
        <div className="bg-white border border-[#E0DFDB] p-6">
          <h2 className="font-heading font-semibold text-sm text-[#111110] mb-3">Direct Link</h2>
          <div className="flex gap-2">
            <input value={shareUrl} readOnly className="input-base bg-[#F7F7F5] font-mono text-xs"/>
            <button onClick={copyLink} className="btn-primary flex items-center gap-2 flex-shrink-0">
              {copied?<Check className="w-4 h-4" strokeWidth={1.5}/>:<Copy className="w-4 h-4" strokeWidth={1.5}/>}{copied?"Copied!":"Copy"}
            </button>
          </div>
          <p className="text-xs text-[#5C5C59] mt-2">Share this link with students. Access type: <strong>{test.accessType.replace(/_/g," ")}</strong></p>
        </div>

        {/* Generate Code */}
        <div className="bg-white border border-[#E0DFDB] p-6">
          <h2 className="font-heading font-semibold text-sm text-[#111110] mb-3">Generate Invite Code</h2>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><label className="label">Max Uses</label><input type="number" value={maxUses} onChange={e=>setMaxUses(Number(e.target.value))} min={1} max={500} className="input-base h-9"/></div>
            <div><label className="label">Expires (days)</label><input type="number" value={expiresIn} onChange={e=>setExpiresIn(Number(e.target.value))} min={1} max={90} className="input-base h-9"/></div>
            <div><label className="label">Label (optional)</label><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Class 10A" className="input-base h-9"/></div>
          </div>
          <button onClick={generateCode} disabled={generating} className="btn-primary flex items-center gap-2">
            {generating?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4" strokeWidth={1.5}/>}Generate Code
          </button>
        </div>

        {/* Codes List */}
        <div className="bg-white border border-[#E0DFDB]">
          <div className="px-5 py-3 border-b border-[#E0DFDB]"><h2 className="font-heading font-semibold text-sm text-[#111110]">Invite Codes ({codes.length})</h2></div>
          {codes.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#5C5C59]">No codes generated yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[#E0DFDB] bg-[#F7F7F5]">
                {["Code","Label","Uses","Expires","Status",""].map(h=><th key={h} className="text-left px-5 py-2 text-xs text-[#5C5C59] uppercase tracking-wider">{h}</th>)}
              </tr></thead>
              <tbody>
                {codes.map(c=>(
                  <tr key={c.id} className="border-b border-[#E0DFDB] last:border-b-0">
                    <td className="px-5 py-2 font-mono text-xs">{c.code}</td>
                    <td className="px-5 py-2 text-[#5C5C59]">{c.label||"-"}</td>
                    <td className="px-5 py-2 font-mono">{c.currentUses}/{c.maxUses}</td>
                    <td className="px-5 py-2 text-xs text-[#5C5C59]">{new Date(c.expiresAt).toLocaleDateString()}</td>
                    <td className="px-5 py-2">{statusBadge(c.status)}</td>
                    <td className="px-5 py-2 flex gap-2">
                      <button onClick={()=>{navigator.clipboard.writeText(c.code);toast.success("Copied!");}} className="text-[#5C5C59] hover:text-[#111110]"><Copy className="w-3.5 h-3.5"/></button>
                      {c.status==="ACTIVE"&&<button onClick={()=>revokeCode(c.code)} className="text-[#D63229] hover:text-red-700"><Trash2 className="w-3.5 h-3.5"/></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
