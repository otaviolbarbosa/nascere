"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  documentId: z.string().uuid(),
});

export const deleteDocumentAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, supabaseAdmin } }) => {
    const { data: document, error: fetchError } = await supabase
      .from("patient_documents")
      .select("storage_path")
      .eq("id", parsedInput.documentId)
      .single();

    if (fetchError || !document) throw new Error("Documento não encontrado");

    const { error: deleteError } = await supabase
      .from("patient_documents")
      .delete()
      .eq("id", parsedInput.documentId);

    if (deleteError) throw new Error(deleteError.message);

    await supabaseAdmin.storage.from("patient_documents").remove([document.storage_path]);

    return { success: true };
  });
