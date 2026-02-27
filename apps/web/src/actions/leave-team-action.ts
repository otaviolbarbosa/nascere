"use server";

import { authActionClient } from "@/lib/safe-action";
import { leaveTeam } from "@/services/team";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid("ID do paciente inválido"),
});

export const leaveTeamAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, user } }) => {
    await leaveTeam(supabase, user.id, parsedInput.patientId);
    return { success: true };
  });
