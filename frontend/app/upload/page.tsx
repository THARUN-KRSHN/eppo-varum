'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, Camera, Check, FileUp, FileWarning, LoaderCircle, ScanLine, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../../components/LanguageProvider';
import { useAuth } from '../../components/AuthProvider';

const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const busyStates = ['QUEUED', 'PREPROCESSING', 'OCR_PROCESSING', 'STRUCTURING', 'VALIDATING'];
const stageForStatus = (value: string) => value === 'PREPROCESSING' ? 1 : value === 'OCR_PROCESSING' ? 2 : ['STRUCTURING', 'VALIDATING'].includes(value) ? 3 : value === 'REVIEW_REQUIRED' ? 4 : 0;

export default function Upload() {
  const { copy } = useLanguage();
  const { token, user, signOut } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('IDLE');
  const [stage, setStage] = useState(0);
  const [extraction, setExtraction] = useState<any>(null);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!file || !token) { setError('Please sign in before uploading a timetable.'); return; }
    setError(''); setExtraction(null); setStatus('UPLOADING');
    const form = new FormData(); form.append('file', file);
    try {
      const authHeaders = { Authorization: `Bearer ${token}` };
      const response = await fetch(`${api}/documents`, { method: 'POST', headers: authHeaders, body: form });
      const queued = await response.json();
      if (response.status === 401) {
        signOut();
        throw new Error('Your session expired. Please sign in again before uploading.');
      }
      if (!response.ok) throw new Error(queued.detail || 'We could not accept this file.');
      localStorage.setItem('transitlens-last-document', queued.document_id);
      setStatus(queued.status); setStage(1);
      let current = queued.status;
      let attempts = 0;
      while (busyStates.includes(current) && attempts < 120) {
        await new Promise(resolve => setTimeout(resolve, 350));
        attempts += 1;
        const statusResponse = await fetch(`${api}/documents/${queued.document_id}/status`, { headers: authHeaders });
        if (statusResponse.status === 401) {
          signOut();
          throw new Error('Your session expired while processing. Please sign in again.');
        }
        if (!statusResponse.ok) throw new Error('We could not read the processing status.');
        const next = await statusResponse.json(); current = next.status;
        setStatus(current); setStage(stageForStatus(current));
      }
      if (current === 'REVIEW_REQUIRED') {
        const extractionResponse = await fetch(`${api}/documents/${queued.document_id}/extraction`, { headers: authHeaders });
        const extractionResult = await extractionResponse.json();
        if (!extractionResponse.ok) throw new Error(extractionResult.detail || 'The extraction is not ready yet.');
        setExtraction(extractionResult); setStage(4);
      } else if (current === 'PROCESSING_FAILED') {
        setError('We could not read this timetable. Try a clearer photo with the whole table in frame.');
      } else if (busyStates.includes(current)) {
        setStatus('FAILED'); setError('Processing is taking longer than expected. You can retry this upload.');
      }
    } catch (requestError) {
      setStatus('FAILED'); setError(requestError instanceof Error ? requestError.message : 'Connection interrupted. Your upload has not been lost.');
    }
  };

  return <main className="mx-auto max-w-6xl px-5 pb-28 pt-32 md:pt-40"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.18em] text-green-600">{copy.nav.upload}</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-green-950 md:text-6xl">{copy.upload.title}</h1><p className="mt-4 text-lg text-green-950/60">{copy.upload.subtitle}</p></div>
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <section className="surface p-6 md:p-10"><div className="rounded-[22px] border-2 border-dashed border-green-200 bg-green-50/55 p-8 text-center md:p-14"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-green-700 text-white shadow-lg shadow-green-900/15"><ScanLine size={30}/></div><h2 className="mt-6 text-2xl font-bold text-green-950">{copy.upload.drop}</h2><p className="mt-2 text-sm text-green-950/55">{copy.upload.dropSub}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-green-700 px-5 font-bold text-white transition hover:bg-green-800"><FileUp size={18}/>{copy.upload.choose}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={event => setFile(event.target.files?.[0] || null)}/></label><label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-green-200 bg-white px-5 font-bold text-green-800 hover:bg-green-50"><Camera size={18}/>{copy.upload.camera}<input className="sr-only" type="file" accept="image/*" capture="environment" onChange={event => setFile(event.target.files?.[0] || null)}/></label></div>{file && <div className="mx-auto mt-7 flex max-w-md items-center gap-3 rounded-2xl border border-green-200 bg-white p-4 text-left"><FileUp className="shrink-0 text-green-700" size={20}/><div className="min-w-0 flex-1"><p className="truncate font-bold text-green-950">{file.name}</p><p className="text-xs text-green-950/55">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><Check className="text-green-600" size={19}/></div>}<p className="mt-7 text-xs font-semibold text-green-900/45">{copy.upload.formats}</p></div><button onClick={submit} disabled={!file || ['UPLOADING', ...busyStates].includes(status)} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-yellow-300 font-bold text-green-950 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50">{['UPLOADING', ...busyStates].includes(status) ? <><LoaderCircle className="animate-spin" size={18}/> {copy.upload.processing}</> : <>{copy.upload.upload} <ArrowRight size={17}/></>}</button>{error && <div className="mt-5 flex gap-3 rounded-2xl border border-yellow-300 bg-yellow-50 p-4 text-sm font-semibold text-green-950"><AlertCircle className="shrink-0 text-yellow-700" size={19}/><span>{error}</span></div>}</section>
      <aside className="space-y-5"><section className="surface p-6"><div className="flex items-center justify-between"><h2 className="font-bold text-green-950">{copy.upload.processing}</h2><span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-green-900">{status === 'IDLE' ? 'READY' : status}</span></div><div className="mt-6 space-y-4">{copy.upload.stages.map((item, index) => <div key={item} className="flex items-center gap-3 text-sm"><span className={`grid h-7 w-7 place-items-center rounded-full ${stage > index ? 'bg-green-700 text-white' : stage === index && status !== 'IDLE' ? 'bg-yellow-300 text-green-950' : 'bg-green-50 text-green-700'}`}>{stage > index ? <Check size={15}/> : stage === index && status !== 'IDLE' ? <LoaderCircle className="animate-spin" size={15}/> : index + 1}</span><span className={stage >= index && status !== 'IDLE' ? 'font-bold text-green-950' : 'text-green-950/50'}>{item}</span></div>)}</div></section><section className="rounded-3xl bg-green-800 p-6 text-white"><ShieldCheck className="text-yellow-300" size={24}/><h2 className="mt-4 text-xl font-bold">Your source stays visible.</h2><p className="mt-2 text-sm leading-6 text-green-100">TransitLens keeps provenance and confidence attached to every extracted timetable.</p></section></aside></div>
    {extraction && <section className="surface mt-7 p-6 md:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.15em] text-green-600">{copy.upload.result}</p><h2 className="mt-2 text-2xl font-bold text-green-950">{extraction.route.origin} <span className="text-yellow-500">→</span> {extraction.route.destination}</h2></div><span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-green-950">{Math.round(extraction.overall_confidence * 100)}% · {extraction.confidence_level}</span></div><div className="mt-6 divide-y divide-green-100 rounded-2xl border border-green-100">{extraction.stops.map((stop: any) => <div key={stop.sequence} className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 sm:grid-cols-[1fr_auto_auto]"><div><p className="font-bold text-green-950">{stop.name_en}</p><p className="text-sm text-green-950/55">{stop.name_ml}</p></div><span className="font-bold text-green-950">{stop.arrival_time?.slice(0, 5) || '—'}</span><span className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline-flex ${stop.confidence < .9 ? 'bg-yellow-100 text-green-950' : 'bg-green-100 text-green-800'}`}>{stop.confidence < .9 ? copy.verify.review : copy.verify.verified}</span></div>)}</div><div className="mt-6 flex flex-wrap gap-3"><Link href="/verify" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-green-700 px-5 font-bold text-white">{copy.upload.review}<ArrowRight size={16}/></Link><button onClick={() => { setFile(null); setStatus('IDLE'); setExtraction(null); setStage(0); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-green-200 px-5 font-bold text-green-800"><FileWarning size={16}/>{copy.upload.retry}</button></div></section>}
  </main>;
}
