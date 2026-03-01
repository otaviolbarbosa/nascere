"use server";

import { authActionClient } from "@/lib/safe-action";
import { dayjs } from "@/lib/dayjs";
import { calculateGestationalAge } from "@/lib/gestational-age";
import type { PatientFilter, PatientWithGestationalInfo } from "@/types";
import { z } from "zod";

const schema = z.object({
  filter: z
    .enum(["all", "recent", "trim1", "trim2", "trim3", "final"])
    .default("all"),
  search: z.string().default(""),
});

export const getHomePatientsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, user } }) => {
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("patient_id")
      .eq("professional_id", user.id);

    const patientIds = teamMembers?.map((tm) => tm.patient_id) ?? [];

    if (patientIds.length === 0) {
      return { patients: [] as PatientWithGestationalInfo[] };
    }

    const { data: patients, error } = await supabase.rpc("get_filtered_patients", {
      patient_ids: patientIds,
      filter_type: parsedInput.filter as PatientFilter,
      search_query: parsedInput.search,
    });

    if (error) throw new Error(error.message);

    const today = dayjs();

    const patientsWithInfo = (patients || [])
      .map((patient) => {
        const gestationalAge = calculateGestationalAge(patient.dum);
        const dueDate = dayjs(patient.due_date);
        const remainingDays = dueDate.diff(today, "day");

        return {
          ...patient,
          weeks: gestationalAge?.weeks ?? 0,
          days: gestationalAge?.days ?? 0,
          remainingDays: Math.max(remainingDays, 0),
          progress: gestationalAge
            ? Math.min(Math.round((gestationalAge.weeks / 40) * 100), 100)
            : 0,
        } as PatientWithGestationalInfo;
      })
      .slice(0, 5);

    return { patients: patientsWithInfo };
  });
