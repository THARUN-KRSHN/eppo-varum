'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { en } from '../locales/en'; import { ml } from '../locales/ml';
type Language = 'en' | 'ml'; type Copy = typeof en | typeof ml;
const LanguageContext = createContext<{ language: Language; copy: Copy; setLanguage: (language: Language) => void }>({ language: 'en', copy: en, setLanguage: () => undefined });
export function LanguageProvider({ children }: { children: React.ReactNode }) { const [language, setLanguageState] = useState<Language>('en'); useEffect(() => { const saved = localStorage.getItem('eppo-varum-language') || localStorage.getItem('transitlens-language'); if (saved === 'en' || saved === 'ml') setLanguageState(saved); }, []); useEffect(() => { document.documentElement.lang = language; }, [language]); const setLanguage = (next: Language) => { setLanguageState(next); localStorage.setItem('eppo-varum-language', next); }; const value = useMemo(() => ({ language, copy: language === 'ml' ? ml : en, setLanguage }), [language]); return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>; }
export const useLanguage = () => useContext(LanguageContext);
