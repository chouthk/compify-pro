import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, Image } from "lucide-react";

interface SchoolLogoUploadProps {
  /** Called with a data URL whenever the logo changes (or null if removed) */
  onLogoChange: (dataUrl: string | null) => void;
}

export default function SchoolLogoUpload({ onLogoChange }: SchoolLogoUploadProps) {
  const { t } = useTranslation();
  const { user, tier } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPaidTier = tier === "pro" || tier === "school";

  // Load existing logo on mount
  useEffect(() => {
    if (!user || !isPaidTier) return;
    const path = `${user.id}/logo.png`;
    const { data } = supabase.storage.from("school-logos").getPublicUrl(path);
    // Check if the logo actually exists by fetching it
    fetch(data.publicUrl, { method: "HEAD" })
      .then((res) => {
        if (res.ok) {
          setLogoUrl(data.publicUrl);
          // Also convert to data URL for PDF
          fetch(data.publicUrl)
            .then((r) => r.blob())
            .then((blob) => {
              const reader = new FileReader();
              reader.onload = () => onLogoChange(reader.result as string);
              reader.readAsDataURL(blob);
            });
        }
      })
      .catch(() => {});
  }, [user, isPaidTier]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("logo.invalidType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("logo.tooLarge"));
      return;
    }

    setUploading(true);
    try {
      const path = `${user.id}/logo.png`;
      const { error } = await supabase.storage
        .from("school-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;

      const { data } = supabase.storage.from("school-logos").getPublicUrl(path);
      setLogoUrl(data.publicUrl + "?t=" + Date.now());

      // Convert to data URL for PDF
      const reader = new FileReader();
      reader.onload = () => onLogoChange(reader.result as string);
      reader.readAsDataURL(file);

      toast.success(t("logo.uploaded"));
    } catch (err: any) {
      toast.error(err.message || t("logo.uploadError"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    try {
      await supabase.storage.from("school-logos").remove([`${user.id}/logo.png`]);
      setLogoUrl(null);
      onLogoChange(null);
      toast.success(t("logo.removed"));
    } catch {
      toast.error(t("logo.removeError"));
    }
  };

  if (!isPaidTier) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
      <Image className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{t("logo.title")}</p>
        <p className="text-xs text-muted-foreground">{t("logo.desc")}</p>
      </div>
      {logoUrl ? (
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRemove}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={uploading}>
            <Upload className="h-3 w-3" />
            {uploading ? "..." : t("logo.upload")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
