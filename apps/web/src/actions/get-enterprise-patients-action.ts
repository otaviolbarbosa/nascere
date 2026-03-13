"use server";

import type { PatientWithPregnancyFields } from "@/services/patient";
import type { PatientFilter, TeamMember } from "@/types";
import { createServerSupabaseClient } from "@nascere/supabase/server";

const PATIENTS_PER_PAGE = 10;

type GetEnterprisePatientsResult = {
  patients: PatientWithPregnancyFields[];
  totalCount: number;
  teamMembersMap: Record<string, TeamMember[]>;
  error?: string;
};

export async function getEnterprisePatients(
  enterpriseId: string,
  filter: PatientFilter = "all",
  search = "",
  page = 1,
  professionalId?: string,
): Promise<GetEnterprisePatientsResult> {
  const supabase = await createServerSupabaseClient();

  let teamMembersQuery = supabase.from("team_members").select("patient_id");

  if (professionalId) {
    teamMembersQuery = teamMembersQuery.eq("professional_id", professionalId);
  } else {
    const { data: professionals } = await supabase
      .from("users")
      .select("id")
      .eq("enterprise_id", enterpriseId)
      .eq("user_type", "professional");

    const professionalIds = professionals?.map((p) => p.id) ?? [];

    if (professionalIds.length === 0) {
      return { patients: [], totalCount: 0, teamMembersMap: {} };
    }

    teamMembersQuery = teamMembersQuery.in("professional_id", professionalIds);
  }

  const { data: teamMembershipsData } = await teamMembersQuery;

  const patientIds = [...new Set(teamMembershipsData?.map((tm) => tm.patient_id) ?? [])];

  if (patientIds.length === 0) {
    return { patients: [], totalCount: 0, teamMembersMap: {} };
  }

  const offset = (page - 1) * PATIENTS_PER_PAGE;

  const { data } = await supabase.rpc("get_filtered_patients", {
    patient_ids: patientIds,
    filter_type: filter,
    search_query: search,
    page_limit: PATIENTS_PER_PAGE,
    page_offset: offset,
  });

  const rows = (data as (PatientWithPregnancyFields & { total_count: number })[]) ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0]?.total_count) : 0;

  const pagePatientIds = rows.map((r) => r.id);
  const teamMembersMap: Record<string, TeamMember[]> = {};

  if (pagePatientIds.length > 0) {
    const { data: teamMembersData } = await supabase
      .from("team_members")
      .select("id, patient_id, professional_id, professional_type, joined_at, professional:users(id, name, email, avatar_url)")
      .in("patient_id", pagePatientIds);

    for (const tm of teamMembersData ?? []) {
      const pid = (tm as typeof tm & { patient_id: string }).patient_id;
      if (!teamMembersMap[pid]) teamMembersMap[pid] = [];
      teamMembersMap[pid].push(tm as unknown as TeamMember);
    }
  }

  return { patients: rows, totalCount, teamMembersMap };
}
