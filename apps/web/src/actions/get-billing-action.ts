"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  billingId: z.string().uuid("ID da cobrança inválido"),
});

export const getBillingAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, supabaseAdmin } }) => {
    const { data: billing, error } = await supabase
      .from("billings")
      .select(`
        *,
        installments(*, payments(*)),
        patient:patients!billings_patient_id_fkey(id, name)
      `)
      .eq("id", parsedInput.billingId)
      .single();

    if (error) throw new Error(error.message);
    if (!billing) throw new Error("Cobrança não encontrada");

    // Generate signed URLs for payments with receipts
    const allPayments = billing.installments.flatMap((i) => i.payments);
    const paymentsWithReceipts = allPayments.filter((p) => p.receipt_path);

    const receiptUrls: Record<string, string> = {};
    if (paymentsWithReceipts.length > 0) {
      const paths = paymentsWithReceipts.map((p) => p.receipt_path as string);
      const { data: signedUrls } = await supabaseAdmin.storage
        .from("payments")
        .createSignedUrls(paths, 3600);

      if (signedUrls) {
        for (const entry of signedUrls) {
          if (entry.signedUrl) {
            const payment = paymentsWithReceipts.find((p) => p.receipt_path === entry.path);
            if (payment) receiptUrls[payment.id] = entry.signedUrl;
          }
        }
      }
    }

    const billingWithUrls = {
      ...billing,
      installments: billing.installments.map((installment) => ({
        ...installment,
        payments: installment.payments.map((payment) => ({
          ...payment,
          receipt_url: receiptUrls[payment.id] ?? null,
        })),
      })),
    };

    return { billing: billingWithUrls };
  });
