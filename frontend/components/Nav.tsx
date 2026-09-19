'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Compass, Languages, Plus, Route, Upload, UserCircle } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { useAuth } from './AuthProvider';

export default function Nav() {
  const { language, copy, setLanguage } = useLanguage();
  const { user } = useAuth();
  const pathname = usePathname();
  const isMapPage = pathname === '/map';
  const links = [['/map', copy.nav.map, Compass], ['/upload', copy.nav.upload, Upload], ['/contribute', copy.nav.contribute, Route], ['/alerts', copy.nav.alerts, Bell]] as const;
  const active = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  return <>
    <header className={`fixed top-5 z-[40] hidden items-center rounded-full border border-green-100 bg-white/90 px-3 py-2 shadow-[0_16px_45px_rgba(21,128,61,.12)] backdrop-blur md:flex ${isMapPage ? 'left-6 w-fit max-w-[calc(100vw-48px)]' : 'left-1/2 w-[min(940px,calc(100%-32px))] -translate-x-1/2 justify-between'}`}>
      <Link href="/" className="flex items-center gap-2 rounded-full px-3 py-2 font-bold text-leaf"><span className="grid h-8 w-8 place-items-center rounded-xl border border-green-100 bg-white p-1"><img src="/logo.png" alt="eppo varum" className="h-full w-full object-contain" /></span><span>eppo varum</span></Link>
      <nav className="flex items-center gap-1">{links.map(([href, label, Icon]) => <Link key={href} href={href} className={`flex items-center gap-2 rounded-full py-2 text-sm font-semibold text-green-950 transition hover:bg-green-50 ${isMapPage ? 'px-3' : 'px-4'}`}><Icon size={16}/>{label}</Link>)}</nav>
      <div className="flex items-center gap-2"><Link href={user ? '/profile' : '/login'} className="rounded-full px-3 py-2 text-sm font-bold text-green-800 hover:bg-green-50">{user?.username || 'Sign in'}</Link><button onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')} aria-label="Switch language" className="flex items-center gap-2 rounded-full border border-green-100 px-3 py-2 text-sm font-semibold hover:bg-yellow-50"><Languages size={16}/>{language === 'en' ? 'മലയാളം' : 'EN'}</button></div>
    </header>
    <nav className="fixed bottom-[env(safe-area-inset-bottom)] left-0 right-0 z-[80] flex items-end justify-around border border-green-100 bg-white/95 p-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] shadow-[0_16px_45px_rgba(21,128,61,.16)] backdrop-blur md:hidden" aria-label="Mobile navigation">
      <Link href="/" className={`grid min-w-14 place-items-center gap-1 rounded-xl p-1 text-[11px] font-semibold ${active('/') ? 'bg-gray-100 text-green-800' : 'text-green-900'}`}><span className="grid h-7 w-7 place-items-center rounded-lg border border-green-100 bg-white p-1"><img src="/logo.png" alt="eppo varum" className="h-full w-full object-contain" /></span>{copy.nav.home}</Link>
      <Link href="/map" className={`grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold ${active('/map') ? 'bg-gray-100 text-green-800' : 'text-green-900'}`}><Compass size={19}/>{copy.nav.map}</Link>
      <Link href="/upload" className={`-mt-7 grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg shadow-green-900/20 ${active('/upload') ? 'bg-green-800 ring-4 ring-gray-200' : 'bg-green-700'}`} aria-label={copy.nav.upload}><Plus size={26}/></Link>
      <Link href="/alerts" className={`grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold ${active('/alerts') ? 'bg-gray-100 text-green-800' : 'text-green-900'}`}><Bell size={19}/>{copy.nav.alerts}</Link>
      <Link href={user ? '/profile' : '/login'} className={`grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold ${active('/profile') ? 'bg-gray-100 text-green-800' : 'text-green-900'}`}><UserCircle size={19}/>{user ? 'Me' : 'Sign in'}</Link>
      <button onClick={() => setLanguage(language === 'en' ? 'ml' : 'en')} className="grid min-w-14 place-items-center gap-1 rounded-xl p-2 text-[11px] font-semibold text-green-900"><Languages size={19}/>{language === 'en' ? 'മലയാളം' : 'EN'}</button>
    </nav>
  </>;
}
