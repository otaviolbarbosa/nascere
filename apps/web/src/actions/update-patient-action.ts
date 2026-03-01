"use server";

import { authActionClient } from "@/lib/safe-action";
import { updatePatientSchema } from "@/lib/validations/patient";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid("ID do paciente inválido"),
  data: updatePatientSchema,
});

export const updatePatientAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase } }) => {
    const { data: patient, error } = await supabase
      .from("patients")
      .update(parsedInput.data)
      .eq("id", parsedInput.patientId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { patient };
  });
