import type { PatientFilter } from "@/types";
import { createServerSupabaseClient } from "@nascere/supabase/server";
import type { Tables } from "@nascere/supabase/types";

type Patient = Tables<"patients">;

type GetMyPatientsResult = {
  patients: Patient[];
  error?: string;
};

export async function getMyPatients(filter: PatientFilter = "all", search = ""): Promise<GetMyPatientsResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { patients: [], error: "Usuário não encontrado" };
  }

  // Get patients where user is a team member
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("patient_id")
    .eq("professional_id", user.id);

  const patientIds = teamMembers?.map((tm) => tm.patient_id) || [];

  if (patientIds.length === 0) {
    return { patients: [] };
  }

  const { data: patients } = await supabase.rpc("get_filtered_patients", {
    patient_ids: patientIds,
    filter_type: filter,
    search_query: search,
  });

  return { patients: (patients as Patient[]) || [] };
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  const supabase = await createServerSupabaseClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();

  return patient;
}
