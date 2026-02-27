"use server";

import type { Invite } from "@/types";
import type { Tables } from "@nascere/supabase";
import { createServerSupabaseAdmin, createServerSupabaseClient } from "@nascere/supabase/server";
import dayjs from "dayjs";

type GetMyInvitesResult = {
  data?: Invite[];
  error?: string;
};

type GetInviteByIdResult = {
  data?: Invite;
  error?: string;
};

type AddInviteResult = {
  data?: Tables<"team_invites">;
  error?: string;
};

export async function getMyInvites(): Promise<GetMyInvitesResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não encontrado" };
  }

  // Use admin client to bypass RLS — the invited professional is not yet
  // a team member, so RLS on the patients table blocks the JOIN.
  const supabaseAdmin = await createServerSupabaseAdmin();

  const { data: invites, error } = await supabaseAdmin
    .from("team_invites")
    .select(`
      *,
      patient:patients!team_invites_patient_id_fkey(id, name, due_date, dum),
      inviter:users!team_invites_invited_by_fkey(id, name, professional_type)
    `)
    .eq("invited_professional_id", user.id)
    .eq("status", "pendente")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: invites as Invite[] };
}

export async function getInviteById(inviteId: string): Promise<GetInviteByIdResult> {
  const supabaseAdmin = await createServerSupabaseAdmin();

  const { data: invite, error } = await supabaseAdmin
    .from("team_invites")
    .select(`
      *,
      patient:patients!team_invites_patient_id_fkey(id, name, due_date, dum),
      inviter:users!team_invites_invited_by_fkey(id, name, professional_type)
    `)
    .eq("id", inviteId)
    .single();

  if (error || !invite) {
    return { error: "Convite não encontrado" };
  }

  return { data: invite as Invite };
}

export async function getPendingInviteById(inviteId: string): Promise<GetInviteByIdResult> {
  const supabaseAdmin = await createServerSupabaseAdmin();

  const { data: invite, error } = await supabaseAdmin
    .from("team_invites")
    .select(`
      *,
      patient:patients!team_invites_patient_id_fkey(id, name, due_date, dum),
      inviter:users!team_invites_invited_by_fkey(id, name, professional_type)
    `)
    .eq("id", inviteId)
    .eq("status", "pendente")
    .single();

  if (error || !invite) {
    return { error: "Convite não encontrado" };
  }

  return { data: invite as Invite };
}

export async function createInvite(patientId: string): Promise<AddInviteResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não encontrado" };
  }

  const { data: pendingInvites } = await supabase
    .from("team_invites")
    .select()
    .eq("patient_id", patientId)
    .eq("invited_by", user.id)
    .eq("status", "pendente")
    .order("created_at", { ascending: false })
    .limit(1);

  if (pendingInvites?.[0]) {
    return { data: pendingInvites[0] };
  }

  const { data: invite, error: inviteError } = await supabase
    .from("team_invites")
    .insert({
      patient_id: patientId,
      invited_by: user.id,
      expires_at: dayjs().add(4, "days").toISOString(),
    })
    .select()
    .single();

  if (inviteError || !invite) {
    return { error: inviteError?.message ?? "Erro ao cadastrar convite" };
  }

  return { data: invite };
}
