import { useTranslation } from "react-i18next";
import Logo from "@/components/Logo";
import { FileDown, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportInstitutionQuotationPDF } from "@/lib/pdf-report";

const Footer = () => {
  const { t } = useTranslation();

  const handleQuotationDownload = () => {
    exportInstitutionQuotationPDF();
  };

  return (
    <footer className="py-12 border-t border-border bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-display font-bold text-foreground">Compify.Pro</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleQuotationDownload} className="gap-2">
            <FileDown className="w-4 h-4" />
            {t("footer.institutionQuotation")}
          </Button>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="mailto:admin@compify.pro" className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              admin@compify.pro
            </a>
            <a href="#" className="hover:text-foreground transition-colors">{t("footer.privacy")}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t("footer.terms")}</a>
            <a href="#" className="hover:text-foreground transition-colors">{t("footer.support")}</a>
          </div>
          <p className="text-xs text-muted-foreground">{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
