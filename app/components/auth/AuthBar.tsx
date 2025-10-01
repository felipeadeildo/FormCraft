import { Button } from "~/components/ui/button";
import { supabase } from "~/lib/supabaseClient";
import { useState, useEffect } from "react";

export function AuthBar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) console.error('Error signing in:', error);
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
          <Button size="sm" onClick={handleSignIn}>
            Entrar com GitHub
          </Button>
        )}
      </div>
    </div>
  );
}