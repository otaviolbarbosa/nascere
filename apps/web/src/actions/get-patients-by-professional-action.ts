"use server";

import { isStaff } from "@/lib/access-control";
import { authActionClient } from "@/lib/safe-action";
import type { PatientFilter } from "@/types";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string().uuid(),
});

export const getPatientsByProfessionalAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, profile } }) => {
    if (!isStaff(profile)) throw new Error("Acesso não autorizado");

    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("patient_id")
      .eq("professional_id", parsedInput.professionalId);

    const patientIds = teamMembers?.map((tm) => tm.patient_id) ?? [];

    if (patientIds.length === 0) return { patients: [] };

    const { data, error } = await supabase.rpc("get_filtered_patients", {
      patient_ids: patientIds,
      filter_type: "all" as PatientFilter,
      search_query: "",
    });

    if (error) throw new Error(error.message);

    const patients = (data ?? []).map((p) => ({ id: p.id, name: p.name }));

    return { patients };
  });
