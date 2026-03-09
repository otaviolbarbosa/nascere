import { isStaff } from "@/lib/access-control";
import { ProfessionalsScreen } from "@/screens";
import { getProfile } from "@/services";
import { getEnterpriseProfessionals } from "@/services/professional";
import { redirect } from "next/navigation";

export default async function ProfessionalsPage() {
  const { profile } = await getProfile();

  if (!isStaff(profile)) {
    redirect("/home");
  }

  const { professionals, enterpriseToken } = await getEnterpriseProfessionals();

  return (
    <ProfessionalsScreen professionals={professionals} enterpriseToken={enterpriseToken} />
  );
}
