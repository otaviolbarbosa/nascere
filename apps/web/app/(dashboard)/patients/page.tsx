import { PatientsScreen } from "@/screens";
import { getMyPatients } from "@/services";
import type { PatientFilter } from "@/types";

const VALID_FILTERS: PatientFilter[] = ["all", "recent", "trim1", "trim2", "trim3", "final"];

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; search?: string }>;
}) {
  const { filter, search } = await searchParams;
  const validFilter = VALID_FILTERS.includes(filter as PatientFilter)
    ? (filter as PatientFilter)
    : "all";

  const { patients } = await getMyPatients(validFilter, search || "");

  return <PatientsScreen patients={patients} initialFilter={validFilter} initialSearch={search || ""} />;
}
