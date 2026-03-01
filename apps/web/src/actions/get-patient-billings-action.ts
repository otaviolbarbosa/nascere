"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid("ID do paciente inválido"),
});

export const getPatientBillingsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, user } }) => {
    const { data: billings, error } = await supabase
      .from("billings")
      .select(`
        *,
        installments(id, status, due_date),
        patient:patients!billings_patient_id_fkey(id, name)
      `)
      .eq("patient_id", parsedInput.patientId)
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return { billings: billings ?? [] };
  });
