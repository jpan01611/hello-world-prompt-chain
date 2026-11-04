import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
export async function GET(request: Request) { const url = new URL(request.url); const code = url.searchParams.get('code'); if (!code) redirect('/login?error=Google%20sign-in%20was%20cancelled.'); const supabase = await createClient(); const { error } = await supabase.auth.exchangeCodeForSession(code); if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`); redirect('/chains'); }
