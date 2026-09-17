'use client';

import Link from 'next/link';
import { Github, Mail, MapPinned, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return <footer className="border-t border-green-100 bg-white">
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
      <div>
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-green-100 bg-white p-2 shadow-sm"><img src="/logo.png" alt="eppo varum logo" className="h-full w-full object-contain" /></span>
          <span><strong className="block text-lg text-green-950">eppo varum</strong><span className="text-sm text-green-950/55">എപ്പോ വരും</span></span>
        </Link>
        <p className="mt-5 max-w-sm text-sm leading-6 text-green-950/60">Community-powered bus timetable data for easier, more trustworthy local journeys.</p>
      </div>
      <div>
        <h2 className="font-bold text-green-950">Explore</h2>
        <div className="mt-4 grid gap-3 text-sm text-green-950/65"><Link href="/map" className="hover:text-green-700">Bus map</Link><Link href="/upload" className="hover:text-green-700">Upload timetable</Link><Link href="/contribute" className="hover:text-green-700">Contribute a route</Link></div>
      </div>
      <div>
        <h2 className="font-bold text-green-950">Our promise</h2>
        <div className="mt-4 space-y-3 text-sm text-green-950/65"><p className="flex gap-2"><ShieldCheck size={17} className="shrink-0 text-green-700" /> Human review before timetable publication.</p><p className="flex gap-2"><MapPinned size={17} className="shrink-0 text-green-700" /> Scheduled data, not live GPS tracking.</p><p className="flex gap-2"><Mail size={17} className="shrink-0 text-green-700" /> Built with local rider knowledge.</p></div>
      </div>
    </div>
    <div className="border-t border-green-100"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-green-950/45"><span>© {new Date().getFullYear()} eppo varum</span><span className="flex items-center gap-2"><Github size={14} /> OpenStreetMap data with attribution</span></div></div>
  </footer>;
}
