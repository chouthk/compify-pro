import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import ReactMarkdown from "react-markdown";
import { Filter, ChevronDown, ChevronUp, Settings2, Download, BookOpen, Sparkles, Loader2, Pencil, Eye, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { exportMarkdownToPDF } from "@/lib/markdown-pdf";
import { exportClassDashboardPDF } from "@/lib/pdf-report";

interface Essay {
  id: string;
  title: string;
  content: string;
  score: number | null;
  feedback: string | null;
  subject: string | null;
  grade_level: string | null;
  created_at: string;
}

interface ClassGroup {
  id: string;
  name: string;
}

interface GradeBoundary {
  grade: string;
  min: number;
  max: number;
  color: string;
}

type GradingMode = "fixed" | "curve" | "percentile";

const DEFAULT_BOUNDARIES: GradeBoundary[] = [
  { grade: "A+", min: 90, max: 100, color: "#10b981" },
  { grade: "A",  min: 80, max: 89,  color: "#34d399" },
  { grade: "B+", min: 75, max: 79,  color: "#60a5fa" },
  { grade: "B",  min: 70, max: 74,  color: "#93c5fd" },
  { grade: "C+", min: 65, max: 69,  color: "#fbbf24" },
  { grade: "C",  min: 55, max: 64,  color: "#f59e0b" },
  { grade: "D",  min: 40, max: 54,  color: "#f97316" },
  { grade: "F",  min: 0,  max: 39,  color: "#ef4444" },
];

const CURVE_PERCENTAGES = [
  { grade: "A+", pct: 5 },
  { grade: "A",  pct: 10 },
  { grade: "B+", pct: 10 },
  { grade: "B",  pct: 20 },
  { grade: "C+", pct: 15 },
  { grade: "C",  pct: 20 },
  { grade: "D",  pct: 15 },
  { grade: "F",  pct: 5 },
];

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "hsl(var(--secondary))",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
];

const DSE_LEVELS = ["5**", "5*", "5", "4", "3", "2", "1/U"];

const predictDseLevel = (score: number | null): string => {
  if (score == null) return "-";
  if (score >= 92) return "5**";
  if (score >= 86) return "5*";
  if (score >= 78) return "5";
  if (score >= 68) return "4";
  if (score >= 55) return "3";
  if (score >= 40) return "2";
  return "1/U";
};

const getVocabularyBand = (content: string): "基礎" | "穩定" | "豐富" | "成熟" => {
  const tokens = content.toLowerCase().match(/[a-z]+(?:'[a-z]+)?|[\u4e00-\u9fff]/g) ?? [];
  if (tokens.length < 20) return "基礎";
  const uniqueRatio = new Set(tokens).size / tokens.length;
  if (uniqueRatio >= 0.72) return "成熟";
  if (uniqueRatio >= 0.58) return "豐富";
  if (uniqueRatio >= 0.44) return "穩定";
  return "基礎";
};

const Analytics = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [allEssays, setAllEssays] = useState<Essay[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedEssayIds, setSelectedEssayIds] = useState<Set<string>>(new Set());
  const [showEssayPicker, setShowEssayPicker] = useState(false);
  const [classStudentNames, setClassStudentNames] = useState<string[]>([]);

  // Grading state
  const [gradingMode, setGradingMode] = useState<GradingMode>("fixed");
  const [boundaries, setBoundaries] = useState<GradeBoundary[]>(DEFAULT_BOUNDARIES);
  const [curvePercentages, setCurvePercentages] = useState(CURVE_PERCENTAGES);
  const [showGradingConfig, setShowGradingConfig] = useState(false);

  // Teaching resource state
  const [resourceType, setResourceType] = useState("exercise");
  const [generatingResource, setGeneratingResource] = useState(false);
  const [generatedResource, setGeneratedResource] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState(false);
  const [editedResource, setEditedResource] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [essayRes, classRes] = await Promise.all([
        supabase
          .from("essays")
          .select("id, title, content, score, feedback, subject, grade_level, created_at")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: true }),
        supabase
          .from("classes")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name"),
      ]);
      setAllEssays(essayRes.data ?? []);
      setClasses(classRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!user || selectedClassId === "all") {
      setClassStudentNames([]);
      return;
    }
    const fetchStudents = async () => {
      const { data } = await supabase
        .from("class_students")
        .select("student_name")
        .eq("class_id", selectedClassId)
        .eq("user_id", user!.id);
      setClassStudentNames((data ?? []).map((s) => s.student_name.toLowerCase()));
    };
    fetchStudents();
  }, [user, selectedClassId]);

  const essays = useMemo(() => {
    let filtered = allEssays;
    if (selectedClassId !== "all" && classStudentNames.length > 0) {
      filtered = filtered.filter((e) =>
        classStudentNames.some((name) => e.title.toLowerCase().includes(name))
      );
    }
    if (selectedEssayIds.size > 0) {
      filtered = filtered.filter((e) => selectedEssayIds.has(e.id));
    }
    return filtered;
  }, [allEssays, selectedClassId, classStudentNames, selectedEssayIds]);

  const toggleEssay = (id: string) => {
    setSelectedEssayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedEssayIds.size === allEssays.length) setSelectedEssayIds(new Set());
    else setSelectedEssayIds(new Set(allEssays.map((e) => e.id)));
  };

  const clearFilters = () => {
    setSelectedClassId("all");
    setSelectedEssayIds(new Set());
  };

  // Assign grade to a score
  const getGrade = useCallback((score: number | null): string => {
    if (score == null) return "-";
    if (gradingMode === "fixed") {
      for (const b of boundaries) {
        if (score >= b.min && score <= b.max) return b.grade;
      }
      return "F";
    }
    // For curve mode, we need sorted scores context — handled in gradeResults
    return "-";
  }, [gradingMode, boundaries]);

  // Compute grade results for all filtered essays
  const gradeResults = useMemo(() => {
    const scored = essays.filter((e) => e.score != null).sort((a, b) => b.score! - a.score!);
    if (scored.length === 0) return [];

    if (gradingMode === "fixed") {
      return scored.map((e) => ({
        ...e,
        grade: getGrade(e.score),
        gradeColor: boundaries.find((b) => e.score! >= b.min && e.score! <= b.max)?.color ?? "#94a3b8",
      }));
    }

    // Curve mode: assign grades by percentage
    const result: (Essay & { grade: string; gradeColor: string })[] = [];
    let idx = 0;
    for (const cp of curvePercentages) {
      const count = Math.max(1, Math.round((cp.pct / 100) * scored.length));
      const color = DEFAULT_BOUNDARIES.find((b) => b.grade === cp.grade)?.color ?? "#94a3b8";
      for (let i = 0; i < count && idx < scored.length; i++, idx++) {
        result.push({ ...scored[idx], grade: cp.grade, gradeColor: color });
      }
    }
    // Assign remaining to last grade
    while (idx < scored.length) {
      const last = curvePercentages[curvePercentages.length - 1];
      const color = DEFAULT_BOUNDARIES.find((b) => b.grade === last.grade)?.color ?? "#ef4444";
      result.push({ ...scored[idx], grade: last.grade, gradeColor: color });
      idx++;
    }
    return result;
  }, [essays, gradingMode, boundaries, curvePercentages, getGrade]);

  // Grade distribution chart data
  const gradeDistribution = useMemo(() => {
    const map: Record<string, { count: number; color: string }> = {};
    const gradeOrder = gradingMode === "fixed" ? boundaries : curvePercentages.map((cp) => ({
      ...cp,
      color: DEFAULT_BOUNDARIES.find((b) => b.grade === cp.grade)?.color ?? "#94a3b8",
    }));
    gradeOrder.forEach((g) => { map[g.grade] = { count: 0, color: ("color" in g ? g.color : "#94a3b8") }; });
    gradeResults.forEach((r) => {
      if (map[r.grade]) map[r.grade].count++;
    });
    return Object.entries(map).map(([grade, { count, color }]) => ({ grade, count, color }));
  }, [gradeResults, gradingMode, boundaries, curvePercentages]);

  // --- Existing analytics computations ---
  const histogram = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10 + 1}-${(i + 1) * 10}`,
      count: 0,
    }));
    buckets[0].range = "0-10";
    essays.forEach((e) => {
      if (e.score == null) return;
      const idx = Math.min(Math.floor(e.score / 10), 9);
      buckets[idx].count++;
    });
    return buckets;
  }, [essays]);

  const trend = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    essays.forEach((e) => {
      if (e.score == null) return;
      const month = e.created_at.slice(0, 7);
      if (!map[month]) map[month] = { total: 0, count: 0 };
      map[month].total += e.score;
      map[month].count++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, avg: Math.round(v.total / v.count), count: v.count }));
  }, [essays]);

  const mistakes = useMemo(() => {
    const keywords: Record<string, number> = {};
    const patterns = [
      { regex: /grammar/gi, label: t("analytics.grammar") },
      { regex: /spelling/gi, label: t("analytics.spelling") },
      { regex: /structure|organization|organisation/gi, label: t("analytics.structure") },
      { regex: /vocabulary|word choice|diction/gi, label: t("analytics.vocabulary") },
      { regex: /coherence|cohesion|flow/gi, label: t("analytics.coherence") },
      { regex: /evidence|support|example/gi, label: t("analytics.evidence") },
      { regex: /thesis|argument|claim/gi, label: t("analytics.thesis") },
      { regex: /punctuation/gi, label: t("analytics.punctuation") },
      { regex: /語法|文法/gi, label: t("analytics.grammar") },
      { regex: /錯字|錯別字|拼寫/gi, label: t("analytics.spelling") },
      { regex: /結構/gi, label: t("analytics.structure") },
      { regex: /詞彙|用詞/gi, label: t("analytics.vocabulary") },
      { regex: /連貫/gi, label: t("analytics.coherence") },
      { regex: /論據|例子/gi, label: t("analytics.evidence") },
      { regex: /論點|立論/gi, label: t("analytics.thesis") },
      { regex: /標點/gi, label: t("analytics.punctuation") },
    ];
    essays.forEach((e) => {
      if (!e.feedback) return;
      patterns.forEach(({ regex, label }) => {
        const matches = e.feedback!.match(regex);
        if (matches) keywords[label] = (keywords[label] || 0) + matches.length;
      });
    });
    return Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [essays, t]);

  const subjectDist = useMemo(() => {
    const map: Record<string, number> = {};
    essays.forEach((e) => {
      const s = e.subject || t("analytics.unspecified");
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [essays, t]);

  const avgScore = useMemo(() => {
    const scored = essays.filter((e) => e.score != null);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((s, e) => s + e.score!, 0) / scored.length);
  }, [essays]);

  const grammarErrorRank = useMemo(() => mistakes.slice(0, 5), [mistakes]);

  const vocabularyDistribution = useMemo(() => {
    const bands = ["基礎", "穩定", "豐富", "成熟"];
    const map = Object.fromEntries(bands.map((band) => [band, 0])) as Record<string, number>;
    essays.forEach((essay) => {
      map[getVocabularyBand(essay.content || "")] += 1;
    });
    return bands.map((band) => ({ band, count: map[band] }));
  }, [essays]);

  const dseLevelDistribution = useMemo(() => {
    const map = Object.fromEntries(DSE_LEVELS.map((level) => [level, 0])) as Record<string, number>;
    essays.forEach((essay) => {
      const level = predictDseLevel(essay.score);
      if (level !== "-") map[level] += 1;
    });
    return DSE_LEVELS.map((level) => ({ level, count: map[level] }));
  }, [essays]);

  const exportDashboardPDF = async () => {
    await exportClassDashboardPDF({
      title: t("analytics.classDashboard"),
      subtitle: t("analytics.classDashboardSubtitle"),
      essayCount: essays.length,
      averageScore: avgScore,
      grammarErrors: grammarErrorRank,
      vocabularyDistribution,
      dseLevelDistribution,
      locale: i18n.language,
    });
  };

  const hasFilters = selectedClassId !== "all" || selectedEssayIds.size > 0;

  const updateBoundary = (idx: number, field: "min" | "max", val: number) => {
    setBoundaries((prev) => prev.map((b, i) => i === idx ? { ...b, [field]: val } : b));
  };

  const updateCurve = (idx: number, val: number) => {
    setCurvePercentages((prev) => prev.map((c, i) => i === idx ? { ...c, pct: val } : c));
  };

  const exportGradeCSV = () => {
    if (gradeResults.length === 0) return;
    const header = "Title,Score,Grade,Date\n";
    const rows = gradeResults.map((r) =>
      `"${r.title.replace(/"/g, '""')}",${r.score ?? ""},${r.grade},${r.created_at.slice(0, 10)}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grade_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateTeachingResource = async () => {
    const feedbackSummaries = essays
      .filter((e) => e.feedback)
      .map((e) => {
        const snippet = e.feedback!.slice(0, 500);
        return `[${e.title}] ${snippet}`;
      })
      .slice(0, 20);

    if (feedbackSummaries.length === 0) {
      toast.error(t("analytics.resourceEmpty"));
      return;
    }

    setGeneratingResource(true);
    setGeneratedResource(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-teaching-resource", {
        body: { feedbackSummaries, resourceType, uiLanguage: i18n.language },
      });
      if (error) throw error;
      setGeneratedResource(data.resource);
      setEditedResource(data.resource);
      setEditingResource(false);
      toast.success(t("analytics.resourceGenerated"));
    } catch (err: any) {
      toast.error(err.message || "Failed to generate resource");
    } finally {
      setGeneratingResource(false);
    }
  };
  const downloadResourcePDF = async () => {
    const content = editedResource || generatedResource || "";
    if (!content) return;
    await exportMarkdownToPDF(content, "teaching_resource.pdf");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">{t("analytics.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-bold text-lg text-foreground">Compify.Pro</span>
          </a>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              {t("analytics.backToDashboard")}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display font-bold text-3xl text-foreground mb-2">{t("analytics.title")}</h1>
        <p className="text-muted-foreground mb-6">{t("analytics.subtitle")}</p>

        {/* Filter Controls */}
        {allEssays.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-primary" />
              <span className="font-display font-semibold text-sm text-foreground">{t("analytics.filterBy")}</span>
              {hasFilters && (
                <button onClick={clearFilters} className="ml-auto text-xs text-primary hover:underline">
                  {t("analytics.clearFilters")}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-4 items-start">
              <div className="min-w-[200px]">
                <label className="text-xs text-muted-foreground block mb-1">{t("analytics.filterClass")}</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => { setSelectedClassId(e.target.value); setSelectedEssayIds(new Set()); }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">{t("analytics.allEssays")}</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[280px]">
                <label className="text-xs text-muted-foreground block mb-1">{t("analytics.filterEssays")}</label>
                <button
                  onClick={() => setShowEssayPicker(!showEssayPicker)}
                  className="w-full flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-secondary/30 transition-colors"
                >
                  <span>{selectedEssayIds.size > 0 ? t("analytics.essaysSelected", { count: selectedEssayIds.size }) : t("analytics.selectEssays")}</span>
                  {showEssayPicker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showEssayPicker && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-2 space-y-1">
                    <button onClick={selectAll} className="w-full text-left text-xs text-primary hover:underline px-2 py-1">
                      {selectedEssayIds.size === allEssays.length ? t("analytics.deselectAll") : t("analytics.selectAll")}
                    </button>
                    {allEssays.map((e) => (
                      <label key={e.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/30 cursor-pointer">
                        <Checkbox checked={selectedEssayIds.has(e.id)} onCheckedChange={() => toggleEssay(e.id)} />
                        <span className="text-sm text-foreground truncate flex-1">{e.title || t("analytics.untitled")}</span>
                        {e.score != null && (
                          <span className={`text-xs font-bold ${e.score >= 70 ? "text-green-600" : e.score >= 50 ? "text-amber-500" : "text-red-500"}`}>{e.score}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {hasFilters && (
              <p className="text-xs text-muted-foreground mt-3">{t("analytics.showingFiltered", { count: essays.length, total: allEssays.length })}</p>
            )}
          </div>
        )}

        {essays.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-4">{hasFilters ? t("analytics.noFilterResults") : t("analytics.noData")}</p>
            {hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>{t("analytics.clearFilters")}</Button>
            ) : (
              <Button onClick={() => navigate("/grade")}>{t("dashboard.gradeEssay")}</Button>
            )}
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="overview">{t("analytics.tabOverview")}</TabsTrigger>
                <TabsTrigger value="grading">{t("analytics.tabGrading")}</TabsTrigger>
                <TabsTrigger value="teaching">{t("analytics.tabTeachingRes")}</TabsTrigger>
              </TabsList>
              <Button variant="outline" size="sm" onClick={() => navigate("/exemplars")} className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> {t("analytics.viewExemplars")}
              </Button>
            </div>

            {/* ============ OVERVIEW TAB ============ */}
            <TabsContent value="overview">
              <section className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">{t("analytics.classDashboard")}</p>
                    <h2 className="font-display font-bold text-2xl text-foreground">{t("analytics.classDashboardTitle")}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t("analytics.classDashboardSubtitle")}</p>
                  </div>
                  <Button variant="outline" onClick={exportDashboardPDF} className="gap-2 shrink-0">
                    <FileDown className="h-4 w-4" /> {t("analytics.exportClassPDF")}
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div>
                    <h3 className="font-display font-semibold text-base text-foreground mb-3">{t("analytics.grammarRank")}</h3>
                    <div className="space-y-3">
                      {grammarErrorRank.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("analytics.noMistakesData")}</p>
                      ) : grammarErrorRank.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium text-foreground truncate">{item.name}</span>
                              <span className="text-muted-foreground">{item.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(12, (item.value / Math.max(...grammarErrorRank.map((m) => m.value))) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base text-foreground mb-3">{t("analytics.vocabDistribution")}</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={vocabularyDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="band" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base text-foreground mb-3">{t("analytics.dseDistribution")}</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={dseLevelDistribution.filter((d) => d.count > 0)} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={78} label>
                          {dseLevelDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: t("analytics.totalEssays"), value: essays.length },
                  { label: t("analytics.avgScore"), value: `${avgScore}/100` },
                  { label: t("analytics.highestScore"), value: Math.max(...essays.filter(e => e.score != null).map(e => e.score!), 0) },
                  { label: t("analytics.lowestScore"), value: Math.min(...essays.filter(e => e.score != null).map(e => e.score!), 100) },
                ].map((s, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-border bg-card shadow-card text-center">
                    <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                    <p className="font-display font-bold text-2xl text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-4">{t("analytics.scoreDistribution")}</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={histogram}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} labelStyle={{ color: "hsl(var(--foreground))" }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-4">{t("analytics.performanceTrend")}</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-4">{t("analytics.commonMistakes")}</h2>
                  {mistakes.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t("analytics.noMistakesData")}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={mistakes} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-4">{t("analytics.subjectDistribution")}</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={subjectDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {subjectDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            {/* ============ GRADING TAB ============ */}
            <TabsContent value="grading">
              {/* Grading Mode Selector + Config */}
              <div className="mb-6 p-5 rounded-2xl border border-border bg-card shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    <h2 className="font-display font-semibold text-lg text-foreground">{t("analytics.gradingConfig")}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportGradeCSV} className="gap-1.5">
                      <Download className="w-3.5 h-3.5" /> {t("analytics.exportGrades")}
                    </Button>
                    <button
                      onClick={() => setShowGradingConfig(!showGradingConfig)}
                      className="text-xs text-primary hover:underline"
                    >
                      {showGradingConfig ? t("analytics.hideConfig") : t("analytics.editConfig")}
                    </button>
                  </div>
                </div>

                {/* Mode selector */}
                <div className="flex gap-3 mb-4">
                  {(["fixed", "curve"] as GradingMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGradingMode(mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        gradingMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {t(`analytics.mode_${mode}`)}
                    </button>
                  ))}
                </div>

                {/* Config editor */}
                {showGradingConfig && (
                  <div className="mt-4 p-4 rounded-xl bg-secondary/30 border border-border">
                    {gradingMode === "fixed" ? (
                      <div>
                        <p className="text-xs text-muted-foreground mb-3">{t("analytics.fixedDesc")}</p>
                        <div className="grid gap-2">
                          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground px-1">
                            <span>{t("analytics.gradeLabel")}</span>
                            <span>{t("analytics.minScore")}</span>
                            <span>{t("analytics.maxScore")}</span>
                            <span></span>
                          </div>
                          {boundaries.map((b, i) => (
                            <div key={i} className="grid grid-cols-4 gap-2 items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                                <span className="text-sm font-bold text-foreground">{b.grade}</span>
                              </div>
                              <Input
                                type="number"
                                value={b.min}
                                onChange={(e) => updateBoundary(i, "min", parseInt(e.target.value) || 0)}
                                className="h-8 text-sm"
                                min={0}
                                max={100}
                              />
                              <Input
                                type="number"
                                value={b.max}
                                onChange={(e) => updateBoundary(i, "max", parseInt(e.target.value) || 0)}
                                className="h-8 text-sm"
                                min={0}
                                max={100}
                              />
                              <span className="text-xs text-muted-foreground">
                                {gradeResults.filter((r) => r.grade === b.grade).length} {t("analytics.students")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground mb-3">{t("analytics.curveDesc")}</p>
                        <div className="grid gap-2">
                          <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground px-1">
                            <span>{t("analytics.gradeLabel")}</span>
                            <span>{t("analytics.percentage")}</span>
                            <span>{t("analytics.actualCount")}</span>
                          </div>
                          {curvePercentages.map((cp, i) => (
                            <div key={i} className="grid grid-cols-3 gap-2 items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEFAULT_BOUNDARIES.find(b => b.grade === cp.grade)?.color }} />
                                <span className="text-sm font-bold text-foreground">{cp.grade}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  value={cp.pct}
                                  onChange={(e) => updateCurve(i, parseInt(e.target.value) || 0)}
                                  className="h-8 text-sm w-20"
                                  min={0}
                                  max={100}
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {gradeResults.filter((r) => r.grade === cp.grade).length} {t("analytics.students")}
                              </span>
                            </div>
                          ))}
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("analytics.totalPct")}: {curvePercentages.reduce((s, c) => s + c.pct, 0)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grade Distribution Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Bar chart */}
                <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-4">{t("analytics.gradeDistChart")}</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="grade" tick={{ fontSize: 13, fill: "hsl(var(--foreground))", fontWeight: 600 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {gradeDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie chart */}
                <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-4">{t("analytics.gradePieChart")}</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={gradeDistribution.filter(g => g.count > 0)} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={100} label={({ grade, count }) => `${grade} (${count})`}>
                        {gradeDistribution.filter(g => g.count > 0).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Student Grade Table */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
                <h2 className="font-display font-semibold text-lg text-foreground mb-4">{t("analytics.studentGrades")}</h2>
                {gradeResults.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("analytics.noScoredEssays")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">#</th>
                          <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">{t("analytics.essayTitle")}</th>
                          <th className="text-center py-2.5 px-3 text-muted-foreground font-medium">{t("analytics.score")}</th>
                          <th className="text-center py-2.5 px-3 text-muted-foreground font-medium">{t("analytics.gradeLabel")}</th>
                          <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">{t("analytics.date")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradeResults.map((r, i) => (
                          <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                            <td className="py-2.5 px-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-2.5 px-3 text-foreground font-medium truncate max-w-[300px]">{r.title || t("analytics.untitled")}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`font-bold ${(r.score ?? 0) >= 70 ? "text-green-600" : (r.score ?? 0) >= 50 ? "text-amber-500" : "text-red-500"}`}>
                                {r.score}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className="inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold text-white"
                                style={{ backgroundColor: r.gradeColor }}
                              >
                                {r.grade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">{r.created_at.slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ============ TEACHING RESOURCES TAB ============ */}
            <TabsContent value="teaching">
              <div className="max-w-3xl">
                <div className="mb-6 p-5 rounded-2xl border border-border bg-card shadow-card">
                  <h2 className="font-display font-semibold text-lg text-foreground mb-2">{t("analytics.generateResource")}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{t("analytics.resourceEmpty")}</p>

                  <div className="flex flex-wrap gap-3 items-end mb-4">
                    <div className="min-w-[200px]">
                      <label className="text-xs text-muted-foreground block mb-1">{t("analytics.resourceType")}</label>
                      <Select value={resourceType} onValueChange={setResourceType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exercise">{t("analytics.resourceExercise")}</SelectItem>
                          <SelectItem value="vocabulary">{t("analytics.resourceVocab")}</SelectItem>
                          <SelectItem value="lessonPlan">{t("analytics.resourceLesson")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={generateTeachingResource}
                      disabled={generatingResource || essays.filter(e => e.feedback).length === 0}
                      className="gap-1.5"
                    >
                      {generatingResource ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> {t("analytics.generating")}</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> {t("analytics.generateResource")}</>
                      )}
                    </Button>
                  </div>
                </div>

                {generatedResource && (
                  <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-2">
                        <Button
                          variant={editingResource ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEditingResource(true)}
                          className="gap-1.5"
                        >
                          <Pencil className="h-3.5 w-3.5" /> {t("analytics.editResource")}
                        </Button>
                        <Button
                          variant={!editingResource ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEditingResource(false)}
                          className="gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" /> {t("analytics.previewResource")}
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" onClick={downloadResourcePDF} className="gap-1.5">
                        <FileDown className="h-3.5 w-3.5" /> {t("analytics.downloadPDF")}
                      </Button>
                    </div>
                    {editingResource ? (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">{t("analytics.editingHint")}</p>
                        <Textarea
                          value={editedResource}
                          onChange={(e) => setEditedResource(e.target.value)}
                          className="min-h-[400px] font-mono text-sm"
                        />
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{editedResource || generatedResource}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Analytics;
