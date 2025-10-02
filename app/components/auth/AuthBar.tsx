import { Button } from "~/components/ui/button";
import { supabase } from "~/lib/supabaseClient";
import { useState, useEffect } from "react";
import { Input } from "~/components/ui/input";

export function AuthBar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSendMagicLink = async () => {
    if (!email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      console.error('Error sending magic link:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  if (loading) {
    return <div className="h-12" />;
  }

  return (
    <div className="flex items-center justify-between py-2 border-b">
      <h1 className="text-xl font-bold">FormCraft</h1>
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <span className="text-sm text-gray-600">Olá, {user.user_metadata?.full_name || user.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sair
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button size="sm" onClick={handleSendMagicLink} disabled={!email || sending}>
              {sending ? 'Enviando...' : sent ? 'Reenviar' : 'Enviar Magic Link'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}