"use server";

import { authActionClient } from "@/lib/safe-action";
import { createInviteForPatient } from "@/services/invite";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid("ID do paciente inválido"),
});

export const createInviteAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, user } }) => {
    const invite = await createInviteForPatient(supabase, user.id, parsedInput.patientId);
    return { invite };
  });
