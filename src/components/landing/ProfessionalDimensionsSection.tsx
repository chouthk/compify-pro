import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { BarChart3, BookOpenCheck, Languages, Network } from "lucide-react";
import { useTranslation } from "react-i18next";

const dimensions = [
  { key: "content", icon: BookOpenCheck, score: 86 },
  { key: "language", icon: Languages, score: 72 },
  { key: "organization", icon: Network, score: 79 },
];

const radarData = [
  { metric: "Content", score: 86 },
  { metric: "Language", score: 72 },
  { metric: "Organization", score: 79 },
];

const ProfessionalDimensionsSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 lg:py-28 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-primary/20 bg-primary/5 mb-5">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{t("dimensions.label")}</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground mb-5">
            {t("dimensions.title")}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{t("dimensions.subtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">
          <div className="space-y-4">
            {dimensions.map(({ key, icon: Icon, score }) => (
              <article key={key} className="rounded-lg border border-border bg-background p-5 shadow-card">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <h3 className="font-display text-xl font-bold text-foreground">
                        {t(`dimensions.${key}Title`)}
                      </h3>
                      <span className="text-sm font-bold text-primary">{score}/100</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {t(`dimensions.${key}Desc`)}
                    </p>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-background p-5 sm:p-8 shadow-elevated">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-primary">{t("dimensions.chartEyebrow")}</p>
                <h3 className="font-display text-2xl font-bold text-foreground">{t("dimensions.chartTitle")}</h3>
              </div>
              <span className="rounded-md bg-primary/10 px-3 py-2 text-sm font-bold text-primary">DSE</span>
            </div>
            <div className="h-[280px] sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.22} strokeWidth={3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">{t("dimensions.chartNote")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalDimensionsSection;