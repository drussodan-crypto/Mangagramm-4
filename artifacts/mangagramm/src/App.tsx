import "@/lib/i18n";
import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Navbar } from "@/components/layout/navbar";
import Home from "@/pages/home";
import Browse from "@/pages/browse";
import SeriesDetail from "@/pages/series-detail";
import Reader from "@/pages/reader";
import Profile from "@/pages/profile";
import Dashboard from "@/pages/dashboard";
import CreateSeries from "@/pages/create-series";
import CreateChapter from "@/pages/create-chapter";
import Favorites from "@/pages/favorites";
import HistoryPage from "@/pages/history";
import Notifications from "@/pages/notifications";
import SettingsPage from "@/pages/settings";
import Login from "@/pages/login";
import CoinsPage from "@/pages/coins";
import PayoutsPage from "@/pages/payouts";
import MessagesPage from "@/pages/messages";
import RulesPage from "@/pages/rules";
import NotFound from "@/pages/not-found";
import { SplashScreen } from "@/components/splash-screen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/browse" component={Browse} />
      <Route path="/series/:id" component={SeriesDetail} />
      <Route path="/read/:chapterId" component={Reader} />
      <Route path="/profile/:userId" component={Profile} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/create" component={CreateSeries} />
      <Route path="/create/:seriesId/chapter" component={CreateChapter} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/coins" component={CoinsPage} />
      <Route path="/payouts" component={PayoutsPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:threadId" component={MessagesPage} />
      <Route path="/login" component={Login} />
      <Route path="/rules" component={RulesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [splash, setSplash] = useState(true);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL || "/"}>
              <SplashScreen show={splash} onDone={() => setSplash(false)} />
              <Navbar />
              <main>
                <Router />
              </main>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
