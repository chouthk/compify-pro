import { useState, useEffect, useCallback, useRef } from "react";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, Sparkles, FileUp, X, Download, Edit3, Save, Lock, Plus, Trash2, SlidersHorizontal, FileDown, ShieldCheck, Wand2, ClipboardCheck, BrainCircuit, Gauge, Rows3, ScanLine, Bookmark, BookmarkPlus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { processFiles, countWords } from "@/lib/file-processors";
import { exportSinglePDF } from "@/lib/pdf-report";
import { Slider } from "@/components/ui/slider";
import { TIERS } from "@/lib/stripe-tiers";
import { RUBRIC_PRESETS, type RubricCriterion } from "@/lib/rubric-presets";
import SchoolLogoUpload from "@/components/SchoolLogoUpload";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

interface Essay {
  id: string;
  title: string;
  content: string;
  subject: string | null;
  grade_level: string | null;
  feedback: string | null;
  score: number | null;
  status: string;
  created_at: string;
}


const DEFAULT_RUBRIC = RUBRIC_PRESETS.custom.criteria;

const ACCEPTED_TYPES = ".txt,.md,.pdf,.docx,.doc,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tiff,.zip";

const GRADE_LEVELS = [
  { value: "Elementary", key: "elementary" },
  { value: "Middle School", key: "middleSchool" },
  { value: "High School", key: "highSchool" },
  { value: "Undergraduate", key: "undergraduate" },
  { value: "Graduate", key: "graduate" },
];

const ABILITY_KEYS = ["content", "language", "organization"] as const;

type AbilityKey = (typeof ABILITY_KEYS)[number];

const extractDimensionScore = (feedback: string | null | undefined, labels: string[], fallback: number) => {
  if (!feedback) return fallback;
  for (const label of labels) {
    const pattern = new RegExp(`${label}[^\\d]{0,24}(\\d{1,3})(?:\\s*[/／]\\s*100)?`, "i");
    const match = feedback.match(pattern);
    if (match) return Math.min(100, Math.max(0, Number(match[1])));
  }
  return fallback;
};

const buildAbilityScores = (essay: Essay) => {
  const base = essay.score ?? 60;
  const wordCount = countWords(essay.content);
  const uniqueRatio = essay.content
    ? new Set(essay.content.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).size / Math.max(1, wordCount)
    : 0.45;
  const languageFallback = Math.round(base * 0.86 + Math.min(12, uniqueRatio * 18));
  const organizationFallback = Math.round(base * 0.9 + (essay.content.split(/\n\s*\n/).length >= 3 ? 8 : 2));

  return {
    content: extractDimensionScore(essay.feedback, ["Content", "內容", "立意", "取材"], Math.min(100, Math.round(base + 4))),
    language: extractDimensionScore(essay.feedback, ["Language", "語言", "詞彙", "文句", "語法"], Math.min(100, languageFallback)),
    organization: extractDimensionScore(essay.feedback, ["Organization", "組織", "結構", "章法", "段落"], Math.min(100, organizationFallback)),
  } satisfies Record<AbilityKey, number>;
};

const GradeEssay = () => {
  const { user, loading, tier, subscribed, reportCredits, refreshReportCredits } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [studentLevel, setStudentLevel] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentEssay, setCurrentEssay] = useState<Essay | null>(null);
  const [aiDetectionLevel, setAiDetectionLevel] = useState<string | null>(null);
  const [history, setHistory] = useState<Essay[]>([]);
  const [view, setView] = useState<"form" | "result">("form");
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [rubric, setRubric] = useState<RubricCriterion[]>(DEFAULT_RUBRIC);
  const [showRubric, setShowRubric] = useState(false);
  const [rubricPreset, setRubricPreset] = useState<string>("custom");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [examinerMode, setExaminerMode] = useState(false);
  const [upgradeSuggestion, setUpgradeSuggestion] = useState("");
  const [generatingUpgrade, setGeneratingUpgrade] = useState(false);

  // Saved configuration presets (stored in localStorage per user)
  interface SavedConfig {
    id: string;
    name: string;
    subject: string;
    gradeLevel: string;
    studentLevel: string;
    examinerMode: boolean;
    rubric: RubricCriterion[];
    rubricPreset: string;
    showRubric: boolean;
  }
  const configStorageKey = user ? `compify_grade_configs_${user.id}` : "compify_grade_configs";
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newConfigName, setNewConfigName] = useState("");

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(configStorageKey);
      if (raw) setSavedConfigs(JSON.parse(raw));
    } catch {/* ignore */}
  }, [user]);

  const persistConfigs = (configs: SavedConfig[]) => {
    setSavedConfigs(configs);
    try { localStorage.setItem(configStorageKey, JSON.stringify(configs)); } catch {/* ignore */}
  };

  const saveCurrentConfig = () => {
    const name = newConfigName.trim();
    if (!name) {
      toast.error(t("grade.configNameRequired"));
      return;
    }
    const config: SavedConfig = {
      id: crypto.randomUUID(),
      name,
      subject,
      gradeLevel,
      studentLevel,
      examinerMode,
      rubric,
      rubricPreset,
      showRubric,
    };
    persistConfigs([config, ...savedConfigs]);
    setSelectedConfigId(config.id);
    setNewConfigName("");
    setShowSaveDialog(false);
    toast.success(t("grade.configSaved"));
  };

  const applyConfig = (id: string) => {
    setSelectedConfigId(id);
    const cfg = savedConfigs.find((c) => c.id === id);
    if (!cfg) return;
    setSubject(cfg.subject);
    setGradeLevel(cfg.gradeLevel);
    setStudentLevel(cfg.studentLevel);
    setExaminerMode(cfg.examinerMode);
    setRubric(cfg.rubric);
    setRubricPreset(cfg.rubricPreset);
    setShowRubric(cfg.showRubric);
    toast.success(t("grade.configApplied", { name: cfg.name }));
  };

  const deleteConfig = (id: string) => {
    persistConfigs(savedConfigs.filter((c) => c.id !== id));
    if (selectedConfigId === id) setSelectedConfigId("");
    toast.success(t("grade.configDeleted"));
  };

  const applyPreset = (presetKey: string) => {
    setRubricPreset(presetKey);
    const preset = RUBRIC_PRESETS[presetKey];
    if (preset) {
      setRubric([...preset.criteria]);
      setShowRubric(true);
    }
  };

  const tierInfo = TIERS[tier];
  const freeQuotaUsed = tierInfo.essayLimit !== Infinity && monthlyCount >= tierInfo.essayLimit;
  const atLimit = freeQuotaUsed && reportCredits <= 0;
  const longEssayMode = content.length > 9000 || countWords(content) > 1200;

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchMonthlyCount();
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

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("essays")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as Essay[]);
  };

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const { text, fileNames } = await processFiles(files);
      if (!text.trim()) {
        toast.error(t("grade.extractError"));
        return;
      }
      setContent((prev) => (prev ? prev + "\n\n" + text : text));
      setUploadedFiles((prev) => [...prev, ...fileNames]);
      if (!title && fileNames.length === 1) {
        setTitle(fileNames[0].replace(/\.[^.]+$/, ""));
      }
      toast.success(t("grade.extractSuccess", { count: fileNames.length }));
    } catch (err: any) {
      toast.error(err.message || t("grade.extractError"));
    } finally {
      setProcessing(false);
    }
  }, [title, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFilesSelected(files);
  }, [handleFilesSelected]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFilesSelected(files);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error(t("grade.pasteError"));
      return;
    }
    if (atLimit) {
      toast.error(t("grade.limitReached"));
      return;
    }
    setSubmitting(true);
    try {
      const { data: essay, error: insertError } = await supabase
        .from("essays")
        .insert({
          user_id: user!.id,
          title: title || "Untitled Essay",
          content,
          subject: subject || null,
          grade_level: gradeLevel || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const rubricData = showRubric ? rubric.filter(c => c.name.trim()) : null;
      const presetName = showRubric && rubricPreset !== "custom" ? rubricPreset : null;
      const { data, error } = await supabase.functions.invoke("grade-essay", {
        body: { essayId: essay.id, uiLanguage: i18n.language, rubric: rubricData, rubricPreset: presetName, studentLevel: studentLevel || undefined, examinerMode },
      });

      if (error) throw error;

      setCurrentEssay({ ...essay, feedback: data.feedback, score: data.score, status: "completed" } as Essay);
      if (freeQuotaUsed) {
        await (supabase as any).rpc("consume_my_report_credit");
        await refreshReportCredits();
      }
      setAiDetectionLevel(data.aiDetectionLevel || null);
      setUpgradeSuggestion("");
      setView("result");
      setMonthlyCount((c) => c + 1);
      fetchHistory();
      toast.success(t("grade.gradedSuccess"));
    } catch (err: any) {
      toast.error(err.message || "Failed to grade essay");
    } finally {
      setSubmitting(false);
    }
  };

  const viewHistoryItem = (essay: Essay) => {
    setCurrentEssay(essay);
    setView("result");
    setEditing(false);
  };

  const resetForm = () => {
    setView("form");
    setCurrentEssay(null);
    setTitle("");
    setContent("");
    setSubject("");
    setGradeLevel("");
    setStudentLevel("");
    setUploadedFiles([]);
    setEditing(false);
    setAiDetectionLevel(null);
    setUpgradeSuggestion("");
  };

  const addCriterion = () => {
    setRubric([...rubric, { name: "", weight: 10, description: "" }]);
  };

  const removeCriterion = (index: number) => {
    setRubric(rubric.filter((_, i) => i !== index));
  };

  const updateCriterion = (index: number, field: keyof RubricCriterion, value: string | number) => {
    setRubric(rubric.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const totalWeight = rubric.reduce((sum, c) => sum + c.weight, 0);

  const startEditing = () => {
    setEditedFeedback(currentEssay?.feedback || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!currentEssay) return;
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("essays")
        .update({ feedback: editedFeedback })
        .eq("id", currentEssay.id);
      if (error) throw error;
      setCurrentEssay({ ...currentEssay, feedback: editedFeedback });
      setEditing(false);
      toast.success(t("grade.feedbackSaved"));
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingEdit(false);
    }
  };

  const generateUpgradeAdvice = async () => {
    if (!currentEssay) return;
    setGeneratingUpgrade(true);
    try {
      const { data, error } = await supabase.functions.invoke("grade-essay", {
        body: { essayId: currentEssay.id, uiLanguage: i18n.language, mode: "upgrade_advice", examinerMode: true },
      });
      if (error) throw error;
      const advice = data.upgradeSuggestion || data.feedback || "";
      setUpgradeSuggestion(advice);
      setEditedFeedback((prev) => prev || `${currentEssay.feedback || ""}\n\n${advice}`.trim());
      toast.success(t("grade.upgradeGenerated"));
    } catch (err: any) {
      toast.error(err.message || t("grade.upgradeFailed"));
    } finally {
      setGeneratingUpgrade(false);
    }
  };

  const exportPDF = async () => {
    if (!currentEssay) return;
    await exportSinglePDF({
      studentName: currentEssay.title || "Untitled Essay",
      fileName: currentEssay.title || "essay",
      score: currentEssay.score,
      wordCount: countWords(currentEssay.content),
      feedback: currentEssay.feedback,
      subject: currentEssay.subject || undefined,
      gradeLevel: currentEssay.grade_level || undefined,
      abilityScores: buildAbilityScores(currentEssay),
      upgradeSuggestion: upgradeSuggestion || undefined,
    }, { logoDataUrl, locale: i18n.language, reportDate, subscribed });
  };

  const exportDOC = () => {
    if (!currentEssay) return;
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${currentEssay.title || "Essay Report"}</title>
      <style>body{font-family:Calibri,sans-serif;font-size:12pt;line-height:1.6;color:#1a1a1a;}h1{font-size:18pt;border-bottom:2pt solid #3b82f6;padding-bottom:6pt;}h2{font-size:14pt;color:#1e40af;margin-top:18pt;}h3{font-size:12pt;margin-top:12pt;}.meta{color:#6b7280;font-size:10pt;margin-bottom:18pt;}.score{background:#3b82f6;color:white;padding:6pt 12pt;font-size:14pt;font-weight:bold;display:inline-block;}</style>
      </head><body>
      <h1>${currentEssay.title || "Essay Report"}</h1>
      <p class="meta">${currentEssay.subject ? `${currentEssay.subject} · ` : ""}${currentEssay.grade_level ? `${currentEssay.grade_level} · ` : ""}${new Date(currentEssay.created_at).toLocaleDateString()}</p>
      ${currentEssay.score !== null ? `<p class="score">${t("grade.score", { score: currentEssay.score })}</p>` : ""}
      <hr/>
      ${markdownToHtml(currentEssay.feedback || "")}
      <hr/><p style="color:#9ca3af;font-size:8pt;">Generated by Compify.Pro</p>
      </body></html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEssay.title || "essay-report"}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return t("grade.excellent");
    if (score >= 70) return t("grade.good");
    if (score >= 50) return t("grade.needsImprovement");
    return t("grade.revisionNeeded");
  };

  const abilityScores = currentEssay ? buildAbilityScores(currentEssay) : null;
  const abilityChartData = abilityScores
    ? ABILITY_KEYS.map((key) => ({ metric: t(`grade.ability_${key}`), score: abilityScores[key] }))
    : [];

  if (loading) return null;

  return (
    <div className="min-h-screen bg-background">
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
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - History */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <h3 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">
              {t("grade.recentEssays")}
            </h3>
            <div className="space-y-2">
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("grade.noEssays")}</p>
              )}
              {history.map((essay) => (
                <button
                  key={essay.id}
                  onClick={() => viewHistoryItem(essay)}
                  className="w-full text-left p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {essay.title || "Untitled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {essay.score !== null && (
                      <span className={`text-xs font-bold ${essay.score >= 70 ? "text-success" : essay.score >= 50 ? "text-accent" : "text-destructive"}`}>
                        {essay.score}/100
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(essay.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {view === "form" ? (
              <div className="max-w-2xl">
                <h1 className="font-display font-bold text-2xl text-foreground mb-1">{t("grade.title")}</h1>
                <p className="text-muted-foreground mb-6">{t("grade.subtitle")}</p>

                {/* Limit warning */}
                {atLimit && (
                  <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                    <Lock className="h-5 w-5 text-destructive shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-destructive">{t("grade.limitReached")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("grade.limitReachedDesc")}</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => navigate("/#pricing")}>
                      {t("dashboard.upgrade")}
                    </Button>
                  </div>
                )}

                <div className="space-y-5">
                  {/* Saved configurations */}
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-semibold text-foreground">{t("grade.savedConfigs")}</Label>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowSaveDialog((s) => !s)} className="gap-1.5 text-xs">
                        <BookmarkPlus className="h-3.5 w-3.5" /> {t("grade.saveConfig")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{t("grade.savedConfigsHint")}</p>
                    {savedConfigs.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Select value={selectedConfigId} onValueChange={applyConfig}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={t("grade.selectSavedConfig")} />
                          </SelectTrigger>
                          <SelectContent>
                            {savedConfigs.map((cfg) => (
                              <SelectItem key={cfg.id} value={cfg.id}>{cfg.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedConfigId && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => deleteConfig(selectedConfigId)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">{t("grade.noSavedConfigs")}</p>
                    )}
                    {showSaveDialog && (
                      <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
                        <Input
                          placeholder={t("grade.configNamePlaceholder")}
                          value={newConfigName}
                          onChange={(e) => setNewConfigName(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => { setShowSaveDialog(false); setNewConfigName(""); }}>
                            {t("grade.cancel")}
                          </Button>
                          <Button type="button" size="sm" onClick={saveCurrentConfig}>
                            <Save className="h-3.5 w-3.5 mr-1" /> {t("grade.confirmSave")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">{t("grade.titleLabel")}</Label>
                      <Input id="title" placeholder={t("grade.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="subject">{t("grade.subjectLabel")}</Label>
                      <Input id="subject" placeholder={t("grade.subjectPlaceholder")} value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="grade">{t("grade.gradeLevelLabel")}</Label>
                    <Select value={gradeLevel} onValueChange={setGradeLevel}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder={t("grade.gradeLevelPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>{t(`grade.${g.key}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="studentLevel">{t("grade.studentLevelLabel")}</Label>
                    <Select value={studentLevel} onValueChange={setStudentLevel}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder={t("grade.studentLevelPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weak">{t("grade.levelWeak")}</SelectItem>
                        <SelectItem value="average">{t("grade.levelAverage")}</SelectItem>
                        <SelectItem value="strong">{t("grade.levelStrong")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">{t("grade.studentLevelHint")}</p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <Label htmlFor="examinerMode" className="text-sm font-semibold text-foreground">{t("grade.examinerMode")}</Label>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("grade.examinerModeHint")}</p>
                      </div>
                    </div>
                    <Switch id="examinerMode" checked={examinerMode} onCheckedChange={setExaminerMode} />
                  </div>

                  {/* Rubric with Presets */}
                  <div className="rounded-xl border border-border bg-card">
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
                        {/* Preset selector */}
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

                        <p className="text-xs text-muted-foreground">{t("grade.rubricHint")}</p>

                        {rubric.map((criterion, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={criterion.name}
                                  onChange={(e) => { updateCriterion(i, "name", e.target.value); setRubricPreset("custom"); }}
                                  placeholder={t("grade.criterionName")}
                                  className="h-8 text-sm"
                                />
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs font-bold text-primary w-8 text-right">{criterion.weight}%</span>
                                </div>
                              </div>
                              <Slider
                                value={[criterion.weight]}
                                onValueChange={([v]) => { updateCriterion(i, "weight", v); setRubricPreset("custom"); }}
                                min={5}
                                max={50}
                                step={5}
                                className="w-full"
                              />
                              <Input
                                value={criterion.description}
                                onChange={(e) => { updateCriterion(i, "description", e.target.value); setRubricPreset("custom"); }}
                                placeholder={t("grade.criterionDesc")}
                                className="h-7 text-xs"
                              />
                            </div>
                            <button
                              onClick={() => { removeCriterion(i); setRubricPreset("custom"); }}
                              className="mt-1 p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
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

                  {/* Drag & Drop Upload Zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                      dragOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border hover:border-muted-foreground/40"
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
                        <p className="text-sm font-medium text-foreground mb-1">{t("grade.dropFiles")}</p>
                        <p className="text-xs text-muted-foreground mb-4">{t("grade.orBrowse")}</p>
                        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                          {["PDF", "DOCX", "Images (OCR)", "ZIP", "TXT / MD"].map((label, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                              <FileText className="h-3 w-3" /> {label}
                            </span>
                          ))}
                        </div>
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

                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.map((name, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                          <FileText className="h-3 w-3" />
                          {name}
                        </span>
                      ))}
                      <button
                        onClick={() => { setUploadedFiles([]); setContent(""); }}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" /> {t("grade.clear")}
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="content">{t("grade.contentLabel")}</Label>
                    </div>
                    <Textarea
                      id="content"
                      placeholder={t("grade.contentPlaceholder")}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[200px] text-sm leading-relaxed"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {t("grade.wordCount", { count: countWords(content) })}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { icon: BrainCircuit, label: t("grade.qualityAssurance"), value: t("grade.hkWrittenStandard") },
                      { icon: Rows3, label: t("grade.longEssayProcessing"), value: longEssayMode ? t("grade.segmentedModeOn") : t("grade.standardMode") },
                      { icon: ScanLine, label: t("grade.outputCompleteness"), value: t("grade.outputCompletenessDesc") },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <item.icon className="mb-3 h-5 w-5 text-primary" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || processing || !content.trim() || atLimit}
                    className="w-full sm:w-auto gap-2"
                    size="lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("grade.grading")}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {t("grade.gradeButton")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : currentEssay ? (
              <div>
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <div>
                    <h1 className="font-display font-bold text-2xl text-foreground">
                      {currentEssay.title || "Untitled Essay"}
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                      {currentEssay.subject && (
                        <span className="text-sm text-muted-foreground">{currentEssay.subject}</span>
                      )}
                      {currentEssay.grade_level && (
                        <span className="text-sm text-muted-foreground">• {currentEssay.grade_level}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={generateUpgradeAdvice} disabled={generatingUpgrade} className="gap-1.5">
                      {generatingUpgrade ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                      {t("grade.generateUpgrade")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
                      <FileDown className="h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportDOC} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" /> DOC
                    </Button>
                    {!editing ? (
                      <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                        <Edit3 className="h-3.5 w-3.5" /> {t("grade.editFeedback")}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={saveEdit} disabled={savingEdit} className="gap-1.5">
                        {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        {t("grade.saveFeedback")}
                      </Button>
                    )}
                    <Button variant="outline" onClick={resetForm}>{t("grade.newEssay")}</Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-4 mb-4">
                  <SchoolLogoUpload onLogoChange={setLogoDataUrl} />
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("grade.reportDate")}</Label>
                    <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="mt-1 w-40 h-9 text-sm" />
                  </div>
                </div>

                {currentEssay.score !== null && (
                  <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                    <div className="grid gap-0 md:grid-cols-[1fr_1.1fr]">
                      <div className="flex items-center gap-4 p-5">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-display font-bold text-2xl text-primary-foreground ${
                        currentEssay.score >= 70 ? "bg-success" : currentEssay.score >= 50 ? "bg-accent" : "bg-destructive"
                      }`}>
                        {currentEssay.score}
                      </div>
                      <div>
                        <p className="font-display font-bold text-foreground">{t("grade.score", { score: currentEssay.score })}</p>
                        <p className="text-sm text-muted-foreground">
                          {getScoreLabel(currentEssay.score)}
                        </p>
                      </div>
                      {aiDetectionLevel && (
                        <div className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold ${
                          aiDetectionLevel === "high" ? "bg-destructive/15 text-destructive border border-destructive/30" :
                          aiDetectionLevel === "medium" ? "bg-amber-500/15 text-amber-600 border border-amber-500/30" :
                          "bg-green-500/15 text-green-600 border border-green-500/30"
                        }`}>
                          {t("grade.aiDetection")}: {t(`grade.aiLevel_${aiDetectionLevel}`)}
                        </div>
                      )}
                      </div>
                      <div className="border-t border-border bg-secondary/30 p-5 md:border-l md:border-t-0">
                        <div className="flex items-center gap-2 text-primary">
                          <Gauge className="h-4 w-4" />
                          <p className="text-xs font-bold uppercase tracking-wider">{t("grade.processingIntegrity")}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          {currentEssay.content.length > 9000 ? t("grade.processedInSegments") : t("grade.singlePassReviewed")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {upgradeSuggestion && (
                  <div className="mb-6 p-5 rounded-2xl border border-primary/20 bg-primary/5 shadow-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Wand2 className="h-4 w-4 text-primary" />
                      <h2 className="font-display font-bold text-base text-foreground">{t("grade.upgradeTitle")}</h2>
                    </div>
                    <div className="prose prose-sm max-w-none text-foreground">
                      <ReactMarkdown>{upgradeSuggestion}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {abilityScores && (
                  <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">DSE C / L / O</p>
                        <h2 className="font-display font-bold text-lg text-foreground">{t("grade.abilityTitle")}</h2>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t("grade.abilitySubtitle")}</p>
                      </div>
                      <span className="hidden sm:inline-flex rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                        {t("grade.studentProfile")}
                      </span>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] items-center">
                      <div className="h-[260px] sm:h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={abilityChartData} outerRadius="75%">
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                            <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.22} strokeWidth={3} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-3">
                        {ABILITY_KEYS.map((key) => (
                          <div key={key} className="rounded-xl border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div>
                                <p className="font-display font-bold text-foreground">{t(`grade.ability_${key}`)}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{t(`grade.ability_${key}Desc`)}</p>
                              </div>
                              <span className="text-sm font-bold text-primary">{abilityScores[key]}/100</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${abilityScores[key]}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {editing ? (
                  <div className="p-6 rounded-2xl border border-primary/30 bg-card shadow-card">
                    <div className="flex items-center gap-2 mb-3">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      <h2 className="font-display font-bold text-base text-foreground">{t("grade.teacherReview")}</h2>
                    </div>
                    <Textarea
                      value={editedFeedback}
                      onChange={(e) => setEditedFeedback(e.target.value)}
                      className="min-h-[400px] text-sm leading-relaxed font-mono"
                      placeholder="Markdown feedback..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">{t("grade.editHint")}</p>
                  </div>
                ) : currentEssay.feedback ? (
                  <div className="prose prose-sm max-w-none p-6 rounded-2xl border border-border bg-card shadow-card">
                    <ReactMarkdown>{currentEssay.feedback}</ReactMarkdown>
                  </div>
                ) : null}

                {currentEssay.status === "error" && (
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {t("grade.gradingFailed")}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple markdown to HTML converter for export
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^\*\*(.+?)\*\*$/gm, '<p><strong>$1</strong></p>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default GradeEssay;
