"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, Plus, Trash2, GripVertical, Check, Loader2, Sparkles, Mic, MicOff, X, Eye, Clock, FileText, Target } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["General","Programming","Mathematics","Science","Chemistry","Physics","English","History","Other"];

interface QuestionForm {
  id?: string; type: string; text: string;
  options: { id: string; text: string }[];
  correctOption: string; keywords: { keyword: string; weight: number }[];
  points: number; tags: string[]; explanation: string; modelAnswer: string;
}

const defaultQ = (type: string): QuestionForm => ({
  type, text: "", correctOption: "",
  options: type === "MCQ" ? [{ id: "a", text: "" },{ id: "b", text: "" },{ id: "c", text: "" },{ id: "d", text: "" }] : [],
  keywords: [], points: type === "MCQ" ? 2 : 5, tags: [], explanation: "", modelAnswer: "",
});

function SortableQuestion({ q, i, onEdit, onDelete }: { q: any; i: number; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.tempId || q.id || i.toString() });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="bg-white border-b border-[#E0DFDB] last:border-b-0 p-4 flex items-start gap-3">
      <button {...attributes} {...listeners} className="mt-1 text-[#C5C5C0] hover:text-[#5C5C59] cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical className="w-4 h-4" strokeWidth={1.5}/>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-[#5C5C59]">Q{i+1}</span>
          <span className="badge badge-navy">{q.type}</span>
          <span className="text-xs text-[#5C5C59] font-mono">{q.points} pts</span>
        </div>
        <p className="text-sm text-[#111110] line-clamp-2">{q.text || <span className="text-[#C5C5C0] italic">No question text</span>}</p>
        {q.tags?.length > 0 && <div className="flex gap-1 mt-1">{q.tags.map((t: string) => <span key={t} className="text-[9px] px-1.5 py-0.5 bg-[#F7F7F5] text-[#5C5C59] border border-[#E0DFDB]">{t}</span>)}</div>}
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 text-[#5C5C59] hover:text-[#111110] border border-[#E0DFDB] rounded-sm hover:bg-[#F7F7F5]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
        <button onClick={onDelete} className="p-1.5 text-[#D63229] hover:text-red-700 border border-[#E0DFDB] rounded-sm hover:bg-red-50">
          <Trash2 className="w-3.5 h-3.5"/>
        </button>
      </div>
    </div>
  );
}

export default function TestCreateClient({ test: existingTest }: { test?: any }) {
  const router = useRouter();
  const isEdit = !!existingTest;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [testId, setTestId] = useState<string | null>(existingTest?.id || null);
  const [showPreview, setShowPreview] = useState(false);

  // Step 1
  const [title, setTitle] = useState(existingTest?.title || "");
  const [description, setDescription] = useState(existingTest?.description || "");
  const [duration, setDuration] = useState(existingTest?.duration || 30);
  const [category, setCategory] = useState(existingTest?.category || "General");
  const [accessType, setAccessType] = useState(existingTest?.accessType || "PUBLIC");
  const [testPassword, setTestPassword] = useState(existingTest?.testPassword || "");
  type Settings = { allow_multiple_attempts: boolean; show_results_immediately: boolean; randomize_questions: boolean; negative_marking: boolean; negative_marks_value: number; ai_grading: boolean; [key: string]: boolean | number };
  const [settings, setSettings] = useState<Settings>({ allow_multiple_attempts: false, show_results_immediately: true, randomize_questions: false, negative_marking: false, negative_marks_value: 0.25, ai_grading: false, ...(existingTest?.settings || {}) });

  // Step 2
  const [questions, setQuestions] = useState<any[]>(existingTest?.questions?.map((q: any) => ({ ...q, tempId: q.id })) || []);
  const [editingQ, setEditingQ] = useState<QuestionForm | null>(null);
  const [editingIdx, setEditingIdx] = useState<number>(-1);
  const [qLoading, setQLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newKw, setNewKw] = useState("");
  const [newKwWeight, setNewKwWeight] = useState(1.0);
  const recognitionRef = useRef<any>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const totalPoints = questions.reduce((s, q) => s + (q.points || 0), 0);

  const saveStep1 = async () => {
    if (!title.trim()) { toast.error("Title required"); return; }
    setSaving(true);
    try {
      const body = { title, description, duration, category, accessType, testPassword: accessType === "PASSWORD_PROTECTED" ? testPassword : null, settings };
      let id = testId;
      if (id) {
        await fetch(`/api/teacher/tests/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        const res = await fetch("/api/teacher/tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        id = data.id; setTestId(id);
      }
      toast.success("Details saved");
      setStep(2);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    setSaving(false);
  };

  const openAddQ = (type: string) => { setEditingQ(defaultQ(type)); setEditingIdx(-1); };
  const openEditQ = (i: number) => { setEditingQ({ ...questions[i] }); setEditingIdx(i); };

  const saveQuestion = async () => {
    if (!editingQ) return;
    if (!editingQ.text.trim()) { toast.error("Question text required"); return; }
    if (editingQ.type === "MCQ") {
      if (editingQ.options.some(o => !o.text.trim())) { toast.error("All options must have text"); return; }
      if (!editingQ.correctOption) { toast.error("Select correct option"); return; }
    } else { if (editingQ.keywords.length === 0) { toast.error("Add at least one keyword"); return; } }
    setQLoading(true);
    try {
      const body = { type: editingQ.type, text: editingQ.text, options: editingQ.options, correctOption: editingQ.correctOption, keywords: editingQ.keywords, points: editingQ.points, tags: editingQ.tags, explanation: editingQ.explanation, modelAnswer: editingQ.modelAnswer };
      if (editingIdx >= 0 && questions[editingIdx]?.id) {
        await fetch(`/api/teacher/tests/${testId}/questions/${questions[editingIdx].id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const updated = [...questions]; updated[editingIdx] = { ...editingQ, id: questions[editingIdx].id, tempId: questions[editingIdx].tempId };
        setQuestions(updated);
      } else {
        const res = await fetch(`/api/teacher/tests/${testId}/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json();
        setQuestions(prev => [...prev, { ...data, tempId: data.id }]);
      }
      toast.success("Question saved"); setEditingQ(null); setEditingIdx(-1);
    } catch { toast.error("Failed to save question"); }
    setQLoading(false);
  };

  const deleteQuestion = async (i: number) => {
    const q = questions[i];
    if (q.id) { await fetch(`/api/teacher/tests/${testId}/questions/${q.id}`, { method: "DELETE" }); }
    setQuestions(prev => prev.filter((_, idx) => idx !== i)); toast.success("Removed");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = questions.findIndex(q => (q.tempId || q.id) === active.id);
    const newIdx = questions.findIndex(q => (q.tempId || q.id) === over.id);
    const reordered = arrayMove(questions, oldIdx, newIdx);
    setQuestions(reordered);
    if (testId) { await fetch(`/api/teacher/tests/${testId}/questions/reorder`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: reordered.map(q => q.id).filter(Boolean) }) }); }
  };

  const enhanceWithAI = async () => {
    if (!editingQ?.text) { toast.error("Enter question text first"); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/enhance-question", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: editingQ.text, type: editingQ.type, subject: category }) });
      const data = await res.json();
      if (data.enhanced) { setEditingQ(prev => prev ? { ...prev, text: data.enhanced } : prev); toast.success("Enhanced by AI!"); }
    } catch { toast.error("AI unavailable"); }
    setAiLoading(false);
  };

  const generateKeywordsWithAI = async () => {
    if (!editingQ?.text) { toast.error("Enter question text first"); return; }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate-keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: editingQ.text, modelAnswer: editingQ.modelAnswer }) });
      const kws = await res.json();
      if (Array.isArray(kws) && kws.length > 0) { setEditingQ(prev => prev ? { ...prev, keywords: kws } : prev); toast.success(`${kws.length} keywords generated!`); }
    } catch { toast.error("AI unavailable"); }
    setAiLoading(false);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input not supported in this browser. Try Chrome or Edge."); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => { setVoiceActive(true); toast.info("Listening... speak your question"); };
    rec.onend = () => setVoiceActive(false);
    rec.onerror = (event: any) => {
      setVoiceActive(false);
      if (event.error === "no-speech") toast.error("No speech detected. Try again.");
      else if (event.error === "not-allowed") toast.error("Microphone access denied. Allow mic in browser settings.");
      else toast.error(`Voice error: ${event.error}`);
    };
    rec.onresult = (event: any) => {
      // Pure browser Web Speech API — no AI, no server call
      const transcript = Array.from(event.results as SpeechRecognitionResultList)
        .map((result: SpeechRecognitionResult) => result[0].transcript)
        .join(" ")
        .trim();
      setEditingQ(prev => prev ? { ...prev, text: transcript } : prev);
      toast.success("Voice captured! You can edit the text or use ✨ Enhance to refine with AI.");
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const publishTest = async () => {
    const res = await fetch(`/api/teacher/tests/${testId}/publish`, { method: "POST" });
    if (res.ok) { toast.success("Test published!"); router.push("/teacher"); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
  };

  // Preview
  const PreviewPanel = () => (
    <div className="bg-white border border-[#E0DFDB] h-full overflow-y-auto">
      <div className="bg-[#1A2E44] px-4 py-2 flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-white/60" strokeWidth={1.5}/>
        <span className="text-xs text-white/80 font-medium uppercase tracking-wider">Live Preview</span>
      </div>
      <div className="p-4">
        {title ? (
          <>
            <h2 className="font-heading font-bold text-[#111110] mb-1">{title}</h2>
            {description && <p className="text-xs text-[#5C5C59] mb-3 leading-relaxed">{description}</p>}
            <div className="flex gap-4 text-xs text-[#5C5C59] mb-4">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" strokeWidth={1.5}/>{duration} min</span>
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" strokeWidth={1.5}/>{questions.length} Qs</span>
              <span className="flex items-center gap-1"><Target className="w-3 h-3" strokeWidth={1.5}/>{totalPoints} pts</span>
            </div>
            <div className="space-y-2">
              {questions.slice(0, 3).map((q, i) => (
                <div key={i} className="border border-[#E0DFDB] p-3 bg-[#F7F7F5]">
                  <div className="flex items-center gap-1.5 mb-1.5"><span className="font-mono text-[10px] text-[#5C5C59]">Q{i+1}</span><span className="badge badge-navy text-[9px]">{q.type}</span><span className="text-[10px] text-[#5C5C59] font-mono">{q.points}pts</span></div>
                  <p className="text-xs text-[#111110] line-clamp-2">{q.text}</p>
                  {q.type === "MCQ" && q.options?.slice(0,2).map((o: any) => <div key={o.id} className="mt-1 text-[10px] text-[#5C5C59] flex gap-1"><span className="font-mono uppercase">{o.id}.</span><span>{o.text}</span></div>)}
                </div>
              ))}
              {questions.length > 3 && <p className="text-[10px] text-[#5C5C59] text-center">+{questions.length-3} more questions</p>}
              {questions.length === 0 && <p className="text-xs text-[#C5C5C0] italic text-center py-4">Add questions to see preview</p>}
            </div>
          </>
        ) : <p className="text-xs text-[#C5C5C0] italic text-center py-8">Fill in details to see preview</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <header className="bg-white border-b border-[#E0DFDB]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/teacher" className="text-[#5C5C59] hover:text-[#111110]"><ArrowLeft className="w-4 h-4" strokeWidth={1.5}/></Link>
            <span className="font-heading font-semibold text-sm text-[#111110]">{isEdit ? "Edit Test" : "Create Test"}</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#5C5C59]">
            {[1,2,3].map(s => (
              <div key={s} className={`flex items-center gap-1.5 ${step===s?"text-[#1A2E44] font-medium":step>s?"text-green-600":""}`}>
                <div className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono border rounded-sm ${step===s?"border-[#1A2E44] bg-[#1A2E44] text-white":step>s?"border-green-500 bg-green-500 text-white":"border-[#E0DFDB]"}`}>
                  {step>s?<Check className="w-3 h-3"/>:s}
                </div>
                {s===1?"Details":s===2?"Questions":"Review"}
              </div>
            ))}
          </div>
          <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-sm transition-colors ${showPreview?"bg-[#1A2E44] text-white border-[#1A2E44]":"border-[#E0DFDB] text-[#5C5C59] hover:border-[#1A2E44]"}`}>
            <Eye className="w-3.5 h-3.5" strokeWidth={1.5}/> Preview
          </button>
        </div>
      </header>

      <div className={`max-w-7xl mx-auto px-6 py-8 ${showPreview ? "grid grid-cols-[1fr_320px] gap-6" : ""}`}>
        <div>
          {/* STEP 1 */}
          {step === 1 && (
            <div className="max-w-3xl space-y-6">
              <div>
                <label className="label">Test Title *</label>
                <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. JavaScript Fundamentals Quiz" className="input-base" maxLength={200}/>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the test..." rows={3} className="w-full bg-white border border-[#E0DFDB] rounded-sm p-3 text-sm focus:ring-1 focus:ring-[#1A2E44] focus:border-[#1A2E44] outline-none resize-none" maxLength={2000}/>
                <span className="text-xs text-[#5C5C59] text-right block mt-1">{description.length}/2000</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Duration (minutes) *</label>
                  <input type="number" value={duration} onChange={e=>setDuration(Number(e.target.value))} min={1} max={300} className="input-base"/>
                </div>
                <div>
                  <label className="label">Category</label>
                  <select value={category} onChange={e=>setCategory(e.target.value)} className="input-base">
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label mb-2">Access Type</label>
                <div className="space-y-2">
                  {[["PUBLIC","Anyone with the link can attempt"],["INVITE_ONLY","Only users with invite code"],["PASSWORD_PROTECTED","Requires password to start"]].map(([v,d])=>(
                    <label key={v} className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${accessType===v?"border-[#1A2E44] bg-white":"border-[#E0DFDB] bg-[#F7F7F5] hover:bg-white"}`}>
                      <input type="radio" name="access" value={v} checked={accessType===v} onChange={()=>setAccessType(v)} className="accent-[#1A2E44]"/>
                      <div><span className="text-sm font-medium text-[#111110]">{v.replace(/_/g," ")}</span><p className="text-xs text-[#5C5C59]">{d}</p></div>
                    </label>
                  ))}
                </div>
                {accessType==="PASSWORD_PROTECTED"&&<div className="mt-3"><label className="label">Test Password *</label><input value={testPassword} onChange={e=>setTestPassword(e.target.value)} placeholder="Enter test password" className="input-base"/></div>}
              </div>
              <div className="bg-white border border-[#E0DFDB] p-5">
                <p className="text-xs font-medium text-[#5C5C59] uppercase tracking-wider mb-3">Advanced Settings</p>
                <div className="space-y-3">
                  {[["allow_multiple_attempts","Allow multiple attempts"],["show_results_immediately","Show results after submission"],["randomize_questions","Randomize question order"],["negative_marking","Enable negative marking for MCQs"],["ai_grading","AI-assisted subjective grading (Gemini)"]].map(([k,l])=>(
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-sm text-[#111110]">{l}</span>
                      <button onClick={()=>setSettings(s=>({...s,[k]:!s[k as keyof typeof s]}))} className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${settings[k as keyof typeof settings]?"bg-[#1A2E44]":"bg-[#E0DFDB]"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${settings[k as keyof typeof settings]?"translate-x-5":"translate-x-0.5"}`}/>
                      </button>
                    </div>
                  ))}
                  {settings.negative_marking && (
                    <div className="pl-4 border-l-2 border-[#E0DFDB]">
                      <label className="label">Penalty per wrong MCQ answer (fraction of points)</label>
                      <div className="flex items-center gap-3">
                        <input type="number" value={settings.negative_marks_value} onChange={e=>setSettings(s=>({...s,negative_marks_value:Number(e.target.value)}))} min={0.1} max={1} step={0.05} className="input-base h-9 w-28"/>
                        <span className="text-xs text-[#5C5C59]">e.g. 0.25 = −¼ point per wrong answer</span>
                      </div>
                    </div>
                  )}
                  {settings.ai_grading && (
                    <div className="pl-4 border-l-2 border-purple-200 bg-purple-50 p-3 rounded-sm">
                      <p className="text-xs text-purple-700">
                        🤖 <strong>AI Grading enabled</strong> — Gemini will evaluate subjective answers.
                        Score = 40% keyword matching + 60% AI assessment. Requires GEMINI_API_KEY.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Link href="/teacher"><button className="btn-outline">Cancel</button></Link>
                <button onClick={saveStep1} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving?<Loader2 className="w-4 h-4 animate-spin"/>:null} Next: Questions <ArrowRight className="w-4 h-4" strokeWidth={1.5}/>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div><h2 className="font-heading text-lg font-bold text-[#111110]">Questions ({questions.length})</h2><p className="text-xs text-[#5C5C59]">Total: {totalPoints} points</p></div>
                <div className="flex gap-2">
                  {["MCQ","SHORT_ANSWER","LONG_ANSWER"].map(t=>(
                    <button key={t} onClick={()=>openAddQ(t)} className="btn-outline flex items-center gap-1 text-xs py-2">
                      <Plus className="w-3.5 h-3.5" strokeWidth={1.5}/>{t==="MCQ"?"MCQ":t==="SHORT_ANSWER"?"Short":"Long"}
                    </button>
                  ))}
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="py-16 text-center bg-white border border-[#E0DFDB]">
                  <FileText className="w-8 h-8 mx-auto mb-3 text-[#E0DFDB]" strokeWidth={1.5}/>
                  <p className="text-sm text-[#5C5C59] mb-3">No questions added yet</p>
                  <button onClick={()=>openAddQ("MCQ")} className="btn-primary">Add First Question</button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={questions.map(q=>q.tempId||q.id||"x")} strategy={verticalListSortingStrategy}>
                    <div className="border border-[#E0DFDB]">
                      {questions.map((q,i)=>(
                        <SortableQuestion key={q.tempId||q.id||i} q={q} i={i} onEdit={()=>openEditQ(i)} onDelete={()=>deleteQuestion(i)}/>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <div className="flex justify-between mt-6">
                <button onClick={()=>setStep(1)} className="btn-outline flex items-center gap-2"><ArrowLeft className="w-4 h-4" strokeWidth={1.5}/>Previous</button>
                <button onClick={()=>setStep(3)} className="btn-primary flex items-center gap-2">
                  Next: Review <ArrowRight className="w-4 h-4" strokeWidth={1.5}/>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="max-w-3xl">
              <h2 className="font-heading text-lg font-bold text-[#111110] mb-6">Review & Publish</h2>
              <div className="bg-white border border-[#E0DFDB] p-6 mb-6">
                <h3 className="font-heading font-semibold text-[#111110] mb-2">{title}</h3>
                <p className="text-sm text-[#5C5C59] mb-4">{description || "No description"}</p>
                <div className="grid grid-cols-3 gap-px bg-[#E0DFDB] border border-[#E0DFDB]">
                  {[[duration+" min","Duration"],[questions.length,"Questions"],[totalPoints,"Total Points"]].map(([v,l])=>(
                    <div key={String(l)} className="bg-[#F7F7F5] p-4 text-center">
                      <div className="font-mono text-xl font-bold text-[#111110]">{v}</div>
                      <div className="text-xs text-[#5C5C59]">{l}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-[#5C5C59]">Access Type</span><span className="font-medium text-[#111110]">{accessType.replace(/_/g," ")}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#5C5C59]">Category</span><span className="font-medium text-[#111110]">{category}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#5C5C59]">MCQ Questions</span><span className="font-mono">{questions.filter(q=>q.type==="MCQ").length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#5C5C59]">Subjective Questions</span><span className="font-mono">{questions.filter(q=>q.type!=="MCQ").length}</span></div>
                </div>
              </div>
              {questions.length === 0 && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-sm">⚠️ Add at least one question before publishing</div>}
              <div className="flex justify-between">
                <button onClick={()=>setStep(2)} className="btn-outline flex items-center gap-2"><ArrowLeft className="w-4 h-4" strokeWidth={1.5}/>Back</button>
                <div className="flex gap-3">
                  <button onClick={()=>router.push("/teacher")} className="btn-outline">Save as Draft</button>
                  <button onClick={publishTest} disabled={questions.length===0} className="btn-primary disabled:opacity-40">Publish Test</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview */}
        {showPreview && <div className="sticky top-20 h-[calc(100vh-8rem)]"><PreviewPanel/></div>}
      </div>

      {/* Question Modal */}
      {editingQ && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-[#E0DFDB] w-full max-w-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0DFDB]">
              <h2 className="font-heading font-semibold text-[#111110]">{editingIdx>=0?"Edit":"Add"} {editingQ.type==="MCQ"?"MCQ":"Subjective"} Question</h2>
              <button onClick={()=>setEditingQ(null)} className="text-[#5C5C59] hover:text-[#111110]"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {editingQ.type !== "MCQ" && (
                <div className="flex gap-2">
                  {["SHORT_ANSWER","LONG_ANSWER"].map(t=>(
                    <button key={t} onClick={()=>setEditingQ(prev=>prev?{...prev,type:t}:prev)} className={`px-3 py-1.5 text-xs border rounded-sm transition-colors ${editingQ.type===t?"border-[#1A2E44] bg-[#1A2E44] text-white":"border-[#E0DFDB] text-[#5C5C59] hover:border-[#1A2E44]"}`}>
                      {t==="SHORT_ANSWER"?"Short Answer (500 chars)":"Long Answer (5000 chars)"}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Question Text *</label>
                  <div className="flex gap-2">
                    <button onClick={voiceActive?()=>{recognitionRef.current?.stop();}:startVoice} className={`flex items-center gap-1 text-xs px-2 py-1 border rounded-sm transition-colors ${voiceActive?"bg-red-50 border-red-300 text-red-600 animate-pulse":"border-[#E0DFDB] text-[#5C5C59] hover:border-[#1A2E44]"}`}>
                      {voiceActive?<MicOff className="w-3 h-3"/>:<Mic className="w-3 h-3"/>}{voiceActive?"Stop":"Voice"}
                    </button>
                    <button onClick={enhanceWithAI} disabled={aiLoading} className="flex items-center gap-1 text-xs px-2 py-1 border border-[#E0DFDB] text-[#5C5C59] hover:border-[#1A2E44] rounded-sm transition-colors disabled:opacity-50">
                      {aiLoading?<Loader2 className="w-3 h-3 animate-spin"/>:<Sparkles className="w-3 h-3"/>}Enhance
                    </button>
                  </div>
                </div>
                <textarea value={editingQ.text} onChange={e=>setEditingQ(prev=>prev?{...prev,text:e.target.value}:prev)} placeholder="Enter your question..." rows={3} className="w-full bg-white border border-[#E0DFDB] rounded-sm p-3 text-sm focus:ring-1 focus:ring-[#1A2E44] focus:border-[#1A2E44] outline-none resize-none"/>
              </div>

              {editingQ.type === "MCQ" && (
                <div>
                  <label className="label">Options (select correct answer)</label>
                  <div className="space-y-2">
                    {editingQ.options.map((opt,i)=>(
                      <div key={opt.id} className="flex items-center gap-2">
                        <input type="radio" name="correct" checked={editingQ.correctOption===opt.id} onChange={()=>setEditingQ(prev=>prev?{...prev,correctOption:opt.id}:prev)} className="accent-[#1A2E44] flex-shrink-0"/>
                        <span className="font-mono text-xs w-5 text-[#5C5C59]">{opt.id.toUpperCase()}</span>
                        <input value={opt.text} onChange={e=>{const ops=[...editingQ.options];ops[i]={...ops[i],text:e.target.value};setEditingQ(prev=>prev?{...prev,options:ops}:prev);}} placeholder={`Option ${opt.id.toUpperCase()}`} className="input-base h-9 flex-1"/>
                        {editingQ.options.length>2&&<button onClick={()=>{const ops=editingQ.options.filter((_,oi)=>oi!==i);setEditingQ(prev=>prev?{...prev,options:ops,correctOption:prev.correctOption===opt.id?"":prev.correctOption}:prev);}} className="text-[#D63229]"><Trash2 className="w-3.5 h-3.5"/></button>}
                      </div>
                    ))}
                  </div>
                  {editingQ.options.length<6&&<button onClick={()=>{const id=String.fromCharCode(97+editingQ.options.length);setEditingQ(prev=>prev?{...prev,options:[...prev.options,{id,text:""}]}:prev);}} className="mt-2 text-xs text-[#5C5C59] hover:text-[#111110] flex items-center gap-1"><Plus className="w-3 h-3"/>Add Option</button>}
                </div>
              )}

              {editingQ.type !== "MCQ" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label mb-0">Scoring Keywords *</label>
                    <button onClick={generateKeywordsWithAI} disabled={aiLoading} className="flex items-center gap-1 text-xs px-2 py-1 border border-[#E0DFDB] text-[#5C5C59] hover:border-[#1A2E44] rounded-sm transition-colors disabled:opacity-50">
                      {aiLoading?<Loader2 className="w-3 h-3 animate-spin"/>:<Sparkles className="w-3 h-3"/>}AI Generate
                    </button>
                  </div>
                  {editingQ.keywords.length > 0 && (
                    <div className="space-y-1 mb-2 bg-[#F7F7F5] border border-[#E0DFDB] p-2">
                      {editingQ.keywords.map((kw,i)=>(
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 text-[#111110]">{kw.keyword}</span>
                          <span className="font-mono text-xs text-[#5C5C59]">w:{kw.weight}</span>
                          <button onClick={()=>setEditingQ(prev=>prev?{...prev,keywords:prev.keywords.filter((_,ki)=>ki!==i)}:prev)} className="text-[#D63229]"><X className="w-3.5 h-3.5"/></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={newKw} onChange={e=>setNewKw(e.target.value)} placeholder="Keyword" className="input-base h-9 flex-1"/>
                    <input type="number" value={newKwWeight} onChange={e=>setNewKwWeight(Number(e.target.value))} min={0.1} max={1} step={0.1} className="input-base h-9 w-20"/>
                    <button onClick={()=>{if(newKw.trim()){setEditingQ(prev=>prev?{...prev,keywords:[...prev.keywords,{keyword:newKw.trim(),weight:newKwWeight}]}:prev);setNewKw("");}}} className="btn-outline h-9 px-3"><Plus className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Points *</label><input type="number" value={editingQ.points} onChange={e=>setEditingQ(prev=>prev?{...prev,points:Number(e.target.value)}:prev)} min={0.5} step={0.5} className="input-base h-9"/></div>
                <div>
                  <label className="label">Tags</label>
                  <div className="flex gap-1">
                    <input value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(newTag.trim()&&!editingQ.tags.includes(newTag.trim())){setEditingQ(prev=>prev?{...prev,tags:[...prev.tags,newTag.trim()]}:prev);setNewTag("");}}}} placeholder="Add tag" className="input-base h-9 flex-1"/>
                    <button onClick={()=>{if(newTag.trim()&&!editingQ.tags.includes(newTag.trim())){setEditingQ(prev=>prev?{...prev,tags:[...prev.tags,newTag.trim()]}:prev);setNewTag("");}}} className="btn-outline h-9 px-2"><Plus className="w-3.5 h-3.5"/></button>
                  </div>
                  {editingQ.tags.length>0&&<div className="flex flex-wrap gap-1 mt-1">{editingQ.tags.map(t=><span key={t} onClick={()=>setEditingQ(prev=>prev?{...prev,tags:prev.tags.filter(x=>x!==t)}:prev)} className="text-[10px] px-2 py-0.5 bg-[#F7F7F5] border border-[#E0DFDB] text-[#5C5C59] cursor-pointer hover:border-[#D63229] hover:text-[#D63229]">{t} ×</span>)}</div>}
                </div>
              </div>
              <div><label className="label">Explanation (shown after attempt)</label><textarea value={editingQ.explanation} onChange={e=>setEditingQ(prev=>prev?{...prev,explanation:e.target.value}:prev)} placeholder="Optional explanation..." rows={2} className="w-full bg-white border border-[#E0DFDB] rounded-sm p-3 text-sm focus:ring-1 focus:ring-[#1A2E44] focus:border-[#1A2E44] outline-none resize-none"/></div>
              {editingQ.type !== "MCQ" && <div><label className="label">Model Answer (teacher reference)</label><textarea value={editingQ.modelAnswer} onChange={e=>setEditingQ(prev=>prev?{...prev,modelAnswer:e.target.value}:prev)} placeholder="Optional model answer..." rows={2} className="w-full bg-white border border-[#E0DFDB] rounded-sm p-3 text-sm focus:ring-1 focus:ring-[#1A2E44] focus:border-[#1A2E44] outline-none resize-none"/></div>}
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-[#E0DFDB]">
              <button onClick={()=>setEditingQ(null)} className="btn-outline">Cancel</button>
              <button onClick={saveQuestion} disabled={qLoading} className="btn-primary flex items-center gap-2">
                {qLoading?<Loader2 className="w-4 h-4 animate-spin"/>:null}{editingIdx>=0?"Update":"Add"} Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
