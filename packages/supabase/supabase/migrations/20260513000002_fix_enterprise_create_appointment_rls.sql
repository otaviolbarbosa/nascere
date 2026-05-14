-- Fix "Enterprise staff can create enterprise appointments" to allow external patients (patient_id IS NULL)
DROP POLICY IF EXISTS "Enterprise staff can create enterprise appointments" ON public.appointments;

CREATE POLICY "Enterprise staff can create enterprise appointments"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    (patient_id IS NOT NULL AND public.is_enterprise_patient(patient_id))
    OR (
      patient_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND user_type IN ('manager', 'secretary')
          AND enterprise_id IS NOT NULL
      )
    )
  );
