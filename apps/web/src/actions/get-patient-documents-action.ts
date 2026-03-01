"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  patientId: z.string().uuid(),
});

export const getPatientDocumentsAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx: { supabase, supabaseAdmin, user } }) => {
    const { data: documents, error } = await supabase
      .from("patient_documents")
      .select("*, uploader:uploaded_by(id, name)")
      .eq("patient_id", parsedInput.patientId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const imageDocs = (documents ?? []).filter((d) => d.file_type.startsWith("image/"));
    const previewMap: Record<string, string> = {};

    if (imageDocs.length > 0) {
      const paths = imageDocs.map((d) => d.storage_path);
      const { data: signedUrls } = await supabaseAdmin.storage
        .from("patient_documents")
        .createSignedUrls(paths, 3600);

      if (signedUrls) {
        for (const entry of signedUrls) {
          if (entry.signedUrl) {
            const doc = imageDocs.find((d) => d.storage_path === entry.path);
            if (doc) previewMap[doc.id] = entry.signedUrl;
          }
        }
      }
    }

    const documentsWithPreviews = (documents ?? []).map((doc) => ({
      ...doc,
      preview_url: previewMap[doc.id] ?? null,
    }));

    return { documents: documentsWithPreviews, currentUserId: user.id };
  });
