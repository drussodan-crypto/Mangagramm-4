import { useState, useRef, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetUserProfile, useGetUserSeries, getGetUserProfileQueryKey, getGetUserSeriesQueryKey } from "@workspace/api-client-react";
import { SeriesCard } from "@/components/series-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Layers, Grid2x2, MessageCircle, UserPlus, UserCheck, PenTool, Upload, X, Check, Loader2, Heart, BookOpen } from "lucide-react";
import { ClassBadge, XpProgressBar } from "@/components/class-badge";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useAuth } from "@/lib/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type Tab = "series" | "chapters";

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const uId = parseInt(userId || "0", 10);
  const { user: currentUser, setUser } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("series");
  const [chapters, setChapters] = useState<any[] | null>(null);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useGetUserProfile(uId, {
    query: { enabled: !!uId, queryKey: getGetUserProfileQueryKey(uId) },
  });

  const { data: series } = useGetUserSeries(uId, {
    query: { enabled: !!uId, queryKey: getGetUserSeriesQueryKey(uId) },
  });

  const isOwner = currentUser?.id === uId;
  const p = profile as any;

  useEffect(() => {
    if (!isOwner && uId) {
      fetch(`/api/follows/${uId}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) { setFollowing(d.following); setFollowersCount(d.followersCount); } })
        .catch(() => {});
    }
  }, [uId, isOwner]);

  const startEditing = () => {
    setEditName(p?.displayName || p?.username || "");
    setEditBio(p?.bio || "");
    setEditAvatar(p?.avatar || "");
    setEditing(true);
  };

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
      setEditAvatar(`/api/storage${objectPath}`);
    } catch {
      toast({ title: "Erreur d'upload", variant: "destructive" });
    } finally { setUploadingAvatar(false); }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const r = await fetch("/api/users/me/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: editName, bio: editBio, avatar: editAvatar }),
      });
      if (r.ok) {
        const updated = await r.json();
        if (setUser) setUser({ ...currentUser!, displayName: updated.displayName, avatar: updated.avatar, bio: updated.bio });
        queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey(uId) });
        toast({ title: "✓ Profil mis à jour" });
        setEditing(false);
      }
    } finally { setSavingProfile(false); }
  };

  const handleFollow = async () => {
    const r = await fetch(`/api/follows/${uId}`, { method: "POST", credentials: "include" });
    if (r.ok) {
      const data = await r.json();
      setFollowing(data.following);
      setFollowersCount(data.followersCount);
    }
  };

  const startDM = async () => {
    const r = await fetch("/api/messages/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ recipientId: uId }),
    });
    if (r.ok) setLocation("/messages");
  };

  const loadChapters = async () => {
    if (chapters) return;
    setChaptersLoading(true);
    try {
      const res = await fetch(`/api/users/${uId}/chapters`, { credentials: "include" });
      if (res.ok) setChapters(await res.json());
    } catch { setChapters([]); }
    finally { setChaptersLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex gap-6"><Skeleton className="h-28 w-28 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-6 w-1/3" /><Skeleton className="h-4 w-1/2" /></div></div>
      </div>
    );
  }

  if (!profile) return <div className="text-center py-20 text-muted-foreground">Utilisateur introuvable</div>;

  const xp = p?.xp || 0;
  const avatarToShow = editing ? editAvatar : p?.avatar;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-profile">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {/* Avatar with badge overlay + online dot */}
        <div className="relative shrink-0" style={{ width: 112, height: 112 }}>
          <ProfileAvatar
            src={avatarToShow}
            name={p?.displayName || p?.username}
            xp={xp}
            size="xl"
            showOnline
            lastSeenAt={p?.lastSeenAt}
            hideOnlineStatus={p?.hideOnlineStatus}
          />
          {editing && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 text-white opacity-0 hover:opacity-100 transition-opacity z-20"
            >
              {uploadingAvatar ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />

        {/* Info / Edit form */}
        <div className="space-y-3 flex-1">
          {!editing ? (
            <>
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h1 className="text-2xl font-serif font-bold">{p?.displayName || p?.username}</h1>
                  <ClassBadge xp={xp} size="sm" />
                  {p?.role === "author" && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Auteur</span>}
                </div>
                <p className="text-sm text-muted-foreground">@{p?.username}</p>
                {p?.bio && <p className="text-sm mt-2 text-foreground/80">{p.bio}</p>}
              </div>

              <XpProgressBar xp={xp} />

              <div className="flex gap-5 text-sm">
                <div className="text-center cursor-pointer hover:opacity-70">
                  <p className="font-bold">{followersCount ?? p?.followersCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Abonnés</p>
                </div>
                <div className="text-center cursor-pointer hover:opacity-70">
                  <p className="font-bold">{p?.followingCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Abonnements</p>
                </div>
                <div className="text-center">
                  <p className="font-bold">{p?.seriesCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Séries</p>
                </div>
                {p?.role === "author" && (
                  <div className="text-center">
                    <p className="font-bold">{(p?.totalViews || 0).toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5"><Eye className="w-3 h-3" />Vues</p>
                  </div>
                )}
                {p?.role === "author" && (
                  <div className="text-center">
                    <p className="font-bold">{(p?.totalLikes || 0).toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5"><Heart className="w-3 h-3" />Likes</p>
                  </div>
                )}
                {p?.role === "author" && (
                  <div className="text-center">
                    <p className="font-bold">{(p?.totalReads || 0).toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5"><BookOpen className="w-3 h-3" />Lectures</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isOwner ? (
                  <>
                    <Button size="sm" variant="outline" onClick={startEditing} className="gap-1">
                      <PenTool className="w-3.5 h-3.5" /> Modifier le profil
                    </Button>
                    <Link href="/settings">
                      <Button size="sm" variant="ghost">Paramètres</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    {currentUser && (
                      <Button size="sm" variant={following ? "secondary" : "default"} onClick={handleFollow} className="gap-1">
                        {following ? <><UserCheck className="w-3.5 h-3.5" /> Suivi</> : <><UserPlus className="w-3.5 h-3.5" /> Suivre</>}
                      </Button>
                    )}
                    {currentUser && (
                      <Button size="sm" variant="outline" onClick={startDM} className="gap-1">
                        <MessageCircle className="w-3.5 h-3.5" /> Message
                      </Button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3 max-w-sm">
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Nom affiché</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Votre nom" className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Bio</label>
                <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="Parlez de vous…" className="min-h-[80px] resize-none text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">💡 Cliquez sur la photo pour changer l'avatar</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveProfile} disabled={savingProfile} className="gap-1">
                  {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="gap-1">
                  <X className="w-3.5 h-3.5" /> Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex border-b border-border mb-6">
        {[
          { id: "series" as Tab, label: "Séries", icon: <Grid2x2 className="w-4 h-4" /> },
          { id: "chapters" as Tab, label: "Chapitres", icon: <Layers className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === "chapters") loadChapters(); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "series" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {((series as any[]) || []).map((s: any) => (
            <SeriesCard key={s.id} series={{ ...s, authorName: p?.displayName || p?.username, authorAvatar: p?.avatar }} />
          ))}
          {((series as any[]) || []).length === 0 && (
            <p className="col-span-4 text-center py-12 text-sm text-muted-foreground">Aucune série publiée</p>
          )}
        </div>
      )}

      {tab === "chapters" && (
        <div className="space-y-2">
          {chaptersLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
          {!chaptersLoading && (chapters || []).map((c: any) => (
            <Link key={c.id} href={`/read/${c.id}`}>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground font-mono shrink-0">Ch.{c.number}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.seriesTitle}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Eye className="w-3 h-3" />{c.viewCount}
                </span>
              </div>
            </Link>
          ))}
          {!chaptersLoading && (chapters || []).length === 0 && (
            <p className="text-center py-12 text-sm text-muted-foreground">Aucun chapitre publié</p>
          )}
        </div>
      )}
    </div>
  );
}
