import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { checkAuthRate } from "@/lib/rate-limit-client";

const authSearch = z.object({
  tab: z.enum(["login", "register"]).optional(),
  // Same-origin relative path to return to after successful sign-in (used by the MCP OAuth consent flow).
  next: z.string().startsWith("/").optional(),
});

function safeNext(next: string | undefined): string | null {
  if (!next) return null;
  // Only allow same-origin relative paths (no protocol, no //, no backslash).
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export const Route = createFileRoute("/auth")({
  validateSearch: authSearch,
  head: () => ({
    meta: [
      { title: "Connexion — PhoneTrack" },
      { name: "description", content: "Connectez-vous à PhoneTrack pour gérer vos appareils, activer le traçage et consulter vos alertes en temps réel." },
      { property: "og:title", content: "Connexion — PhoneTrack" },
      { property: "og:description", content: "Accédez à votre espace PhoneTrack pour tracer et sécuriser vos appareils." },
      { property: "og:url", content: "https://phonetracked.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://phonetracked.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { tab, next } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const nextPath = safeNext(next);
  const goPostAuth = () => {
    if (nextPath) { window.location.href = nextPath; return; }
    navigate({ to: "/dashboard" });
  };

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  // Register state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [acceptCgu, setAcceptCgu] = useState(false);

  // Reset
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);

  const loginSchema = z.object({
    email: z.string().trim().email("Adresse e-mail invalide").max(255),
    password: z.string().min(1, "Mot de passe requis"),
  });
  const registerSchema = z.object({
    full_name: z.string().trim().min(1, "Nom requis").max(100),
    email: z.string().trim().email("Adresse e-mail invalide").max(255),
    password: z.string().min(8, "Mot de passe : 8 caractères minimum").max(72),
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email: loginEmail, password: loginPwd });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const guard = await checkAuthRate(parsed.data.email, "signin", "attempt");
    if (!guard.allowed) { setLoading(false); return toast.error(guard.message ?? "Trop de tentatives"); }
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error(error.message);
    await checkAuthRate(parsed.data.email, "signin", "success");
    toast.success("Connecté");
    goPostAuth();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptCgu) return toast.error("Vous devez accepter les CGU");
    const parsed = registerSchema.safeParse({ full_name: name, email, password: pwd });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const returnOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: returnOrigin + (nextPath ?? ""),
        data: { full_name: parsed.data.full_name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Compte créé !");
    goPostAuth();
  };

  const handleGoogle = async () => {
    setLoading(true);
    const returnOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: returnOrigin + (nextPath ?? "/dashboard"),
    });
    if (result.error) { setLoading(false); toast.error("Échec de la connexion Google"); return; }
    if (result.redirected) return;
    goPostAuth();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().email().safeParse(resetEmail);
    if (!parsed.success) return toast.error("Adresse e-mail invalide");
    setLoading(true);
    const guard = await checkAuthRate(parsed.data, "reset", "attempt");
    if (!guard.allowed) { setLoading(false); return toast.error(guard.message ?? "Trop de tentatives"); }
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Lien envoyé ! Vérifiez votre boîte mail.");
    setShowReset(false);
  };

  return (
    <>
      <SiteNav />
      <div className="container mx-auto flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
          <Tabs defaultValue={tab ?? "login"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Se connecter</TabsTrigger>
              <TabsTrigger value="register">Créer un compte</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 pt-4">
              {!showReset ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div><Label htmlFor="li-email">Adresse e-mail</Label>
                    <Input id="li-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required /></div>
                  <div><Label htmlFor="li-pwd">Mot de passe</Label>
                    <Input id="li-pwd" type="password" value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} required /></div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Se connecter
                  </Button>
                  <button type="button" onClick={() => setShowReset(true)} className="block w-full text-center text-sm text-primary hover:underline">
                    Mot de passe oublié ?
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3">
                  <p className="text-sm text-muted-foreground">Recevez un lien pour réinitialiser votre mot de passe.</p>
                  <Input type="email" placeholder="Adresse e-mail" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Envoyer
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowReset(false)}>Annuler</Button>
                  </div>
                </form>
              )}
              <Separator />
              <Button variant="outline" onClick={handleGoogle} disabled={loading} className="w-full">
                <GoogleIcon /> Continuer avec Google
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 pt-4">
              <form onSubmit={handleRegister} className="space-y-3">
                <div><Label htmlFor="r-name">Nom complet</Label>
                  <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div><Label htmlFor="r-email">Adresse e-mail</Label>
                  <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><Label htmlFor="r-pwd">Mot de passe (min. 8 caractères)</Label>
                  <Input id="r-pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required /></div>
                <div className="flex items-start gap-2 pt-1">
                  <Checkbox id="cgu" checked={acceptCgu} onCheckedChange={(v) => setAcceptCgu(!!v)} />
                  <Label htmlFor="cgu" className="text-xs text-muted-foreground leading-tight">
                    J'accepte les <Link to="/legal/cgu" className="underline">CGU</Link> et la{" "}
                    <Link to="/legal/confidentialite" className="underline">politique de confidentialité</Link>.
                  </Label>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer mon compte
                </Button>
              </form>
              <Separator />
              <Button variant="outline" onClick={handleGoogle} disabled={loading} className="w-full">
                <GoogleIcon /> Continuer avec Google
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

function Separator() {
  return (
    <div className="relative my-3">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
      <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
    </div>
  );
}
function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.92 3.22-4.76 3.22-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.12A6.99 6.99 0 0 1 5.5 12c0-.74.13-1.45.34-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.4c1.61 0 3.06.55 4.21 1.64l3.15-3.15C17.45 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.33 9.14 5.4 12 5.4z"/>
    </svg>
  );
}
