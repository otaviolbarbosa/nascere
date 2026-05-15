# 006 — Integração com Google Agenda

## Objetivo

Sincronizar automaticamente os appointments criados no VentreApp com o Google Agenda do profissional, de forma opt-in. Quando um appointment é criado, atualizado ou cancelado, o evento correspondente na agenda do Google é criado/atualizado/removido.

---

## Escopo

- Fluxo de autorização separado ("Conectar Google Agenda") nas configurações
- Criação de evento no Google Calendar ao criar um appointment
- Atualização do evento ao editar um appointment
- Cancelamento do evento ao cancelar um appointment
- Armazenamento do `google_event_id` no appointment para sincronização futura
- Refresh automático do access token

**Fora do escopo (v1):**
- Sincronização bidirecional (eventos criados no Google → VentreApp)
- Sincronização de appointments já existentes antes da conexão
- Suporte a múltiplas agendas do Google (usa a agenda principal)

---

## Mapeamento de dados

| Campo no VentreApp        | Campo no Google Calendar       |
|---------------------------|-------------------------------|
| `date` + `time`           | `start.dateTime`              |
| `date` + `time` + `duration` | `end.dateTime`             |
| `type` (consulta/encontro)| `summary` (ex: "Consulta — Nome do Paciente") |
| `notes`                   | `description`                 |
| `location`                | `location`                    |
| `patient.name` ou `external_patient_name` | parte do `summary` |
| `external_patient_email`  | `attendees[]` (opcional)      |

---

## Passos de implementação

### Etapa 1 — Migration: armazenar tokens e event ID

**Arquivo:** `packages/supabase/supabase/migrations/YYYYMMDD_google_calendar_integration.sql`

```sql
-- Tokens OAuth do Google por usuário
ALTER TABLE users
  ADD COLUMN google_access_token  text,
  ADD COLUMN google_refresh_token text,
  ADD COLUMN google_token_expires_at timestamptz;

-- ID do evento criado no Google Calendar por appointment
ALTER TABLE appointments
  ADD COLUMN google_event_id text;
```

Após a migration, rodar `pnpm db:types` para regenerar os tipos.

---

### Etapa 2 — Fluxo OAuth com escopo de Calendar

**Arquivos a modificar/criar:**

**`apps/web/src/providers/auth-provider.tsx`**
- Adicionar método `connectGoogleCalendar()` que dispara `supabase.auth.signInWithOAuth` com provider `google` e escopo adicional `https://www.googleapis.com/auth/calendar.events`
- Usar `queryParams: { access_type: 'offline', prompt: 'consent' }` para garantir que o `refresh_token` seja retornado

```ts
async connectGoogleCalendar() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar.events',
      queryParams: { access_type: 'offline', prompt: 'consent' },
      redirectTo: `${window.location.origin}/auth/callback?next=/settings&intent=google_calendar`,
    },
  })
}
```

**`apps/web/app/auth/callback/route.ts`**
- Detectar `intent=google_calendar` na query string
- Extrair `session.provider_token` e `session.provider_refresh_token`
- Salvar os tokens em `users` via `supabaseAdmin`

```ts
if (intent === 'google_calendar' && session?.provider_token) {
  await supabaseAdmin.from('users').update({
    google_access_token: session.provider_token,
    google_refresh_token: session.provider_refresh_token,
    google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  }).eq('id', session.user.id)
}
```

---

### Etapa 3 — Serviço Google Calendar

**Novo arquivo:** `apps/web/src/services/google-calendar.ts`

Responsabilidades:
- `getValidAccessToken(userId)` — busca o token do usuário; se expirado, usa o `refresh_token` para renovar via `https://oauth2.googleapis.com/token` e salva o novo token
- `createCalendarEvent(accessToken, appointment)` — POST para `https://www.googleapis.com/calendar/v3/calendars/primary/events`
- `updateCalendarEvent(accessToken, eventId, appointment)` — PATCH no evento existente
- `deleteCalendarEvent(accessToken, eventId)` — DELETE no evento

Usar `fetch` nativo (sem biblioteca externa) para evitar dependências pesadas. Não instalar `googleapis`.

```ts
async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', userId)
    .single()

  if (!user?.google_access_token) return null

  const isExpired = !user.google_token_expires_at ||
    new Date(user.google_token_expires_at) <= new Date()

  if (!isExpired) return user.google_access_token

  // Refresh
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: user.google_refresh_token!,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const { access_token, expires_in } = await res.json()

  await supabase.from('users').update({
    google_access_token: access_token,
    google_token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
  }).eq('id', userId)

  return access_token
}
```

---

### Etapa 4 — Hook na action de appointments

**`apps/web/src/actions/add-appointment-action.ts`**

Após `createAppointment()`, disparar a sincronização de forma não-bloqueante (falha silenciosa — o appointment é criado independente):

```ts
const appointment = await createAppointment(...)

// Sincronização com Google Calendar (não bloqueia a resposta)
syncAppointmentToGoogleCalendar(appointment, ctx.user.id).catch((err) => {
  console.error('[google-calendar] sync failed', err)
})

revalidatePath('/home')
return { appointment }
```

**Novo arquivo:** `apps/web/src/services/sync-google-calendar.ts`

```ts
export async function syncAppointmentToGoogleCalendar(
  appointment: Appointment,
  userId: string,
) {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return // usuário não conectou o Google Calendar

  const event = await createCalendarEvent(accessToken, appointment)

  // Salvar o google_event_id para futuras atualizações
  await supabaseAdmin
    .from('appointments')
    .update({ google_event_id: event.id })
    .eq('id', appointment.id)
}
```

Repetir o padrão para `update-appointment-action.ts` (usando `updateCalendarEvent`) e para cancelamento (usando `deleteCalendarEvent`).

---

### Etapa 5 — UI nas Configurações

**`apps/web/src/screens/settings-screen.tsx`**

Adicionar seção "Integrações" com:
- Estado: conectado/desconectado (baseado em `user.google_access_token IS NOT NULL`)
- Botão "Conectar Google Agenda" → chama `connectGoogleCalendar()`
- Botão "Desconectar" → limpa os tokens via server action `disconnectGoogleCalendarAction`

```tsx
<div>
  <h3>Google Agenda</h3>
  {isConnected ? (
    <>
      <p>Conectado — novos agendamentos serão sincronizados automaticamente.</p>
      <Button variant="ghost" onClick={() => disconnectGoogleCalendar()}>
        Desconectar
      </Button>
    </>
  ) : (
    <>
      <p>Sincronize seus agendamentos com o Google Agenda.</p>
      <Button onClick={() => connectGoogleCalendar()}>
        Conectar Google Agenda
      </Button>
    </>
  )}
</div>
```

**Nova action:** `apps/web/src/actions/disconnect-google-calendar-action.ts`
- Limpa `google_access_token`, `google_refresh_token`, `google_token_expires_at` do usuário

---

### Etapa 6 — Variáveis de ambiente

Adicionar ao `.env.local` e ao ambiente de produção (Vercel):

```env
GOOGLE_CLIENT_ID=       # mesmo usado pelo Supabase para OAuth
GOOGLE_CLIENT_SECRET=   # mesmo usado pelo Supabase para OAuth
```

> O `client_id` e `client_secret` já existem no painel do Supabase (configurações de OAuth do Google). Basta copiar os mesmos valores.

---

## Ordem de execução sugerida

1. Migration + `pnpm db:types`
2. Serviço `google-calendar.ts` (tokens + CRUD de eventos)
3. Callback OAuth (`intent=google_calendar`)
4. Hook em `add-appointment-action.ts`
5. Actions de update e cancelamento
6. UI nas configurações
7. Testes manuais (criar, editar, cancelar appointment com Calendar conectado)

---

## Riscos e observações

- **Token expirado sem refresh_token:** pode acontecer se o usuário não reconsentiu com `prompt: 'consent'`. Tratar retornando `null` e ignorando a sincronização.
- **Usuário revoga acesso no Google:** a chamada à API retornará 401. Limpar os tokens do banco nesse caso.
- **Fuso horário:** o Google Calendar exige `timeZone` nos eventos. Usar `America/Sao_Paulo` como padrão ou buscar da preferência do usuário.
- **RLS nos tokens:** os campos `google_access_token` e `google_refresh_token` só devem ser lidos via `supabaseAdmin` em server actions — nunca expostos ao cliente.