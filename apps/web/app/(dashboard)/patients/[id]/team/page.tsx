import { getPatientById } from "@/services/patient";
import { getTeamMembers } from "@/services/team";
import PatientTeamScreen from "@/screens/patient-team-screen";

export const revalidate = 300;

export default async function PatientTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;

  const [{ teamMembers }, patient] = await Promise.all([
    getTeamMembers(patientId),
    getPatientById(patientId),
  ]);

  if (!patient) return null;

  return <PatientTeamScreen teamMembers={teamMembers} patient={patient} />;
}
