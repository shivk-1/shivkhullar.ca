import { site } from "@/data/site";

type Social = { label: string; href: string; external?: boolean };

const socials: Social[] = [
  { label: "GitHub", href: site.socials.github, external: true },
  { label: "LinkedIn", href: site.socials.linkedin, external: true },
  { label: "X", href: site.socials.x, external: true },
  { label: "Email", href: `mailto:${site.email}` },
  { label: "Resume", href: site.resume, external: true },
];

/** Text-only link row — no icons, matching the old site's tone. */
export function Socials({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      {socials.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            target={s.external ? "_blank" : undefined}
            rel={s.external ? "noreferrer noopener" : undefined}
            className="link text-[15px] text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            {s.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
