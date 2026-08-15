import Link from "next/link";
import { Hero } from "@/components/hero";
import { Section } from "@/components/section";
import { ExperienceList } from "@/components/experience-list";
import { ProjectList } from "@/components/project-list";
import { WritingList } from "@/components/writing-list";
import { GalleryCarousel } from "@/components/gallery-carousel";
import { getPosts } from "@/lib/writing";
import { features } from "@/data/site";

export default function Home() {
  const posts = getPosts().slice(0, 3);

  return (
    <main className="pb-20">
      <Hero />

      <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
        <Section id="experience" title="experience">
          <ExperienceList />
        </Section>

        {features.projects && (
          <Section id="projects" title="some things i've built">
            <ProjectList />
          </Section>
        )}

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

        <Section id="gallery" title="a glimpse of my life">
          <GalleryCarousel />
        </Section>
      </div>
    </main>
  );
}
