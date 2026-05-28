import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Send, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ContactFormSection = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", position: "", monthlyVolume: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.position || !form.monthlyVolume) {
      toast.error(t("contact.required"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-enquiry", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          position: form.position,
          monthly_volume: parseInt(form.monthlyVolume, 10),
        },
      });
      if (error) throw error;
      toast.success(t("contact.success"));
      setForm({ name: "", email: "", position: "", monthlyVolume: "" });
    } catch {
      toast.error(t("contact.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="py-20 lg:py-28 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-foreground mb-3">
              {t("contact.title")}
            </h2>
            <p className="text-muted-foreground">{t("contact.subtitle")}</p>
            <a
              href="mailto:admin@compify.pro"
              className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              admin@compify.pro
            </a>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 bg-background rounded-xl border border-border p-6 sm:p-8 shadow-card">
            <div className="space-y-2">
              <Label htmlFor="name">{t("contact.name")}</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("contact.namePlaceholder")}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("contact.email")}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t("contact.emailPlaceholder")}
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("contact.position")}</Label>
              <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("contact.positionPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">{t("contact.posPrincipal")}</SelectItem>
                  <SelectItem value="head">{t("contact.posHead")}</SelectItem>
                  <SelectItem value="teacher">{t("contact.posTeacher")}</SelectItem>
                  <SelectItem value="other">{t("contact.posOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">{t("contact.volume")}</Label>
              <Input
                id="volume"
                type="number"
                min={1}
                max={99999}
                value={form.monthlyVolume}
                onChange={(e) => setForm({ ...form, monthlyVolume: e.target.value })}
                placeholder={t("contact.volumePlaceholder")}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-gradient-hero hover:opacity-90 transition-opacity" disabled={loading}>
              <Send className="mr-2 w-4 h-4" />
              {loading ? t("contact.sending") : t("contact.submit")}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactFormSection;
