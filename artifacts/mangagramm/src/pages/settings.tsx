import { useEffect, useState, useRef } from "react";
import { useGetSettings, useUpdateSettings, useUpdateProfile, getGetSettingsQueryKey, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon, Monitor, Save, Upload, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [matureContent, setMatureContent] = useState(false);
  const [readingDirection, setReadingDirection] = useState("ltr");
  const [autoNextChapter, setAutoNextChapter] = useState(true);
  const [pageLayout, setPageLayout] = useState("scroll");
  const [language, setLanguage] = useState("fr");
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);

  useEffect(() => {
    if (settings) {
      const s = settings as any;
      setEmailNotif(s.emailNotifications ?? true);
      setPushNotif(s.pushNotifications ?? true);
      setMatureContent(s.matureContent ?? false);
      setReadingDirection(s.readingDirection || "ltr");
      setAutoNextChapter(s.autoNextChapter ?? true);
      setPageLayout(s.pageLayout || "scroll");
      setLanguage(s.language || "fr");
      setHideOnlineStatus(s.hideOnlineStatus ?? false);
      if (s.theme && s.theme !== "system") setTheme(s.theme);
    }
  }, [settings]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio((user as any).bio || "");
      setAvatar(user.avatar || "");
    }
  }, [user]);

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const meta = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!meta.ok) throw new Error();
      const { uploadURL, objectPath } = await meta.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setAvatar(`/api/storage${objectPath}`);
      toast({ title: "✓ Photo uploadée — sauvegardez le profil pour confirmer" });
    } catch {
      toast({ title: "Erreur d'upload", variant: "destructive" });
    } finally { setUploadingAvatar(false); }
  };

  const saveProfile = () => {
    updateProfile.mutate({ data: { displayName, bio, avatar: avatar || undefined } }, {
      onSuccess: (data: any) => {
        setUser(data);
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        toast({ title: "✓ Profil mis à jour" });
      },
    });
  };

  const saveSettings = () => {
    updateSettings.mutate({
      data: {
        theme: theme as any,
        emailNotifications: emailNotif,
        pushNotifications: pushNotif,
        matureContent,
        readingDirection: readingDirection as any,
        autoNextChapter,
        pageLayout: pageLayout as any,
        language,
        hideOnlineStatus,
      } as any,
    }, {
      onSuccess: () => {
        i18n.changeLanguage(language);
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "✓ Paramètres sauvegardés" });
      },
    });
  };

  if (!user) return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted-foreground">Connectez-vous pour accéder aux paramètres.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="page-settings">
      <h1 className="text-2xl font-serif font-bold mb-8">Paramètres</h1>

      <div className="space-y-8">

        {/* ── PROFIL ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Profil</h2>
          <div className="space-y-4">
            {/* Avatar upload */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {(displayName || user.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100 transition-opacity"
                >
                  {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </button>
              </div>
              <div>
                <p className="text-sm font-medium">Photo de profil</p>
                <p className="text-xs text-muted-foreground">Cliquez sur la photo pour changer</p>
                <Button size="sm" variant="outline" className="mt-1 h-7 text-xs gap-1" onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}>
                  {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Depuis la galerie
                </Button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Nom affiché</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="input-display-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} data-testid="input-bio" />
            </div>
            <Button onClick={saveProfile} disabled={updateProfile.isPending} data-testid="button-save-profile">
              <Save className="w-4 h-4 mr-2" /> {updateProfile.isPending ? "Sauvegarde…" : "Sauvegarder le profil"}
            </Button>
          </div>
        </section>

        <Separator />

        {/* ── APPARENCE ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Apparence</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Thème</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: "light", label: "Clair", icon: <Sun className="w-5 h-5 mx-auto mb-1" /> },
                  { val: "dark", label: "Sombre", icon: <Moon className="w-5 h-5 mx-auto mb-1" /> },
                  { val: "system", label: "Système", icon: <Monitor className="w-5 h-5 mx-auto mb-1" /> },
                ].map(t => (
                  <button
                    key={t.val}
                    className={`p-3 rounded-lg border text-center text-sm transition-colors ${theme === t.val ? "border-foreground bg-accent" : "border-border hover:bg-accent/50"}`}
                    onClick={() => setTheme(t.val as any)}
                    data-testid={`button-theme-${t.val}`}
                  >
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Langue</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger data-testid="select-language"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                  <SelectItem value="ko">🇰🇷 한국어</SelectItem>
                  <SelectItem value="es">🇪🇸 Español</SelectItem>
                  <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                  <SelectItem value="zh">🇨🇳 中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator />

        {/* ── LECTURE ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Lecture</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sens de lecture</Label>
              <Select value={readingDirection} onValueChange={setReadingDirection}>
                <SelectTrigger data-testid="select-reading-direction"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ltr">Gauche → Droite</SelectItem>
                  <SelectItem value="rtl">Droite → Gauche</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mise en page</Label>
              <Select value={pageLayout} onValueChange={setPageLayout}>
                <SelectTrigger data-testid="select-page-layout"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Page unique</SelectItem>
                  <SelectItem value="double">Double page</SelectItem>
                  <SelectItem value="scroll">Défilement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoNext">Chapitre suivant automatique</Label>
              <Switch id="autoNext" checked={autoNextChapter} onCheckedChange={setAutoNextChapter} data-testid="switch-auto-next" />
            </div>
          </div>
        </section>

        <Separator />

        {/* ── CONFIDENTIALITÉ ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Confidentialité</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="hideOnline">Masquer le statut En ligne</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Les autres ne verront pas si vous êtes connecté</p>
              </div>
              <Switch id="hideOnline" checked={hideOnlineStatus} onCheckedChange={setHideOnlineStatus} data-testid="switch-hide-online" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="matureToggle">Contenu mature (18+)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Afficher le contenu pour adultes</p>
              </div>
              <Switch id="matureToggle" checked={matureContent} onCheckedChange={setMatureContent} data-testid="switch-mature" />
            </div>
          </div>
        </section>

        <Separator />

        {/* ── NOTIFICATIONS ── */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailNotif">Notifications email</Label>
              <Switch id="emailNotif" checked={emailNotif} onCheckedChange={setEmailNotif} data-testid="switch-email-notif" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pushNotif">Notifications push</Label>
              <Switch id="pushNotif" checked={pushNotif} onCheckedChange={setPushNotif} data-testid="switch-push-notif" />
            </div>
          </div>
        </section>

        <Button onClick={saveSettings} disabled={updateSettings.isPending} className="w-full" data-testid="button-save-settings">
          <Save className="w-4 h-4 mr-2" /> {updateSettings.isPending ? "Sauvegarde…" : "Sauvegarder tous les paramètres"}
        </Button>
      </div>
    </div>
  );
}
