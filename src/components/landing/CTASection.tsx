import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const CTASection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">{t("cta.subtitle")}</p>
          <Button size="lg" className="bg-gradient-hero hover:opacity-90 transition-opacity text-base px-8 py-6 shadow-glow">
            {t("cta.button")}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">{t("cta.note")}</p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
