-- Make patient_id optional to support external (non-registered) patients
ALTER TABLE public.appointments ALTER COLUMN patient_id DROP NOT NULL;

-- Add external patient fields
ALTER TABLE public.appointments ADD COLUMN external_patient_name TEXT;
ALTER TABLE public.appointments ADD COLUMN external_patient_phone TEXT;
ALTER TABLE public.appointments ADD COLUMN external_patient_email TEXT;
