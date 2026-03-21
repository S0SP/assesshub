"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/public/validate-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })
      .then(r => r.json())
      .then(data => {
        if (!data.valid) { setError(data.error || "Invalid code"); return; }
        if (data.type === "teacher") router.push(`/register?code=${code}`);
        else if (data.type === "test") router.push(`/test/${data.shareCode}`);
      })
      .catch(() => setError("Failed to validate code"));
  }, [code, router]);

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F5]">
      <h2 className="font-heading text-xl font-bold text-[#111110] mb-2">Invalid Code</h2>
      <p className="text-sm text-[#5C5C59]">{error}</p>
    </div>
  );
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]">
      <Loader2 className="w-5 h-5 animate-spin text-[#5C5C59] mr-2"/><span className="text-sm text-[#5C5C59]">Validating code...</span>
    </div>
  );
}
