"use server";

import { authActionClient } from "@/lib/safe-action";
import { respondToInvite } from "@/services/invite";
import { z } from "zod";

const schema = z.object({
  inviteId: z.string().uuid("ID do convite inválido"),
  action: z.enum(["accept", "reject"]),
});

export const respondInviteAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, supabaseAdmin, user } }) => {
    const result = await respondToInvite(
      supabase,
      supabaseAdmin,
      user.id,
      user.user_metadata,
      parsedInput.inviteId,
      parsedInput.action,
    );
    return { success: true, patientId: result.patientId };
  });
