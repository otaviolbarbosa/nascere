"use server";

import { authActionClient } from "@/lib/safe-action";
import type { ProfessionalType } from "@/types";
import { z } from "zod";

const schema = z.object({
  query: z.string().min(2, "Busca deve ter pelo menos 2 caracteres"),
  types: z.array(z.string()).optional(),
});

export const searchUsersAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabaseAdmin, user } }) => {
    const q = parsedInput.query.trim();
    const types = (parsedInput.types ?? []) as ProfessionalType[];

    let query = supabaseAdmin
      .from("users")
      .select("id, name, email, professional_type")
      .eq("user_type", "professional")
      .neq("id", user.id)
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(8);

    if (types.length > 0) {
      query = query.in("professional_type", types);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return { users: data ?? [] };
  });
