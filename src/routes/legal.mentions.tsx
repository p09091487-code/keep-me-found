import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/legal/mentions")({
  head: () => ({
    meta: [
      { title: "Mentions légales — PhoneTrack" },
      { name: "description", content: "Mentions légales de PhoneTrack : éditeur, hébergement, propriété intellectuelle et responsabilité." },
      { property: "og:title", content: "Mentions légales — PhoneTrack" },
      { property: "og:url", content: "https://phonetracked.lovable.app/legal/mentions" },
    ],
    links: [{ rel: "canonical", href: "https://phonetracked.lovable.app/legal/mentions" }],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="container mx-auto max-w-3xl px-4 py-12 prose prose-slate">
        <h1>Mentions légales</h1>
        <h2>Éditeur</h2>
        <p>PhoneTrack — Service de traçage d'appareils mobiles.<br />
          Adresse : à compléter par l'éditeur.<br />
          Contact : support@phonetrack.example
        </p>
        <h2>Hébergement</h2>
        <p>L'application est hébergée sur l'infrastructure Lovable Cloud (Cloudflare + base de données managée en Union Européenne).</p>
        <h2>Propriété intellectuelle</h2>
        <p>L'ensemble des contenus (textes, logos, code) est protégé par les lois en vigueur. Toute reproduction non autorisée est interdite.</p>
        <h2>Responsabilité</h2>
        <p>L'utilisateur s'engage à utiliser le service conformément à la loi et uniquement pour ses propres appareils.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
