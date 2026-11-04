import Link from 'next/link';
import { requireSuperadmin } from '@/lib/auth';
import { createChainWithOptionalStep } from '@/lib/chain-actions';

export default async function NewChainPage() {
  await requireSuperadmin();
  return <main className="detail-page"><header className="detail-page-header"><div><p className="eyebrow">Prompt chains</p><h1>Create a prompt chain</h1><p className="muted">Create the workflow now, then add or reorder steps from Chain steps.</p></div><Link className="secondary button-link" href="/chains">Cancel</Link></header><form className="creation-card" action={createChainWithOptionalStep}><h2>Chain details</h2><label>Name<input name="name" placeholder="e.g. Columbia caption generator" required /></label><label>Description<input name="description" placeholder="What this chain is for" /></label><div className="creation-divider"><p className="eyebrow">Optional first step</p><p className="muted">Leave both fields blank to create the chain without a step.</p></div><label>Step name<input name="step_name" placeholder="e.g. Describe the image" /></label><label>Step prompt<textarea name="prompt" placeholder="What should this step do?" /></label><button type="submit">Create prompt chain</button></form></main>;
}
