-- Patient Documents table
CREATE TABLE IF NOT EXISTS "public"."patient_documents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."patient_documents" OWNER TO "postgres";

ALTER TABLE ONLY "public"."patient_documents"
    ADD CONSTRAINT "patient_documents_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."patient_documents"
    ADD CONSTRAINT "patient_documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."patient_documents"
    ADD CONSTRAINT "patient_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."patient_documents" ENABLE ROW LEVEL SECURITY;

-- SELECT: team members or the patient themselves
CREATE POLICY "View patient documents" ON "public"."patient_documents"
    FOR SELECT USING (
        "public"."is_team_member"("patient_id")
        OR EXISTS (
            SELECT 1 FROM "public"."patients"
            WHERE "patients"."id" = "patient_documents"."patient_id"
            AND "patients"."user_id" = "auth"."uid"()
        )
    );

-- INSERT: team members or the patient themselves
CREATE POLICY "Upload patient documents" ON "public"."patient_documents"
    FOR INSERT WITH CHECK (
        "public"."is_team_member"("patient_id")
        OR EXISTS (
            SELECT 1 FROM "public"."patients"
            WHERE "patients"."id" = "patient_documents"."patient_id"
            AND "patients"."user_id" = "auth"."uid"()
        )
    );

-- DELETE: only the uploader
CREATE POLICY "Delete own documents" ON "public"."patient_documents"
    FOR DELETE USING ("uploaded_by" = "auth"."uid"());

-- Storage bucket for patient documents (private, 50MB limit)
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit")
VALUES ('patient_documents', 'patient_documents', false, 52428800)
ON CONFLICT ("id") DO NOTHING;

GRANT ALL ON TABLE "public"."patient_documents" TO "anon";
GRANT ALL ON TABLE "public"."patient_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_documents" TO "service_role";
