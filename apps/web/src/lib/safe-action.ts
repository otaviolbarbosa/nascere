import { createServerSupabaseAdmin, createServerSupabaseClient } from "@nascere/supabase/server";
import { createSafeActionClient } from "next-safe-action";

export const actionClient = createSafeActionClient();

export const authActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createServerSupabaseClient();
  const supabaseAdmin = await createServerSupabaseAdmin();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autorizado");

  return next({ ctx: { supabase, supabaseAdmin, user } });
});
