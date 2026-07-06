import { Link } from "@tanstack/react-router";
import { Facebook } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="container mx-auto grid gap-6 px-4 py-10 md:grid-cols-3">
        <div>
          <h3 className="font-bold">PhoneTrack</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Traçage et sécurisation d'appareils par IMEI. Vos données sont chiffrées et hébergées en Europe.
          </p>
          <a
            href="https://www.facebook.com/profile.php?id=61584052972900&locale=fr_FR"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            aria-label="Page Facebook PhoneTrack"
          >
            <Facebook className="h-4 w-4" />
            Facebook
          </a>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Légal</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li><Link to="/legal/mentions" className="hover:text-foreground">Mentions légales</Link></li>
            <li><Link to="/legal/cgu" className="hover:text-foreground">CGU</Link></li>
            <li><Link to="/legal/confidentialite" className="hover:text-foreground">Politique de confidentialité</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Compte</h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Se connecter</Link></li>
            <li><Link to="/auth" search={{ tab: "register" }} className="hover:text-foreground">Créer un compte</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PhoneTrack — Tous droits réservés.
      </div>
    </footer>
  );
}
