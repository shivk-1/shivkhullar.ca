import { Hero } from "@/components/hero";
import { Section } from "@/components/section";
import { ExperienceList } from "@/components/experience-list";
import { ProjectCard } from "@/components/project-card";
import { projects } from "@/data/projects";

export default function Home() {
  return (
    <main className="pb-20">
      <Hero />

      <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
        <Section id="experience" title="experience">
          <ExperienceList />
        </Section>

        <Section id="projects" title="some things i've built">
          <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}
