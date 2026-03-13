-- ============================================================
-- Pregnancies Table
-- Extracts pregnancy-specific data from patients into a
-- dedicated table to support multiple pregnancies per patient.
--
-- Columns moved from patients → pregnancies:
--   born_at, due_date, dum, has_finished, observations
-- ============================================================

-- ============================================================
-- 1. Create pregnancies table
-- ============================================================
CREATE TABLE public.pregnancies (
  id          uuid        NOT NULL DEFAULT extensions.uuid_generate_v4(),
  patient_id  uuid        NOT NULL,
  due_date    date        NOT NULL,
  dum         date,
  born_at     date,
  has_finished boolean    NOT NULL DEFAULT false,
  observations text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pregnancies_pkey PRIMARY KEY (id),
  CONSTRAINT pregnancies_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE
);

CREATE INDEX pregnancies_patient_id_idx ON public.pregnancies(patient_id);
CREATE INDEX pregnancies_due_date_idx   ON public.pregnancies(due_date);

-- updated_at trigger
CREATE TRIGGER handle_pregnancies_updated_at
  BEFORE UPDATE ON public.pregnancies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-calculate dum from due_date (reuses the function created for patients)
CREATE TRIGGER update_pregnancy_dum_trigger
  BEFORE INSERT OR UPDATE OF due_date ON public.pregnancies
  FOR EACH ROW EXECUTE FUNCTION public.update_patient_dum();

GRANT ALL ON TABLE public.pregnancies TO anon, authenticated, service_role;

-- ============================================================
-- 2. RLS on pregnancies
-- ============================================================
ALTER TABLE public.pregnancies ENABLE ROW LEVEL SECURITY;

-- Professionals/team members can view pregnancies of their patients
CREATE POLICY "Team members can view pregnancies"
  ON public.pregnancies FOR SELECT
  USING (
    public.is_team_member(patient_id)
    OR (SELECT user_id FROM public.patients WHERE id = patient_id) = auth.uid()
  );

-- Team members can add new pregnancies to their patients
CREATE POLICY "Team members can create pregnancies"
  ON public.pregnancies FOR INSERT
  WITH CHECK (public.is_team_member(patient_id));

-- Team members can update pregnancies of their patients
CREATE POLICY "Team members can update pregnancies"
  ON public.pregnancies FOR UPDATE
  USING  (public.is_team_member(patient_id))
  WITH CHECK (public.is_team_member(patient_id));

-- Enterprise staff can view pregnancies of all enterprise patients
CREATE POLICY "Enterprise staff can view enterprise pregnancies"
  ON public.pregnancies FOR SELECT
  USING (public.is_enterprise_patient(patient_id));

-- Enterprise staff can add pregnancies to any enterprise patient
CREATE POLICY "Enterprise staff can create enterprise pregnancies"
  ON public.pregnancies FOR INSERT
  WITH CHECK (public.is_enterprise_staff());

-- Enterprise staff can update pregnancies of enterprise patients
CREATE POLICY "Enterprise staff can update enterprise pregnancies"
  ON public.pregnancies FOR UPDATE
  USING  (public.is_enterprise_patient(patient_id))
  WITH CHECK (public.is_enterprise_patient(patient_id));

-- ============================================================
-- 3. Copy existing pregnancy data from patients
-- ============================================================
INSERT INTO public.pregnancies (patient_id, due_date, dum, born_at, has_finished, observations, created_at, updated_at)
SELECT
  id,
  due_date,
  dum,
  born_at,
  has_finished,
  observations,
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM public.patients;

-- ============================================================
-- 4. Add pregnancy_id to team_members and populate it
-- ============================================================
ALTER TABLE public.team_members
  ADD COLUMN pregnancy_id uuid
  REFERENCES public.pregnancies(id) ON DELETE SET NULL;

CREATE INDEX team_members_pregnancy_id_idx ON public.team_members(pregnancy_id);

-- Link each team_member to the single pregnancy that was just created
UPDATE public.team_members tm
SET pregnancy_id = (
  SELECT preg.id
  FROM public.pregnancies preg
  WHERE preg.patient_id = tm.patient_id
  ORDER BY preg.created_at DESC
  LIMIT 1
);

-- ============================================================
-- 6. Drop the dum trigger from patients (moved to pregnancies)
-- ============================================================
DROP TRIGGER IF EXISTS "update_patient_dum_trigger" ON public.patients;
DROP INDEX IF EXISTS "idx_patients_due_date";

-- ============================================================
-- 7. Update get_filtered_patients to join with pregnancies
--    (returns same columns as before for full compatibility)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_filtered_patients(uuid[], text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_filtered_patients(
  patient_ids  uuid[],
  filter_type  text    DEFAULT 'all',
  search_query text    DEFAULT '',
  page_limit   integer DEFAULT 10,
  page_offset  integer DEFAULT 0
)
RETURNS TABLE(
  id           uuid,
  user_id      uuid,
  name         text,
  email        text,
  phone        text,
  date_of_birth date,
  due_date     date,
  address      text,
  observations text,
  created_by   uuid,
  created_at   timestamptz,
  updated_at   timestamptz,
  dum          date,
  total_count  bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id, p.user_id, p.name, p.email, p.phone, p.date_of_birth,
    pg.due_date, p.address, pg.observations,
    p.created_by, p.created_at, p.updated_at, pg.dum,
    COUNT(*) OVER() AS total_count
  FROM public.patients p
  JOIN LATERAL (
    SELECT preg.*
    FROM public.pregnancies preg
    WHERE preg.patient_id = p.id
    ORDER BY preg.created_at DESC
    LIMIT 1
  ) pg ON true
  WHERE p.id = ANY(patient_ids)
    AND (
      search_query = ''
      OR p.name ILIKE '%' || search_query || '%'
    )
    AND (pg.has_finished = false OR filter_type = 'finished')
    AND (
      filter_type = 'all'
      OR filter_type = 'recent'
      OR filter_type = 'finished'
      OR (filter_type = 'trim1' AND public.gestational_weeks(pg.dum) < 13)
      OR (filter_type = 'trim2' AND public.gestational_weeks(pg.dum) >= 13 AND public.gestational_weeks(pg.dum) < 26)
      OR (filter_type = 'trim3' AND public.gestational_weeks(pg.dum) >= 26)
      OR (filter_type = 'final' AND public.gestational_weeks(pg.dum) >= 37)
    )
  ORDER BY
    CASE WHEN filter_type = 'recent'   THEN p.created_at END DESC,
    CASE WHEN filter_type = 'finished' THEN pg.born_at   END DESC NULLS LAST,
    pg.due_date ASC
  LIMIT page_limit
  OFFSET page_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_filtered_patients(uuid[], text, text, integer, integer) TO anon, authenticated, service_role;

-- ============================================================
-- 8. Update schedule_dpp_reminders to use pregnancies
-- ============================================================
CREATE OR REPLACE FUNCTION public.schedule_dpp_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  patient_record RECORD;
BEGIN
  FOR patient_record IN
    SELECT p.id, p.name, pg.due_date
    FROM public.patients p
    JOIN LATERAL (
      SELECT preg.due_date
      FROM public.pregnancies preg
      WHERE preg.patient_id = p.id
        AND preg.has_finished = false
      ORDER BY preg.created_at DESC
      LIMIT 1
    ) pg ON true
    WHERE pg.due_date IS NOT NULL
      AND pg.due_date >= CURRENT_DATE
  LOOP
    -- 30 days before DPP
    IF patient_record.due_date - CURRENT_DATE = 30 THEN
      INSERT INTO public.scheduled_notifications
        (notification_type, reference_id, reference_type, scheduled_for, payload)
      VALUES
        ('dpp_approaching', patient_record.id, 'patient',
         CURRENT_DATE::timestamptz + INTERVAL '8 hours',
         jsonb_build_object('patient_name', patient_record.name, 'days_until_dpp', 30))
      ON CONFLICT DO NOTHING;
    END IF;

    -- 15 days before DPP
    IF patient_record.due_date - CURRENT_DATE = 15 THEN
      INSERT INTO public.scheduled_notifications
        (notification_type, reference_id, reference_type, scheduled_for, payload)
      VALUES
        ('dpp_approaching', patient_record.id, 'patient',
         CURRENT_DATE::timestamptz + INTERVAL '8 hours',
         jsonb_build_object('patient_name', patient_record.name, 'days_until_dpp', 15))
      ON CONFLICT DO NOTHING;
    END IF;

    -- 7 days before DPP
    IF patient_record.due_date - CURRENT_DATE = 7 THEN
      INSERT INTO public.scheduled_notifications
        (notification_type, reference_id, reference_type, scheduled_for, payload)
      VALUES
        ('dpp_approaching', patient_record.id, 'patient',
         CURRENT_DATE::timestamptz + INTERVAL '8 hours',
         jsonb_build_object('patient_name', patient_record.name, 'days_until_dpp', 7))
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 9. Remove migrated columns from patients
-- ============================================================
ALTER TABLE public.patients
  DROP COLUMN born_at,
  DROP COLUMN due_date,
  DROP COLUMN dum,
  DROP COLUMN has_finished,
  DROP COLUMN observations;
