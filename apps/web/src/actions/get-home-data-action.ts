"use server";

import { authActionClient } from "@/lib/safe-action";
import { getHomeData } from "@/services/home";
import { z } from "zod";

export const getHomeDataAction = authActionClient
  .inputSchema(z.object({}))
  .action(async () => {
    return await getHomeData();
  });
