"use server";

import { authActionClient } from "@/lib/safe-action";
import { createPatientSchema } from "@/lib/validations/patient";
import { createPatient } from "@/services/patient";

export const addPatientAction = authActionClient
  .inputSchema(createPatientSchema)
  .action(async ({ parsedInput, ctx: { supabase, supabaseAdmin, user } }) => {
    const patient = await createPatient(supabase, supabaseAdmin, user.id, parsedInput);
    return { patient };
  });
