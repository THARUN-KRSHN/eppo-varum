'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, Compass, Languages, LogOut, Plus, Route, Upload } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from './LanguageProvider';
import { useAuth } from './AuthProvider';

export default function Nav() {
  const { language, copy, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const links = [['/map', copy.nav.map, Compass], ['/upload', copy.nav.upload, Upload], ['/contribute', copy.nav.contribute, Route], ['/alerts', copy.nav.alerts, Bell]] as const;
  const active = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  return <>
    <header className="fixed left-1/2 top-4 z-50 hidden w-[min(940px,calc(100%-32px))] -translate-x-1/2 items-center justify-between rounded-full border border-green-100 bg-white/90 px-3 py-2 shadow-[0_16px_45px_rgba(21,128,61,.12)] backdrop-blur md:flex">
      <Link href="/" className="flex items-center gap-2 rounded-full px-3 py-2 font-bold text-leaf"><span className="grid h-8 w-8 place-items-center rounded-xl border border-green-100 bg-white p-1"><img src="/logo.png" alt="eppo varum" className="h-full w-full object-contain" /></span><span>eppo varum</span></Link>
      <nav className="flex items-center gap-1">{links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-green-950 transition hover:bg-green-50"><Icon size={16}/>{label}</Link>)}</nav>
      <div className="flex items-center gap-2"><Link href={user ? '/profile' : '/login'} className="rounded-full px-3 py-2 text-sm font-bold text-green-800 hover:bg-green-50">{user?.username || 'Sign in'}</Link><button onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')} aria-label="Switch language" className="flex items-center gap-2 rounded-full border border-green-100 px-3 py-2 text-sm font-semibold hover:bg-yellow-50"><Languages size={16}/>{language === 'en' ? 'മലയാളം' : 'EN'}</button></div>
    </header>
    <header className="fixed left-3 right-3 top-3 z-50 flex items-center justify-between rounded-2xl border border-green-100 bg-white/95 px-3 py-2 shadow-[0_12px_35px_rgba(21,128,61,.12)] backdrop-blur md:hidden">
      <Link href="/" aria-label="Go to homepage" className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl border border-green-100 bg-white p-1.5"><img src="/logo.png" alt="eppo varum" className="h-full w-full object-contain" /></span><span className="text-sm font-bold text-green-950">eppo varum</span></Link>
      <div className="relative"><button onClick={() => setAccountOpen(!accountOpen)} className="flex items-center gap-1 rounded-xl px-2 py-2 text-sm font-bold text-green-900" aria-expanded={accountOpen}><span className="max-w-24 truncate">{user?.username || 'Sign in'}</span><ChevronDown size={16} /></button>{accountOpen && <div className="absolute right-0 top-12 w-48 overflow-hidden rounded-2xl border border-green-100 bg-white p-2 shadow-xl">{user ? <><Link href="/profile" onClick={() => setAccountOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-semibold text-green-950 hover:bg-green-50">Uploaded documents</Link><button onClick={() => { signOut(); setAccountOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50"><LogOut size={16} /> Sign out</button></> : <Link href="/login" onClick={() => setAccountOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-semibold text-green-950 hover:bg-green-50">Sign in or sign up</Link>}</div>}</div>
    </header>
    <nav className="fixed bottom-4 left-4 right-4 z-50 flex items-end justify-around rounded-[24px] border border-green-100 bg-white/95 p-2 shadow-[0_16px_45px_rgba(21,128,61,.16)] backdrop-blur md:hidden" aria-label="Mobile navigation">
      <Link href="/" className={`grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold ${active('/') ? 'bg-gray-100 text-green-800' : 'text-green-900'}`}><Route size={19}/>{copy.nav.home}</Link>
      <Link href="/map" className={`grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold ${active('/map') ? 'bg-gray-100 text-green-800' : 'text-green-900'}`}><Compass size={19}/>{copy.nav.map}</Link>
      <Link href="/upload" className={`-mt-7 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg shadow-green-900/20 ${active('/upload') ? 'bg-green-800 ring-4 ring-gray-200' : 'bg-green-700'}`} aria-label={copy.nav.upload}><Plus size={26}/></Link>
      <Link href="/alerts" className={`grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold ${active('/alerts') ? 'bg-gray-100 text-green-800' : 'text-green-900'}`}><Bell size={19}/>{copy.nav.alerts}</Link>
      <button onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')} className="grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold text-green-900"><Languages size={19}/>{language === 'en' ? 'മലയാളം' : 'EN'}</button>
    </nav>
  </>;
}
