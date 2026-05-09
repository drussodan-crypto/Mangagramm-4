import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import { RequireAuth } from "@/components/require-auth";
import { ClassBadge, XpProgressBar, getClassForXp } from "@/components/class-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, CreditCard, CheckCircle, AlertCircle, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const PACKAGES = [
  { id: "coins_50", coins: 50, xof: 500, label: "50 Coins", popular: false },
  { id: "coins_120", coins: 120, xof: 1000, label: "120 Coins", popular: true },
  { id: "coins_260", coins: 260, xof: 2000, label: "260 Coins", popular: false },
  { id: "coins_700", coins: 700, xof: 5000, label: "700 Coins", popular: false },
  { id: "coins_1500", coins: 1500, xof: 10000, label: "1500 Coins", popular: false },
];

function CoinsContent() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [balance, setBalance] = useState<{ coins: number; earnedCoins: number } | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [xpData, setXpData] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState("");

  const params = new URLSearchParams(window.location.search);
  const statusFromUrl = params.get("status");

  useEffect(() => {
    fetch("/api/payments/balance", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setBalance(d); })
      .catch(() => {});

    fetch("/api/xp/me", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setXpData(d); })
      .catch(() => {});

    if (statusFromUrl === "success") {
      setStatusMsg("Paiement en cours de confirmation. Vos coins seront crédités sous peu.");
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
        body: JSON.stringify({ packageId: selectedPkg, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "payment_gateway_not_configured") {
          toast({ title: "Passerelle non configurée", description: "Le propriétaire doit configurer CinetPay. Contactez l'admin.", variant: "destructive" });
        } else {
          toast({ title: "Erreur", description: data.message || data.error, variant: "destructive" });
        }
        return;
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (err) {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8" data-testid="page-coins">
      <div>
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <Coins className="w-7 h-7 text-yellow-500" /> Acheter des Coins
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Utilisez vos coins pour débloquer les chapitres Premium.</p>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {statusMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-card">
        <div>
          <p className="text-xs text-muted-foreground">Solde actuel</p>
          <p className="text-2xl font-bold text-yellow-500">{balance?.coins ?? 0} <span className="text-sm font-normal">Coins</span></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Classe</p>
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

      <div>
        <h2 className="text-base font-semibold mb-3">Choisir un pack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPkg(pkg.id)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                selectedPkg === pkg.id
                  ? "border-yellow-500 bg-yellow-500/10"
                  : "border-border hover:border-border/80 bg-card"
              }`}
              data-testid={`package-${pkg.id}`}
            >
              {pkg.popular && (
                <Badge className="absolute top-2 right-2 bg-yellow-500 text-black text-xs">Populaire</Badge>
              )}
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="text-lg font-bold">{pkg.coins}</span>
                <span className="text-sm text-muted-foreground">Coins</span>
              </div>
              <p className="text-base font-semibold">{(pkg.xof).toLocaleString()} XOF</p>
              <p className="text-xs text-muted-foreground mt-0.5">≈ {(pkg.xof / 655).toFixed(0)} €</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="flex items-center gap-1.5 mb-1.5"><Phone className="w-3.5 h-3.5" /> Numéro Mobile Money (optionnel)</Label>
          <Input
            placeholder="+225 07 XX XX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            data-testid="input-phone"
          />
          <p className="text-xs text-muted-foreground mt-1">MTN, Orange, Wave, Moov acceptés via CinetPay</p>
        </div>

        <Button
          onClick={handlePurchase}
          className="w-full gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
          disabled={!selectedPkg || isLoading}
          size="lg"
          data-testid="button-purchase"
        >
          <CreditCard className="w-4 h-4" />
          {isLoading ? "Redirection..." : "Payer via Mobile Money"}
        </Button>
        <p className="text-xs text-center text-muted-foreground">Paiement sécurisé via CinetPay • MTN, Orange, Wave</p>
      </div>
    </div>
  );
}

export default function CoinsPage() {
  return <RequireAuth><CoinsContent /></RequireAuth>;
}
