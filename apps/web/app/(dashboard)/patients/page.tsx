import type { Tables } from "@nascere/supabase/types";
import PatientsScreen from "@/screens/patients-screen";

type Patient = Tables<"patients">;

export default async function PatientsPage() {
  const patients = (await fetch("/api/patients")) as unknown as Patient[];

  return <PatientsScreen patients={patients} />;
}
