'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createChain, updateChain, deleteChain, deleteRun, createStep, updateStep, deleteStep, reorderStep, runChain } from '@/lib/chain-actions';

type Step = { id: string; step_order: number; name: string; prompt: string };
type StepOutput = { name: string; prompt: string; output: string };
type Run = { id: string; input: string; output: string; step_outputs: StepOutput[]; media_url: string | null; media_type: string | null; created_at: string; created_by: string | null };
type Chain = { id: string; name: string; description: string; active: boolean; steps: Step[]; runs: Run[] };
type Theme = 'system' | 'light' | 'dark';

export default function ChainBuilder({ initialChains }: { initialChains: Chain[] }) {
  const [chains, setChains] = useState(initialChains);
  const [selected, setSelected] = useState(initialChains[0]?.id ?? '');
  const [theme, setTheme] = useState<Theme>('system');
  const [systemDark, setSystemDark] = useState(false);
  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  const [dragOverStep, setDragOverStep] = useState<string | null>(null);
  const [previewSteps, setPreviewSteps] = useState<Step[] | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'overview' | 'chains' | 'steps' | 'runs'>('overview');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const chain = chains.find((item) => item.id === selected);
  const activeChainCount = chains.filter((item) => item.active).length;
  const activeChainPercent = chains.length ? Math.round((activeChainCount / chains.length) * 100) : 0;
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);
  const refresh = () => window.location.reload();
  const visibleSteps = previewSteps ?? chain?.steps ?? [];
  const finishDrag = async () => {
    if (!draggedStep || !chain) return;
    const ordered = previewSteps ?? chain.steps;
    const position = ordered.findIndex((candidate) => candidate.id === draggedStep);
    if (position < 0) return;
    const form = new FormData();
    form.set('chain_id', chain.id);
    form.set('id', draggedStep);
    form.set('target_order', String(position + 1));
    setDraggedStep(null);
    setDragOverStep(null);
    setPreviewSteps(null);
    document.getElementById('prompt-chain-drag-preview')?.remove();
    await reorderStep(form);
    setChains((current) => current.map((candidate) => candidate.id === chain.id ? { ...candidate, steps: ordered } : candidate));
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImage]);

  return <div className={isDark ? 'app dark' : 'app'}>
    <header className="topbar">
      <div><p className="eyebrow">SUPERADMIN TOOL</p><h1>Prompt Chain Studio</h1></div>
      <div className="top-actions">
        <label className="theme-picker">Theme
          <select value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
            <option value="system">System default</option><option value="light">Light mode</option><option value="dark">Dark mode</option>
          </select>
        </label>
        <form action={async () => { const { createClient } = await import('@/lib/supabase/client'); await createClient().auth.signOut(); refresh(); }}><button className="secondary">Sign out</button></form>
      </div>
    </header>
    <main className="workspace">
      <aside className="chain-list">
        <div className="section-title"><h2>Workspace</h2></div>
        <button className={activePanel === 'overview' ? 'sidebar-tag selected' : 'sidebar-tag'} onClick={() => setActivePanel('overview')}><strong>Overview</strong><span>Prompt chain workspace summary</span></button>
        <button className={activePanel === 'chains' ? 'sidebar-tag selected' : 'sidebar-tag'} onClick={() => setActivePanel('chains')}><strong>Prompt chain</strong><span>Manage prompt chains</span></button>
        <button className={activePanel === 'steps' ? 'sidebar-tag selected' : 'sidebar-tag'} onClick={() => setActivePanel('steps')}><strong>Chain steps</strong><span>Manage ordered prompts</span></button>
        <button className={activePanel === 'runs' ? 'sidebar-tag selected' : 'sidebar-tag'} onClick={() => { setActivePanel('runs'); document.getElementById('chain-runs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><strong>Chain run</strong><span>Run chains and view past results</span></button>
      </aside>
      {chain ? <section className="editor" id="chain-config">
        {activePanel === 'overview' && <><div className="editor-heading"><div><p className="eyebrow">Workspace overview</p><h2>Prompt Chain Studio</h2><p className="muted">Manage chains, ordered steps, and stored chain runs.</p></div></div><div className="overview-stats"><article className="overview-stat"><span>Total chains</span><strong>{chains.length}</strong><small>Configured workflows</small></article><article className="overview-stat"><span>Active chains</span><strong>{activeChainCount}</strong><small>Ready to run</small></article><article className="overview-stat"><span>Total steps</span><strong>{chains.reduce((total, item) => total + item.steps.length, 0)}</strong><small>Prompt instructions</small></article><article className="overview-stat"><span>Stored runs</span><strong>{chains.reduce((total, item) => total + item.runs.length, 0)}</strong><small>Execution history</small></article></div><section className="overview-panel"><div className="overview-panel-heading"><div><p className="eyebrow">All workflows</p><h3>Chain activity</h3></div><span className="muted">{activeChainPercent}% active overall</span></div><div className="overview-chart-layout"><div className="overview-donut" style={{ background: `conic-gradient(var(--accent) ${activeChainPercent}%, var(--bg) ${activeChainPercent}% 100%)` }} role="img" aria-label={`${activeChainPercent}% of all chains are active`}><div><strong>{activeChainPercent}%</strong><span>all active</span></div></div><div className="overview-activity-list">{chains.length > 0 ? chains.map((item) => <div className="overview-bar-row" key={item.id}><div><strong>{item.name}</strong><span>{item.steps.length} steps · {item.runs.length} runs · {item.active ? 'Active' : 'Paused'}</span></div><button type="button" className="secondary overview-open" onClick={() => { setSelected(item.id); setActivePanel('chains'); }}>Open</button></div>) : <div className="overview-empty"><strong>Workspace is ready</strong><span>Chain activity will appear here after a workflow is created or run.</span></div>}<div className="overview-mini-stats"><div><span>Steps across all chains</span><strong>{chains.reduce((total, item) => total + item.steps.length, 0)}</strong></div><div><span>Runs across all chains</span><strong>{chains.reduce((total, item) => total + item.runs.length, 0)}</strong></div></div></div></div></section></>}
        {activePanel !== 'overview' && <>
        <div className="editor-heading"><div><p className="eyebrow">{activePanel === 'runs' ? 'Chain run' : activePanel === 'steps' ? 'Chain steps' : 'Prompt chains'}</p><h2>{activePanel === 'chains' ? 'Prompt chains' : chain.name}</h2><p className="muted">{activePanel === 'runs' ? 'Run this chain and review its stored results.' : activePanel === 'steps' ? 'Manage the ordered prompts in this chain.' : 'Create and manage reusable prompt workflows.'}</p></div></div>
        {(activePanel === 'chains' || activePanel === 'steps') && <>
        {activePanel === 'chains' && <>
        <form className="chain-settings" action={async (form) => { await updateChain(form); refresh(); }}><input type="hidden" name="id" value={chain.id} /><label>Name<input name="name" defaultValue={chain.name} required /></label><label>Description<input name="description" defaultValue={chain.description} /></label><label className="checkbox"><input type="checkbox" name="active" defaultChecked={chain.active} /> Active</label><button>Save chain</button></form>
        <div className="steps-heading"><div><p className="eyebrow">Prompt chains</p><h2>Chain details</h2></div></div>
        <div className="table-scroll config-table-scroll"><table className="config-table"><thead><tr><th>Chain ID</th><th>Name</th><th>Description</th><th>Status</th><th>Steps</th><th>Actions</th></tr></thead><tbody>{chains.map((item) => <tr key={item.id}><td><code title={item.id}>{item.id.slice(0, 8)}…</code></td><td><button type="button" className="table-link-button" onClick={() => setSelected(item.id)}>{item.name}</button></td><td>{item.description || '—'}</td><td>{item.active ? 'Active' : 'Paused'}</td><td>{item.steps.length}</td><td><form action={async (form) => { await deleteChain(form); refresh(); }}><input type="hidden" name="id" value={item.id} /><button className="danger">Delete</button></form></td></tr>)}</tbody></table></div>
        <Link className="create-table-button" href="/chains/new">+ Create prompt chain</Link>
        </>}
        {activePanel === 'steps' && <><div className="steps-heading"><div><p className="eyebrow">Prompt steps</p><h2>Steps</h2><p className="reorder-hint">Drag the ⋮ handle to reorder.</p></div><span className="step-count">{chain.steps.length} steps</span></div>
        <div className="table-scroll config-table-scroll"><table className="config-table steps-table"><thead><tr><th>Step ID</th><th>Prompt chain ID</th><th>Order</th><th>Name</th><th>Prompt</th><th>Actions</th></tr></thead><tbody>{visibleSteps.map((step, index) => <tr key={step.id} className={dragOverStep === step.id ? 'config-row drag-over' : 'config-row'} onDragOver={(event) => { event.preventDefault(); if (!draggedStep || draggedStep === step.id) return; const rect = event.currentTarget.getBoundingClientRect(); const from = chain.steps.findIndex((candidate) => candidate.id === draggedStep); const target = chain.steps.findIndex((candidate) => candidate.id === step.id); const after = from < target ? event.clientY >= rect.top + rect.height * 0.1 : event.clientY >= rect.bottom - rect.height * 0.1; const base = chain.steps.filter((candidate) => candidate.id !== draggedStep); const moved = chain.steps.find((candidate) => candidate.id === draggedStep); const targetIndex = base.findIndex((candidate) => candidate.id === step.id); if (!moved || targetIndex < 0) return; const reordered = [...base]; reordered.splice(Math.min(base.length, targetIndex + (after ? 1 : 0)), 0, moved); setPreviewSteps(reordered); setDragOverStep(step.id); }} onDrop={(event) => { event.preventDefault(); void finishDrag(); }}><td><button className="drag-handle table-drag-handle" draggable onDragStart={(event) => { setDraggedStep(step.id); setPreviewSteps(chain.steps); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { void finishDrag(); }} aria-label={`Drag ${step.name} to reorder`}>⋮</button><code title={step.id}>{step.id.slice(0, 8)}…</code></td><td><code title={chain.id}>{chain.id.slice(0, 8)}…</code></td><td>{index + 1}</td>        <td><form action={async (form) => { await updateStep(form); refresh(); }}><input type="hidden" name="id" value={step.id} /><input type="hidden" name="prompt" value={step.prompt} /><input name="name" defaultValue={step.name} required /><button className="secondary table-save">Save</button></form></td><td><form action={async (form) => { await updateStep(form); refresh(); }}><input type="hidden" name="id" value={step.id} /><input type="hidden" name="name" value={step.name} /><textarea name="prompt" defaultValue={step.prompt} required /><button className="secondary table-save">Save</button></form></td><td><form action={async (form) => { await deleteStep(form); refresh(); }}><input type="hidden" name="chain_id" value={chain.id} /><input type="hidden" name="id" value={step.id} /><button className="danger">Delete</button></form></td></tr>)}</tbody></table></div>
        <form className="new-step" action={async (form) => { await createStep(form); refresh(); }}><input type="hidden" name="chain_id" value={chain.id} /><h3>Add a step</h3><input name="name" placeholder="e.g. Describe the image" required /><textarea name="prompt" placeholder="What should this step do?" required /><button>Add step</button></form></>}
        </>}
        {activePanel === 'runs' && <section id="chain-runs" className="run-panel run-panel-active"><div><p className="eyebrow">Generated media for {chain.name}</p><h2>Run this chain</h2><p className="muted">Use an uploaded image, image URL, or text input as the chain source.</p></div><form className="run-form" action={async (form) => { await runChain(form); refresh(); }}><input type="hidden" name="chain_id" value={chain.id} /><label>LLM<select name="llm" defaultValue="openai"><option value="openai">OpenAI</option><option value="gemini">Gemini</option></select></label><label>Upload image <span className="muted">(optional)</span><input ref={imageInputRef} name="media_file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => setSelectedImage(event.target.files?.[0] ?? null)} /></label>{imagePreviewUrl && selectedImage && <div className="upload-preview"><img src={imagePreviewUrl} alt={`Preview of ${selectedImage.name}`} /><div><strong>{selectedImage.name}</strong><span>{Math.round(selectedImage.size / 1024)} KB</span></div><button type="button" className="secondary" onClick={() => { setSelectedImage(null); if (imageInputRef.current) imageInputRef.current.value = ''; }}>Remove</button></div>}<label>Media URL <span className="muted">(optional)</span><input name="media_url" type="url" placeholder="https://.../generated-image.png" /></label><input type="hidden" name="media_type" value="image" /><textarea name="input" placeholder="Describe the source or add text for the prompt chain" /><button>Run prompt chain</button></form>{chain.runs.length > 0 && <div className="runs"><h3>Past chain runs</h3><div className="table-scroll chain-runs-table-scroll"><table className="chain-runs-table"><thead><tr><th>Run ID</th><th>Image uploaded</th><th>Created</th><th>Created by</th><th>Actions</th></tr></thead><tbody>{chain.runs.map((run) => <tr key={run.id} className="run-row"><td className="id-cell"><Link className="table-link table-cell-link" href={`/chains/runs/${run.id}?chain=${chain.id}`}><code title={run.id}>{run.id.slice(0, 8)}…</code></Link></td><td><Link className="table-link table-cell-link" href={`/chains/runs/${run.id}?chain=${chain.id}`}>{run.media_url ? <img className="generated-media-preview" src={run.media_url} alt={`Media used by ${chain.name}`} /> : <span className="muted">No image</span>}</Link></td><td><Link className="table-link table-cell-link" href={`/chains/runs/${run.id}?chain=${chain.id}`}>{new Date(run.created_at).toLocaleString()}</Link></td><td><Link className="table-link table-cell-link" href={`/chains/runs/${run.id}?chain=${chain.id}`}><code title={run.created_by ?? ''}>{run.created_by ? `${run.created_by.slice(0, 8)}…` : '—'}</code></Link></td><td className="action-cell"><form action={async (form) => { await deleteRun(form); refresh(); }}><input type="hidden" name="id" value={run.id} /><button type="submit" className="danger">Delete</button></form></td></tr>)}</tbody></table></div></div>}</section>}
        </>}
      </section> : null}
      {!chain && <section className="empty"><h2>Create your first prompt chain</h2><p>Chains turn ordered instructions into reusable generated media.</p></section>}
    </main>
  </div>;
}
