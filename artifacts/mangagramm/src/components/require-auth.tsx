import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 text-center">
        <Lock className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-semibold mb-2">{t("auth.join_community")}</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{t("auth.sign_in_desc")}</p>
        <Button onClick={login} size="lg">{t("auth.sign_in_with")}</Button>
      </div>
    );
  }

  return <>{children}</>;
}
