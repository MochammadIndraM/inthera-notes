export type TaskStatus = "todo" | "in_progress" | "done";
export type TransactionType = "income" | "expense" | "transfer";
export type Theme = "system" | "light" | "dark";
export type Profile = { id: string; display_name: string | null; theme: Theme };
export type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_archived: boolean;
};
export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  project_id: string | null;
  completed_at: string | null;
};
export type Account = {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet" | "other";
  opening_balance: string;
  balance: string;
  opened_on: string | null;
  is_archived: boolean;
};
export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  is_archived: boolean;
};
export type Transaction = {
  id: string;
  type: TransactionType;
  amount: string;
  transaction_date: string;
  account_id: string | null;
  from_account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  title: string | null;
  notes: string | null;
  category_name: string | null;
  account_name: string | null;
  from_account_name: string | null;
  to_account_name: string | null;
};
export type Budget = {
  id: string;
  category_id: string;
  category_name: string;
  month: string;
  limit_amount: string;
  spent: string;
};
export type Summary = {
  balance: string;
  income: string;
  expense: string;
  active_tasks: number;
  completed_today: number;
  due_today: number;
  overdue: number;
  daily: { date: string; income: string; expense: string }[];
  categories: { id: string; name: string; amount: string }[];
};
export type Workspace = {
  reminders?: import("./reminders/types").ReminderState;
  today: string;
  profile: Profile;
  accounts: Account[];
  categories: Category[];
  projects: Project[];
};
export type ActionResult = {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
  redirectTo?: string;
  warning?: string;
};
export type SearchParams = Record<string, string | string[] | undefined>;
