"use server";

import { authActionClient } from "@/lib/safe-action";
import { createBillingSchema } from "@/lib/validations/billing";
import { createBilling } from "@/services/billing";

export const addBillingAction = authActionClient
  .inputSchema(createBillingSchema)
  .action(async ({ parsedInput, ctx: { supabase, supabaseAdmin, user } }) => {
    const billing = await createBilling(supabase, supabaseAdmin, user.id, parsedInput);
    return { billing };
  });
