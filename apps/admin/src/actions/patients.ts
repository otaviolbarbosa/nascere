"use server";

import { adminActionClient } from "@/lib/safe-action";
import type { Tables } from "@ventre/supabase";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const getPaginatedPatientsSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(1).default(10),
  order: z
    .object({
      field: z.string(),
      isAscendent: z.boolean(),
    })
    .optional(),
});

export const getPaginatedPatientsAction = adminActionClient
  .inputSchema(getPaginatedPatientsSchema)
  .action(async ({ parsedInput, ctx: { supabaseAdmin } }) => {
    const { page, size, order } = parsedInput;
    const from = (page - 1) * size;
    const to = from + size - 1;

    const field = order?.field ?? "created_at";
    const ascending = order?.isAscendent ?? false;

    const { data, error, count } = await supabaseAdmin
      .from("patients")
      .select("id, name, email, phone, date_of_birth, created_at, user_id", { count: "exact" })
      .order(field, { ascending })
      .range(from, to);

    if (error) throw new Error(error.message);

    const authResults = await Promise.all(
      data.map((p) =>
        p.user_id ? supabaseAdmin.auth.admin.getUserById(p.user_id) : Promise.resolve(null),
      ),
    );

    const confirmedMap = new Map<string, boolean>();
    for (const r of authResults) {
      if (r && !r.error && r.data.user) {
        confirmedMap.set(r.data.user.id, !!r.data.user.email_confirmed_at);
      }
    }

    const total_pages = Math.ceil((count ?? 0) / size);

    return {
      data: data.map((p) => ({
        ...(p as Tables<"patients">),
        email_confirmed: p.user_id ? (confirmedMap.get(p.user_id) ?? false) : false,
      })),
      pagination: { page, size, total_pages },
    };
  });

const updatePatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").optional(),
  email: z.string().email("E-mail inválido").nullable().optional(),
  phone: z.string().optional(),
  date_of_birth: z.string().nullable().optional(),
});

const deletePatientSchema = z.object({
  id: z.string().uuid(),
});

export const updatePatientAction = adminActionClient
  .inputSchema(updatePatientSchema)
  .action(async ({ parsedInput, ctx: { supabaseAdmin } }) => {
    const { id, ...data } = parsedInput;

    const { error } = await supabaseAdmin.from("patients").update(data).eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/patients");
    revalidatePath(`/patients/${id}`);
    return { success: true };
  });

export const deletePatientAction = adminActionClient
  .inputSchema(deletePatientSchema)
  .action(async ({ parsedInput, ctx: { supabaseAdmin } }) => {
    const { error } = await supabaseAdmin.from("patients").delete().eq("id", parsedInput.id);

    if (error) throw new Error(error.message);

    revalidatePath("/patients");
    return { success: true };
  });

export const sendConfirmationEmailAction = adminActionClient
  .inputSchema(z.object({ email: z.string().email() }))
  .action(async ({ parsedInput, ctx: { supabaseAdmin } }) => {
    const { error } = await supabaseAdmin.auth.resend({
      type: "signup",
      email: parsedInput.email,
    });

    if (error) throw new Error(error.message);

    return { success: true };
  });
