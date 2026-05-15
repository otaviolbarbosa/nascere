import { isStaff } from "@/lib/access-control";
import { getServerAuth } from "@/lib/server-auth";
import { AppointmentsScreen } from "@/screens";
import { getMyAppointments } from "@/services/appointment";
import { createServerSupabaseAdmin } from "@ventre/supabase/server";

export default async function AppointmentsPage() {
  const { profile, user } = await getServerAuth();
  const { appointments } = await getMyAppointments();

  let isGoogleCalendarConnected = false;
  if (user) {
    const supabaseAdmin = await createServerSupabaseAdmin();
    const { data: googleToken } = await supabaseAdmin
      .from("user_google_tokens")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    isGoogleCalendarConnected = !!googleToken;
  }

  return (
    <AppointmentsScreen
      appointments={appointments}
      isStaff={isStaff(profile)}
      isGoogleCalendarConnected={isGoogleCalendarConnected}
    />
  );
}
