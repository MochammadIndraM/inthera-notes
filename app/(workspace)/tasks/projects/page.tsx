import Link from "next/link";
import { FolderClosed } from "lucide-react";
import { getWorkspace } from "@/lib/queries";
import { PageHeading } from "@/components/shared";
import { DeleteRecord, ProjectEditor } from "@/components/record-forms";
import { ArchiveButton } from "@/components/record-actions";
import { EmptyState } from "@/components/ui";
export const metadata = { title: "Proyek" };
export default async function Projects() {
  const { projects } = await getWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="PRODUKTIVITAS"
        title="Ruang untuk setiap rencana."
        description="Kelompokkan tugas berdasarkan tujuan yang sedang kamu bangun."
        actions={<ProjectEditor />}
      />
      {projects.length ? (
        <div className="resource-grid">
          {projects.map((project) => (
            <article
              className={
                "resource-card " + (project.is_archived ? "archived" : "")
              }
              key={project.id}
            >
              <div className="resource-top">
                <span
                  className="resource-icon"
                  style={{ color: project.color }}
                >
                  <FolderClosed size={24} />
                </span>
                <div className="row-actions">
                  <ProjectEditor project={project} />
                  <ArchiveButton
                    entity="project"
                    id={project.id}
                    archived={project.is_archived}
                  />
                  <DeleteRecord
                    entity="project"
                    id={project.id}
                    label={project.name}
                  />
                </div>
              </div>
              <h2>{project.name}</h2>
              <p>{project.description || "Belum ada deskripsi proyek."}</p>
              {project.is_archived && (
                <span className="badge neutral">Diarsipkan</span>
              )}
              <Link className="text-link" href={"/tasks?project=" + project.id}>
                Buka tugas proyek →
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            title="Satu tempat untuk setiap tujuan"
            description="Buat proyek pertamamu, lalu hubungkan tugas yang saling berkaitan."
            action={<ProjectEditor triggerClass="btn secondary" />}
          />
        </section>
      )}
    </>
  );
}
