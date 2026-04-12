import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Search, Bell, Menu, X, Sun, Moon, BookOpen, User, LogOut, Settings, PenTool, Heart, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home">
          <BookOpen className="w-7 h-7" strokeWidth={2.5} />
          <span className="font-serif text-xl font-bold tracking-tight hidden sm:inline">MangaGramm</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors" data-testid="link-discover">Discover</Link>
          <Link href="/browse" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors" data-testid="link-browse">Browse</Link>
          {isAuthenticated && user?.role === "author" && (
            <Link href="/dashboard" className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors" data-testid="link-dashboard">Dashboard</Link>
          )}
        </nav>

        <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search manga, webtoon..."
              className="pl-9 h-9 bg-secondary border-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            data-testid="button-theme-toggle"
          >
            {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

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
                    <User className="w-4 h-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  {user?.role === "author" && (
                    <DropdownMenuItem onClick={() => setLocation("/dashboard")} data-testid="menu-dashboard">
                      <PenTool className="w-4 h-4 mr-2" /> Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setLocation("/favorites")} data-testid="menu-favorites">
                    <Heart className="w-4 h-4 mr-2" /> Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/history")} data-testid="menu-history">
                    <History className="w-4 h-4 mr-2" /> History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-settings">
                    <Settings className="w-4 h-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="button-login">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" data-testid="button-register">Sign Up</Button>
              </Link>
            </div>
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
                placeholder="Search..."
                className="pl-9 h-9 bg-secondary border-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">Discover</Link>
          <Link href="/browse" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">Browse</Link>
          {isAuthenticated && user?.role === "author" && (
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent">Dashboard</Link>
          )}
        </div>
      )}
    </header>
  );
}
