"use client";
import { useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { changeRecord, saveRecord, type Entity } from "@/lib/actions/records";
import type {
  Account,
  Budget,
  Category,
  Project,
  Task,
  Transaction,
  TransactionType,
  Workspace,
} from "@/lib/types";
import { Field, Modal, MoneyInput, MutationForm } from "./ui";

type Trigger = { trigger?: ReactNode; triggerClass?: string };
function Editor({
  entity,
  title,
  children,
  id,
  trigger,
  triggerClass,
}: Trigger & {
  entity: Entity;
  title: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <Modal
      title={title}
      trigger={
        trigger ??
        (id ? (
          <>
            <Pencil size={15} />
            <span className="sr-only">Ubah</span>
          </>
        ) : undefined)
      }
      triggerClass={triggerClass ?? (id ? "icon-btn" : "btn primary")}
    >
      {(close) => (
        <MutationForm action={saveRecord.bind(null, entity)} onSuccess={close}>
          {id && <input type="hidden" name="id" value={id} />}
          {children}
        </MutationForm>
      )}
    </Modal>
  );
}
export function TaskEditor({
  task,
  projects,
  ...trigger
}: Trigger & { task?: Task; projects: Project[] }) {
  return (
    <Editor
      entity="task"
      title={task ? "Ubah tugas" : "Tambah tugas"}
      id={task?.id}
      {...trigger}
    >
      <Field label="Apa yang ingin diselesaikan?" name="title">
        <input
          name="title"
          required
          autoFocus
          maxLength={160}
          defaultValue={task?.title}
          placeholder="Tulis tugas pertamamu…"
        />
      </Field>
      <details open={!!task} className="advanced">
        <summary>Detail & pengaturan tugas</summary>
        <div className="form-stack">
          <Field label="Deskripsi" name="description">
            <textarea
              name="description"
              rows={3}
              maxLength={5000}
              defaultValue={task?.description ?? ""}
              placeholder="Tambahkan konteks atau langkah kecil…"
            />
          </Field>
          <div className="form-grid">
            <Field label="Tenggat" name="due_date">
              <input
                type="date"
                name="due_date"
                min="1900-01-01"
                max="9999-12-30"
                defaultValue={task?.due_date ?? ""}
              />
            </Field>
            <Field label="Prioritas" name="priority">
              <select name="priority" defaultValue={task?.priority ?? "medium"}>
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
              </select>
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Status" name="status">
              <select name="status" defaultValue={task?.status ?? "todo"}>
                <option value="todo">Belum dimulai</option>
                <option value="in_progress">Dikerjakan</option>
                <option value="done">Selesai</option>
              </select>
            </Field>
            <Field label="Proyek" name="project_id">
              <select name="project_id" defaultValue={task?.project_id ?? ""}>
                <option value="">Tanpa proyek</option>
                {projects
                  .filter((p) => !p.is_archived || p.id === task?.project_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.is_archived ? " (arsip)" : ""}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
        </div>
      </details>
    </Editor>
  );
}
export function TransactionEditor({
  transaction,
  workspace,
  initialType = "expense",
  ...trigger
}: Trigger & {
  transaction?: Transaction;
  workspace: Workspace;
  initialType?: TransactionType;
}) {
  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? initialType,
  );
  // Archived values remain selectable only for their existing historical relation.
  const accountOptions = (current?: string | null) =>
    workspace.accounts
      .filter((a) => !a.is_archived || a.id === current)
      .map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
          {a.is_archived ? " (arsip)" : ""}
        </option>
      ));
  return (
    <Editor
      entity="transaction"
      title={transaction ? "Ubah transaksi" : "Catat transaksi"}
      id={transaction?.id}
      {...trigger}
    >
      <div className="segmented" role="group" aria-label="Jenis transaksi">
        {(
          [
            ["expense", "Pengeluaran", ArrowUpRight],
            ["income", "Pemasukan", ArrowDownLeft],
            ["transfer", "Transfer", ArrowRightLeft],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            aria-pressed={type === value}
            className={type === value ? "selected" : ""}
            onClick={() => setType(value)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />
      <Field label="Nominal transaksi" name="amount">
        <MoneyInput name="amount" value={transaction?.amount} />
      </Field>
      {type === "transfer" ? (
        <div className="form-grid" key="transfer">
          <input type="hidden" name="account_id" value="" />
          <input type="hidden" name="category_id" value="" />
          <Field label="Dari akun" name="from_account_id">
            <select
              required
              name="from_account_id"
              defaultValue={transaction?.from_account_id ?? ""}
            >
              <option value="">Pilih akun asal</option>
              {accountOptions(transaction?.from_account_id)}
            </select>
          </Field>
          <Field label="Ke akun" name="to_account_id">
            <select
              required
              name="to_account_id"
              defaultValue={transaction?.to_account_id ?? ""}
            >
              <option value="">Pilih akun tujuan</option>
              {accountOptions(transaction?.to_account_id)}
            </select>
          </Field>
        </div>
      ) : (
        <div className="form-grid" key={type}>
          <input type="hidden" name="from_account_id" value="" />
          <input type="hidden" name="to_account_id" value="" />
          <Field label="Akun" name="account_id">
            <select
              required
              name="account_id"
              defaultValue={transaction?.account_id ?? ""}
            >
              <option value="">Pilih akun</option>
              {accountOptions(transaction?.account_id)}
            </select>
          </Field>
          <Field label="Kategori" name="category_id">
            <select
              required
              name="category_id"
              defaultValue={
                transaction?.type === type
                  ? (transaction.category_id ?? "")
                  : ""
              }
            >
              <option value="">Pilih kategori</option>
              {workspace.categories
                .filter(
                  (c) =>
                    c.type === type &&
                    (!c.is_archived || c.id === transaction?.category_id),
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.is_archived ? " (arsip)" : ""}
                  </option>
                ))}
            </select>
          </Field>
        </div>
      )}
      <div className="form-grid">
        <Field label="Tanggal (WIB)" name="transaction_date">
          <input
            type="date"
            name="transaction_date"
            required
            min="1900-01-01"
            max="9999-12-30"
            defaultValue={transaction?.transaction_date ?? workspace.today}
          />
        </Field>
        <Field label="Judul / catatan singkat" name="title">
          <input
            name="title"
            maxLength={160}
            defaultValue={transaction?.title ?? ""}
            placeholder="Contoh: makan siang"
          />
        </Field>
      </div>
      <Field label="Catatan detail" name="notes">
        <textarea
          name="notes"
          rows={2}
          maxLength={5000}
          defaultValue={transaction?.notes ?? ""}
        />
      </Field>
      {type === "transfer" && (
        <p className="notice">
          Transfer mencatat perpindahan saldo internal dan tidak memindahkan
          uang sungguhan.
        </p>
      )}
      {!workspace.accounts.some((a) => !a.is_archived) && (
        <p className="notice warning">
          Buat akun keuangan terlebih dahulu melalui menu Akun.
        </p>
      )}
    </Editor>
  );
}
export function AccountEditor({
  account,
  ...trigger
}: Trigger & { account?: Account }) {
  return (
    <Editor
      entity="account"
      title={account ? "Ubah akun keuangan" : "Buat akun keuangan"}
      id={account?.id}
      {...trigger}
    >
      <Field label="Nama akun" name="name">
        <input
          name="name"
          autoFocus
          required
          maxLength={80}
          defaultValue={account?.name}
          placeholder="Contoh: Tunai, Bank, atau DANA"
        />
      </Field>
      <Field label="Jenis akun" name="type">
        <select name="type" defaultValue={account?.type ?? "cash"}>
          <option value="cash">Tunai</option>
          <option value="bank">Bank</option>
          <option value="ewallet">E-wallet</option>
          <option value="other">Lainnya</option>
        </select>
      </Field>
      <Field
        label="Saldo awal"
        name="opening_balance"
        hint="Saldo awal bukan pemasukan. Nilai negatif diperbolehkan untuk koreksi saldo."
      >
        <MoneyInput
          name="opening_balance"
          value={account?.opening_balance ?? "0"}
          allowNegative
        />
      </Field>
      <Field label="Tanggal pembukaan (opsional)" name="opened_on">
        <input
          type="date"
          name="opened_on"
          min="1900-01-01"
          max="9999-12-30"
          defaultValue={account?.opened_on ?? ""}
        />
      </Field>
    </Editor>
  );
}
export function CategoryEditor({
  category,
  ...trigger
}: Trigger & { category?: Category }) {
  return (
    <Editor
      entity="category"
      title={category ? "Ubah kategori" : "Tambah kategori"}
      id={category?.id}
      {...trigger}
    >
      <Field label="Nama kategori" name="name">
        <input
          name="name"
          autoFocus
          required
          maxLength={80}
          defaultValue={category?.name}
        />
      </Field>
      <Field
        label="Jenis"
        name="type"
        hint="Jenis kategori yang sudah dipakai transaksi atau anggaran tidak bisa diubah."
      >
        <select name="type" defaultValue={category?.type ?? "expense"}>
          <option value="expense">Pengeluaran</option>
          <option value="income">Pemasukan</option>
        </select>
      </Field>
    </Editor>
  );
}
export function ProjectEditor({
  project,
  ...trigger
}: Trigger & { project?: Project }) {
  return (
    <Editor
      entity="project"
      title={project ? "Ubah proyek" : "Tambah proyek"}
      id={project?.id}
      {...trigger}
    >
      <Field label="Nama proyek" name="name">
        <input
          name="name"
          required
          autoFocus
          maxLength={80}
          defaultValue={project?.name}
        />
      </Field>
      <Field label="Deskripsi" name="description">
        <textarea
          name="description"
          maxLength={5000}
          rows={3}
          defaultValue={project?.description ?? ""}
        />
      </Field>
      <Field label="Warna proyek" name="color">
        <input
          name="color"
          type="color"
          defaultValue={project?.color ?? "#7560e8"}
        />
      </Field>
    </Editor>
  );
}
export function BudgetEditor({
  budget,
  categories,
  month,
  ...trigger
}: Trigger & { budget?: Budget; categories: Category[]; month: string }) {
  return (
    <Editor
      entity="budget"
      title={budget ? "Ubah anggaran" : "Buat anggaran"}
      id={budget?.id}
      {...trigger}
    >
      <Field label="Kategori pengeluaran" name="category_id">
        <select
          required
          name="category_id"
          defaultValue={budget?.category_id ?? ""}
        >
          <option value="">Pilih kategori</option>
          {categories
            .filter(
              (c) =>
                c.type === "expense" &&
                (!c.is_archived || c.id === budget?.category_id),
            )
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.is_archived ? " (arsip)" : ""}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Bulan" name="month">
        <input
          type="month"
          required
          min="1900-01"
          max="9999-11"
          defaultValue={budget?.month.slice(0, 7) ?? month}
          name="budget_month"
          onChange={(e) => {
            const hidden = e.currentTarget.form?.elements.namedItem(
              "month",
            ) as HTMLInputElement;
            if (hidden) hidden.value = e.currentTarget.value + "-01";
          }}
        />
      </Field>
      <input
        type="hidden"
        name="month"
        defaultValue={(budget?.month.slice(0, 7) ?? month) + "-01"}
      />
      <Field label="Batas anggaran" name="limit_amount">
        <MoneyInput name="limit_amount" value={budget?.limit_amount} />
      </Field>
      <p className="field-hint">
        Anggaran tidak membatasi pencatatan transaksi. Tidak ada rollover
        otomatis ke bulan berikutnya.
      </p>
    </Editor>
  );
}
export function DeleteRecord({
  entity,
  id,
  label,
}: {
  entity: Entity;
  id: string;
  label: string;
}) {
  return (
    <Modal
      title="Hapus data?"
      trigger={
        <>
          <Trash2 size={15} />
          <span className="sr-only">Hapus {label}</span>
        </>
      }
      triggerClass="icon-btn danger-text"
      description={
        entity === "transaction"
          ? `Hapus “${label}” secara permanen? Saldo, ringkasan, dan realisasi anggaran akan dihitung ulang.`
          : entity === "project"
            ? `Hapus “${label}”? Tugas tetap disimpan dan dilepaskan dari proyek ini.`
            : `Hapus “${label}” secara permanen? Tindakan ini tidak dapat dibatalkan.`
      }
    >
      {(close) => (
        <MutationForm
          action={() => changeRecord(entity, id, "delete")}
          onSuccess={close}
          submit="Ya, hapus data"
        >
          <span />
        </MutationForm>
      )}
    </Modal>
  );
}
