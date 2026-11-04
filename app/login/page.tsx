import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  async function signInWithGoogle() {
    'use server';
    const supabase = await createClient();
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
    const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
    if (!host) redirect('/login?error=Unable%20to%20determine%20the%20OAuth%20callback%20URL.');
    const redirectTo = `${protocol}://${host}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error || !data.url) redirect(`/login?error=${encodeURIComponent(error?.message ?? 'Unable to start Google sign-in.')}`);
    redirect(data.url as never);
  }

  const { error } = await searchParams;
  return <main className="center-page"><div className="auth-card"><p className="eyebrow">Prompt Chain Studio</p><h1>Sign in</h1><p className="muted">Sign in with your authorized Google account to access the superadmin tool.</p>{error && <p className="auth-error">{error}</p>}<form action={signInWithGoogle}><button className="google-button" type="submit">Continue with Google</button></form></div></main>;
}
