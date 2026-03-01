"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid("ID do paciente inválido"),
});

export const getPatientEvolutionsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase } }) => {
    const { data: evolutions, error } = await supabase
      .from("patient_evolutions")
      .select("*, professional:professional_id(id, name)")
      .eq("patient_id", parsedInput.patientId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return { evolutions: evolutions ?? [] };
  });
