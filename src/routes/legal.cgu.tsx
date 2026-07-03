import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/legal/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions générales d'utilisation — PhoneTrack" },
      { name: "description", content: "Lisez les conditions générales d'utilisation du service PhoneTrack : engagements de l'utilisateur, service, résiliation et droit applicable." },
      { property: "og:title", content: "CGU — PhoneTrack" },
      { property: "og:url", content: "https://phonetracked.lovable.app/legal/cgu" },
    ],
    links: [{ rel: "canonical", href: "https://phonetracked.lovable.app/legal/cgu" }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="container mx-auto max-w-3xl px-4 py-12 prose prose-slate">
        <h1>Conditions générales d'utilisation</h1>
        <h2>1. Objet</h2>
        <p>PhoneTrack permet l'enregistrement de l'IMEI d'appareils mobiles dont l'utilisateur est légalement propriétaire, et leur localisation en cas de perte ou de vol.</p>
        <h2>2. Engagement de l'utilisateur</h2>
        <p>L'utilisateur certifie être le propriétaire légal de chaque appareil qu'il enregistre. Toute utilisation pour suivre une personne à son insu est strictement interdite et engage la pleine responsabilité de l'utilisateur.</p>
        <h2>3. Compte</h2>
        <p>L'utilisateur s'engage à fournir des informations exactes et à conserver son mot de passe confidentiel.</p>
        <h2>4. Service</h2>
        <p>PhoneTrack est fourni « tel quel ». Aucune garantie absolue de localisation n'est apportée : la précision dépend de facteurs externes (couverture GPS, état de l'appareil…).</p>
        <h2>5. Résiliation</h2>
        <p>L'utilisateur peut supprimer son compte à tout moment depuis son tableau de bord. Toutes ses données sont alors définitivement effacées.</p>
        <h2>6. Droit applicable</h2>
        <p>Les présentes CGU sont régies par le droit français.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
