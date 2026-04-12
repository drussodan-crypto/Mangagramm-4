import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLoginUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const loginMutation = useLoginUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data: any) => {
        setUser(data.user);
        setLocation("/");
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || "Login failed. Please check your credentials.");
      },
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4" data-testid="page-login">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <BookOpen className="w-10 h-10 mx-auto" strokeWidth={2} />
          <h1 className="text-2xl font-serif font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your MangaGramm account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive text-center" data-testid="text-error">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="input-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-submit-login">
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Don't have an account? <Link href="/register" className="font-medium text-foreground hover:underline" data-testid="link-register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
