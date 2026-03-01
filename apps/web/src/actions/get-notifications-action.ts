"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  filter: z.enum(["all", "unread"]).default("all"),
});

export const getNotificationsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, user } }) => {
    const { page, limit, filter } = parsedInput;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filter === "unread") {
      query = query.eq("is_read", false);
    }

    const { data: notifications, count, error } = await query;

    if (error) throw new Error(error.message);

    return {
      notifications: notifications ?? [],
      total: count ?? 0,
      page,
      limit,
    };
  });
