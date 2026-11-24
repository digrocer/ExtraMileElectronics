// Neutral image backdrop (one tone keeps the grid calm; kept as a helper so it can vary later).
const tints = ['from-zinc-50 to-zinc-100'];

/** Stable Tailwind gradient stops for a product slug (pair with `bg-gradient-to-br`). */
export function tintFor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return tints[h % tints.length] ?? 'from-slate-100 to-zinc-200';
}
