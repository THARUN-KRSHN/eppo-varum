'use client';

import { useEffect, useState } from 'react';

export default function IntroSplash() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 1100);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-white" aria-label="Loading eppo varum"><div className="intro-logo"><img src="/logo.png" alt="eppo varum" /></div></div>;
}
