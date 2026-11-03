import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSuperadmin } from '@/lib/auth';
import { deleteRun } from '@/lib/chain-actions';

export default async function ChainRunPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ chain?: string }> }) {
  const { id } = await params;
  const { chain: chainId } = await searchParams;
  const { supabase } = await requireSuperadmin();
  const { data: run } = await supabase.from('prompt_chain_runs').select('id, input, output, step_outputs, media_url, created_at, created_by, chain_id').eq('id', id).maybeSingle();
  if (!run) notFound();
  const { data: chain } = await supabase.from('prompt_chains').select('name').eq('id', run.chain_id).maybeSingle();
  const stepOutputs = Array.isArray(run.step_outputs) ? run.step_outputs as { name: string; prompt: string; output: string }[] : [];
  return <main className="detail-page"><header className="detail-page-header"><div><p className="eyebrow">Chain run / {chain?.name ?? 'Prompt chain'}</p><h1>Run details</h1><p className="muted">{new Date(run.created_at).toLocaleString()}</p></div><Link className="secondary button-link" href={`/chains?chain=${chainId ?? run.chain_id}`}>Back to chain runs</Link></header><section className="run-detail standalone">{run.media_url && <img className="generated-media-preview" src={run.media_url} alt="Uploaded media" />}<div className="run-facts"><p><strong>Run ID:</strong> {run.id}</p><p><strong>Created by:</strong> {run.created_by ?? '—'}</p><p><strong>Created:</strong> {new Date(run.created_at).toLocaleString()}</p></div><h2>Step results</h2>{stepOutputs.length ? <div className="step-outputs">{stepOutputs.map((step, index) => <section className="step-output" key={`${run.id}-${index}`}><h3>Step {index + 1}: {step.name}</h3><div><strong>Step description</strong><p>{step.prompt}</p></div><div><strong>Step output</strong><pre>{step.output}</pre></div></section>)}</div> : <p className="muted">No step results stored.</p>}<h2>Final output</h2><pre>{run.output}</pre><form action={deleteRun}><input type="hidden" name="id" value={run.id} /><button className="danger">Delete run</button></form></section></main>;
}
