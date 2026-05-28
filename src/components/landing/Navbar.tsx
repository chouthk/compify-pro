import { useState } from "react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Menu, X, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: "en", label: "English" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "zh-CN", label: "简体中文" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-bold text-lg text-foreground">Compify.Pro</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.features")}</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.howItWorks")}</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.pricing")}</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.testimonials")}</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Globe className="w-4 h-4" />
                  <span className="text-xs">{currentLang.label}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={i18n.language === lang.code ? "bg-accent/10 font-medium" : ""}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                  {t("nav.logIn")}
                </Button>
                <Button size="sm" className="bg-gradient-hero hover:opacity-90 transition-opacity" onClick={() => navigate("/signup")}>
                  {t("nav.startFreeTrial")}
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 space-y-3 animate-fade-up">
            <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground">{t("nav.features")}</a>
            <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground">{t("nav.howItWorks")}</a>
            <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground">{t("nav.pricing")}</a>
            <a href="#testimonials" className="block text-sm text-muted-foreground hover:text-foreground">{t("nav.testimonials")}</a>
            <div className="flex flex-wrap gap-3 pt-2">
              {languages.map((lang) => (
                <Button
                  key={lang.code}
                  variant={i18n.language === lang.code ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => i18n.changeLanguage(lang.code)}
                >
                  {lang.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              {user ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                    Dashboard
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                    {t("nav.logIn")}
                  </Button>
                  <Button size="sm" className="bg-gradient-hero" onClick={() => navigate("/signup")}>
                    {t("nav.startFreeTrial")}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
