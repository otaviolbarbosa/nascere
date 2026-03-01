"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().optional(),
});

export const updateProfileAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, user } }) => {
    const { data: profile, error } = await supabase
      .from("users")
      .update({
        name: parsedInput.name.trim(),
        phone: parsedInput.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw new Error("Erro ao atualizar perfil");

    return { profile };
  });
