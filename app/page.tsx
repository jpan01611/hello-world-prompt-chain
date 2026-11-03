import { redirect } from 'next/navigation';
import { requireSuperadmin } from '@/lib/auth';
export default async function Home() { await requireSuperadmin(); redirect('/chains'); }

