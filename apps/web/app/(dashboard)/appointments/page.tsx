import { isStaff } from "@/lib/access-control";
import { getServerAuth } from "@/lib/server-auth";
import { AppointmentsScreen } from "@/screens";
import { getMyAppointments } from "@/services/appointment";

export default async function AppointmentsPage() {
  const { profile } = await getServerAuth();
  const { appointments } = await getMyAppointments();

  return <AppointmentsScreen appointments={appointments} isStaff={isStaff(profile)} />;
}
