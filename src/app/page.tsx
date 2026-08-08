import { Hero } from "@/components/hero";
import { Section } from "@/components/section";
import { ExperienceList } from "@/components/experience-list";
import { ProjectCard } from "@/components/project-card";
import { Reveal } from "@/components/reveal";
import { Footer } from "@/components/footer";
import { projects } from "@/data/projects";

export default function Home() {
  return (
    <main className="pb-4">
      <Hero />

      <div className="mt-14 space-y-14 sm:mt-16 sm:space-y-16">
        <Section id="experience" title="Experience">
          <ExperienceList />
        </Section>

        <Section id="projects" title="Projects">
          <div className="grid gap-5 sm:grid-cols-2">
            {projects.map((project, i) => (
              <Reveal key={project.name} delay={i * 0.05}>
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </div>
        </Section>
      </div>

      <Footer />
    </main>
  );
}
