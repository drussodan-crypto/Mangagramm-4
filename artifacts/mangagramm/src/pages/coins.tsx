import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { ClassBadge, XpProgressBar, getClassForXp } from "@/components/class-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, CreditCard, CheckCircle, AlertCircle, Phone, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const PACKAGES = [
  { id: "coins_20", coins: 20, xof: 100, label: "20 Coins", popular: false },
  { id: "coins_50", coins: 50, xof: 250, label: "50 Coins", popular: false },
  { id: "coins_120", coins: 120, xof: 600, label: "120 Coins", popular: true },
  { id: "coins_260", coins: 260, xof: 1300, label: "260 Coins", popular: false },
  { id: "coins_700", coins: 700, xof: 3500, label: "700 Coins", popular: false },
  { id: "coins_1500", coins: 1500, xof: 7500, label: "1500 Coins", popular: false },
];

function CoinsContent() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [balance, setBalance] = useState<{ coins: number; earnedCoins: number } | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [xpData, setXpData] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusOk, setStatusOk] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const statusFromUrl = params.get("status");
  const refFromUrl = params.get("ref");

  const fetchBalance = () => {
    fetch("/api/payments/balance", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setBalance(d); })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBalance();
    fetch("/api/xp/me", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setXpData(d); })
      .catch(() => {});

    if (statusFromUrl === "success" && refFromUrl) {
      setIsVerifying(true);
      setStatusMsg("Vérification du paiement en cours…");
      fetch(`/api/payments/verify/${refFromUrl}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.verified) {
            setStatusOk(true);
            setStatusMsg(`✅ Paiement confirmé ! ${data.coinsGranted ? `+${data.coinsGranted} Coins` : ""} crédités sur votre compte.`);
            fetchBalance();
          } else {
            setStatusMsg("⚠️ Paiement en cours de confirmation. Vos coins seront crédités sous peu.");
          }
        })
        .catch(() => setStatusMsg("⚠️ Impossible de vérifier le paiement. Contactez le support si vos coins n'apparaissent pas."))
        .finally(() => setIsVerifying(false));
    }
  }, []);

  const userXp = (user as any)?.xp || 0;
  const cls = getClassForXp(userXp);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: selectedPkg }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "payment_gateway_not_configured") {
          toast({ title: "Passerelle non configurée", description: "Contactez l'administrateur.", variant: "destructive" });
        } else {
          toast({ title: "Erreur", description: data.message || data.error, variant: "destructive" });
        }
        return;
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8" data-testid="page-coins">
      <div>
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          🪙 Acheter des Coins
        </h1>
        <p className="text-sm text-muted-foreground mt-1">100 FCFA = 20 Coins. Utilisez vos coins pour débloquer les chapitres Premium.</p>
      </div>

      {(statusMsg || isVerifying) && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${statusOk ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500"}`}>
          {isVerifying ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {statusMsg}
        </div>
      )}

      {/* Balance card */}
      <div className="grid grid-cols-2 gap-4 p-5 rounded-xl border border-border bg-card">
        <div>
          <p className="text-xs text-muted-foreground">Solde actuel</p>
          <p className="text-3xl font-bold text-yellow-500">{balance?.coins ?? 0} <span className="text-sm font-normal text-muted-foreground">Coins</span></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Votre classe</p>
          <ClassBadge xp={userXp} size="md" showDiscount />
        </div>
        {xpData && (
          <div className="col-span-2">
            <XpProgressBar xp={userXp} />
          </div>
        )}
        {cls.discount > 0 && (
          <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-green-500/10 text-green-400 text-xs">
            <CheckCircle className="w-3 h-3" />
            Votre classe vous donne <strong>{cls.discount}%</strong> de réduction sur les chapitres Premium.
          </div>
        )}
      </div>

      {/* Packages */}
      <div>
        <h2 className="text-base font-semibold mb-3">Choisir un pack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPkg(pkg.id)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                selectedPkg === pkg.id
                  ? "border-yellow-500 bg-yellow-500/10"
                  : "border-border hover:border-yellow-500/50 bg-card"
              }`}
              data-testid={`package-${pkg.id}`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-2 right-2 bg-yellow-500 text-black text-xs">Populaire</Badge>
              )}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xl">🪙</span>
                <span className="text-lg font-bold">{pkg.coins}</span>
              </div>
              <p className="text-sm font-semibold">{(pkg.xof).toLocaleString("fr-FR")} FCFA</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">≈ {(pkg.xof / 655.957).toFixed(0)} €</p>
            </button>
          ))}
        </div>
      </div>

      {/* Payment button */}
      <div className="space-y-3">
        <Button
          onClick={handlePurchase}
          className="w-full gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
          disabled={!selectedPkg || isLoading}
          size="lg"
          data-testid="button-purchase"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Redirection…</>
          ) : (
            <><CreditCard className="w-4 h-4" /> Payer via Paystack</>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Paiement sécurisé via Paystack • Mobile Money (MTN, Orange, Wave) • Carte bancaire
        </p>
        <p className="text-xs text-center text-muted-foreground">
          <a href="/rules" className="underline hover:text-foreground">📜 Voir les règles de fonctionnement</a>
        </p>
      </div>
    </div>
  );
}

export default function CoinsPage() {
  return <RequireAuth><CoinsContent /></RequireAuth>;
}
