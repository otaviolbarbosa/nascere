CREATE TABLE IF NOT EXISTS "public"."patient_evolutions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "professional_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."patient_evolutions"
    ADD CONSTRAINT "patient_evolutions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."patient_evolutions"
    ADD CONSTRAINT "patient_evolutions_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."patient_evolutions"
    ADD CONSTRAINT "patient_evolutions_professional_id_fkey"
    FOREIGN KEY ("professional_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."patient_evolutions" ENABLE ROW LEVEL SECURITY;

-- SELECT: equipe ou a própria paciente
CREATE POLICY "View patient evolutions" ON "public"."patient_evolutions"
    FOR SELECT USING (
        "public"."is_team_member"("patient_id")
        OR EXISTS (
            SELECT 1 FROM "public"."patients"
            WHERE "patients"."id" = "patient_evolutions"."patient_id"
            AND "patients"."user_id" = "auth"."uid"()
        )
    );

-- INSERT: somente membros da equipe
CREATE POLICY "Create patient evolutions" ON "public"."patient_evolutions"
    FOR INSERT WITH CHECK (
        "public"."is_team_member"("patient_id")
    );

-- Sem UPDATE/DELETE policies (registros imutáveis)

GRANT ALL ON TABLE "public"."patient_evolutions" TO "anon";
GRANT ALL ON TABLE "public"."patient_evolutions" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_evolutions" TO "service_role";
