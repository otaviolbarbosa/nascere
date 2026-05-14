-- Fix "Enterprise staff can view enterprise appointments" to allow external patients (patient_id IS NULL)
DROP POLICY IF EXISTS "Enterprise staff can view enterprise appointments" ON public.appointments;

CREATE POLICY "Enterprise staff can view enterprise appointments"
  ON public.appointments
  FOR SELECT
  USING (
    (patient_id IS NOT NULL AND public.is_enterprise_patient(patient_id))
    OR (
      patient_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.users professional
        JOIN public.users staff ON staff.enterprise_id = professional.enterprise_id
        WHERE staff.id = auth.uid()
          AND staff.user_type IN ('manager', 'secretary')
          AND staff.enterprise_id IS NOT NULL
          AND professional.id = appointments.professional_id
      )
    )
  );
