import { Banknote, Building2, Wallet, CreditCard } from "lucide-react";
import { getWorkspace } from "@/lib/queries";
import { money, dateLabel } from "@/lib/domain";
import { PageHeading } from "@/components/shared";
import { AccountEditor } from "@/components/record-forms";
import { ArchiveButton } from "@/components/record-actions";
import { EmptyState } from "@/components/ui";
export const metadata = { title: "Akun keuangan" };
export default async function Accounts() {
  const { accounts } = await getWorkspace();
  return (
    <>
      <PageHeading
        eyebrow="KEUANGAN PRIBADI"
        title="Setiap tempat, satu gambaran."
        description="Saldo dihitung otomatis dari saldo awal dan semua transaksi."
        actions={<AccountEditor />}
      />
      <div className="info-strip">
        <Wallet size={19} />
        <div>
          <span>Total saldo terkini</span>
          <strong>
            {money(
              accounts.reduce(
                (total, a) => total + BigInt(a.balance),
                BigInt(0),
              ),
            )}
          </strong>
        </div>
        <p>
          Termasuk saldo akun yang diarsipkan. Saldo awal tidak dihitung sebagai
          pemasukan.
        </p>
      </div>
      {accounts.length ? (
        <div className="resource-grid">
          {accounts.map((a) => {
            const Icon = {
              cash: Banknote,
              bank: Building2,
              ewallet: Wallet,
              other: CreditCard,
            }[a.type];
            return (
              <article
                key={a.id}
                className={
                  "resource-card account-card " +
                  (a.is_archived ? "archived" : "")
                }
              >
                <div className="resource-top">
                  <span className="resource-icon">
                    <Icon size={24} />
                  </span>
                  <div className="row-actions">
                    <AccountEditor account={a} />
                    <ArchiveButton
                      entity="account"
                      id={a.id}
                      archived={a.is_archived}
                    />
                  </div>
                </div>
                <span className="eyebrow">
                  {
                    {
                      cash: "Tunai",
                      bank: "Bank",
                      ewallet: "E-wallet",
                      other: "Lainnya",
                    }[a.type]
                  }
                </span>
                <h2>{a.name}</h2>
                <strong
                  className={
                    "account-balance " +
                    (BigInt(a.balance) < BigInt(0) ? "expense-text" : "")
                  }
                >
                  {money(a.balance)}
                </strong>
                <div className="account-detail">
                  <span>Saldo awal</span>
                  <strong>{money(a.opening_balance)}</strong>
                </div>
                {a.opened_on && (
                  <div className="account-detail">
                    <span>Tanggal pembukaan</span>
                    <span>{dateLabel(a.opened_on, true)}</span>
                  </div>
                )}
                {a.is_archived && (
                  <span className="badge neutral">
                    Diarsipkan · histori tetap tersimpan
                  </span>
                )}
                {BigInt(a.balance) < BigInt(0) && (
                  <p className="notice warning">
                    Saldo negatif. Periksa kembali catatan transaksi atau saldo
                    awal.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            title="Di mana kamu menyimpan uang?"
            description="Buat akun Tunai, Bank, atau E-wallet. Kamu bisa menambah akun lain nanti."
            action={<AccountEditor />}
          />
        </section>
      )}
    </>
  );
}
