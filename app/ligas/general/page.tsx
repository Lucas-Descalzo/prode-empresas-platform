import { GroupPageClient } from "@/components/group-page-client";
import styles from "@/components/group-page.module.css";
import { getPublicPoolPageData } from "@/lib/group-service";

export const dynamic = "force-dynamic";

export default async function GeneralLeaguePage() {
  const data = await getPublicPoolPageData();

  if (!data) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Liga general</p>
            <h1>No disponible</h1>
            <p>La base de datos todavía no está configurada.</p>
          </div>
        </section>
      </main>
    );
  }

  return <GroupPageClient data={data} />;
}
