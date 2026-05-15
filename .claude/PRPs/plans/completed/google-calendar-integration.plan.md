# Feature: Google Calendar Integration

## Summary

Add opt-in Google Calendar sync to the VentreApp appointments flow. Professionals connect their Google Calendar once via a settings toggle, and from then on every appointment create/update/cancel is mirrored as a Google Calendar event — non-blocking, so Calendar failures never break appointment creation.

## User Story

As a professional using VentreApp
I want to connect my Google Calendar and have appointments automatically synced
So that I can manage my schedule without duplicating entries between VentreApp and Google Calendar

## Problem Statement

Professionals who use Google Calendar must manually create events after logging appointments in the app. The sync is one-directional (VentreApp → Google), opt-in per user, and must not block or break the existing appointment flow.

## Solution Statement

1. Separate OAuth flow (not mixed into the existing login) requests the `calendar.events` scope with `access_type=offline` + `prompt=consent` to guarantee a refresh token is returned.
2. `provider_token` and `provider_refresh_token` from `exchangeCodeForSession` are captured immediately in the auth callback and persisted to a dedicated `user_google_tokens` table (not the `users` table — avoids polluting `ctx.profile` which is loaded on every action).
3. A `google-calendar.ts` service handles token validity checks, auto-refresh, and CRUD against the Google Calendar REST API via native `fetch`.
4. A `syncAppointmentToGoogleCalendar` helper is called fire-and-forget after each appointment mutation (create/update/cancel).
5. `google_event_id` is persisted on the `appointments` row to enable future update/delete targeting.

## Metadata

| Field            | Value                                                             |
| ---------------- | ----------------------------------------------------------------- |
| Type             | NEW_CAPABILITY                                                    |
| Complexity       | MEDIUM                                                            |
| Systems Affected | auth, appointments, settings, database                           |
| Dependencies     | @supabase/ssr ^0.5.2, @supabase/supabase-js ^2.47.0, next 16.1.0 |
| Estimated Tasks  | 10                                                                |

---

## UX Design

### Before State

```
╔══════════════════════════════════════════════════════════════════╗
║                          BEFORE STATE                            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌──────────────────┐    ┌──────────────────┐   ┌────────────┐  ║
║  │  Criar           │───►│ add-appointment  │──►│ DB somente │  ║
║  │  Appointment     │    │ -action.ts       │   │ (Supabase) │  ║
║  └──────────────────┘    └──────────────────┘   └────────────┘  ║
║                                                                  ║
║  USER_FLOW: profissional cria appointment → salvo só no banco    ║
║  PAIN_POINT: precisa criar o mesmo evento manualmente no Google  ║
║  DATA_FLOW: form → action → createAppointment() → DB row        ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

Settings (antes):
╔══════════════════════════════════════════════════════════════════╗
║  Contas conectadas:                                              ║
║  [Google] → Ativo / Conectar  (apenas para login)               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### After State

```
╔══════════════════════════════════════════════════════════════════╗
║                           AFTER STATE                            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌──────────────────┐    ┌──────────────────┐   ┌────────────┐  ║
║  │  Criar           │───►│ add-appointment  │──►│ DB         │  ║
║  │  Appointment     │    │ -action.ts       │   │ (Supabase) │  ║
║  └──────────────────┘    └──────────────────┘   └─────┬──────┘  ║
║                                                        │         ║
║                                           fire-and-forget        ║
║                                                        ▼         ║
║                                          ┌─────────────────────┐ ║
║                                          │ syncToGoogleCalendar│ ║
║                                          │ → token válido?     │ ║
║                                          │   sim → POST /event │ ║
║                                          │   não → skip        │ ║
║                                          └─────────────────────┘ ║
║                                                                  ║
║  USER_FLOW: profissional cria appointment → salvo no banco +     ║
║             evento criado no Google Calendar (se conectado)      ║
║  VALUE_ADD: sem trabalho duplicado, agenda unificada             ║
║  DATA_FLOW: form → action → DB → sync(fire-forget) → GCal API  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

Settings (depois):
╔══════════════════════════════════════════════════════════════════╗
║  Contas conectadas:                                              ║
║  [Google] → Ativo / Conectar  (login)                           ║
║                                                                  ║
║  Integrações:                                                    ║
║  [Google Agenda] → Conectado / Conectar Google Agenda            ║
║                    Desconectar (se conectado)                    ║
╚══════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| `/settings` | Sem seção de integrações | Seção "Integrações" com toggle Google Agenda | Profissional ativa a sync uma vez |
| `/auth/callback` | Apenas login/recovery | + captura tokens quando `intent=google_calendar` | Tokens salvos transparentemente |
| `add-appointment-action.ts` | Só salva no banco | + dispara sync GCal (fire-and-forget) | Evento aparece no Google Calendar |
| `update-appointment-action.ts` | Só atualiza no banco | + atualiza evento GCal via `google_event_id` | Mudanças refletidas no Calendar |
| `cancel-day-appointments-action.ts` | Só muda status | + deleta evento GCal | Cancelamentos refletidos |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `apps/web/app/auth/callback/route.ts` | all | Modificar para capturar `provider_token` — entender a estrutura atual |
| P0 | `apps/web/src/actions/add-appointment-action.ts` | all | Padrão exato de action + fire-and-forget a REPLICAR |
| P0 | `apps/web/src/lib/safe-action.ts` | all | Como `ctx` é construído — `supabaseAdmin` vem daqui |
| P1 | `apps/web/src/screens/settings-screen.tsx` | all | Padrão `AuthItem` a ESPELHAR para o toggle Google Agenda |
| P1 | `apps/web/src/services/appointment.ts` | all | Padrão de serviço que aceita `SupabaseClient | SupabaseAdminClient` |
| P1 | `apps/web/src/providers/auth-provider.tsx` | 110-145 | Onde adicionar `connectGoogleCalendar()` |
| P1 | `packages/supabase/src/types/database.types.ts` | 69-90, 1630-1650 | Tipos de `appointments` e `users` — entender as rows |
| P2 | `packages/supabase/supabase/migrations/20260513000001_appointments_external_patient.sql` | all | Convenção de migration a seguir |
| P2 | `apps/web/src/actions/update-appointment-action.ts` | all | Padrão de update action |
| P2 | `apps/web/src/actions/cancel-day-appointments-action.ts` | all | Padrão de cancel action |

**External Documentation:**

| Source | Section | Why Needed |
|--------|---------|------------|
| [Supabase signInWithOAuth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) | `options.scopes` + `queryParams` | Sintaxe para adicionar escopo calendar.events |
| [Supabase exchangeCodeForSession](https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession) | Return value | Confirmar que `data.session.provider_token` está disponível |
| [Google Calendar Events: insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert) | Required fields, dateTime format | POST payload obrigatório |
| [Google Calendar Events: patch](https://developers.google.com/workspace/calendar/api/v3/reference/events/patch) | Partial update | PATCH para atualizar evento existente |
| [Google Calendar Events: delete](https://developers.google.com/workspace/calendar/api/v3/reference/events/delete) | Response 204 | DELETE retorna 204 sem body |
| [Google OAuth token refresh](https://developers.google.com/identity/protocols/oauth2/web-server) | Refresh token flow | POST para `oauth2.googleapis.com/token` |

---

## Patterns to Mirror

**ACTION_PATTERN:**
```typescript
// SOURCE: apps/web/src/actions/add-appointment-action.ts (full file)
// COPY THIS PATTERN for new actions:
export const myAction = authActionClient
  .inputSchema(mySchema)
  .action(async ({ parsedInput, ctx: { supabase, supabaseAdmin, user, profile } }) => {
    // use supabaseAdmin for writes that bypass RLS
    const result = await myService(supabaseAdmin, user.id, parsedInput)
    revalidatePath('/target')
    return { result }
  })
```

**FIRE_AND_FORGET_PATTERN:**
```typescript
// SOURCE: apps/web/src/actions/add-appointment-action.ts:35
// insertActivityLog called WITHOUT await — same pattern for GCal sync:
insertActivityLog({ supabaseAdmin, ... }) // no await, no .catch at call site
// For GCal sync, add .catch to log errors:
syncAppointmentToGoogleCalendar(appointment, user.id).catch((err) => {
  console.error('[google-calendar] sync failed', err)
})
```

**SETTINGS_TOGGLE_PATTERN:**
```typescript
// SOURCE: apps/web/src/screens/settings-screen.tsx:42-97
// AuthItem sub-component pattern:
function AuthItem({ label, isEnabled, isLoading, onConnect }: AuthItemProps) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      {isEnabled
        ? <Badge>Ativo</Badge>
        : <Button disabled={isLoading} onClick={onConnect}>Conectar</Button>
      }
    </div>
  )
}
// hasGoogleIdentity pattern:
const hasGoogleCalendar = profile?.google_calendar_connected === true
```

**AUTH_CALLBACK_PATTERN:**
```typescript
// SOURCE: apps/web/app/auth/callback/route.ts:38-52
// Current pattern (only captures error):
const { error } = await supabase.auth.exchangeCodeForSession(code)
// Must change to (capture data for provider_token):
const { data, error } = await supabase.auth.exchangeCodeForSession(code)
if (!error && data.session?.provider_token && intent === 'google_calendar') {
  // persist tokens via supabaseAdmin
}
```

**SERVICE_SIGNATURE_PATTERN:**
```typescript
// SOURCE: apps/web/src/services/appointment.ts:52-55
// Services accept the client as a parameter — do the same for new services:
export async function createAppointment(
  supabase: SupabaseClient | SupabaseAdminClient,
  userId: string,
  data: CreateAppointmentInput,
)
```

**SUPABASE_ADMIN_IMPORT:**
```typescript
// SOURCE: packages/supabase/src/server.ts
// Import path used in safe-action.ts and services:
import { createServerSupabaseAdmin } from '@ventre/supabase/server'
// In services called outside of action context, instantiate directly:
const supabase = await createServerSupabaseAdmin()
```

---

## Architecture Decision

**APPROACH_CHOSEN:** Separate `user_google_tokens` table (not columns on `users`)

**RATIONALE:** `safe-action.ts` loads `profile` via `select("*")` on every action: `await supabase.from("users").select("*").eq("id", user.id).single()`. Adding `google_access_token`/`google_refresh_token` to `users` would expose sensitive OAuth tokens in `ctx.profile` on every action, and every `select("*")` query everywhere. A dedicated table keeps tokens isolated, easier to RLS-protect, and doesn't leak into action context.

**ALTERNATIVES_REJECTED:**
- Columns on `users` table: exposes tokens in `ctx.profile` loaded on every action via `select("*")`
- Storing tokens in Supabase session (Supabase handles its own refresh, but `provider_token` becomes null after session refresh — documented gotcha)
- Using `googleapis` npm package: adds ~2MB bundle weight; native `fetch` is sufficient for 3 endpoints

**NOT_BUILDING (scope limits):**
- Bidirectional sync (Google → VentreApp)
- Syncing appointments created before Calendar connection
- Support for multiple Google Calendars (uses `primary`)
- Attendee email invites via `attendees[]` (optional field, not in v1)

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `packages/supabase/supabase/migrations/20260514000001_google_calendar_integration.sql` | CREATE | Add `user_google_tokens` table + `google_event_id` on appointments |
| `packages/supabase/src/types/database.types.ts` | REGENERATE | Run `pnpm db:types` after migration |
| `apps/web/app/auth/callback/route.ts` | UPDATE | Capture `provider_token` when `intent=google_calendar` |
| `apps/web/src/providers/auth-provider.tsx` | UPDATE | Add `connectGoogleCalendar()` method |
| `apps/web/src/services/google-calendar.ts` | CREATE | Token management + GCal REST CRUD |
| `apps/web/src/actions/disconnect-google-calendar-action.ts` | CREATE | Clear tokens from `user_google_tokens` |
| `apps/web/src/actions/add-appointment-action.ts` | UPDATE | Fire-and-forget GCal sync on create |
| `apps/web/src/actions/update-appointment-action.ts` | UPDATE | Fire-and-forget GCal sync on update |
| `apps/web/src/actions/cancel-day-appointments-action.ts` | UPDATE | Fire-and-forget GCal delete on cancel |
| `apps/web/src/screens/settings-screen.tsx` | UPDATE | Add "Integrações" section with Google Agenda toggle |

---

## NOT Building (Scope Limits)

- Sincronização bidirecional (Google Calendar → VentreApp)
- Retroactive sync de appointments existentes antes da conexão
- Suporte a múltiplas agendas do Google (usa `primary`)
- Envio de convites a pacientes via `attendees[]`
- Notificação visual no app quando a sync falha (v1 falha silenciosamente no log)

---

## Step-by-Step Tasks

### Task 1: CREATE Migration `20260514000001_google_calendar_integration.sql`

- **ACTION**: CREATE SQL migration file
- **FILE**: `packages/supabase/supabase/migrations/20260514000001_google_calendar_integration.sql`
- **IMPLEMENT**:

```sql
-- Tokens OAuth do Google Calendar por usuário (separado de users para não expor em ctx.profile)
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id                  uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id             uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token        text        NOT NULL,
  refresh_token       text,
  expires_at          timestamptz NOT NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Somente o próprio usuário pode ler/atualizar seus tokens (service_role bypassa via supabaseAdmin)
CREATE POLICY "user_google_tokens: owner read"
  ON user_google_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_google_tokens: owner delete"
  ON user_google_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ID do evento no Google Calendar para update/delete futuros
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_event_id text;
```

- **MIRROR**: `packages/supabase/supabase/migrations/20260513000001_appointments_external_patient.sql` — naming format, `IF NOT EXISTS`, `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` pattern
- **GOTCHA**: Não usar `uuid_generate_v4()` sem prefixo — a função está em `extensions.uuid_generate_v4()` conforme as migrations existentes
- **GOTCHA**: No INSERT/UPDATE policy for the table — writes are only done via `supabaseAdmin` (service_role), which bypasses RLS. Adding user-facing INSERT policy would create a security hole.
- **VALIDATE**: `pnpm db:push && pnpm db:types`

---

### Task 2: UPDATE `apps/web/app/auth/callback/route.ts`

- **ACTION**: UPDATE to capture `provider_token` when `intent=google_calendar`
- **MIRROR**: `apps/web/app/auth/callback/route.ts` — existing structure, same supabase client setup
- **IMPLEMENT**:

1. Read the existing `code`, `type`, `next` params. **Add** `intent` param:
```typescript
const intent = requestUrl.searchParams.get('intent')
```

2. Change `const { error }` to `const { data, error }` on `exchangeCodeForSession`:
```typescript
const { data, error } = await supabase.auth.exchangeCodeForSession(code)
```

3. After the exchange succeeds and before the redirect, add:
```typescript
if (!error && intent === 'google_calendar' && data.session?.provider_token) {
  // Use supabaseAdmin to bypass RLS — this runs server-side
  const { createServerSupabaseAdmin } = await import('@ventre/supabase/server')
  const admin = await createServerSupabaseAdmin()
  await admin.from('user_google_tokens').upsert(
    {
      user_id: data.session.user.id,
      access_token: data.session.provider_token,
      refresh_token: data.session.provider_refresh_token ?? undefined,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    },
    { onConflict: 'user_id' }
  )
}
```

- **GOTCHA**: `exchangeCodeForSession` returns `data.session?.provider_token` — NOT `data.provider_token`. The session is nested.
- **GOTCHA**: `provider_refresh_token` may be `null` if user didn't complete the Google consent with `access_type=offline`. Treat as optional.
- **GOTCHA**: The callback route builds its own Supabase SSR client (not from `@ventre/supabase/server`). Import `createServerSupabaseAdmin` separately for the admin write.
- **VALIDATE**: `pnpm check-types`

---

### Task 3: UPDATE `apps/web/src/providers/auth-provider.tsx`

- **ACTION**: ADD `connectGoogleCalendar()` method to auth context
- **MIRROR**: `apps/web/src/providers/auth-provider.tsx:124-132` — `signInWithGoogle()` pattern exactly

**Add to `AuthContextType` interface** (near `signInWithGoogle`):
```typescript
connectGoogleCalendar: () => Promise<void>
```

**Add implementation** (after `signInWithGoogle` function):
```typescript
const connectGoogleCalendar = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar.events',
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo: `${window.location.origin}/auth/callback?next=/profile/settings&intent=google_calendar`,
    },
  })
}
```

**Add to context value** (near `signInWithGoogle` in the value object):
```typescript
connectGoogleCalendar,
```

- **GOTCHA**: `signInWithOAuth` is a redirect — the function returns immediately and the browser navigates away. No need to handle return value.
- **GOTCHA**: `scopes` in Supabase OAuth only adds to the base scopes (`openid email profile`). Do not include those base scopes — they are added automatically.
- **GOTCHA**: `calendar.events` scope is a Google sensitive scope. In production, the Google Cloud project must have this scope verified, otherwise users will see an "unverified app" warning. Needs `redirect_uri` whitelisted in Google Cloud Console.
- **VALIDATE**: `pnpm check-types`

---

### Task 4: CREATE `apps/web/src/services/google-calendar.ts`

- **ACTION**: CREATE service with token management + Google Calendar REST CRUD
- **MIRROR**: `apps/web/src/services/appointment.ts` — function naming, error throwing, import pattern

```typescript
import type { Tables } from '@ventre/supabase/types'
import { createServerSupabaseAdmin } from '@ventre/supabase/server'

type Appointment = Tables<'appointments'>

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const TIMEZONE = 'America/Sao_Paulo'

export async function getValidGoogleAccessToken(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseAdmin()
  const { data: tokenRow } = await supabase
    .from('user_google_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!tokenRow?.access_token) return null

  const isExpired = new Date(tokenRow.expires_at) <= new Date(Date.now() + 60_000)
  if (!isExpired) return tokenRow.access_token

  if (!tokenRow.refresh_token) return null

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokenRow.refresh_token,
    }),
  })

  if (!res.ok) {
    // Token revoked or expired — clear stored tokens
    await supabase.from('user_google_tokens').delete().eq('user_id', userId)
    return null
  }

  const { access_token, expires_in } = await res.json() as { access_token: string; expires_in: number }

  await supabase.from('user_google_tokens').update({
    access_token,
    expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
  }).eq('user_id', userId)

  return access_token
}

function buildEventPayload(appointment: Appointment) {
  const startISO = `${appointment.date}T${appointment.time}`
  const startDate = new Date(`${startISO}-03:00`)
  const endDate = new Date(startDate.getTime() + (appointment.duration ?? 60) * 60_000)
  const patientName = appointment.external_patient_name ?? 'Paciente'
  const typePt = appointment.type === 'consulta' ? 'Consulta' : 'Encontro'

  return {
    summary: `${typePt} — ${patientName}`,
    description: appointment.notes ?? undefined,
    location: appointment.location ?? undefined,
    start: { dateTime: startDate.toISOString(), timeZone: TIMEZONE },
    end: { dateTime: endDate.toISOString(), timeZone: TIMEZONE },
  }
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  appointment: Appointment,
): Promise<string> {
  const res = await fetch(CALENDAR_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventPayload(appointment)),
  })
  if (!res.ok) throw new Error(`GCal create failed: ${res.status}`)
  const event = await res.json() as { id: string }
  return event.id
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  appointment: Appointment,
): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventPayload(appointment)),
  })
  if (!res.ok) throw new Error(`GCal update failed: ${res.status}`)
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  const res = await fetch(`${CALENDAR_API}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  // 204 = success, 404 = already deleted — both are acceptable
  if (!res.ok && res.status !== 404) throw new Error(`GCal delete failed: ${res.status}`)
}

export async function syncCreateToGoogleCalendar(
  appointment: Appointment,
  userId: string,
): Promise<void> {
  const accessToken = await getValidGoogleAccessToken(userId)
  if (!accessToken) return

  const eventId = await createGoogleCalendarEvent(accessToken, appointment)

  const supabase = await createServerSupabaseAdmin()
  await supabase
    .from('appointments')
    .update({ google_event_id: eventId })
    .eq('id', appointment.id)
}

export async function syncUpdateToGoogleCalendar(
  appointment: Appointment,
  userId: string,
): Promise<void> {
  if (!appointment.google_event_id) return

  const accessToken = await getValidGoogleAccessToken(userId)
  if (!accessToken) return

  await updateGoogleCalendarEvent(accessToken, appointment.google_event_id, appointment)
}

export async function syncDeleteToGoogleCalendar(
  googleEventId: string,
  userId: string,
): Promise<void> {
  const accessToken = await getValidGoogleAccessToken(userId)
  if (!accessToken) return

  await deleteGoogleCalendarEvent(accessToken, googleEventId)
}
```

- **GOTCHA**: `appointment.time` is stored as `HH:MM:SS` (PostgreSQL `time` type). Combine with `appointment.date` as `YYYY-MM-DDTHH:MM:SS` to form a valid ISO datetime. Append `-03:00` (São Paulo offset) or convert from UTC — use `-03:00` as a safe constant for BRT.
- **GOTCHA**: If `appointment.duration` is null, default to 60 minutes to produce a valid `end.dateTime`.
- **GOTCHA**: After `refresh_token` fails with non-OK response, clear the stored tokens (user likely revoked access). Next sync attempt will silently skip.
- **GOTCHA**: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must NOT have `NEXT_PUBLIC_` prefix — server-side only.
- **VALIDATE**: `pnpm check-types`

---

### Task 5: CREATE `apps/web/src/actions/disconnect-google-calendar-action.ts`

- **ACTION**: CREATE server action to remove stored Google tokens
- **MIRROR**: `apps/web/src/actions/add-appointment-action.ts` — `authActionClient` with no input schema

```typescript
'use server'
import { authActionClient } from '@/lib/safe-action'
import { revalidatePath } from 'next/cache'

export const disconnectGoogleCalendarAction = authActionClient
  .action(async ({ ctx: { supabaseAdmin, user } }) => {
    const { error } = await supabaseAdmin
      .from('user_google_tokens')
      .delete()
      .eq('user_id', user.id)
    if (error) throw new Error('Erro ao desconectar Google Agenda')
    revalidatePath('/profile/settings')
  })
```

- **MIRROR**: `apps/web/src/lib/safe-action.ts` for `authActionClient` import path
- **VALIDATE**: `pnpm check-types`

---

### Task 6: UPDATE `apps/web/src/actions/add-appointment-action.ts`

- **ACTION**: ADD fire-and-forget GCal sync after `createAppointment`
- **MIRROR**: Existing `insertActivityLog(...)` fire-and-forget at line 35 — same pattern

After the `createAppointment(...)` call, add:
```typescript
import { syncCreateToGoogleCalendar } from '@/services/google-calendar'

// ... existing createAppointment call ...
const appointment = await createAppointment(supabaseAdmin, professionalId, parsedInput)

// Fire-and-forget — GCal failure must not break appointment creation
syncCreateToGoogleCalendar(appointment, user.id).catch((err) => {
  console.error('[google-calendar] create sync failed', err)
})
```

- **GOTCHA**: Do NOT `await` the sync call — it must not delay the action response or bubble errors to the user
- **VALIDATE**: `pnpm check-types`

---

### Task 7: UPDATE `apps/web/src/actions/update-appointment-action.ts`

- **ACTION**: ADD fire-and-forget GCal update sync
- **MIRROR**: Same fire-and-forget pattern as Task 6

Read `update-appointment-action.ts` fully first. After the update query completes, add:
```typescript
import { syncUpdateToGoogleCalendar } from '@/services/google-calendar'

// After the update query — need to fetch the updated row first
// (the action already does a select after update for the activity log, reuse that)
syncUpdateToGoogleCalendar(updatedAppointment, user.id).catch((err) => {
  console.error('[google-calendar] update sync failed', err)
})
```

- **GOTCHA**: The update action may not return the full row (check the actual file). If the select-after-update already fetches the row, reuse it. If not, the sync function needs the appointment with `google_event_id` — ensure the select includes it after `pnpm db:types` regenerates.
- **VALIDATE**: `pnpm check-types`

---

### Task 8: UPDATE `apps/web/src/actions/cancel-day-appointments-action.ts`

- **ACTION**: ADD fire-and-forget GCal delete for each cancelled appointment
- **MIRROR**: Same fire-and-forget pattern

Read `cancel-day-appointments-action.ts` fully first. Before the bulk status update, fetch the appointments that will be cancelled (to get their `google_event_id`). After the update:

```typescript
import { syncDeleteToGoogleCalendar } from '@/services/google-calendar'

// After cancellation, delete GCal events for any that had one
for (const appt of cancelledAppointments) {
  if (appt.google_event_id) {
    syncDeleteToGoogleCalendar(appt.google_event_id, user.id).catch((err) => {
      console.error('[google-calendar] delete sync failed', err)
    })
  }
}
```

- **GOTCHA**: The action currently does a bulk update without fetching rows first. Read the file — you may need to add a `.select()` before or after the update to get `google_event_id` values.
- **VALIDATE**: `pnpm check-types`

---

### Task 9: UPDATE `apps/web/src/screens/settings-screen.tsx`

- **ACTION**: ADD "Integrações" section with Google Agenda toggle
- **MIRROR**: `apps/web/src/screens/settings-screen.tsx:42-97` — `AuthItem` pattern + `handleLinkGoogle` pattern

1. **Fetch token status from DB**: Add a server-side query or pass from parent to determine if tokens exist. Since this is a client screen, add a new server action `getGoogleCalendarStatusAction` that returns `{ connected: boolean }`.

Actually — simpler: the settings screen already has `profile` from `useAuth()`. After migration and `db:types`, add a query to `user_google_tokens` in the settings screen data fetch, OR add a boolean computed column/function. The simplest approach: a new server action.

**New action** (add to `disconnect-google-calendar-action.ts` or new file):
```typescript
export const getGoogleCalendarStatusAction = authActionClient
  .action(async ({ ctx: { supabaseAdmin, user } }) => {
    const { data } = await supabaseAdmin
      .from('user_google_tokens')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    return { connected: !!data }
  })
```

2. **In settings-screen.tsx**, add after the existing auth section:

```tsx
// Section: Integrações
<div className="space-y-4">
  <h3 className="text-sm font-medium text-muted-foreground">Integrações</h3>
  <AuthItem
    label="Google Agenda"
    description={isGoogleCalendarConnected
      ? "Agendamentos sincronizados automaticamente"
      : "Sincronize seus agendamentos com o Google Agenda"}
    isEnabled={isGoogleCalendarConnected}
    isLoading={isConnectingCalendar}
    onConnect={handleConnectGoogleCalendar}
    onDisconnect={handleDisconnectGoogleCalendar}
  />
</div>
```

- The `AuthItem` component needs a `description` prop and `onDisconnect` — check the existing signature and extend if needed, OR create a new `IntegrationItem` component if the `AuthItem` doesn't cleanly support both connect and disconnect.
- `handleConnectGoogleCalendar` calls `connectGoogleCalendar()` from `useAuth()`
- `handleDisconnectGoogleCalendar` calls `executeAsync(disconnectGoogleCalendarAction)`
- **VALIDATE**: `pnpm check-types` + visual check in browser

---

### Task 10: ADD environment variables

- **ACTION**: Document and add to `.env.local`
- **IMPLEMENT**: Add to `.env.local` (and Vercel project settings):

```env
GOOGLE_CLIENT_ID=<same value as used by Supabase Google OAuth>
GOOGLE_CLIENT_SECRET=<same value as used by Supabase Google OAuth>
```

> These are server-only (no `NEXT_PUBLIC_` prefix). The values can be copied from the Supabase Dashboard → Authentication → Providers → Google.

Also add to `apps/web/src/env.ts` (or wherever env validation is done, if it exists) so TypeScript picks up the required vars.

- **VALIDATE**: `pnpm check-types` + test token refresh in dev

---

## Testing Strategy

### Manual Test Checklist (no unit tests for v1 — external API integration)

| Scenario | Steps | Expected |
|----------|-------|----------|
| Conectar Google Agenda | Settings → "Conectar Google Agenda" → autorizar no Google → retorna para settings | Status muda para "Conectado" |
| Criar appointment com Calendar conectado | Criar appointment qualquer | Evento aparece no Google Calendar em ~2s |
| Criar appointment sem Calendar conectado | Criar appointment sem ter conectado | Appointment criado normalmente, sem erro |
| Atualizar appointment | Editar data/hora de appointment existente | Evento atualizado no Google Calendar |
| Cancelar appointment | Cancelar appointment do dia | Evento removido do Google Calendar |
| Desconectar Google Agenda | Settings → "Desconectar" | Status muda para "Desconectado"; novos appointments não sincronizados |
| Token expirado | Criar appointment com token de >1h atrás | Refresh automático ocorre, evento criado normalmente |
| Token revogado | Revogar acesso no Google Account → criar appointment | Tokens limpos do banco, appointment criado sem erro |

### Edge Cases

- [ ] `appointment.duration` nulo → usa 60 min como padrão
- [ ] `appointment.time` no formato `HH:MM:SS` → conversão correta para ISO 8601
- [ ] `google_event_id` nulo no update → sync ignorada silenciosamente
- [ ] Google API retorna 401 no refresh → tokens limpos, próximo appointment não falha
- [ ] `provider_refresh_token` ausente (usuário conectou sem `prompt=consent`) → `null` tratado em `getValidGoogleAccessToken`

---

## Validation Commands

### Level 1: STATIC_ANALYSIS
```bash
pnpm check-types
npx biome check apps/web/src/services/google-calendar.ts apps/web/src/actions/disconnect-google-calendar-action.ts apps/web/app/auth/callback/route.ts
```
**EXPECT**: Exit 0

### Level 2: DATABASE_VALIDATION
```bash
pnpm db:push && pnpm db:types
```
**EXPECT**: Migration applied, `user_google_tokens` table visible in Supabase Dashboard, `database.types.ts` updated with new table and `appointments.google_event_id`

### Level 3: MANUAL_VALIDATION
Follow the manual test checklist above in a dev environment with `pnpm dev`.

---

## Acceptance Criteria

- [ ] Profissional pode conectar/desconectar Google Agenda nas configurações
- [ ] Appointment criado → evento aparece no Google Calendar do profissional
- [ ] Appointment atualizado → evento atualizado no Google Calendar
- [ ] Appointment cancelado → evento removido do Google Calendar
- [ ] Falha na API do Google não impede criação do appointment
- [ ] Token refresh automático funciona sem intervenção do usuário
- [ ] `pnpm check-types` passa com exit 0
- [ ] `pnpm db:push` aplica a migration sem erros

---

## Completion Checklist

- [ ] Task 1: Migration criada e `pnpm db:push && pnpm db:types` executado
- [ ] Task 2: Auth callback captura `provider_token` quando `intent=google_calendar`
- [ ] Task 3: `connectGoogleCalendar()` adicionado ao auth provider
- [ ] Task 4: `google-calendar.ts` service criado com token management e CRUD
- [ ] Task 5: `disconnect-google-calendar-action.ts` criado
- [ ] Task 6: `add-appointment-action.ts` atualizado com fire-and-forget sync
- [ ] Task 7: `update-appointment-action.ts` atualizado com fire-and-forget sync
- [ ] Task 8: `cancel-day-appointments-action.ts` atualizado com fire-and-forget delete
- [ ] Task 9: Settings screen atualizada com seção "Integrações"
- [ ] Task 10: Variáveis de ambiente documentadas e adicionadas
- [ ] Level 1: `pnpm check-types` passa
- [ ] Level 2: Migration aplicada e tipos regenerados
- [ ] Level 3: Teste manual completo

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `provider_token` nulo no callback (usuário já autorizou sem `prompt=consent`) | MEDIUM | HIGH | `prompt=consent` força novo consent; documentar que usuários existentes precisarão reconectar |
| Google rejeita scope `calendar.events` como "não verificado" em prod | HIGH | MEDIUM | Solicitar verificação do app no Google Cloud Console antes do lançamento; scope permitido para usuários de teste durante desenvolvimento |
| `exchangeCodeForSession` bug em supabase-js ≥ v2.91.0 | LOW | HIGH | Verificar `pnpm ls @supabase/supabase-js` — se ≥ v2.91.0, adicionar `await new Promise(r => setTimeout(r, 0))` após o exchange |
| `appointment.time` em formato inesperado no banco | LOW | MEDIUM | Log e skip se `buildEventPayload` falhar na construção do ISO datetime |
| Usuário revoga acesso no Google | MEDIUM | LOW | `getValidGoogleAccessToken` limpa os tokens na falha de refresh; appointments continuam funcionando |
| Rate limit na API do Google Calendar | LOW | LOW | v1 cria/atualiza/deleta 1 evento por appointment; sem bulk operations |

---

## Notes

- **Variáveis de ambiente**: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` são os mesmos valores já configurados no Supabase para OAuth. Não é necessário criar um novo projeto no Google Cloud.
- **Verificação de app no Google**: O scope `calendar.events` é sensível. Para produção, submeter para verificação via Google Cloud Console. Em desenvolvimento, adicionar e-mails de testadores na tela de OAuth do Cloud Console.
- **Fuso horário**: `America/Sao_Paulo` (BRT = UTC-3). Se a app expandir para outros países, este campo precisará vir de uma preferência do usuário.
- **Sincronização retroativa**: appointments criados antes da conexão com o Calendar não serão sincronizados. Isso é intencional (v1).
- **`supabase-js` version check**: Run `pnpm ls @supabase/supabase-js` to verify the resolved version. If ≥ v2.91.0, add the `setTimeout` workaround in the callback route.
