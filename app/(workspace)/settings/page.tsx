import { requireUser } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/queries";
import { PageHeading, Panel } from "@/components/shared";
import { SettingsForm } from "@/components/settings-form";
import { CategoryEditor } from "@/components/record-forms";
import { ArchiveButton } from "@/components/record-actions";
export const metadata = { title: "Pengaturan" };
export default async function Settings() {
  const [workspace, { user }] = await Promise.all([
    getWorkspace(),
    requireUser(),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE PRIBADI"
        title="Sesuai caramu."
        description="Atur profil, tampilan, dan kategori keuanganmu."
      />
      <div className="settings-grid">
        <Panel
          title="Profil & preferensi"
          subtitle="Satu ruang yang terasa milikmu"
        >
          <div className="padded">
            <SettingsForm
              profile={workspace.profile}
              email={user.email ?? ""}
            />
          </div>
        </Panel>
        <div id="categories">
          <Panel
            title="Kategori keuangan"
            subtitle="Kategori privat milik akunmu"
            action={<CategoryEditor triggerClass="btn secondary small" />}
          >
            {(["expense", "income"] as const).map((type) => (
              <section className="category-section" key={type}>
                <h3>{type === "expense" ? "Pengeluaran" : "Pemasukan"}</h3>
                {workspace.categories
                  .filter((c) => c.type === type)
                  .map((c) => (
                    <div className="category-row" key={c.id}>
                      <span>
                        {c.name}
                        {c.is_archived && <small>Diarsipkan</small>}
                      </span>
                      <div className="row-actions">
                        <CategoryEditor category={c} />
                        <ArchiveButton
                          entity="category"
                          id={c.id}
                          archived={c.is_archived}
                        />
                      </div>
                    </div>
                  ))}
              </section>
            ))}
            <p className="field-hint padded">
              Arsipkan kategori yang tidak dipakai lagi. Transaksi historis
              tetap tersimpan dan nama kategori harus unik per jenis.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
