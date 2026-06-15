import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const KEY = "phonetrack-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);
  const decide = (v: "accept" | "decline") => {
    localStorage.setItem(KEY, v);
    setVisible(false);
  };
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg">
      <div className="container mx-auto flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Nous utilisons uniquement des cookies fonctionnels nécessaires à votre session. Voir notre{" "}
          <Link to="/legal/confidentialite" className="underline">politique de confidentialité</Link>.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => decide("decline")}>Refuser</Button>
          <Button size="sm" onClick={() => decide("accept")}>Accepter</Button>
        </div>
      </div>
    </div>
  );
}
