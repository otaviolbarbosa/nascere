"use server";

import { authActionClient } from "@/lib/safe-action";
import { createAppointmentSchema } from "@/lib/validations/appointment";
import { createAppointment } from "@/services/appointment";

export const addAppointmentAction = authActionClient
  .inputSchema(createAppointmentSchema)
  .action(async ({ parsedInput, ctx: { supabase, user } }) => {
    const appointment = await createAppointment(supabase, user.id, parsedInput);
    return { appointment };
  });
