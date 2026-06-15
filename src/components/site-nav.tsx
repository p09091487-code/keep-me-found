import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Satellite, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SiteNav() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate({ to: "/" });
  };

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <Satellite className="h-6 w-6 text-primary" />
          <span className="text-lg">PhoneTrack</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/" hash="features" className="text-sm text-muted-foreground hover:text-foreground">Fonctionnalités</Link>
          {user && (
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Tableau de bord</Link>
          )}
          <Link to="/legal/confidentialite" className="text-sm text-muted-foreground hover:text-foreground">Confidentialité</Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link to="/account" className="text-sm text-muted-foreground hover:text-foreground">{user.email}</Link>
              <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Déconnexion</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild><Link to="/auth">Se connecter</Link></Button>
              <Button asChild><Link to="/auth" search={{ tab: "register" }}>Créer un compte</Link></Button>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t bg-background px-4 py-3 md:hidden">
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)} className="block py-1">Tableau de bord</Link>
              <Link to="/account" onClick={() => setOpen(false)} className="block py-1">Compte</Link>
              <button onClick={signOut} className="block py-1 text-left">Déconnexion</button>
            </>
          ) : (
            <>
              <Link to="/auth" onClick={() => setOpen(false)} className="block py-1">Se connecter</Link>
              <Link to="/auth" search={{ tab: "register" }} onClick={() => setOpen(false)} className="block py-1">Créer un compte</Link>
            </>
          )}
          <Link to="/legal/confidentialite" onClick={() => setOpen(false)} className="block py-1">Confidentialité</Link>
        </div>
      )}
    </nav>
  );
}
