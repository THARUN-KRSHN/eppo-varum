export default function Loading() {
  return <main className="grid min-h-[70vh] place-items-center px-5 py-24" aria-label="Loading eppo varum">
    <div className="text-center">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-[28px] border border-green-100 bg-white p-4 shadow-[0_18px_50px_rgba(21,128,61,.14)]"><img src="/logo.png" alt="" className="h-full w-full object-contain" /></div>
      <p className="mt-5 text-sm font-bold uppercase tracking-[.2em] text-green-700">eppo varum</p>
      <div className="mx-auto mt-4 h-1.5 w-28 overflow-hidden rounded-full bg-green-100"><div className="h-full w-1/2 animate-pulse rounded-full bg-yellow-400" /></div>
    </div>
  </main>;
}
