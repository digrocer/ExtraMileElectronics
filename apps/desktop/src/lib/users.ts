import type { Enums } from '@extramile/core';
import { supabase } from './supabase';
import { deviceId } from './tauri';

// User management. Reads use the staff JWT directly (RLS `own_profile` lets staff
// read every profile). Mutations go through the `admin-actions` Edge Function, which
// is admin-only server-side (role_change, staff_invite) — the desktop gates the UI to
// admins too, but the server is the real boundary.

export type Role = Enums<'user_role'>;
export const ROLES: Role[] = ['customer', 'staff', 'admin'];

export interface UserRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  created_at: string;
}

export async function listUsers(): Promise<UserRow[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, created_at')
    .order('created_at', { ascending: false })
    .limit(500)
    .returns<UserRow[]>();
  return data ?? [];
}

async function callAdmin(action: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-actions', {
    body: {
      action,
      payload,
      idempotency_key: globalThis.crypto.randomUUID(),
      device_id: await deviceId(),
      source: 'desktop',
    },
  });
  if (error) throw new Error(error.message);
}

export async function changeRole(userId: string, role: Role): Promise<void> {
  await callAdmin('role_change', { user_id: userId, role });
}

export async function inviteStaff(email: string, role: Role): Promise<void> {
  await callAdmin('staff_invite', { email, role });
}
