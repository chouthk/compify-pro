import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Plus, Search, Trash2, Eye, EyeOff, Sparkles, Loader2, Pencil, FileDown, Save, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { exportMarkdownToPDF } from "@/lib/markdown-pdf";

interface Exemplar {
  id: string;
  user_id: string;
  title: string;
  content: string;
  score: number | null;
  subject: string | null;
  grade_level: string | null;
  exam_type: string | null;
  is_anonymous: boolean;
  created_at: string;
}

const EXAM_TYPES = ["DSE Chinese", "DSE English", "IB", "IELTS", "TOEFL", "Other"];

const GENRES = [
  { value: "argumentative", key: "genreArgumentative" },
  { value: "narrative", key: "genreNarrative" },
  { value: "descriptive", key: "genreDescriptive" },
  { value: "expository", key: "genreExpository" },
  { value: "persuasive", key: "genrePersuasive" },
  { value: "letter", key: "genreLetter" },
  { value: "speech", key: "genreSpeech" },
  { value: "report", key: "genreReport" },
];

const Exemplars = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [exemplars, setExemplars] = useState<Exemplar[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Manual add form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [score, setScore] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [examType, setExamType] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExam, setFilterExam] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");

  // AI generation state
  const [genTopic, setGenTopic] = useState("");
  const [genGenre, setGenGenre] = useState("");
  const [genGradeLevel, setGenGradeLevel] = useState("");
  const [genExamType, setGenExamType] = useState("");
  const [genWordCount, setGenWordCount] = useState("600");
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [editingGenerated, setEditingGenerated] = useState(false);
  const [editedGenContent, setEditedGenContent] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchExemplars();
  }, [user]);

  const fetchExemplars = async () => {
    const { data } = await supabase
      .from("exemplar_essays")
      .select("*")
      .order("score", { ascending: false });
    setExemplars((data as Exemplar[]) ?? []);
    setFetching(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error(t("exemplars.requiredFields"));
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("exemplar_essays").insert({
        user_id: user!.id,
        title,
        content,
        score: score ? parseInt(score) : null,
        subject: subject || null,
        grade_level: gradeLevel || null,
        exam_type: examType || null,
        is_anonymous: isAnonymous,
      });
      if (error) throw error;
      toast.success(t("exemplars.added"));
      setTitle(""); setContent(""); setScore(""); setSubject(""); setGradeLevel(""); setExamType("");
      setShowAdd(false);
      fetchExemplars();
    } catch (err: any) {
      toast.error(err.message || "Failed to add exemplar");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExemplar = async (id: string) => {
    const { error } = await supabase.from("exemplar_essays").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success(t("exemplars.deleted"));
    fetchExemplars();
    if (viewingId === id) setViewingId(null);
  };

  const filtered = exemplars.filter((e) => {
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase()) && !e.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterExam !== "all" && e.exam_type !== filterExam) return false;
    if (filterGrade !== "all" && e.grade_level !== filterGrade) return false;
    return true;
  });

  const viewing = viewingId ? exemplars.find((e) => e.id === viewingId) : null;
  const uniqueGrades = [...new Set(exemplars.map(e => e.grade_level).filter(Boolean))];

  // AI Generation
  const generateExemplar = async () => {
    if (!genTopic.trim() || !genGenre) {
      toast.error(t("exemplars.topicRequired"));
      return;
    }
    setGenerating(true);
    setGeneratedContent(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-exemplar", {
        body: {
          topic: genTopic,
          genre: genGenre,
          gradeLevel: genGradeLevel || undefined,
          examType: genExamType || undefined,
          wordCount: parseInt(genWordCount) || 600,
          uiLanguage: i18n.language,
        },
      });
      if (error) throw error;
      setGeneratedContent(data.content);
      setEditedGenContent(data.content);
      setEditingGenerated(false);
      toast.success(t("exemplars.exemplarGenerated"));
    } catch (err: any) {
      toast.error(err.message || "Failed to generate exemplar");
    } finally {
      setGenerating(false);
    }
  };

  const saveGeneratedToBank = async () => {
    const finalContent = editedGenContent || generatedContent || "";
    if (!finalContent) return;
    // Extract title from first heading or use topic
    const titleMatch = finalContent.match(/^#\s+(.+)/m);
    const essayTitle = titleMatch ? titleMatch[1] : genTopic;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("exemplar_essays").insert({
        user_id: user!.id,
        title: essayTitle,
        content: finalContent,
        subject: genGenre || null,
        grade_level: genGradeLevel || null,
        exam_type: genExamType || null,
        is_anonymous: true,
      });
      if (error) throw error;
      toast.success(t("exemplars.savedToBank"));
      fetchExemplars();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadGeneratedPDF = async () => {
    const content = editedGenContent || generatedContent || "";
    if (!content) return;
    await exportMarkdownToPDF(content, "model_essay.pdf");
  };

  const discardGenerated = () => {
    setGeneratedContent(null);
    setEditedGenContent("");
    setEditingGenerated(false);
  };

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
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">{t("exemplars.title")}</h1>
            <p className="text-muted-foreground">{t("exemplars.subtitle")}</p>
          </div>
        </div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse">{t("exemplars.browseTab")}</TabsTrigger>
            <TabsTrigger value="generate">{t("exemplars.generateTab")}</TabsTrigger>
          </TabsList>

          {/* ========== BROWSE TAB ========== */}
          <TabsContent value="browse">
            <div className="flex items-center justify-end mb-4">
              <Button onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
                <Plus className="h-4 w-4" /> {t("exemplars.addNew")}
              </Button>
            </div>

            {/* Add Form */}
            {showAdd && (
              <div className="mb-8 p-6 rounded-2xl border border-border bg-card shadow-card">
                <h2 className="font-display font-semibold text-lg text-foreground mb-4">{t("exemplars.addExemplar")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>{t("exemplars.titleLabel")}</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("exemplars.titlePlaceholder")} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("exemplars.scoreLabel")}</Label>
                    <Input type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 85" min={0} max={100} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("exemplars.subjectLabel")}</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("exemplars.subjectPlaceholder")} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("exemplars.examTypeLabel")}</Label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={t("exemplars.examTypePlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {EXAM_TYPES.map((et) => <SelectItem key={et} value={et}>{et}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("exemplars.gradeLevelLabel")}</Label>
                    <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="e.g. S5, Grade 11" className="mt-1" />
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <button onClick={() => setIsAnonymous(!isAnonymous)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {isAnonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {isAnonymous ? t("exemplars.anonymous") : t("exemplars.showAuthor")}
                    </button>
                  </div>
                </div>
                <div className="mb-4">
                  <Label>{t("exemplars.contentLabel")}</Label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("exemplars.contentPlaceholder")} className="mt-1 min-h-[200px]" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} disabled={submitting}>{submitting ? t("exemplars.saving") : t("exemplars.save")}</Button>
                  <Button variant="outline" onClick={() => setShowAdd(false)}>{t("exemplars.cancel")}</Button>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("exemplars.searchPlaceholder")} className="pl-9" />
              </div>
              <Select value={filterExam} onValueChange={setFilterExam}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("exemplars.filterExam")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("exemplars.allExams")}</SelectItem>
                  {EXAM_TYPES.map((et) => <SelectItem key={et} value={et}>{et}</SelectItem>)}
                </SelectContent>
              </Select>
              {uniqueGrades.length > 0 && (
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("exemplars.filterGrade")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("exemplars.allGrades")}</SelectItem>
                    {uniqueGrades.map((g) => <SelectItem key={g!} value={g!}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Viewing detail */}
            {viewing && (
              <div className="mb-8 p-6 rounded-2xl border border-primary/30 bg-card shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-xl text-foreground">{viewing.title}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setViewingId(null)}>{t("exemplars.close")}</Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {viewing.score != null && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold">{viewing.score}/100</span>
                  )}
                  {viewing.exam_type && <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">{viewing.exam_type}</span>}
                  {viewing.subject && <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">{viewing.subject}</span>}
                  {viewing.grade_level && <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">{viewing.grade_level}</span>}
                </div>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{viewing.content}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Exemplar grid */}
            {fetching ? (
              <p className="text-muted-foreground text-center py-12">{t("exemplars.loading")}</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">{t("exemplars.empty")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((e) => (
                  <div
                    key={e.id}
                    className="p-5 rounded-2xl border border-border bg-card shadow-card hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setViewingId(e.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display font-semibold text-foreground line-clamp-1">{e.title}</h3>
                      {e.score != null && (
                        <span className={`text-sm font-bold shrink-0 ml-2 ${e.score >= 80 ? "text-green-600" : e.score >= 60 ? "text-amber-500" : "text-muted-foreground"}`}>
                          {e.score}/100
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{e.content.slice(0, 200)}...</p>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {e.exam_type && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{e.exam_type}</span>}
                      {e.grade_level && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{e.grade_level}</span>}
                      {e.user_id === user?.id && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); deleteExemplar(e.id); }}
                          className="ml-auto p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========== AI GENERATE TAB ========== */}
          <TabsContent value="generate">
            <div className="max-w-3xl">
              <div className="mb-6 p-6 rounded-2xl border border-border bg-card shadow-card">
                <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t("exemplars.generateExemplar")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="sm:col-span-2">
                    <Label>{t("exemplars.topicLabel")}</Label>
                    <Input value={genTopic} onChange={(e) => setGenTopic(e.target.value)} placeholder={t("exemplars.topicPlaceholder")} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("exemplars.genreLabel")}</Label>
                    <Select value={genGenre} onValueChange={setGenGenre}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={t("exemplars.genrePlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {GENRES.map((g) => <SelectItem key={g.value} value={g.value}>{t(`exemplars.${g.key}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("exemplars.examTypeLabel")}</Label>
                    <Select value={genExamType} onValueChange={setGenExamType}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder={t("exemplars.examTypePlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        {EXAM_TYPES.map((et) => <SelectItem key={et} value={et}>{et}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("exemplars.gradeLevelLabel")}</Label>
                    <Input value={genGradeLevel} onChange={(e) => setGenGradeLevel(e.target.value)} placeholder="e.g. S5, Grade 11" className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("exemplars.wordCountLabel")}</Label>
                    <Input type="number" value={genWordCount} onChange={(e) => setGenWordCount(e.target.value)} placeholder="600" min={200} max={2000} className="mt-1" />
                  </div>
                </div>
                <Button onClick={generateExemplar} disabled={generating} className="gap-1.5">
                  {generating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t("exemplars.generatingExemplar")}</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> {t("exemplars.generateExemplar")}</>
                  )}
                </Button>
              </div>

              {/* Generated content */}
              {generatedContent && (
                <div className="p-6 rounded-2xl border border-primary/20 bg-card shadow-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <Button
                        variant={editingGenerated ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditingGenerated(true)}
                        className="gap-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" /> {t("exemplars.editExemplar")}
                      </Button>
                      <Button
                        variant={!editingGenerated ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditingGenerated(false)}
                        className="gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" /> {t("exemplars.previewExemplar")}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={downloadGeneratedPDF} className="gap-1.5">
                        <FileDown className="h-3.5 w-3.5" /> {t("exemplars.downloadExemplarPDF")}
                      </Button>
                      <Button size="sm" onClick={saveGeneratedToBank} disabled={submitting} className="gap-1.5">
                        <Save className="h-3.5 w-3.5" /> {t("exemplars.saveToBank")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={discardGenerated} className="gap-1.5 text-destructive hover:text-destructive">
                        <X className="h-3.5 w-3.5" /> {t("exemplars.discardExemplar")}
                      </Button>
                    </div>
                  </div>

                  {editingGenerated ? (
                    <Textarea
                      value={editedGenContent}
                      onChange={(e) => setEditedGenContent(e.target.value)}
                      className="min-h-[500px] font-mono text-sm"
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{editedGenContent || generatedContent}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Exemplars;
