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
    <section id={id} className="scroll-mt-24">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[28px]">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
