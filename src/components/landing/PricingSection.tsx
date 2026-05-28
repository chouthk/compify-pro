import { Button } from "@/components/ui/button";
import { Check, FileText, ShieldCheck, TicketPercent, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CREDIT_PACK, TIERS, TierKey } from "@/lib/stripe-tiers";
import { toast } from "sonner";
import { useState } from "react";

const PricingSection = () => {
  const { t } = useTranslation();
  const { user, tier: currentTier } = useAuth();
  const navigate = useNavigate();
  const [loadingTier, setLoadingTier] = useState<TierKey | null>(null);

  const handleCheckout = async (tierKey: TierKey, mode: "subscription" | "payment" = "subscription") => {
    if (!user) {
      navigate("/signup");
      return;
    }
    if (tierKey === "free") return;

    const priceId = TIERS[tierKey].price_id;
    if (!priceId) return;

    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, mode },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleCreditCheckout = async () => {
    if (!user) {
      navigate("/signup");
      return;
    }

    setLoadingTier("free");
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: CREDIT_PACK.price_id, mode: "payment" },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  const plans: { tierKey: TierKey; nameKey: string; priceKey: string; periodKey: string; descKey: string; features: string[]; ctaKey: string; highlighted: boolean }[] = [
    {
      tierKey: "free",
      nameKey: "pricing.freeName",
      priceKey: "pricing.freePrice",
      periodKey: "pricing.freePeriod",
      descKey: "pricing.freeDesc",
      features: ["pricing.freeF1", "pricing.freeF2", "pricing.freeF3", "pricing.freeF4"],
      ctaKey: "pricing.freeCta",
      highlighted: false,
    },
    {
      tierKey: "pro",
      nameKey: "pricing.proName",
      priceKey: "pricing.proPrice",
      periodKey: "pricing.proPeriod",
      descKey: "pricing.proDesc",
      features: ["pricing.proF1", "pricing.proF2", "pricing.proF3", "pricing.proF4", "pricing.proF5", "pricing.proF6"],
      ctaKey: "pricing.proCta",
      highlighted: true,
    },
    {
      tierKey: "school",
      nameKey: "pricing.schoolName",
      priceKey: "pricing.schoolPrice",
      periodKey: "pricing.schoolPeriod",
      descKey: "pricing.schoolDesc",
      features: ["pricing.schoolF1", "pricing.schoolF2", "pricing.schoolF3", "pricing.schoolF4", "pricing.schoolF5", "pricing.schoolF6"],
      ctaKey: "pricing.schoolCta",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t("pricing.label")}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-foreground mb-4">
            {t("pricing.title")}
          </h2>
          <p className="text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>

        <div className="max-w-5xl mx-auto mb-10 rounded-lg border border-primary/20 bg-background shadow-elevated p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <TicketPercent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-display font-bold text-xl text-foreground">{t("pricing.earlyBirdTitle")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("pricing.earlyBirdDesc")}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center lg:min-w-80">
              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t("pricing.betaLabel")}</p>
                <p className="font-display font-bold text-lg text-foreground">Beta</p>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t("pricing.earlyBirdPriceLabel")}</p>
                <p className="font-display font-bold text-lg text-primary">HK$168</p>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{t("pricing.seatsLabel")}</p>
                <p className="font-display font-bold text-lg text-foreground">100</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
          {plans.map((plan, i) => {
            const isCurrentPlan = currentTier === plan.tierKey;
            return (
              <div
                key={i}
                className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                  plan.highlighted
                    ? "border-primary bg-background shadow-elevated scale-105"
                    : "border-border bg-background shadow-card hover:shadow-elevated"
                } ${isCurrentPlan ? "ring-2 ring-primary" : ""}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-gradient-hero text-primary-foreground text-xs font-semibold">
                      {t("pricing.mostPopular")}
                    </span>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      Your Plan
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-display font-bold text-xl text-foreground mb-1">{t(plan.nameKey)}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t(plan.descKey)}</p>
                  {plan.tierKey === "pro" && (
                    <div className="mb-3 flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground line-through">{t("pricing.proOriginalPrice")}</span>
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                        {t("pricing.earlyBirdBadge")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-extrabold text-4xl text-foreground">{t(plan.priceKey)}</span>
                    <span className="text-sm text-muted-foreground">{t(plan.periodKey)}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((featureKey, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground">{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.highlighted ? "bg-gradient-hero hover:opacity-90 transition-opacity" : ""
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                  size="lg"
                  disabled={isCurrentPlan || loadingTier === plan.tierKey}
                  onClick={() => handleCheckout(plan.tierKey)}
                >
                  {isCurrentPlan ? "Current Plan" : loadingTier === plan.tierKey ? "Loading..." : t(plan.ctaKey)}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="max-w-5xl mx-auto mt-8 rounded-lg border border-border bg-background shadow-card p-6 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-display font-bold text-xl text-foreground">{t("pricing.creditName")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("pricing.creditDesc")}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {["pricing.creditF1", "pricing.creditF2", "pricing.creditF3"].map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{t(feature)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-5">
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-display font-extrabold text-4xl text-foreground">{t("pricing.creditPrice")}</span>
                <span className="text-sm text-muted-foreground">{t("pricing.creditPeriod")}</span>
              </div>
              <Button className="w-full" variant="outline" size="lg" onClick={handleCreditCheckout} disabled={loadingTier === "free"}>
                {loadingTier === "free" ? "Loading..." : t("pricing.creditCta")}
              </Button>
            </div>
          </div>
        </div>

        <p className="max-w-5xl mx-auto mt-6 flex items-start gap-2 text-xs text-muted-foreground">
          <FileText className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("pricing.termsNote")}</span>
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
