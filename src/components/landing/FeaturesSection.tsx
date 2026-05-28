import { Layers, Zap, FileDown, ShieldCheck, SearchCheck, Users, FileCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

const FeaturesSection = () => {
  const { t } = useTranslation();

  const features = [
    { icon: Layers, titleKey: "features.batchUpload", descKey: "features.batchUploadDesc" },
    { icon: Zap, titleKey: "features.aiGrading", descKey: "features.aiGradingDesc" },
    { icon: FileDown, titleKey: "features.export", descKey: "features.exportDesc" },
    { icon: ShieldCheck, titleKey: "features.privacy", descKey: "features.privacyDesc" },
    { icon: SearchCheck, titleKey: "features.analytics", descKey: "features.analyticsDesc" },
    { icon: Users, titleKey: "features.multiTeacher", descKey: "features.multiTeacherDesc" },
    { icon: FileCheck, titleKey: "features.primaryTitle", descKey: "features.primaryDesc" },
  ];

  return (
    <section id="features" className="py-20 lg:py-28 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t("features.label")}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            {t("features.title")}
          </h2>
          <p className="text-lg text-muted-foreground">{t("features.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((item, i) => (
            <div key={i} className="p-6 rounded-xl border border-border bg-background hover:border-primary/20 hover:shadow-card transition-all duration-300 group">
              <div className="w-11 h-11 rounded-lg bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center mb-4 transition-colors">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{t(item.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
