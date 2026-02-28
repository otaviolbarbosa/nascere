"use server";

import { authActionClient } from "@/lib/safe-action";

export const getPendingInvitesAction = authActionClient.action(
  async ({ ctx: { supabase, user } }) => {
    const { data, error } = await supabase
      .from("team_invites")
      .select("id")
      .eq("invited_professional_id", user.id)
      .eq("status", "pendente")
      .gt("expires_at", new Date().toISOString());

    if (error) throw new Error(error.message);

    return { hasPendingInvites: (data?.length ?? 0) > 0 };
  },
);
