import { useState } from "react";
import Logo from "@/components/Logo";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const Signup = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate referral code if provided
    if (referralCode.trim()) {
      const { data: codeData } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("code", referralCode.trim().toUpperCase())
        .maybeSingle();
      if (!codeData) {
        toast.error(t("referral.invalidCode"));
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          referral_code: referralCode.trim().toUpperCase() || undefined,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email to confirm your account!");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Logo />
            <span className="font-display font-bold text-lg text-foreground">Compify</span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-foreground">{t("nav.startFreeTrial")}</h1>
          <p className="text-sm text-muted-foreground mt-1">Create your free account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4 p-8 rounded-2xl border border-border bg-card shadow-card">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Ms. Johnson"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="referral">{t("referral.codeLabel")}</Label>
            <Input
              id="referral"
              type="text"
              placeholder={t("referral.codePlaceholder")}
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="font-mono uppercase tracking-widest"
            />
            <p className="text-xs text-muted-foreground">{t("referral.codeHint")}</p>
          </div>
          <Button type="submit" className="w-full bg-gradient-hero hover:opacity-90" disabled={loading}>
            {loading ? "Creating account..." : t("nav.startFreeTrial")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
