import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

const TestimonialsSection = () => {
  const { t } = useTranslation();

  const testimonials = [
    { nameKey: "testimonials.t1Name", roleKey: "testimonials.t1Role", quoteKey: "testimonials.t1Quote", rating: 5 },
    { nameKey: "testimonials.t2Name", roleKey: "testimonials.t2Role", quoteKey: "testimonials.t2Quote", rating: 5 },
    { nameKey: "testimonials.t3Name", roleKey: "testimonials.t3Role", quoteKey: "testimonials.t3Quote", rating: 5 },
  ];

  return (
    <section id="testimonials" className="py-20 lg:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t("testimonials.label")}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            {t("testimonials.title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {testimonials.map((item, i) => (
            <div key={i} className="p-8 rounded-2xl border border-border bg-card shadow-card hover:shadow-elevated transition-shadow duration-300">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: item.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground text-sm leading-relaxed mb-6">"{t(item.quoteKey)}"</p>
              <div>
                <p className="font-display font-semibold text-foreground">{t(item.nameKey)}</p>
                <p className="text-xs text-muted-foreground">{t(item.roleKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
