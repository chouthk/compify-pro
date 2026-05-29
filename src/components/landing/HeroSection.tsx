import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowRight, Sparkles, Clock, FileCheck, Play, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-subtle" />

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-primary/20 bg-card shadow-card mb-8 animate-fade-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{t("hero.badge")}</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-tight tracking-tight mb-6 animate-fade-up text-foreground" style={{ animationDelay: '0.1s' }}>
            {t("hero.headline")}
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 animate-fade-up leading-relaxed" style={{ animationDelay: '0.2s' }}>
            {t("hero.subheadline")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <Button size="lg" className="bg-gradient-hero hover:opacity-90 transition-opacity text-base px-8 py-6 shadow-glow" onClick={() => navigate("/signup")}>
              {t("nav.startFreeTrial")}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 py-6"
              onClick={() => setDemoOpen(true)}
            >
              <Play className="mr-2 w-4 h-4 fill-current" />
              {t("hero.watchDemo")}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-2xl text-foreground">10hrs+</p>
                <p className="text-xs text-muted-foreground">{t("hero.statSaved")}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-2xl text-foreground">DSE</p>
                <p className="text-xs text-muted-foreground">{t("hero.statAccuracy")}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-lg text-foreground">Beta</p>
                <p className="text-xs text-muted-foreground">{t("hero.statTeachers")}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-2xl text-foreground">12</p>
                <p className="text-xs text-muted-foreground">{t("hero.statRubrics")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 max-w-5xl mx-auto animate-scale-in" style={{ animationDelay: '0.5s' }}>
          <div className="rounded-lg border border-border bg-card shadow-elevated p-2 sm:p-3">
            <div className="rounded-md bg-muted/40 p-6 sm:p-8 lg:p-12">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground ml-2">{t("hero.batchGrading")}</span>
              </div>
              <div className="space-y-3">
                {["essay_emma_watson.pdf", "essay_john_smith.pdf", "essay_sarah_chen.pdf"].map((name, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        <FileCheck className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                        {["A", "B+", "A-"][i]} — {t("hero.graded")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Tour Dialog */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="sm:max-w-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-bold mb-2">Compify.Pro 功能導覽</h3>
            <p className="text-sm text-muted-foreground mb-4">示範影片即將推出，敬請期待！</p>
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                <span className="text-lg">📤</span>
                <div><p className="font-medium text-sm">一鍵上傳全班作文</p><p className="text-xs text-muted-foreground">支援 PDF/DOCX/TXT，一次最多 100 篇</p></div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                <span className="text-lg">🤖</span>
                <div><p className="font-medium text-sm">AI 自動批改</p><p className="text-xs text-muted-foreground">C/L/O 三維評分，跟足 HKEAA 標準</p></div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                <span className="text-lg">📄</span>
                <div><p className="font-medium text-sm">專業 PDF 報告</p><p className="text-xs text-muted-foreground">可直接派發學生及家長</p></div>
              </div>
            </div>
            <div className="flex gap-3 mt-4 justify-center">
              <Button onClick={() => { setDemoOpen(false); navigate("/signup"); }}>
                立即免費試用
              </Button>
              <Button variant="outline" onClick={() => setDemoOpen(false)}>
                關閉
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;
