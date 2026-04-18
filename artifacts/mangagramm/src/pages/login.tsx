import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import { BookOpen, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4" data-testid="page-login">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <BookOpen className="w-12 h-12 mx-auto" strokeWidth={1.5} />
          <h1 className="text-2xl font-serif font-bold">MangaGramm</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {t("auth.sign_in_desc")}
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={login} size="lg" className="w-full gap-2" data-testid="button-login">
            <LogIn className="w-4 h-4" />
            {t("auth.sign_in_with")}
          </Button>
          <p className="text-xs text-muted-foreground">
            Connexion via Google, GitHub et plus encore
          </p>
        </div>
      </div>
    </div>
  );
}
