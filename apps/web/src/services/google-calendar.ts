import type { Appointment, Patient } from "@/types";
import { createServerSupabaseAdmin } from "@ventre/supabase/server";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TIMEZONE = "America/Sao_Paulo";

export async function getValidGoogleAccessToken(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseAdmin();
  const { data: tokenRow } = await supabase
    .from("user_google_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (!tokenRow?.access_token) return null;

  // Refresh proactively 60 seconds before expiry
  const isExpired = new Date(tokenRow.expires_at) <= new Date(Date.now() + 60_000);
  if (!isExpired) return tokenRow.access_token;

  if (!tokenRow.refresh_token) return null;

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      refresh_token: tokenRow.refresh_token,
    }),
  });

  if (!res.ok) {
    // Token was revoked or is permanently invalid — clear stored tokens
    await supabase.from("user_google_tokens").delete().eq("user_id", userId);
    return null;
  }

  const { access_token, expires_in } = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  await supabase
    .from("user_google_tokens")
    .update({
      access_token,
      expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId);

  return access_token;
}

function buildEventPayload(appointment: Appointment, patient: Patient) {
  // appointment.time is stored as "HH:MM:SS" by PostgreSQL
  const startISO = `${appointment.date}T${appointment.time}`;
  const startDate = new Date(`${startISO}-03:00`);
  const endDate = new Date(startDate.getTime() + (appointment.duration ?? 60) * 60_000);
  const patientName = patient.name ?? appointment.external_patient_name ?? "Paciente";
  const typePt = appointment.type === "consulta" ? "Consulta" : "Encontro";

  return {
    summary: `[VentreApp] ${typePt} com ${patientName}`,
    description: appointment.notes ?? undefined,
    location: appointment.location ?? undefined,
    start: { dateTime: startDate.toISOString(), timeZone: TIMEZONE },
    end: { dateTime: endDate.toISOString(), timeZone: TIMEZONE },
  };
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  appointment: Appointment,
  patient: Patient,
): Promise<string> {
  const res = await fetch(CALENDAR_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildEventPayload(appointment, patient)),
  });
  if (!res.ok) throw new Error(`GCal create failed: ${res.status}`);
  const event = (await res.json()) as { id: string };
  return event.id;
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  appointment: Appointment,
  patient: Patient,
): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildEventPayload(appointment, patient)),
  });
  if (!res.ok) throw new Error(`GCal update failed: ${res.status}`);
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 204 = success, 404 = already deleted — both acceptable
  if (!res.ok && res.status !== 404) throw new Error(`GCal delete failed: ${res.status}`);
}

export async function syncCreateToGoogleCalendar(
  appointment: Appointment,
  patient: Patient,
  userId: string,
): Promise<void> {
  const accessToken = await getValidGoogleAccessToken(userId);
  if (!accessToken) return;

  const eventId = await createGoogleCalendarEvent(accessToken, appointment, patient);

  const supabase = await createServerSupabaseAdmin();
  await supabase.from("appointments").update({ google_event_id: eventId }).eq("id", appointment.id);
}

export async function syncUpdateToGoogleCalendar(
  appointment: Appointment,
  patient: Patient,
  userId: string,
): Promise<void> {
  if (!appointment.google_event_id) return;

  const accessToken = await getValidGoogleAccessToken(userId);
  if (!accessToken) return;

  await updateGoogleCalendarEvent(accessToken, appointment.google_event_id, appointment, patient);
}

export async function syncDeleteToGoogleCalendar(
  googleEventId: string,
  userId: string,
): Promise<void> {
  const accessToken = await getValidGoogleAccessToken(userId);
  if (!accessToken) return;

  await deleteGoogleCalendarEvent(accessToken, googleEventId);
}
