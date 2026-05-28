import { useState, useEffect, useCallback } from "react";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, FileUp, Loader2, Sparkles, FileText, X, CheckCircle2, AlertCircle, Clock, Download, SlidersHorizontal, Plus, Trash2, Users, FileDown, Combine, Scissors } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { processFile, countWords, isArchiveFile, extractFilesFromArchive } from "@/lib/file-processors";
import { Slider } from "@/components/ui/slider";
import { TIERS } from "@/lib/stripe-tiers";
import ReactMarkdown from "react-markdown";
import { exportSinglePDF, exportBatchPDF } from "@/lib/pdf-report";
import { RUBRIC_PRESETS, type RubricCriterion } from "@/lib/rubric-presets";
import SchoolLogoUpload from "@/components/SchoolLogoUpload";

interface BatchItem {
  id: string;
  fileName: string;
  studentName: string;
  content: string;
  wordCount: number;
  status: "pending" | "grading" | "done" | "error";
  essayId?: string;
  score?: number | null;
  feedback?: string | null;
  error?: string;
  mergedFrom?: { fileName: string; content: string }[];
}

/**
 * Extract student name from a file name.
 * Strips extension, removes common suffixes like "essay", "作文", "composition",
 * then converts underscores/hyphens to spaces and title-cases.
 */
function extractStudentName(fileName: string): string {
  // Remove extension
  let name = fileName.replace(/\.[^.]+$/, "");
  // Remove common essay-related suffixes/prefixes (case-insensitive)
  name = name.replace(/[-_ ]*(essay|composition|作文|文章|assignment|homework|draft|final|v\d+)[-_ ]*/gi, " ");
  // Remove trailing/leading numbers that look like IDs (e.g. "001_John" → "John", but keep "John 3" → "John")
  name = name.replace(/^[\d]+[-_ ]+/, "").replace(/[-_ ]+[\d]+$/, "");
  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]+/g, " ").trim();
  // Title case
  name = name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return name || fileName.replace(/\.[^.]+$/, "");
}


const ACCEPTED_TYPES = ".txt,.md,.pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tiff,.zip,.7z";

const GRADE_LEVELS = [
  { value: "Elementary", key: "elementary" },
  { value: "Middle School", key: "middleSchool" },
  { value: "High School", key: "highSchool" },
  { value: "Undergraduate", key: "undergraduate" },
  { value: "Graduate", key: "graduate" },
];

const CONCURRENCY = 3;

interface RosterStudent {
  id: string;
  student_name: string;
  student_id: string | null;
}

interface RosterClass {
  id: string;
  name: string;
  students: RosterStudent[];
}

/**
 * Fuzzy match: normalize both strings (lowercase, remove spaces/punctuation),
 * then check if one contains the other.
 */
function fuzzyMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-.,]/g, "");
  const na = normalize(a);
  const nb = normalize(b);
  return na.includes(nb) || nb.includes(na);
}

function matchStudentToRoster(extractedName: string, roster: RosterStudent[]): RosterStudent | null {
  // Exact match first
  const exact = roster.find((s) => s.student_name.toLowerCase() === extractedName.toLowerCase());
  if (exact) return exact;
  // Fuzzy match
  const fuzzy = roster.find((s) => fuzzyMatch(extractedName, s.student_name));
  return fuzzy || null;
}

const BatchGrade = () => {
  const { user, loading, tier, subscribed, reportCredits, refreshReportCredits } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [items, setItems] = useState<BatchItem[]>([]);
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [processing, setProcessing] = useState(false);
  const [grading, setGrading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [rubric, setRubric] = useState<RubricCriterion[]>(RUBRIC_PRESETS.custom.criteria);
  const [showRubric, setShowRubric] = useState(false);
  const [rubricPreset, setRubricPreset] = useState("custom");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Class roster state
  const [rosterClasses, setRosterClasses] = useState<RosterClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");


  const tierInfo = TIERS[tier];
  const remainingFreeQuota = tierInfo.essayLimit === Infinity ? Infinity : Math.max(0, tierInfo.essayLimit - monthlyCount);
  const remainingQuota = tierInfo.essayLimit === Infinity ? Infinity : remainingFreeQuota + reportCredits;

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMonthlyCount();
      fetchRosterClasses();
    }
  }, [user]);

  const fetchMonthlyCount = async () => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count } = await supabase
      .from("essays")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth);
    setMonthlyCount(count ?? 0);
  };

  const fetchRosterClasses = async () => {
    if (!user) return;
    const { data: classData } = await supabase
      .from("classes")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (!classData || classData.length === 0) return;
    const classIds = classData.map((c) => c.id);
    const { data: studentData } = await supabase
      .from("class_students")
      .select("*")
      .in("class_id", classIds)
      .order("student_name");
    setRosterClasses(
      classData.map((c) => ({
        id: c.id,
        name: c.name,
        students: (studentData || []).filter((s) => s.class_id === c.id),
      }))
    );
  };

  // When class selection changes, re-match all items
  const selectedRoster = rosterClasses.find((c) => c.id === selectedClassId);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = rosterClasses.find((c) => c.id === classId);
    if (!cls) return;
    setItems((prev) =>
      prev.map((item) => {
        const matched = matchStudentToRoster(item.studentName, cls.students);
        return matched ? { ...item, studentName: matched.student_name } : item;
      })
    );
  };

  const applyPreset = (key: string) => {
    setRubricPreset(key);
    const preset = RUBRIC_PRESETS[key];
    if (preset) {
      setRubric([...preset.criteria]);
      setShowRubric(true);
    }
  };

  const addCriterion = () => setRubric([...rubric, { name: "", weight: 10, description: "" }]);
  const removeCriterion = (i: number) => setRubric(rubric.filter((_, idx) => idx !== i));
  const updateCriterion = (i: number, field: keyof RubricCriterion, value: string | number) =>
    setRubric(rubric.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  const totalWeight = rubric.reduce((s, c) => s + c.weight, 0);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      // Flatten archives: extract files from .zip and .7z first
      const flatFiles: File[] = [];
      for (const file of files) {
        if (isArchiveFile(file)) {
          try {
            const extracted = await extractFilesFromArchive(file);
            flatFiles.push(...extracted);
            toast.info(`${file.name}: ${extracted.length} ${t("batch.filesExtracted")}`);
          } catch {
            toast.error(`${t("batch.fileError")}: ${file.name}`);
          }
        } else {
          flatFiles.push(file);
        }
      }

      const newItems: BatchItem[] = [];
      for (const file of flatFiles) {
        try {
          const text = await processFile(file);
          if (text.trim()) {
            let studentName = extractStudentName(file.name);
            // If a class roster is selected, try to match
            if (selectedRoster) {
              const matched = matchStudentToRoster(studentName, selectedRoster.students);
              if (matched) studentName = matched.student_name;
            }
            newItems.push({
              id: crypto.randomUUID(),
              fileName: file.name,
              studentName,
              content: text.trim(),
              wordCount: countWords(text),
              status: "pending",
            });
          }
        } catch {
          toast.error(`${t("batch.fileError")}: ${file.name}`);
        }
      }
      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems]);
        toast.success(t("batch.filesAdded", { count: newItems.length }));
      }
    } finally {
      setProcessing(false);
    }
  }, [t, selectedRoster]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFilesSelected(Array.from(e.dataTransfer.files));
  }, [handleFilesSelected]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mergeSelected = () => {
    if (selectedIds.size < 2) {
      toast.warning(t("batch.selectAtLeastTwo"));
      return;
    }
    const selected = items.filter((i) => selectedIds.has(i.id) && i.status === "pending");
    if (selected.length < 2) {
      toast.warning(t("batch.selectAtLeastTwo"));
      return;
    }
    // Sort by filename for natural page order (e.g. page1, page2, page3)
    const sorted = [...selected].sort((a, b) =>
      a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: "base" })
    );
    const mergedContent = sorted.map((s) => s.content).join("\n\n");
    const mergedFileName = `${sorted[0].fileName.replace(/\.[^.]+$/, "")} (+${sorted.length - 1})`;
    const merged: BatchItem = {
      id: crypto.randomUUID(),
      fileName: mergedFileName,
      studentName: sorted[0].studentName,
      content: mergedContent,
      wordCount: countWords(mergedContent),
      status: "pending",
      mergedFrom: sorted.map((s) => ({ fileName: s.fileName, content: s.content })),
    };
    const firstIdx = items.findIndex((i) => i.id === sorted[0].id);
    setItems((prev) => {
      const filtered = prev.filter((i) => !selectedIds.has(i.id));
      const insertAt = Math.min(firstIdx, filtered.length);
      return [...filtered.slice(0, insertAt), merged, ...filtered.slice(insertAt)];
    });
    setSelectedIds(new Set());
    setSelectMode(false);
    toast.success(t("batch.mergedSuccess", { count: sorted.length }));
  };

  const splitItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item?.mergedFrom) return;
    if (!confirm(t("batch.splitConfirm"))) return;
    const restored: BatchItem[] = item.mergedFrom.map((src) => ({
      id: crypto.randomUUID(),
      fileName: src.fileName,
      studentName: extractStudentName(src.fileName),
      content: src.content,
      wordCount: countWords(src.content),
      status: "pending",
    }));
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      return [...prev.slice(0, idx), ...restored, ...prev.slice(idx + 1)];
    });
  };

  const gradeOne = async (item: BatchItem): Promise<BatchItem> => {
    try {
      // Insert essay
      const { data: essay, error: insertError } = await supabase
        .from("essays")
        .insert({
          user_id: user!.id,
          title: item.fileName.replace(/\.[^.]+$/, ""),
          content: item.content,
          subject: subject || null,
          grade_level: gradeLevel || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const rubricData = showRubric ? rubric.filter((c) => c.name.trim()) : null;
      const presetName = showRubric && rubricPreset !== "custom" ? rubricPreset : null;

      const { data, error } = await supabase.functions.invoke("grade-essay", {
        body: { essayId: essay.id, uiLanguage: i18n.language, rubric: rubricData, rubricPreset: presetName },
      });

      if (error) throw error;

      return { ...item, status: "done", essayId: essay.id, score: data.score, feedback: data.feedback };
    } catch (err: any) {
      return { ...item, status: "error", error: err.message || "Grading failed" };
    }
  };

  const startBatchGrade = async () => {
    const pendingItems = items.filter((i) => i.status === "pending");
    if (pendingItems.length === 0) return;

    const toGrade = remainingQuota === Infinity ? pendingItems : pendingItems.slice(0, remainingQuota);
    if (toGrade.length < pendingItems.length) {
      toast.warning(t("batch.quotaWarning", { count: toGrade.length, total: pendingItems.length }));
    }

    setGrading(true);

    // Mark items as pending
    setItems((prev) =>
      prev.map((i) => (toGrade.find((t) => t.id === i.id) ? { ...i, status: "pending" as const } : i))
    );

    // Process with concurrency limit
    const queue = [...toGrade];
    let completedThisRun = 0;
    const process = async () => {
      while (queue.length > 0) {
        const item = queue.shift()!;
        // Mark as grading
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "grading" } : i)));
        const result = await gradeOne(item);
        const shouldUseCredit = remainingFreeQuota !== Infinity && completedThisRun >= remainingFreeQuota;
        if (result.status === "done" && shouldUseCredit) {
          await (supabase as any).rpc("consume_my_report_credit");
          await refreshReportCredits();
        }
        if (result.status === "done") completedThisRun += 1;
        setItems((prev) => prev.map((i) => (i.id === item.id ? result : i)));
        setMonthlyCount((c) => c + (result.status === "done" ? 1 : 0));
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, toGrade.length) }, () => process());
    await Promise.all(workers);

    setGrading(false);
    toast.success(t("batch.complete"));
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const gradingCount = items.filter((i) => i.status === "grading").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const totalItems = items.length;
  const progressPercent = totalItems > 0 ? Math.round(((doneCount + errorCount) / totalItems) * 100) : 0;

  const exportCSV = () => {
    const completed = items.filter((i) => i.status === "done");
    if (completed.length === 0) return;
    const headers = ["Student Name", "File Name", "Score", "Word Count"];
    const rows = completed.map((i) => [i.studentName, i.fileName, String(i.score ?? ""), String(i.wordCount)]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-grades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-display font-bold text-lg text-foreground">Compify.Pro</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
              {monthlyCount} / {tierInfo.essayLimit === Infinity ? "∞" : tierInfo.essayLimit} {t("grade.thisMonth")}
            </span>
            {reportCredits > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {reportCredits} {t("grade.reportCredits")}
              </span>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <h1 className="font-display font-bold text-2xl text-foreground mb-1">{t("batch.title")}</h1>
        <p className="text-muted-foreground mb-6">{t("batch.subtitle")}</p>

        {/* Shared Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <Label>{t("grade.subjectLabel")}</Label>
            <Input placeholder={t("grade.subjectPlaceholder")} value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>{t("grade.gradeLevelLabel")}</Label>
            <Select value={gradeLevel} onValueChange={setGradeLevel}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder={t("grade.gradeLevelPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {GRADE_LEVELS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{t(`grade.${g.key}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Class Roster Selector */}
        {rosterClasses.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">{t("roster.selectClass")}</Label>
            </div>
            <Select value={selectedClassId} onValueChange={handleClassChange}>
              <SelectTrigger><SelectValue placeholder={t("roster.noClassSelected")} /></SelectTrigger>
              <SelectContent>
                {rosterClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} ({cls.students.length} {t("batch.studentLabel")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRoster && items.length > 0 && (
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                <span className="text-success">
                  ✓ {t("roster.matched")}: {items.filter((i) => selectedRoster.students.some((s) => s.student_name === i.studentName)).length}
                </span>
                <span className="text-accent">
                  ? {t("roster.unmatched")}: {items.filter((i) => !selectedRoster.students.some((s) => s.student_name === i.studentName)).length}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Rubric */}
        <div className="rounded-xl border border-border bg-card mb-5">
          <button
            type="button"
            onClick={() => setShowRubric(!showRubric)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/30 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{t("grade.customRubric")}</span>
              {showRubric && rubricPreset !== "custom" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {t(RUBRIC_PRESETS[rubricPreset]?.labelKey || "")}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{showRubric ? "▲" : "▼"}</span>
          </button>
          {showRubric && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">{t("grade.rubricPreset")}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(RUBRIC_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        rubricPreset === key
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {t(preset.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              {rubric.map((criterion, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input value={criterion.name} onChange={(e) => { updateCriterion(i, "name", e.target.value); setRubricPreset("custom"); }} placeholder={t("grade.criterionName")} className="h-8 text-sm" />
                      <span className="text-xs font-bold text-primary w-8 text-right shrink-0">{criterion.weight}%</span>
                    </div>
                    <Slider value={[criterion.weight]} onValueChange={([v]) => { updateCriterion(i, "weight", v); setRubricPreset("custom"); }} min={5} max={50} step={5} className="w-full" />
                    <Input value={criterion.description} onChange={(e) => { updateCriterion(i, "description", e.target.value); setRubricPreset("custom"); }} placeholder={t("grade.criterionDesc")} className="h-7 text-xs" />
                  </div>
                  <button onClick={() => { removeCriterion(i); setRubricPreset("custom"); }} className="mt-1 p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => { addCriterion(); setRubricPreset("custom"); }} className="gap-1.5 text-xs">
                  <Plus className="h-3 w-3" /> {t("grade.addCriterion")}
                </Button>
                <span className={`text-xs font-medium ${totalWeight === 100 ? "text-success" : "text-destructive"}`}>
                  {t("grade.totalWeight")}: {totalWeight}%{totalWeight !== 100 ? ` (${t("grade.shouldBe100")})` : " ✓"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* School Logo & Report Date */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <SchoolLogoUpload onLogoChange={setLogoDataUrl} />
          <div>
            <Label className="text-xs text-muted-foreground">{t("grade.reportDate")}</Label>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="mt-1 w-40 h-9 text-sm" />
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all mb-5 ${
            dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-muted-foreground/40"
          }`}
        >
          {processing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t("grade.extracting")}</p>
            </div>
          ) : (
            <>
              <FileUp className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">{t("batch.dropMultiple")}</p>
              <p className="text-xs text-muted-foreground mb-2">{t("batch.onePerFile")}</p>
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </>
          )}
        </div>

        {/* File List */}
        {items.length > 0 && (
          <div className="space-y-4 mb-6">
            {/* Progress Bar */}
            {grading && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{t("batch.progress")}</span>
                  <span className="text-sm text-muted-foreground">{doneCount + errorCount} / {totalItems}</span>
                </div>
                <Progress value={progressPercent} className="h-2.5" />
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  {gradingCount > 0 && <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {t("batch.grading", { count: gradingCount })}</span>}
                  {doneCount > 0 && <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {t("batch.done", { count: doneCount })}</span>}
                  {errorCount > 0 && <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> {t("batch.errors", { count: errorCount })}</span>}
                  {pendingCount > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t("batch.queued", { count: pendingCount })}</span>}
                </div>
              </div>
            )}

            {/* Merge Toolbar */}
            {!grading && pendingCount > 1 && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-dashed border-border bg-secondary/20">
                {!selectMode ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} className="gap-1.5">
                      <Combine className="h-3.5 w-3.5" /> {t("batch.selectMode")}
                    </Button>
                    <span className="text-xs text-muted-foreground flex-1">{t("batch.mergeHint")}</span>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={mergeSelected} disabled={selectedIds.size < 2} className="gap-1.5">
                      <Combine className="h-3.5 w-3.5" /> {t("batch.mergeSelected", { count: selectedIds.size })}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }} className="gap-1.5">
                      <X className="h-3.5 w-3.5" /> {t("batch.exitSelectMode")}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Items */}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className={`rounded-xl border bg-card overflow-hidden ${selectMode && selectedIds.has(item.id) ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
                  <div className="w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors">
                    {selectMode && item.status === "pending" && (
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="shrink-0"
                      />
                    )}
                    <button
                      onClick={() => selectMode && item.status === "pending" ? toggleSelect(item.id) : setExpandedId(expandedId === item.id ? null : item.id)}
                      className="flex-1 flex items-center gap-3 text-left min-w-0"
                    >
                      <div className="shrink-0">
                        {item.status === "pending" && (item.mergedFrom ? <Combine className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-muted-foreground" />)}
                        {item.status === "grading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
                        {item.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.fileName} · {t("grade.wordCount", { count: item.wordCount })}</p>
                      </div>
                      {item.score !== null && item.score !== undefined && (
                        <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                          item.score >= 70 ? "bg-success/10 text-success" : item.score >= 50 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                        }`}>
                          {item.score}/100
                        </span>
                      )}
                    </button>
                    {item.status === "pending" && !grading && item.mergedFrom && (
                      <button onClick={(e) => { e.stopPropagation(); splitItem(item.id); }} title={t("batch.split")} className="p-1 text-muted-foreground hover:text-primary">
                        <Scissors className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {item.status === "pending" && !grading && (
                      <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="p-1 text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {expandedId === item.id && item.feedback && (
                    <div className="border-t border-border p-4 prose prose-sm max-w-none bg-secondary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {t("batch.studentLabel")}: {item.studentName}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs h-7"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await exportSinglePDF({
                              studentName: item.studentName,
                              fileName: item.fileName,
                              score: item.score,
                              wordCount: item.wordCount,
                              feedback: item.feedback,
                              subject: subject || undefined,
                              gradeLevel: gradeLevel || undefined,
                            }, { logoDataUrl, locale: i18n.language, reportDate, subscribed });
                          }}
                        >
                          <FileDown className="h-3 w-3" /> {t("batch.downloadPDF")}
                        </Button>
                      </div>
                      <ReactMarkdown>{item.feedback}</ReactMarkdown>
                    </div>
                  )}
                  {expandedId === item.id && item.error && (
                    <div className="border-t border-border p-3 text-sm text-destructive bg-destructive/5">{item.error}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {!grading && pendingCount > 0 && (
                <Button onClick={startBatchGrade} className="gap-2" size="lg">
                  <Sparkles className="h-4 w-4" />
                  {t("batch.gradeAll", { count: Math.min(pendingCount, remainingQuota === Infinity ? pendingCount : remainingQuota) })}
                </Button>
              )}
              {doneCount > 0 && (
                <>
                  <Button variant="outline" onClick={exportCSV} className="gap-2">
                    <Download className="h-4 w-4" /> {t("batch.exportCSV")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const completed = items.filter((i) => i.status === "done" && i.feedback);
                      await exportBatchPDF(
                        completed.map((i) => ({
                          studentName: i.studentName,
                          fileName: i.fileName,
                          score: i.score,
                          wordCount: i.wordCount,
                          feedback: i.feedback,
                          subject: subject || undefined,
                          gradeLevel: gradeLevel || undefined,
                        })),
                        { logoDataUrl, locale: i18n.language, reportDate, subscribed }
                      );
                    }}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" /> {t("batch.exportPDF")}
                  </Button>
                </>
              )}
              {!grading && items.length > 0 && (
                <Button variant="ghost" onClick={() => setItems([])} className="gap-2 text-muted-foreground">
                  <X className="h-4 w-4" /> {t("batch.clearAll")}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchGrade;
