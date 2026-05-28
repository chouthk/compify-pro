import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TIERS } from "@/lib/stripe-tiers";
import { Copy, Gift, Shield, TicketCheck } from "lucide-react";

const Dashboard = () => {
  const { user, signOut, tier, subscribed, subscriptionEnd, refreshSubscription, isAdmin, reportCredits, refreshReportCredits } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [monthlyCount, setMonthlyCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success(t("dashboard.subscriptionActivated"));
      refreshSubscription();
      if (searchParams.get("purchase") === "credits") {
        const sessionId = searchParams.get("session_id");
        if (sessionId) {
          supabase.functions.invoke("claim-report-credits", { body: { sessionId } })
            .then(({ error }) => {
              if (error) throw error;
              toast.success(t("dashboard.creditsActivated"));
              refreshReportCredits();
            })
            .catch((err) => toast.error(err.message || t("dashboard.creditsFailed")));
        }
      }
    } else if (checkout === "cancelled") {
      toast.info(t("dashboard.checkoutCancelled"));
    }
  }, [searchParams, user, refreshSubscription, t]);

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabase
        .from("essays")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth);
      setMonthlyCount(count ?? 0);
    };
    fetchCount();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to open subscription portal");
    }
  };

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchReferral = async () => {
      setLoadingCode(true);
      try {
        const { data, error } = await supabase.rpc("get_my_referral_code");
        if (!error && data) setReferralCode(data as string);
      } catch (err) {
        console.error("Failed to get referral code:", err);
      } finally {
        setLoadingCode(false);
      }

      const { count } = await supabase
        .from("referral_rewards")
        .select("*", { count: "exact", head: true })
        .eq("referrer_user_id", user.id);
      setReferralCount(count ?? 0);
    };
    fetchReferral();
  }, [user]);

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success(t("referral.copied"));
    }
  };

  const tierInfo = TIERS[tier];
  const essayLimit = tierInfo.essayLimit;
  const usagePercent = essayLimit === Infinity ? 0 : Math.min((monthlyCount / essayLimit) * 100, 100);
  const estimatedTimeSaved = Math.round(monthlyCount * 0.4 * 10) / 10; // ~24 min per essay

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-bold text-lg text-foreground">Compify.Pro</span>
          </a>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-1">
                <Shield className="w-3 h-3" /> Admin
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              {t("dashboard.signOut")}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl text-foreground mb-2">{t("dashboard.title")}</h1>
            <p className="text-muted-foreground">{t("dashboard.welcome")}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => navigate("/analytics")} className="gap-2">
              <span>📊</span> {t("analytics.viewAnalytics")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/exemplars")} className="gap-2">
              <span>📚</span> {t("analytics.viewExemplars")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/class-roster")} className="gap-2">
              <span>👥</span> {t("roster.manageRoster")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/batch-grade")} className="gap-2">
              <span>📦</span> {t("batch.batchGrade")}
            </Button>
            <Button onClick={() => navigate("/grade")} className="gap-2">
              <span>✨</span> {t("dashboard.gradeEssay")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
            <p className="text-sm text-muted-foreground mb-1">{t("dashboard.essaysGraded")}</p>
            <p className="font-display font-bold text-3xl text-foreground">
              {monthlyCount} / {essayLimit === Infinity ? "∞" : essayLimit}
            </p>
            {essayLimit !== Infinity && (
              <div className="mt-3">
                <div className="w-full h-2 rounded-full bg-secondary">
                  <div
                    className={`h-2 rounded-full transition-all ${usagePercent >= 100 ? "bg-destructive" : usagePercent >= 80 ? "bg-accent" : "bg-primary"}`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.monthlyUsage")}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">{t("dashboard.planLimit", { name: tierInfo.name })}</p>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
            <p className="text-sm text-muted-foreground mb-1">{t("dashboard.plan")}</p>
            <p className="font-display font-bold text-3xl text-foreground">{tierInfo.name}</p>
            {subscriptionEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("dashboard.renews", { date: new Date(subscriptionEnd).toLocaleDateString() })}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              {isAdmin ? (
                <span className="text-xs font-medium text-primary">✦ Unlimited (Admin)</span>
              ) : !subscribed ? (
                <Button variant="outline" size="sm" onClick={() => navigate("/#pricing")}>
                  {t("dashboard.upgrade")}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleManageSubscription}>
                  {t("dashboard.manage")}
                </Button>
              )}
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
            <p className="text-sm text-muted-foreground mb-1">{t("dashboard.timeSaved")}</p>
            <p className="font-display font-bold text-3xl text-foreground">{estimatedTimeSaved} hrs</p>
            <p className="text-xs text-muted-foreground mt-2">
              {monthlyCount > 0 ? t("dashboard.timeSavedDesc") : t("dashboard.startGrading")}
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-border bg-card shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <TicketCheck className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">{t("dashboard.reportCredits")}</p>
            </div>
            <p className="font-display font-bold text-3xl text-foreground">{reportCredits}</p>
            <p className="text-xs text-muted-foreground mt-2">{t("dashboard.reportCreditsDesc")}</p>
          </div>
        </div>

        {/* Referral Code Section — always visible */}
        <div className="mt-6 p-6 rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center gap-3 mb-3">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-lg text-foreground">{t("referral.title")}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{t("referral.description")}</p>
          {referralCode ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-2.5 rounded-lg bg-muted border border-border font-mono text-lg font-bold text-foreground tracking-widest">
                  {referralCode}
                </div>
                <Button variant="outline" size="sm" onClick={copyReferralCode} className="gap-1.5">
                  <Copy className="w-4 h-4" />
                  {t("referral.copy")}
                </Button>
              </div>
              {referralCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("referral.rewardCount", { count: referralCount })}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {loadingCode ? t("referral.generating") : t("referral.generate")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
