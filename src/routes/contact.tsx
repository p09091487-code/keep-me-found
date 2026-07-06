import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — PhoneTrack" },
      { name: "description", content: "Contactez le support PhoneTrack pour toute question sur le traçage IMEI ou votre compte." },
      { property: "og:title", content: "Contact — PhoneTrack" },
      { property: "og:description", content: "Contactez l'équipe PhoneTrack." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().email({ message: "Email invalide" }).max(320),
  subject: z.string().trim().min(1, "Sujet requis").max(300),
  message: z.string().trim().min(1, "Message requis").max(5000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_messages").insert({
        user_id: user?.id ?? null,
        name: parsed.data.name || null,
        email: parsed.data.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
      });
      if (error) throw error;
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      toast.success("Message envoyé !");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="container mx-auto max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">Contact</h1>
        <p className="mt-2 text-muted-foreground">
          Une question ? Envoyez-nous un message, nous répondons sous 48h.
        </p>

        {sent ? (
          <div className="mt-6 rounded-lg border bg-card p-6">
            <p className="text-sm">
              Merci ! Votre message a bien été reçu. Vous recevrez une réponse par e-mail.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => setSent(false)}>
              Envoyer un autre message
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Nom (facultatif)</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={200} />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={320} />
            </div>
            <div>
              <Label htmlFor="subject">Sujet *</Label>
              <Input id="subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={300} />
            </div>
            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea id="message" required rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={5000} />
              <p className="mt-1 text-xs text-muted-foreground">{form.message.length}/5000</p>
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Envoi…" : "Envoyer"}</Button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
