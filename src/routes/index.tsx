import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, MapPin, Bell, Smartphone, Satellite } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PhoneTrack — Traçage IMEI et sécurité mobile" },
      { name: "description", content: "Enregistrez l'IMEI de vos appareils, activez le traçage en cas de perte ou de vol et recevez des alertes en temps réel sur une carte interactive." },
      { property: "og:title", content: "PhoneTrack — Traçage IMEI et sécurité mobile" },
      { property: "og:description", content: "Enregistrez l'IMEI, activez le traçage en cas de perte ou de vol et recevez des alertes temps réel." },
      { property: "og:url", content: "https://phonetracked.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://phonetracked.lovable.app/" }],
  }),
  component: Landing,
});

const features = [
  { icon: ShieldCheck, color: "bg-blue-100 text-blue-600", title: "Enregistrement sécurisé", desc: "Sauvegardez l'IMEI et les infos de vos appareils dans un coffre numérique avant toute perte." },
  { icon: MapPin, color: "bg-green-100 text-green-600", title: "Localisation temps réel", desc: "Activez le traçage et suivez la position GPS de vos appareils sur une carte interactive." },
  { icon: Bell, color: "bg-red-100 text-red-600", title: "Alertes instantanées", desc: "Recevez un e-mail dès qu'un appareil perdu ou volé quitte sa zone de confiance." },
  { icon: Smartphone, color: "bg-purple-100 text-purple-600", title: "Multi-appareils", desc: "Gérez et protégez plusieurs téléphones ou tablettes depuis un tableau de bord unique." },
];

function Landing() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <header className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800 py-20 text-white">
        <div className="container relative mx-auto px-4 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/30 px-3 py-1 text-sm font-semibold text-blue-50">
            <Satellite className="h-4 w-4" /> Traçage en temps réel actif
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Retrouvez votre téléphone,<br />où qu'il soit.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100">
            Enregistrez l'IMEI de vos appareils, activez le traçage en cas de perte ou de vol, et localisez votre téléphone en temps réel sur la carte.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-blue-700 hover:bg-gray-100">
              <Link to="/auth" search={{ tab: "register" }}>Créer un compte gratuit</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-blue-700">
              <Link to="/auth">Se connecter</Link>
            </Button>
          </div>
        </div>
      </header>

      <section id="features" className="container mx-auto px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Une protection complète pour vos appareils</h2>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 text-center shadow-sm transition hover:shadow-md">
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${f.color}`}>
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
