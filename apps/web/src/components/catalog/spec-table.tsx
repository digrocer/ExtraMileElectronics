function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bIn\b/, '(in)')
    .replace(/\bMah\b/, '(mAh)')
    .replace(/\bGb\b/i, 'GB')
    .replace(/\bMp\b/, 'MP')
    .replace(/\b(Anc|Hdr|Os|Ram|Cpu|Gpu)\b/g, (w) => w.toUpperCase());
}

function displayValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/** Spec list rendered from the category's spec_schema key order, falling back to the raw specs. */
export function SpecTable({
  specs,
  schema,
}: {
  specs: Record<string, unknown>;
  schema: Record<string, unknown>;
}) {
  const keys = Object.keys(schema).length > 0 ? Object.keys(schema) : Object.keys(specs);
  const rows = keys.filter((k) => specs[k] !== undefined && specs[k] !== null && specs[k] !== '');
  if (rows.length === 0) return null;

  // iOS inset grouped list: label left, value right, hairlines inset from the leading edge.
  return (
    <dl className="overflow-hidden rounded-2xl bg-card text-[15px]">
      {rows.map((k, i) => (
        <div key={k} className="flex items-center justify-between gap-4 pl-4">
          <div
            className={`flex flex-1 items-center justify-between gap-4 py-3 pr-4 ${
              i > 0 ? 'border-t border-black/[0.06]' : ''
            }`}
          >
            <dt className="text-muted-foreground">{humanize(k)}</dt>
            <dd className="text-right font-medium">{displayValue(specs[k])}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
