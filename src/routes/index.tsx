import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, MapPin, Bell, Lock, Smartphone } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhoneTrack — Traçage IMEI et sécurité mobile" },
      { name: "description", content: "Protégez vos téléphones : enregistrez l'IMEI, suivez la position en cas de perte ou de vol, et recevez des alertes en temps réel." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <header className="bg-gradient-to-br from-primary to-indigo-700 py-20 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Protégez vos appareils. Localisez-les en cas de perte ou de vol.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg opacity-90">
            Enregistrez l'IMEI, activez le traçage et recevez des alertes en temps réel sur une carte interactive.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth" search={{ tab: "register" }}>Créer un compte gratuit</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10">
              <Link to="/auth">Se connecter</Link>
            </Button>
          </div>
        </div>
      </header>

      <section id="features" className="container mx-auto px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Fonctionnalités</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Smartphone, t: "Enregistrement IMEI", d: "Validation Luhn à 15 chiffres, unicité garantie en base." },
            { icon: MapPin, t: "Carte en temps réel", d: "Suivi Leaflet/OpenStreetMap avec mises à jour live." },
            { icon: Bell, t: "Alertes instantanées", d: "Notifications par e-mail dès qu'un appareil change de zone." },
            { icon: ShieldCheck, t: "Conformité RGPD", d: "Données hébergées en UE, droit à l'oubli intégré." },
            { icon: Lock, t: "Connexion sécurisée", d: "Auth OAuth Google + mots de passe hachés (Argon)." },
            { icon: Smartphone, t: "Multi-appareils", d: "Gérez tous vos téléphones depuis un tableau de bord unique." },
          ].map((f) => (
            <div key={f.t} className="rounded-lg border bg-card p-6">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
