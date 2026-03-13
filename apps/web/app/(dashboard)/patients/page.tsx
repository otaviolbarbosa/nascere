import { getEnterprisePatients } from "@/actions/get-enterprise-patients-action";
import { isStaff } from "@/lib/access-control";
import { PatientsEnterpriseScreen, PatientsScreen } from "@/screens";
import { getEnterpriseProfessionals } from "@/services/professional";
import { getMyPatients, getProfile } from "@/services";
import type { PatientFilter } from "@/types";

const VALID_FILTERS: PatientFilter[] = ["all", "recent", "trim1", "trim2", "trim3", "final"];

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; search?: string; page?: string; professional?: string }>;
}) {
  const { filter, search, page, professional } = await searchParams;
  const validFilter = VALID_FILTERS.includes(filter as PatientFilter)
    ? (filter as PatientFilter)
    : "all";
  const currentPage = Math.max(1, Number(page) || 1);

  const { profile } = await getProfile();

  let patients: Awaited<ReturnType<typeof getMyPatients>>["patients"] = [];
  let totalCount = 0;
  let teamMembersMap: Awaited<ReturnType<typeof getMyPatients>>["teamMembersMap"] = {};

  if (isStaff(profile) && profile?.enterprise_id) {
    const { professionals } = await getEnterpriseProfessionals();

    const validProfessionalId =
      professional && professionals.some((p) => p.id === professional) ? professional : null;

    ({ patients, totalCount, teamMembersMap } = await getEnterprisePatients(
      profile.enterprise_id,
      validFilter,
      search || "",
      currentPage,
      validProfessionalId ?? undefined,
    ));

    return (
      <PatientsEnterpriseScreen
        patients={patients}
        totalCount={totalCount}
        currentPage={currentPage}
        initialFilter={validFilter}
        initialSearch={search || ""}
        professionals={professionals}
        initialProfessionalId={validProfessionalId}
        teamMembersMap={teamMembersMap}
      />
    );
  }

  ({ patients, totalCount, teamMembersMap } = await getMyPatients(validFilter, search || "", currentPage));

  return (
    <PatientsScreen
      patients={patients}
      totalCount={totalCount}
      currentPage={currentPage}
      initialFilter={validFilter}
      initialSearch={search || ""}
      teamMembersMap={teamMembersMap}
    />
  );
}
