"use server";

import { authActionClient } from "@/lib/safe-action";
import type { TeamMember } from "@/types";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid("ID do paciente inválido"),
});

export const getTeamMembersAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase } }) => {
    const { data, error } = await supabase
      .from("team_members")
      .select(`
        *,
        professional:users!team_members_professional_id_fkey(id, name, email, avatar_url)
      `)
      .eq("patient_id", parsedInput.patientId);

    if (error) throw new Error(error.message);

    return { teamMembers: (data ?? []) as TeamMember[] };
  });
