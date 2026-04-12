import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegisterUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, PenTool, BookMarked } from "lucide-react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"author" | "reader">("reader");
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const registerMutation = useRegisterUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    registerMutation.mutate({ data: { username, email, password, role } }, {
      onSuccess: (data: any) => {
        setUser(data.user);
        setLocation("/");
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || "Registration failed.");
      },
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4" data-testid="page-register">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <BookOpen className="w-10 h-10 mx-auto" strokeWidth={2} />
          <h1 className="text-2xl font-serif font-bold">Join MangaGramm</h1>
          <p className="text-sm text-muted-foreground">Create your account and start your journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive text-center" data-testid="text-error">{error}</p>}

          <div className="space-y-2">
            <Label>I want to</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`p-3 rounded-lg border text-center text-sm transition-colors ${role === "reader" ? "border-foreground bg-accent" : "border-border hover:bg-accent/50"}`}
                onClick={() => setRole("reader")}
                data-testid="button-role-reader"
              >
                <BookMarked className="w-5 h-5 mx-auto mb-1" />
                Read
              </button>
              <button
                type="button"
                className={`p-3 rounded-lg border text-center text-sm transition-colors ${role === "author" ? "border-foreground bg-accent" : "border-border hover:bg-accent/50"}`}
                onClick={() => setRole("author")}
                data-testid="button-role-author"
              >
                <PenTool className="w-5 h-5 mx-auto mb-1" />
                Create
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} data-testid="input-username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} data-testid="input-password" />
          </div>
          <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-submit-register">
            {registerMutation.isPending ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Already have an account? <Link href="/login" className="font-medium text-foreground hover:underline" data-testid="link-login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
