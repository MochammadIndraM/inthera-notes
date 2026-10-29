export type ReminderTask = { id: string; title: string; due_date: string };
export type ReminderPreferences = {
  in_app_enabled: boolean;
  email_enabled: boolean;
};
export type ReminderState = {
  preferences: ReminderPreferences;
  migrationRequired: boolean;
  unavailable: boolean;
  dueCount: number;
  overdueCount: number;
  tasks: ReminderTask[];
};
export type ReminderPayload = {
  email: string;
  name: string;
  date: string;
  due_count: number;
  overdue_count: number;
  tasks: ReminderTask[];
};
export type ReminderEmail = {
  from: string;
  to: string[];
  subject: string;
  text: string;
};
export type ReminderDelivery = {
  id: string;
  user_id: string;
  claim_token: string;
  payload: ReminderPayload;
  email_request: ReminderEmail | null;
};
