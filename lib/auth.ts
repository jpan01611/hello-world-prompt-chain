import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error } = await supabase.from('profiles').select('id, first_name, last_name, is_superadmin').eq('id', user.id).maybeSingle();
  if (error) throw new Error(`Unable to verify access: ${error.message}`);
  if (!profile?.is_superadmin) redirect('/unauthorized');
  return { supabase, user, profile };
}

