ALTER TABLE "public"."patient_evolutions"
    ADD COLUMN "is_public" boolean NOT NULL DEFAULT true;

-- Remover a policy anterior e recriar com a lógica de privacidade
DROP POLICY IF EXISTS "View patient evolutions" ON "public"."patient_evolutions";

-- A profissional criadora vê sempre; membros da equipe e a paciente veem apenas as públicas
CREATE POLICY "View patient evolutions" ON "public"."patient_evolutions"
    FOR SELECT USING (
        "professional_id" = "auth"."uid"()
        OR (
            "is_public" = true
            AND (
                "public"."is_team_member"("patient_id")
                OR EXISTS (
                    SELECT 1 FROM "public"."patients"
                    WHERE "patients"."id" = "patient_evolutions"."patient_id"
                    AND "patients"."user_id" = "auth"."uid"()
                )
            )
        )
    );
