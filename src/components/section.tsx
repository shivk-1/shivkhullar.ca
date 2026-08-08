import type { ReactNode } from "react";

export function Section({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-8 sm:pt-10">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
