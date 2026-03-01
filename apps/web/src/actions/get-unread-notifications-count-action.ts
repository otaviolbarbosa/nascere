"use server";

import { authActionClient } from "@/lib/safe-action";

export const getUnreadNotificationsCountAction = authActionClient.action(
  async ({ ctx: { supabase, user } }) => {
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw new Error(error.message);

    return { unreadCount: count ?? 0 };
  },
);
