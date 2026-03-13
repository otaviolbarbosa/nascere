"use server";

import { authActionClient } from "@/lib/safe-action";
import { getEnterpriseProfessionals } from "@/services/professional";
import { z } from "zod";

export const getEnterpriseProfessionalsAction = authActionClient
  .inputSchema(z.object({}))
  .action(async () => {
    const { professionals } = await getEnterpriseProfessionals();
    return { professionals };
  });
