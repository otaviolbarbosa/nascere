-- Fix "Create appointments" to allow external patients (patient_id IS NULL)
-- When patient_id IS NULL, allow insert if professional_id matches the current user
DROP POLICY IF EXISTS "Create appointments" ON public.appointments;

CREATE POLICY "Create appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    (patient_id IS NOT NULL AND public.is_team_member(patient_id))
    OR (patient_id IS NULL AND professional_id = auth.uid())
  );
