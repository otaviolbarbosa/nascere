-- ============================================================
-- Enterprise Staff RLS Policies
-- Allows managers and secretaries to manage professionals
-- and patients (plus all associated data) within their enterprise.
-- ============================================================

-- ============================================================
-- Helper Functions
-- ============================================================

-- Returns true if the current user is a manager or secretary
-- belonging to any enterprise.
CREATE OR REPLACE FUNCTION public.is_enterprise_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND user_type IN ('manager', 'secretary')
      AND enterprise_id IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_enterprise_staff() TO anon, authenticated, service_role;

-- Returns true if the current user (manager/secretary) belongs to the
-- same enterprise as the given user.
CREATE OR REPLACE FUNCTION public.is_same_enterprise(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users staff
    JOIN public.users target ON target.enterprise_id = staff.enterprise_id
    WHERE staff.id = auth.uid()
      AND staff.user_type IN ('manager', 'secretary')
      AND target.id = p_user_id
      AND staff.enterprise_id IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_same_enterprise(uuid) TO anon, authenticated, service_role;

-- Returns true if the current user (manager/secretary) belongs to the
-- same enterprise as the creator of the given patient.
-- Works regardless of whether the creator is a professional or another staff member.
CREATE OR REPLACE FUNCTION public.is_enterprise_patient(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.patients p
    JOIN public.users creator ON creator.id = p.created_by
    JOIN public.users staff ON staff.enterprise_id = creator.enterprise_id
    WHERE staff.id = auth.uid()
      AND staff.user_type IN ('manager', 'secretary')
      AND p.id = p_patient_id
      AND staff.enterprise_id IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_enterprise_patient(uuid) TO anon, authenticated, service_role;

-- ============================================================
-- users
-- Enterprise staff can view and update professionals in the same enterprise.
-- INSERT is not covered here: professionals join via the enterprise token flow.
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise professionals"
  ON public.users
  FOR SELECT
  USING (
    user_type = 'professional'
    AND public.is_same_enterprise(id)
  );

CREATE POLICY "Enterprise staff can update enterprise professionals"
  ON public.users
  FOR UPDATE
  USING (
    user_type = 'professional'
    AND public.is_same_enterprise(id)
  )
  WITH CHECK (
    user_type = 'professional'
    AND public.is_same_enterprise(id)
  );

-- ============================================================
-- patients
-- Enterprise staff can create, list and edit patients that belong
-- to any professional (or staff member) in the same enterprise.
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise patients"
  ON public.patients
  FOR SELECT
  USING (public.is_enterprise_patient(id));

CREATE POLICY "Enterprise staff can create enterprise patients"
  ON public.patients
  FOR INSERT
  WITH CHECK (public.is_enterprise_staff());

CREATE POLICY "Enterprise staff can update enterprise patients"
  ON public.patients
  FOR UPDATE
  USING (public.is_enterprise_patient(id))
  WITH CHECK (public.is_enterprise_patient(id));

-- ============================================================
-- team_members
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise team members"
  ON public.team_members
  FOR SELECT
  USING (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can insert enterprise team members"
  ON public.team_members
  FOR INSERT
  WITH CHECK (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can delete enterprise team members"
  ON public.team_members
  FOR DELETE
  USING (public.is_enterprise_patient(patient_id));

-- ============================================================
-- appointments
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise appointments"
  ON public.appointments
  FOR SELECT
  USING (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can create enterprise appointments"
  ON public.appointments
  FOR INSERT
  WITH CHECK (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can update enterprise appointments"
  ON public.appointments
  FOR UPDATE
  USING (public.is_enterprise_patient(patient_id))
  WITH CHECK (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can delete enterprise appointments"
  ON public.appointments
  FOR DELETE
  USING (public.is_enterprise_patient(patient_id));

-- ============================================================
-- team_invites
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise team invites"
  ON public.team_invites
  FOR SELECT
  USING (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can create enterprise team invites"
  ON public.team_invites
  FOR INSERT
  WITH CHECK (public.is_enterprise_patient(patient_id));

-- ============================================================
-- patient_invite_links
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise invite links"
  ON public.patient_invite_links
  FOR SELECT
  USING (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can create enterprise invite links"
  ON public.patient_invite_links
  FOR INSERT
  WITH CHECK (public.is_enterprise_patient(patient_id));

-- ============================================================
-- patient_documents
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise patient documents"
  ON public.patient_documents
  FOR SELECT
  USING (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can upload enterprise patient documents"
  ON public.patient_documents
  FOR INSERT
  WITH CHECK (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can delete enterprise patient documents"
  ON public.patient_documents
  FOR DELETE
  USING (public.is_enterprise_patient(patient_id));

-- ============================================================
-- patient_evolutions
-- INSERT is intentionally omitted: only care team members (via the existing
-- "Create patient evolutions" policy using is_team_member) are allowed to
-- write evolutions. Enterprise staff can only view.
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise patient evolutions"
  ON public.patient_evolutions
  FOR SELECT
  USING (public.is_enterprise_patient(patient_id));

-- ============================================================
-- billings
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise billings"
  ON public.billings
  FOR SELECT
  USING (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can create enterprise billings"
  ON public.billings
  FOR INSERT
  WITH CHECK (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can update enterprise billings"
  ON public.billings
  FOR UPDATE
  USING (public.is_enterprise_patient(patient_id))
  WITH CHECK (public.is_enterprise_patient(patient_id));

CREATE POLICY "Enterprise staff can delete enterprise billings"
  ON public.billings
  FOR DELETE
  USING (public.is_enterprise_patient(patient_id));

-- ============================================================
-- installments
-- Viewable via billing access (no direct INSERT/DELETE — managed by service_role)
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise installments"
  ON public.installments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.billings b
      WHERE b.id = installments.billing_id
        AND public.is_enterprise_patient(b.patient_id)
    )
  );

-- ============================================================
-- payments
-- ============================================================

CREATE POLICY "Enterprise staff can view enterprise payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.installments i
      JOIN public.billings b ON b.id = i.billing_id
      WHERE i.id = payments.installment_id
        AND public.is_enterprise_patient(b.patient_id)
    )
  );

CREATE POLICY "Enterprise staff can register enterprise payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (
    registered_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.installments i
      JOIN public.billings b ON b.id = i.billing_id
      WHERE i.id = payments.installment_id
        AND public.is_enterprise_patient(b.patient_id)
    )
  );
