"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  billingId: z.string().uuid("ID da cobrança inválido"),
  status: z.enum(["pendente", "pago", "atrasado", "cancelado"]),
});

export const updateBillingAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase } }) => {
    const { data: billing, error } = await supabase
      .from("billings")
      .update({ status: parsedInput.status })
      .eq("id", parsedInput.billingId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return { billing };
  });
