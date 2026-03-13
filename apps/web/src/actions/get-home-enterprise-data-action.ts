"use server";

import { authActionClient } from "@/lib/safe-action";
import { getHomeEnterpriseData } from "@/services/home-enterprise";
import { z } from "zod";

export const getHomeEnterpriseDataAction = authActionClient
  .inputSchema(z.object({}))
  .action(async () => {
    return await getHomeEnterpriseData();
  });
