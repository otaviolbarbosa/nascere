"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  fcmToken: z.string().min(1, "Token FCM obrigatório"),
});

export const unsubscribeNotificationsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, user } }) => {
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("fcm_token", parsedInput.fcmToken)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    return { success: true };
  });
