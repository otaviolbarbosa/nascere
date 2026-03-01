"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid().optional(),
});

export const getAppointmentsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, user } }) => {
    let query = supabase
      .from("appointments")
      .select(`
        *,
        patient:patients!appointments_patient_id_fkey(id, name),
        professional:users!appointments_professional_id_fkey(name, professional_type)
      `)
      .eq("professional_id", user.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (parsedInput.patientId) {
      query = query.eq("patient_id", parsedInput.patientId);
    }

    const { data: appointments, error } = await query;

    if (error) throw new Error(error.message);

    return { appointments: appointments ?? [] };
  });
