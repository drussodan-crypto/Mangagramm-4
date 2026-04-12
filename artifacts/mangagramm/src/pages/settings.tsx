import { useEffect, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon, Monitor, Save } from "lucide-react";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      if (s.theme && s.theme !== "system") {
        setTheme(s.theme);
      }
    }
  }, [settings]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setAvatar(user.avatar || "");
    }
  }, [user]);

  const saveProfile = () => {
    updateProfile.mutate({ data: { displayName, bio, avatar: avatar || undefined } }, {
      onSuccess: (data: any) => {
        setUser(data);
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        toast({ title: "Profile updated" });
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
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved" });
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="page-settings">
      <h1 className="text-2xl font-serif font-bold mb-8">Settings</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} data-testid="input-display-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} data-testid="input-bio" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input id="avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." data-testid="input-avatar" />
            </div>
            <Button onClick={saveProfile} disabled={updateProfile.isPending} data-testid="button-save-profile">
              <Save className="w-4 h-4 mr-2" /> {updateProfile.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`p-3 rounded-lg border text-center text-sm transition-colors ${theme === "light" ? "border-foreground bg-accent" : "border-border hover:bg-accent/50"}`}
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                >
                  <Sun className="w-5 h-5 mx-auto mb-1" />
                  Light
                </button>
                <button
                  className={`p-3 rounded-lg border text-center text-sm transition-colors ${theme === "dark" ? "border-foreground bg-accent" : "border-border hover:bg-accent/50"}`}
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                >
                  <Moon className="w-5 h-5 mx-auto mb-1" />
                  Dark
                </button>
                <button
                  className={`p-3 rounded-lg border text-center text-sm transition-colors ${theme === "system" ? "border-foreground bg-accent" : "border-border hover:bg-accent/50"}`}
                  onClick={() => setTheme("system")}
                  data-testid="button-theme-system"
                >
                  <Monitor className="w-5 h-5 mx-auto mb-1" />
                  System
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Fran\u00e7ais</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-semibold mb-4">Reading</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reading Direction</Label>
              <Select value={readingDirection} onValueChange={setReadingDirection}>
                <SelectTrigger data-testid="select-reading-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ltr">Left to Right</SelectItem>
                  <SelectItem value="rtl">Right to Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Page Layout</Label>
              <Select value={pageLayout} onValueChange={setPageLayout}>
                <SelectTrigger data-testid="select-page-layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Page</SelectItem>
                  <SelectItem value="double">Double Page</SelectItem>
                  <SelectItem value="scroll">Scroll</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autoNext">Auto Next Chapter</Label>
              <Switch id="autoNext" checked={autoNextChapter} onCheckedChange={setAutoNextChapter} data-testid="switch-auto-next" />
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-semibold mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="emailNotif">Email Notifications</Label>
              <Switch id="emailNotif" checked={emailNotif} onCheckedChange={setEmailNotif} data-testid="switch-email-notif" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pushNotif">Push Notifications</Label>
              <Switch id="pushNotif" checked={pushNotif} onCheckedChange={setPushNotif} data-testid="switch-push-notif" />
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-semibold mb-4">Content</h2>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="matureToggle">Show Mature Content (18+)</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Enable to see age-restricted content</p>
            </div>
            <Switch id="matureToggle" checked={matureContent} onCheckedChange={setMatureContent} data-testid="switch-mature" />
          </div>
        </section>

        <Button onClick={saveSettings} disabled={updateSettings.isPending} className="w-full" data-testid="button-save-settings">
          <Save className="w-4 h-4 mr-2" /> {updateSettings.isPending ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
}
