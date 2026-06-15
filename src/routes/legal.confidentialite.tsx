import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/legal/confidentialite")({
  head: () => ({ meta: [{ title: "Politique de confidentialité — PhoneTrack" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="container mx-auto max-w-3xl px-4 py-12 prose prose-slate">
        <h1>Politique de confidentialité</h1>
        <h2>Données collectées</h2>
        <ul>
          <li>Identité : nom, adresse e-mail</li>
          <li>Appareils : marque, modèle, IMEI, alias, statut</li>
          <li>Positions GPS : latitude, longitude, horodatage</li>
          <li>Journaux : actions effectuées dans l'application (RGPD)</li>
        </ul>
        <h2>Finalités</h2>
        <p>Permettre l'authentification, l'enregistrement de vos appareils et leur localisation en cas de perte / vol.</p>
        <h2>Hébergement et sécurité</h2>
        <p>Les données sont hébergées en UE. Les mots de passe sont hachés (Argon/bcrypt). Les communications sont chiffrées en HTTPS.</p>
        <h2>Vos droits (RGPD)</h2>
        <ul>
          <li>Droit d'accès et de rectification : depuis votre tableau de bord.</li>
          <li>Droit à l'oubli : suppression définitive du compte et de toutes vos données depuis la page « Mon compte ».</li>
          <li>Droit à la portabilité : sur demande à support@phonetrack.example.</li>
        </ul>
        <h2>Cookies</h2>
        <p>Nous n'utilisons que des cookies fonctionnels nécessaires à votre session. Aucun cookie publicitaire.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
