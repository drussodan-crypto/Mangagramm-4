import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { Search, Bell, Menu, X, Sun, Moon, Monitor, BookOpen, User, LogOut, Settings, PenTool, Heart, History, Globe, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileMenuOpen(false);
    }
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => i18n.language.startsWith(l.code)) || SUPPORTED_LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <BookOpen className="w-7 h-7" strokeWidth={2.5} />
          <span className="font-serif text-xl font-bold tracking-tight hidden sm:inline">MangaGramm</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">{t("discover")}</Link>
          <Link href="/browse" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">{t("browse")}</Link>
          {isAuthenticated && user?.role === "author" && (
            <Link href="/dashboard" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors">{t("dashboard")}</Link>
          )}
        </nav>

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

        <div className="flex items-center gap-1">
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
              {isAuthenticated && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/settings")}>
                    <Settings className="w-4 h-4 mr-2" /> {t("settings")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {isAuthenticated ? (
            <>
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-notifications">
                  <Bell className="w-4 h-4" />
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar || ""} />
                      <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                        {(user?.displayName || user?.username || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
                    <p className="text-xs text-muted-foreground">@{user?.username}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation(`/profile/${user?.id}`)} data-testid="menu-profile">
                    <User className="w-4 h-4 mr-2" /> {t("profile")}
                  </DropdownMenuItem>
                  {user?.role === "author" && (
                    <DropdownMenuItem onClick={() => setLocation("/dashboard")} data-testid="menu-dashboard">
                      <PenTool className="w-4 h-4 mr-2" /> {t("dashboard")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setLocation("/favorites")} data-testid="menu-favorites">
                    <Heart className="w-4 h-4 mr-2" /> {t("favorites")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/history")} data-testid="menu-history">
                    <History className="w-4 h-4 mr-2" /> {t("history")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-settings">
                    <Settings className="w-4 h-4 mr-2" /> {t("settings")}
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

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-2">
          <form onSubmit={handleSearch} className="sm:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("search")}
                className="pl-9 h-9 bg-secondary border-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">{t("discover")}</Link>
          <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">{t("browse")}</Link>
          {isAuthenticated && user?.role === "author" && (
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">{t("dashboard")}</Link>
          )}
          {!isAuthenticated && (
            <Button onClick={login} className="w-full mt-2" size="sm">{t("login")}</Button>
          )}
        </div>
      )}
    </header>
  );
}
