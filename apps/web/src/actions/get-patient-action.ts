"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid("ID do paciente inválido"),
});

export const getPatientAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase } }) => {
    const { data: patient, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", parsedInput.patientId)
      .single();

    if (error) throw new Error(error.message);

    return { patient };
  });
