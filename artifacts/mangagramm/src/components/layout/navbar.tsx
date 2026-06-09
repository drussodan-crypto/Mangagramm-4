import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { Search, Bell, Menu, X, Sun, Moon, Monitor, User, LogOut, Settings, PenTool, Heart, History, MessageCircle, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ClassBadge } from "@/components/class-badge";
import { ProfileAvatar } from "@/components/profile-avatar";

function BrushLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 52" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="9" y="0" width="10" height="24" rx="5" fill="currentColor" opacity="0.9"/>
      <rect x="9" y="7" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.35"/>
      <rect x="9" y="11" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.35"/>
      <rect x="9" y="15" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.35"/>
      <rect x="7" y="24" width="14" height="6" rx="2" fill="currentColor" opacity="0.6"/>
      <rect x="7" y="24" width="14" height="2.5" rx="1" fill="currentColor" opacity="0.85"/>
      <path d="M7 30 L21 30 L19 38 L9 38 Z" fill="currentColor"/>
      <path d="M9 38 Q14 52 14 52 Q14 52 19 38 Z" fill="currentColor"/>
      <ellipse cx="14" cy="46" rx="2" ry="3.5" fill="currentColor" opacity="0.3"/>
    </svg>
  );
}

export function Navbar() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  const userXp = (user as any)?.xp || 0;

  // Poll unread message count
  useEffect(() => {
    if (!isAuthenticated) return;
    const poll = async () => {
      try {
        const r = await fetch("/api/messages/unread-count", { credentials: "include" });
        if (r.ok) { const d = await r.json(); setUnreadMessages(d.count || 0); }
      } catch {}
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, [isAuthenticated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* ── LOGO ── */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <BrushLogo className="w-6 h-9 text-foreground transition-transform group-hover:rotate-[-6deg]" />
          <span className="font-serif text-xl font-bold tracking-tight">MangaGramm</span>
        </Link>

        {/* ── NAV LINKS ── */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">{t("discover")}</Link>
          <Link href="/browse" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">{t("browse")}</Link>
          {isAuthenticated && (user as any)?.role === "author" && (
            <Link href="/dashboard" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">{t("dashboard")}</Link>
          )}
        </nav>

        {/* ── SEARCH ── */}
        <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("search")}
              className="pl-9 h-9 bg-secondary border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </form>

        {/* ── ACTIONS ── */}
        <div className="flex items-center gap-1">
          {/* Settings / Theme / Lang */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-quick-settings">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t("theme")}</p>
                <div className="grid grid-cols-3 gap-1">
                  {(["light", "dark", "system"] as const).map((th) => (
                    <button
                      key={th}
                      className={`flex flex-col items-center gap-1 p-2 rounded text-xs transition-colors ${theme === th ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                      onClick={() => setTheme(th)}
                      data-testid={`theme-${th}`}
                    >
                      {th === "light" && <Sun className="w-4 h-4" />}
                      {th === "dark" && <Moon className="w-4 h-4" />}
                      {th === "system" && <Monitor className="w-4 h-4" />}
                      {t(`themes.${th}`)}
                    </button>
                  ))}
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t("language")}</p>
                <div className="flex flex-wrap gap-1">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${i18n.language.startsWith(lang.code) ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                      onClick={() => i18n.changeLanguage(lang.code)}
                      data-testid={`lang-${lang.code}`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.code.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {isAuthenticated ? (
            <>
              {/* Messages */}
              <Link href="/messages">
                <Button variant="ghost" size="icon" className="h-9 w-9 relative" data-testid="button-messages">
                  <MessageCircle className="w-4 h-4" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Button>
              </Link>

              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-notifications">
                  <Bell className="w-4 h-4" />
                </Button>
              </Link>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2 rounded-full" data-testid="button-user-menu">
                    <ProfileAvatar
                      src={user?.avatar}
                      name={user?.displayName || user?.username}
                      xp={userXp}
                      size="xs"
                      showBadge
                      showOnline={false}
                    />
                    <div className="hidden sm:flex flex-col items-start leading-none">
                      <span className="text-xs font-medium max-w-[80px] truncate">{user?.displayName || user?.username}</span>
                      <ClassBadge xp={userXp} size="sm" className="mt-0.5" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
                    <p className="text-xs text-muted-foreground">@{user?.username}</p>
                    <ClassBadge xp={userXp} size="sm" className="mt-1" showXp />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation(`/profile/${user?.id}`)} data-testid="menu-profile">
                    <User className="w-4 h-4 mr-2" /> {t("profile")}
                  </DropdownMenuItem>
                  {(user as any)?.role === "author" && (
                    <DropdownMenuItem onClick={() => setLocation("/dashboard")} data-testid="menu-dashboard">
                      <PenTool className="w-4 h-4 mr-2" /> {t("dashboard")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setLocation("/messages")} data-testid="menu-messages">
                    <MessageCircle className="w-4 h-4 mr-2" /> Messages
                    {unreadMessages > 0 && <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-1.5">{unreadMessages}</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/favorites")} data-testid="menu-favorites">
                    <Heart className="w-4 h-4 mr-2" /> {t("favorites")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/history")} data-testid="menu-history">
                    <History className="w-4 h-4 mr-2" /> {t("history")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/coins")} data-testid="menu-coins">
                    🪙 Mes Coins
                  </DropdownMenuItem>
                  {(user as any)?.role === "author" && (
                    <DropdownMenuItem onClick={() => setLocation("/payouts")} data-testid="menu-payouts">
                      💰 Mes Revenus
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-settings">
                    <Settings className="w-4 h-4 mr-2" /> {t("settings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/rules")} data-testid="menu-rules">
                    <ScrollText className="w-4 h-4 mr-2" /> Règles de fonctionnement
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-2" /> {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={login} size="sm" data-testid="button-login">
              {t("login")}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-2">
          <form onSubmit={handleSearch} className="sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder={t("search")} className="pl-9 h-9 bg-secondary border-0" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </form>
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">{t("discover")}</Link>
          <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">{t("browse")}</Link>
          {isAuthenticated && (user as any)?.role === "author" && (
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">{t("dashboard")}</Link>
          )}
          {isAuthenticated && (
            <Link href="/messages" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">
              <MessageCircle className="w-4 h-4" /> Messages
              {unreadMessages > 0 && <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-1.5">{unreadMessages}</span>}
            </Link>
          )}
          {!isAuthenticated && (
            <Button onClick={login} className="w-full mt-2" size="sm">{t("login")}</Button>
          )}
        </div>
      )}
    </header>
  );
}
