import { Upload, Brain, FileText, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const SolutionSection = () => {
  const { t } = useTranslation();

  const steps = [
    { icon: Upload, step: "01", titleKey: "solution.step1Title", descKey: "solution.step1Desc" },
    { icon: Brain, step: "02", titleKey: "solution.step2Title", descKey: "solution.step2Desc" },
    { icon: FileText, step: "03", titleKey: "solution.step3Title", descKey: "solution.step3Desc" },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t("solution.label")}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            {t("solution.title")} <span className="text-gradient">{t("solution.titleHighlight")}</span>
          </h2>
          <p className="text-lg text-muted-foreground">{t("solution.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((item, i) => (
            <div key={i} className="relative group">
              <div className="p-8 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-300 hover:shadow-elevated">
                <span className="text-6xl font-display font-extrabold text-primary/10 absolute top-4 right-6">{item.step}</span>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-bold text-xl text-foreground mb-3">{t(item.titleKey)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(item.descKey)}</p>
              </div>
              {i < 2 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
