import Link from "next/link";
import { Hero } from "@/components/hero";
import { Section } from "@/components/section";
import { ExperienceList } from "@/components/experience-list";
import { ProjectList } from "@/components/project-list";
import { WritingList } from "@/components/writing-list";
import { getPosts } from "@/lib/writing";

export default function Home() {
  const posts = getPosts().slice(0, 3);

  return (
    <main className="pb-20">
      <Hero />

      <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
        <Section id="experience" title="experience">
          <ExperienceList />
        </Section>

        <Section id="projects" title="some things i've built">
          <ProjectList />
        </Section>

        <Section
          id="writing"
          title="writing"
          action={
            <Link href="/writing" className="link text-sm text-muted">
              all writing →
            </Link>
          }
        >
          <WritingList posts={posts} />
        </Section>
      </div>
    </main>
  );
}
