import { Clock, AlertTriangle, TrendingDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const ProblemSection = () => {
  const { t } = useTranslation();

  const problems = [
    { icon: Clock, titleKey: "problem.item1Title", descKey: "problem.item1Desc" },
    { icon: AlertTriangle, titleKey: "problem.item2Title", descKey: "problem.item2Desc" },
    { icon: TrendingDown, titleKey: "problem.item3Title", descKey: "problem.item3Desc" },
  ];

  return (
    <section className="py-20 lg:py-28 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-3">{t("problem.label")}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            {t("problem.title")}
          </h2>
          <p className="text-lg text-muted-foreground">{t("problem.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {problems.map((item, i) => (
            <div key={i} className="text-center p-8 rounded-2xl border border-border bg-background shadow-card hover:shadow-elevated transition-shadow duration-300">
              <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-5">
                <item.icon className="w-7 h-7 text-destructive" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">{t(item.titleKey)}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{t(item.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
