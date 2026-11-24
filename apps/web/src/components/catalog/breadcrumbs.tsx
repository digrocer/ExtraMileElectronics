import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-[13px]">
      {trail.map((t, i) => (
        <span key={`${t.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />}
          {t.href ? (
            <Link href={t.href} className="text-primary hover:underline">
              {t.label}
            </Link>
          ) : (
            <span className="text-muted-foreground">{t.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
