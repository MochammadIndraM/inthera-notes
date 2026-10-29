// Isolated UI fixtures. Never imported by authenticated production routes.
import { monthRange, todayWib } from "../../lib/domain";
import type { Summary, Task, Transaction, Workspace } from "../../lib/types";
const id = (n: number) =>
  "10000000-0000-4000-8000-" + String(n).padStart(12, "0");
export const fixtureWorkspace: Workspace = {
  today: todayWib(),
  profile: { id: id(1), display_name: "Pengguna Pengujian", theme: "light" },
  accounts: [
    {
      id: id(2),
      name: "Tunai · fixture",
      type: "cash",
      opening_balance: "500000",
      balance: "550000",
      opened_on: null,
      is_archived: false,
    },
    {
      id: id(3),
      name: "Bank · fixture",
      type: "bank",
      opening_balance: "1000000",
      balance: "1100000",
      opened_on: null,
      is_archived: false,
    },
  ],
  categories: [
    {
      id: id(4),
      name: "Makanan & Minuman",
      type: "expense",
      is_archived: false,
    },
    { id: id(5), name: "Gaji", type: "income", is_archived: false },
  ],
  projects: [
    {
      id: id(6),
      name: "Rencana pribadi",
      description: "Fixture pengujian",
      color: "#7560e8",
      is_archived: false,
    },
  ],
};
const today = todayWib();
export const fixtureTasks: Task[] = [
  {
    id: id(7),
    title: "Tinjau kembali rencana minggu ini",
    description: "Catatan fixture untuk memeriksa tampilan tugas.",
    due_date: today,
    priority: "high",
    project_id: id(6),
    status: "in_progress",
    completed_at: null,
  },
  {
    id: id(8),
    title: "Rapikan dokumen dan catatan pengeluaran",
    description: "",
    due_date: "2025-01-01",
    priority: "medium",
    project_id: null,
    status: "todo",
    completed_at: null,
  },
];
export const fixtureTransactions: Transaction[] = [
  {
    id: id(9),
    type: "expense",
    amount: "50000",
    transaction_date: today,
    account_id: id(2),
    category_id: id(4),
    from_account_id: null,
    to_account_id: null,
    title: "Makan siang · fixture",
    notes: "Hanya data pengujian lokal",
    category_name: "Makanan & Minuman",
    account_name: "Tunai · fixture",
    from_account_name: null,
    to_account_name: null,
  },
  {
    id: id(10),
    type: "income",
    amount: "200000",
    transaction_date: today,
    account_id: id(3),
    category_id: id(5),
    from_account_id: null,
    to_account_id: null,
    title: "Pemasukan · fixture",
    notes: "Hanya data pengujian lokal",
    category_name: "Gaji",
    account_name: "Bank · fixture",
    from_account_name: null,
    to_account_name: null,
  },
  {
    id: id(11),
    type: "transfer",
    amount: "100000",
    transaction_date: today,
    account_id: null,
    category_id: null,
    from_account_id: id(3),
    to_account_id: id(2),
    title: "Transfer · fixture",
    notes: "",
    category_name: null,
    account_name: null,
    from_account_name: "Bank · fixture",
    to_account_name: "Tunai · fixture",
  },
];
const { start, end } = monthRange(today.slice(0, 7));
export const fixtureSummary: Summary = {
  balance: "1650000",
  income: "200000",
  expense: "50000",
  active_tasks: 2,
  completed_today: 0,
  due_today: 1,
  overdue: 1,
  daily: Array.from(
    { length: (Date.parse(end) - Date.parse(start)) / 86400000 },
    (_, i) => {
      const date = start.slice(0, 8) + String(i + 1).padStart(2, "0");
      return {
        date,
        income: date === today ? "200000" : "0",
        expense: date === today ? "50000" : "0",
      };
    },
  ),
  categories: [{ id: id(4), name: "Makanan & Minuman", amount: "50000" }],
};
