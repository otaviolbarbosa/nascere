"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  billingId: z.string().uuid("ID da cobrança inválido"),
  installmentId: z.string().uuid("ID da parcela inválido"),
  paymentLink: z.string().url("URL inválida").or(z.literal("")),
});

export const saveInstallmentLinkAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabaseAdmin } }) => {
    const { data: installment } = await supabaseAdmin
      .from("installments")
      .select("id")
      .eq("id", parsedInput.installmentId)
      .eq("billing_id", parsedInput.billingId)
      .single();

    if (!installment) throw new Error("Parcela não encontrada");

    const { error } = await supabaseAdmin
      .from("installments")
      .update({ payment_link: parsedInput.paymentLink || null })
      .eq("id", parsedInput.installmentId);

    if (error) throw new Error(error.message);

    return { success: true };
  });
