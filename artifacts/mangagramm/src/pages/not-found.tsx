import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4" data-testid="page-not-found">
      <div className="text-center space-y-4">
        <BookOpen className="w-16 h-16 mx-auto opacity-20" />
        <h1 className="text-4xl font-serif font-bold">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
