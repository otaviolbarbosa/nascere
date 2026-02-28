import { sendNotificationToTeam } from "@/lib/notifications/send";
import { getNotificationTemplate } from "@/lib/notifications/templates";
import type { CreateAppointmentInput } from "@/lib/validations/appointment";
import { createServerSupabaseClient } from "@nascere/supabase/server";
import type { Tables, TablesInsert } from "@nascere/supabase/types";

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

type Appointment = Tables<"appointments">;
type Patient = Tables<"patients">;

export type AppointmentWithPatient = Appointment & {
  patient: Pick<Patient, "id" | "name">;
};

type GetMyAppointmentsResult = {
  appointments: AppointmentWithPatient[];
  error?: string;
};

export async function getMyAppointments(): Promise<GetMyAppointmentsResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { appointments: [], error: "Usuário não encontrado" };
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      `
      *,
      patient:patients!appointments_patient_id_fkey(id, name)
    `,
    )
    .eq("professional_id", user.id)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  return { appointments: (appointments as AppointmentWithPatient[]) || [] };
}

export async function createAppointment(
  supabase: SupabaseClient,
  userId: string,
  data: CreateAppointmentInput,
) {
  const insertData: TablesInsert<"appointments"> = {
    patient_id: data.patient_id,
    professional_id: userId,
    date: data.date,
    time: data.time,
    duration: data.duration,
    type: data.type,
    location: data.location,
    notes: data.notes,
  };

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("name")
    .eq("id", data.patient_id)
    .single();

  if (patient) {
    const template = getNotificationTemplate("appointment_created", {
      patientName: patient.name,
      date: data.date,
      time: data.time,
    });
    sendNotificationToTeam(data.patient_id, userId, {
      type: "appointment_created",
      ...template,
      data: { url: "/appointments" },
    });
  }

  return appointment;
}
