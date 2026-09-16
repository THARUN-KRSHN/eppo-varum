'use client';

import Link from 'next/link';
import { Bell, Compass, Languages, Plus, Route, Upload } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { useAuth } from './AuthProvider';

export default function Nav() {
  const { language, copy, setLanguage } = useLanguage();
  const { user } = useAuth();
  const links = [['/map', copy.nav.map, Compass], ['/upload', copy.nav.upload, Upload], ['/contribute', copy.nav.contribute, Route], ['/alerts', copy.nav.alerts, Bell]] as const;
  return <>
    <header className="fixed z-50 left-1/2 top-4 hidden w-[min(940px,calc(100%-32px))] -translate-x-1/2 items-center justify-between rounded-full border border-green-100 bg-white/90 px-3 py-2 shadow-[0_16px_45px_rgba(21,128,61,.12)] backdrop-blur md:flex">
      <Link href="/" className="flex items-center gap-2 rounded-full px-3 py-2 font-bold text-leaf"><span className="grid h-8 w-8 place-items-center rounded-xl bg-green-700 text-white"><Route size={17}/></span><span>eppo varum</span></Link>
      <nav className="flex items-center gap-1">{links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-green-950 transition hover:bg-green-50"><Icon size={16}/>{label}</Link>)}</nav>
      <div className="flex items-center gap-2"><Link href={user ? '/profile' : '/login'} className="rounded-full px-3 py-2 text-sm font-bold text-green-800 hover:bg-green-50">{user?.username || 'Sign in'}</Link><button onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')} aria-label="Switch language" className="flex items-center gap-2 rounded-full border border-green-100 px-3 py-2 text-sm font-semibold hover:bg-yellow-50"><Languages size={16}/>{language === 'en' ? 'മലയാളം' : 'EN'}</button></div>
    </header>
    <nav className="fixed bottom-4 left-4 right-4 z-50 flex items-end justify-around rounded-[24px] border border-green-100 bg-white/95 p-2 shadow-[0_16px_45px_rgba(21,128,61,.16)] backdrop-blur md:hidden" aria-label="Mobile navigation">
      <Link href="/" className="grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold text-green-900"><Route size={19}/>{copy.nav.home}</Link>
      <Link href="/map" className="grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold text-green-900"><Compass size={19}/>{copy.nav.map}</Link>
      <Link href="/upload" className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-green-700 text-white shadow-lg shadow-green-900/20" aria-label={copy.nav.upload}><Plus size={26}/></Link>
      <Link href="/alerts" className="grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold text-green-900"><Bell size={19}/>{copy.nav.alerts}</Link>
      <button onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')} className="grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold text-green-900"><Languages size={19}/>{language === 'en' ? 'മലയാളം' : 'EN'}</button>
    </nav>
  </>;
}
