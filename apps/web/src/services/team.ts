import type { TeamMember } from "@/types";
import { createServerSupabaseClient } from "@nascere/supabase/server";

type GetTeamMembersResult = {
  teamMembers: TeamMember[];
  error?: string;
};

export async function getTeamMembers(patientId: string): Promise<GetTeamMembersResult> {
  const supabase = await createServerSupabaseClient();

  const { data: team, error } = await supabase
    .from("team_members")
    .select(`
      *,
      professional:users!team_members_professional_id_fkey(id, name, email)
    `)
    .eq("patient_id", patientId);

  if (error) {
    return { teamMembers: [], error: error.message };
  }

  return { teamMembers: (team as TeamMember[]) || [] };
}
