import { useState, useEffect } from "react";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Users, Edit2, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface ClassStudent {
  id: string;
  student_name: string;
  student_id: string | null;
}

interface ClassGroup {
  id: string;
  name: string;
  description: string | null;
  students: ClassStudent[];
}

const ClassRoster = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    if (!user) return;
    setLoadingData(true);
    const { data: classData } = await supabase
      .from("classes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!classData) {
      setLoadingData(false);
      return;
    }

    const classIds = classData.map((c) => c.id);
    const { data: studentData } = classIds.length > 0
      ? await supabase
          .from("class_students")
          .select("*")
          .in("class_id", classIds)
          .order("student_name")
      : { data: [] };

    const grouped: ClassGroup[] = classData.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      students: (studentData || []).filter((s) => s.class_id === c.id),
    }));

    setClasses(grouped);
    setLoadingData(false);
  };

  const createClass = async () => {
    if (!user || !newClassName.trim()) return;
    const { error } = await supabase.from("classes").insert({
      user_id: user.id,
      name: newClassName.trim(),
      description: newClassDesc.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewClassName("");
    setNewClassDesc("");
    toast.success(t("roster.classCreated"));
    fetchClasses();
  };

  const deleteClass = async (classId: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", classId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("roster.classDeleted"));
    fetchClasses();
  };

  const renameClass = async (classId: string) => {
    if (!editClassName.trim()) return;
    const { error } = await supabase.from("classes").update({ name: editClassName.trim() }).eq("id", classId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingClassId(null);
    fetchClasses();
  };

  const addStudent = async (classId: string) => {
    if (!user || !newStudentName.trim()) return;
    const { error } = await supabase.from("class_students").insert({
      class_id: classId,
      user_id: user.id,
      student_name: newStudentName.trim(),
      student_id: newStudentId.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewStudentName("");
    setNewStudentId("");
    toast.success(t("roster.studentAdded"));
    fetchClasses();
  };

  const removeStudent = async (studentDbId: string) => {
    const { error } = await supabase.from("class_students").delete().eq("id", studentDbId);
    if (error) {
      toast.error(error.message);
      return;
    }
    fetchClasses();
  };

  const bulkAddStudents = async (classId: string, text: string) => {
    if (!user) return;
    const names = text.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    const rows = names.map((name) => ({
      class_id: classId,
      user_id: user.id,
      student_name: name,
      student_id: null,
    }));
    const { error } = await supabase.from("class_students").insert(rows);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("roster.studentsAdded", { count: names.length }));
    fetchClasses();
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
          <LanguageSwitcher />
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
        <h1 className="font-display font-bold text-2xl text-foreground mb-1">{t("roster.title")}</h1>
        <p className="text-muted-foreground mb-6">{t("roster.subtitle")}</p>

        {/* Create new class */}
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <Label className="text-sm font-medium">{t("roster.newClass")}</Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder={t("roster.classNamePlaceholder")}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && createClass()}
            />
            <Input
              value={newClassDesc}
              onChange={(e) => setNewClassDesc(e.target.value)}
              placeholder={t("roster.classDescPlaceholder")}
              className="flex-1"
            />
            <Button onClick={createClass} disabled={!newClassName.trim()} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" /> {t("roster.create")}
            </Button>
          </div>
        </div>

        {/* Class list */}
        {loadingData ? (
          <p className="text-sm text-muted-foreground text-center py-12">{t("roster.loading")}</p>
        ) : classes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{t("roster.noClasses")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div key={cls.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Class header */}
                <div className="flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors">
                  <button onClick={() => setExpandedClassId(expandedClassId === cls.id ? null : cls.id)} className="shrink-0">
                    {expandedClassId === cls.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0" onClick={() => setExpandedClassId(expandedClassId === cls.id ? null : cls.id)}>
                    {editingClassId === cls.id ? (
                      <div className="flex items-center gap-2">
                        <Input value={editClassName} onChange={(e) => setEditClassName(e.target.value)} className="h-8" autoFocus onKeyDown={(e) => e.key === "Enter" && renameClass(cls.id)} />
                        <button onClick={() => renameClass(cls.id)} className="p-1 text-success"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingClassId(null)} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground cursor-pointer">{cls.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cls.description && `${cls.description} · `}{t("roster.studentCount", { count: cls.students.length })}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditingClassId(cls.id); setEditClassName(cls.name); }} className="p-1.5 text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteClass(cls.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>

                {/* Expanded student list */}
                {expandedClassId === cls.id && (
                  <div className="border-t border-border px-4 pb-4">
                    {/* Students */}
                    {cls.students.length > 0 && (
                      <div className="divide-y divide-border">
                        {cls.students.map((s) => (
                          <div key={s.id} className="flex items-center gap-3 py-2">
                            <span className="text-sm text-foreground flex-1">{s.student_name}</span>
                            {s.student_id && <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{s.student_id}</span>}
                            <button onClick={() => removeStudent(s.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add student */}
                    <div className="flex gap-2 mt-3">
                      <Input
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder={t("roster.studentNamePlaceholder")}
                        className="flex-1 h-8 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && addStudent(cls.id)}
                      />
                      <Input
                        value={newStudentId}
                        onChange={(e) => setNewStudentId(e.target.value)}
                        placeholder={t("roster.studentIdPlaceholder")}
                        className="w-28 h-8 text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={() => addStudent(cls.id)} disabled={!newStudentName.trim()} className="gap-1 text-xs h-8">
                        <Plus className="h-3 w-3" /> {t("roster.add")}
                      </Button>
                    </div>

                    {/* Bulk add */}
                    <details className="mt-3">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">{t("roster.bulkAdd")}</summary>
                      <div className="mt-2">
                        <textarea
                          className="w-full h-20 text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                          placeholder={t("roster.bulkPlaceholder")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.shiftKey) {
                              bulkAddStudents(cls.id, (e.target as HTMLTextAreaElement).value);
                              (e.target as HTMLTextAreaElement).value = "";
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{t("roster.bulkHint")}</p>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassRoster;
