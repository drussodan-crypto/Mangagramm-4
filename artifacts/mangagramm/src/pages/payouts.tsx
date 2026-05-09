import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, BanknoteIcon, CheckCircle, Clock, XCircle, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
  processed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  rejected: <XCircle className="w-3.5 h-3.5 text-red-500" />,
};

function PayoutsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("mtn");
  const [isLoading, setIsLoading] = useState(false);

  const load = () => {
    fetch("/api/payouts/me", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setData(d);
          if (d.payoutNumber) setPhone(d.payoutNumber);
          if (d.payoutMethod) setMethod(d.payoutMethod);
        }
      })
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleRequest = async () => {
    const coins = parseInt(amount, 10);
    if (!coins || coins < 100) { toast({ title: "Minimum 100 coins", variant: "destructive" }); return; }
    if (!phone) { toast({ title: "Numéro requis", variant: "destructive" }); return; }

    setIsLoading(true);
    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amountCoins: coins, payoutMethod: method, payoutNumber: phone }),
      });
      const d = await res.json();
      if (!res.ok) { toast({ title: "Erreur", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Retrait demandé !", description: d.message });
      setAmount("");
      load();
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const earnedCoins = data?.earnedCoins || 0;
  const earnedXof = earnedCoins * (data?.coinToXof || 10);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8" data-testid="page-payouts">
      <div>
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <BanknoteIcon className="w-7 h-7 text-green-500" /> Mes Revenus
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Retirez vos gains via MTN, Orange ou Wave Money.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border bg-card">
        <div>
          <p className="text-xs text-muted-foreground">Coins disponibles</p>
          <p className="text-2xl font-bold text-green-500">{earnedCoins} <span className="text-sm font-normal">Coins</span></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Équivalent en XOF</p>
          <p className="text-2xl font-bold">{earnedXof.toLocaleString()} <span className="text-sm font-normal">XOF</span></p>
        </div>
        <div className="col-span-2 text-xs text-muted-foreground">
          1 Coin = {data?.coinToXof || 10} XOF • Minimum de retrait : 100 Coins (1 000 XOF) • Traitement sous 48h
        </div>
      </div>

      <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
        <h2 className="text-base font-semibold">Nouveau retrait</h2>
        <div className="space-y-2">
          <Label>Montant (en Coins)</Label>
          <Input type="number" min={100} step={50} placeholder="100" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-amount" />
          {amount && parseInt(amount) >= 100 && (
            <p className="text-xs text-muted-foreground">= {(parseInt(amount) * (data?.coinToXof || 10)).toLocaleString()} XOF</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Opérateur</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger data-testid="select-method"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mtn">MTN Mobile Money</SelectItem>
              <SelectItem value="orange">Orange Money</SelectItem>
              <SelectItem value="wave">Wave</SelectItem>
              <SelectItem value="moov">Moov Money</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Votre numéro</Label>
          <Input placeholder="+225 07 XX XX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-payout-number" />
        </div>
        <Button onClick={handleRequest} disabled={isLoading || earnedCoins < 100} className="w-full gap-2 bg-green-600 hover:bg-green-500" data-testid="button-withdraw">
          {isLoading ? "Demande en cours..." : "Demander le retrait"}
        </Button>
      </div>

      {data?.payouts?.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Historique des retraits</h2>
          <div className="space-y-2">
            {data.payouts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card" data-testid={`payout-${p.id}`}>
                <div className="flex items-center gap-2">
                  {STATUS_ICONS[p.status] || <Clock className="w-3.5 h-3.5" />}
                  <div>
                    <p className="text-sm font-medium">{p.amountCoins} Coins → {p.amountXof.toLocaleString()} XOF</p>
                    <p className="text-xs text-muted-foreground">{p.payoutMethod.toUpperCase()} • {p.payoutNumber} • {new Date(p.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
                <Badge variant={p.status === "processed" ? "default" : p.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                  {p.status === "pending" ? "En attente" : p.status === "processed" ? "Traité" : "Rejeté"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PayoutsPage() {
  return <RequireAuth><PayoutsContent /></RequireAuth>;
}
