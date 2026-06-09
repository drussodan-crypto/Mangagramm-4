import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, PenTool, Coins, TrendingUp, BadgeCheck, ArrowLeft, Gift, Users } from "lucide-react";

const CLASSES = [
  { level: "4", xp: "0–99", label: "Lecteur Débutant", discount: "0%", color: "#6b7280" },
  { level: "3", xp: "100–299", label: "Lecteur Régulier", discount: "0%", color: "#3b82f6" },
  { level: "2", xp: "300–599", label: "Lecteur Avancé", discount: "0%", color: "#8b5cf6" },
  { level: "1", xp: "600–999", label: "Lecteur Expert", discount: "5%", color: "#f59e0b" },
  { level: "S", xp: "1000–1999", label: "Lecteur Elite", discount: "15%", color: "#ef4444" },
  { level: "⚡", xp: "2000+", label: "Niveau Dieu", discount: "25%", color: "#a855f7" },
];

const AUTHOR_CLASSES = [
  { views: "0", price: "1 Coin", label: "Classe 4 — Débutant" },
  { views: "1 000", price: "2 Coins", label: "Classe 3" },
  { views: "4 000", price: "3 Coins", label: "Classe 2" },
  { views: "7 000", price: "4 Coins", label: "Classe 1" },
  { views: "10 000", price: "5 Coins", label: "Classe S" },
  { views: "13 000+", price: "6 Coins", label: "Niveau Dieu" },
];

export default function RulesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="page-rules">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
        </Link>
        <h1 className="text-3xl font-serif font-bold mb-2">📜 Règles de Fonctionnement</h1>
        <p className="text-muted-foreground">Comprendre le système économique, les classes et les réductions sur MangaGramm</p>
      </div>

      <div className="space-y-10">

        {/* Monnaie virtuelle */}
        <section className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🪙</span>
            <h2 className="text-xl font-bold">Monnaie Virtuelle — Coins</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/40 p-4">
                <p className="font-semibold mb-2">Tarif d'achat</p>
                <p className="text-muted-foreground">100 FCFA = 20 Coins</p>
                <p className="text-xs mt-1 text-muted-foreground">Achetable via Mobile Money (Orange Money, MTN, Wave…)</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-4">
                <p className="font-semibold mb-2">Déverrouillage de chapitres</p>
                <p className="text-muted-foreground">1 Coin par chapitre premium (tarif de base)</p>
                <p className="text-xs mt-1 text-muted-foreground">Le prix augmente avec la classe de l'auteur</p>
              </div>
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <p className="font-semibold mb-1">💰 Répartition des revenus</p>
              <p className="text-muted-foreground">Chaque coin dépensé sur un chapitre est réparti : <strong>70% pour l'auteur</strong>, 30% pour la plateforme.</p>
            </div>
          </div>
        </section>

        {/* Classes lecteurs */}
        <section className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6" />
            <h2 className="text-xl font-bold">Progression des Lecteurs — Classes & Réductions</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Chaque Coin dépensé vous fait gagner de l'XP. Montez de classe pour obtenir des réductions sur les chapitres premium !</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 font-semibold">Classe</th>
                  <th className="text-left pb-2 font-semibold">XP requis</th>
                  <th className="text-left pb-2 font-semibold">Intitulé</th>
                  <th className="text-left pb-2 font-semibold">Réduction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {CLASSES.map(c => (
                  <tr key={c.level}>
                    <td className="py-2.5">
                      <span className="font-bold text-base" style={{ color: c.color }}>Cl. {c.level}</span>
                    </td>
                    <td className="py-2.5 text-muted-foreground">{c.xp}</td>
                    <td className="py-2.5">{c.label}</td>
                    <td className="py-2.5">
                      <span className={c.discount !== "0%" ? "text-green-500 font-bold" : "text-muted-foreground"}>{c.discount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
            💡 La difficulté de progression augmente exponentiellement à chaque niveau — plus votre classe est élevée, plus il faut de Coins pour passer au niveau suivant.
          </div>
        </section>

        {/* Classes auteurs */}
        <section className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <PenTool className="w-6 h-6" />
            <h2 className="text-xl font-bold">Progression des Auteurs</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">En tant qu'auteur, votre classe augmente avec le nombre total de vues. Le prix de vos chapitres premium augmente automatiquement à chaque montée de classe.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 font-semibold">Palier de vues</th>
                  <th className="text-left pb-2 font-semibold">Classe</th>
                  <th className="text-left pb-2 font-semibold">Prix chapitre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {AUTHOR_CLASSES.map(c => (
                  <tr key={c.label}>
                    <td className="py-2.5 text-muted-foreground">{c.views} vues cumulées</td>
                    <td className="py-2.5 font-medium">{c.label}</td>
                    <td className="py-2.5 text-yellow-500 font-bold">{c.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Badge certification */}
        <section className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <BadgeCheck className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">Badge de Certification ✓</h2>
          </div>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Le badge bleu certifié (✓) est visible sur le profil des créateurs reconnus par la plateforme.</p>
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
              <p className="font-semibold text-blue-500 mb-1">Certification automatique</p>
              <p className="text-muted-foreground">Les comptes fondateurs de MangaGramm sont certifiés à vie, gratuitement et de manière permanente.</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="font-semibold mb-1">Pour les autres auteurs</p>
              <p className="text-muted-foreground">Le badge de certification est disponible avec l'abonnement Premium à 4€/mois. Il confère une plus grande visibilité sur la plateforme.</p>
            </div>
          </div>
        </section>

        {/* Notifications de succès */}
        <section className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="w-6 h-6" />
            <h2 className="text-xl font-bold">Notifications de Succès</h2>
          </div>
          <p className="text-sm text-muted-foreground">Chaque montée de classe déclenche une notification automatique :</p>
          <div className="mt-3 rounded-lg bg-muted/40 p-4 text-sm italic">
            "Bravo Cher Lecteur/Auteur ! Vous venez de passer en Classe [Niveau]. Continuez ainsi !"
          </div>
        </section>

        {/* Types de contenu */}
        <section className="rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6" />
            <h2 className="text-xl font-bold">Types de Contenu</h2>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { type: "manga", desc: "Format japonais, lecture droite→gauche", icon: "🇯🇵" },
              { type: "webtoon", desc: "Format coréen, défilement vertical", icon: "🇰🇷" },
              { type: "comic", desc: "Format occidental, cases classiques", icon: "🦸" },
              { type: "light-novel", desc: "Roman illustré, lecture textuelle", icon: "📖" },
            ].map(t => (
              <div key={t.type} className="rounded-lg bg-muted/40 p-3">
                <p className="text-lg mb-1">{t.icon}</p>
                <p className="font-semibold capitalize">{t.type}</p>
                <p className="text-muted-foreground text-xs mt-1">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link href="/coins">
            <Button className="gap-2">🪙 Acheter des Coins</Button>
          </Link>
          <Link href="/browse">
            <Button variant="outline" className="gap-2"><BookOpen className="w-4 h-4" /> Explorer</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
