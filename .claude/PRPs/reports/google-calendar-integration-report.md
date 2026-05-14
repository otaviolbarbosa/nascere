# Implementation Report

**Plan**: `.claude/PRPs/plans/google-calendar-integration.plan.md`
**Branch**: `feat/create-appointments-to-external-patients`
**Date**: 2026-05-14
**Status**: COMPLETE

---

## Summary

Implemented opt-in Google Calendar sync for appointments. Professionals can now connect their Google Calendar from the Settings screen. Once connected, every appointment create/update/cancel is mirrored as a Google Calendar event via fire-and-forget calls that don't block the primary flow.

---

## Assessment vs Reality

| Metric | Predicted | Actual | Reasoning |
|--------|-----------|--------|-----------|
| Complexity | MEDIUM | MEDIUM | Matched — straightforward pattern replication |
| Confidence | 8/10 | 9/10 | All patterns were accurately predicted; one minor deviation in update-appointment-action |

**Deviations from plan:**

- `update-appointment-action.ts`: Plan said to reuse the existing post-update select. In reality, the action only did a bare `.update()` with no row fetch at all. Added a new `select("*, patient:patients(name)")` query after the update that serves both the GCal sync and the existing activity log (consolidating the two separate queries that were there before).
- `database.types.ts`: The `db:types` script (`with-env.cjs`) injects a debug line at the top of the generated file. Removed it manually after regeneration.

---

## Tasks Completed

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Migration + db:types | `migrations/20260514000001_google_calendar_integration.sql` | ✅ |
| 2 | Auth callback token capture | `apps/web/app/auth/callback/route.ts` | ✅ |
| 3 | Auth provider connectGoogleCalendar | `apps/web/src/providers/auth-provider.tsx` | ✅ |
| 4 | Google Calendar service | `apps/web/src/services/google-calendar.ts` | ✅ |
| 5 | Disconnect action + status action | `apps/web/src/actions/disconnect-google-calendar-action.ts` | ✅ |
| 6 | add-appointment sync | `apps/web/src/actions/add-appointment-action.ts` | ✅ |
| 7 | update-appointment sync | `apps/web/src/actions/update-appointment-action.ts` | ✅ |
| 8 | cancel-day sync | `apps/web/src/actions/cancel-day-appointments-action.ts` | ✅ |
| 9 | Settings screen Integrações section | `apps/web/src/screens/settings-screen.tsx` | ✅ |
| 10 | Env vars documented | `apps/web/.env.local.example` | ✅ |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check | ✅ | 0 errors — `pnpm check-types` passes clean |
| Lint | ✅ | Biome: "No issues found" |
| Migration | ✅ | Applied via `pnpm db:push` |
| DB types | ✅ | `user_google_tokens` + `appointments.google_event_id` generated |

---

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `packages/supabase/supabase/migrations/20260514000001_google_calendar_integration.sql` | CREATE | `user_google_tokens` table + `google_event_id` on appointments |
| `packages/supabase/src/types/database.types.ts` | REGENERATE | Added `user_google_tokens` and `google_event_id` types |
| `apps/web/app/auth/callback/route.ts` | UPDATE | Capture + persist `provider_token` on `intent=google_calendar` |
| `apps/web/src/providers/auth-provider.tsx` | UPDATE | Added `connectGoogleCalendar()` to interface + implementation |
| `apps/web/src/services/google-calendar.ts` | CREATE | Token management, refresh, GCal REST CRUD, sync helpers |
| `apps/web/src/actions/disconnect-google-calendar-action.ts` | CREATE | `disconnectGoogleCalendarAction` + `getGoogleCalendarStatusAction` |
| `apps/web/src/actions/add-appointment-action.ts` | UPDATE | Fire-and-forget `syncCreateToGoogleCalendar` |
| `apps/web/src/actions/update-appointment-action.ts` | UPDATE | Fire-and-forget `syncUpdateToGoogleCalendar`; consolidated post-update select |
| `apps/web/src/actions/cancel-day-appointments-action.ts` | UPDATE | Pre-fetch rows with `google_event_id`; fire-and-forget delete per event |
| `apps/web/src/screens/settings-screen.tsx` | UPDATE | New `IntegrationItem` component + "Integrações" section |
| `apps/web/.env.local.example` | UPDATE | Documented `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |

---

## Issues Encountered

1. **`database.types.ts` debug line**: The `with-env.cjs` script outputs a debug/tip line to stdout that gets captured by `>` into the types file. Removed manually after regeneration. Known behavior — happens every time `db:types` runs.

2. **Actions with no `inputSchema` take `void`**: `disconnectGoogleCalendarAction` and `getGoogleCalendarStatusAction` have no input schema, so `next-safe-action` types their `execute` as `(input: void) => ...`. Calling with `{}` caused TS errors — fixed by calling without arguments.

---

## Next Steps

1. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local` (copy from Supabase Dashboard → Auth → Providers → Google)
2. Add same vars to Vercel production environment
3. In Google Cloud Console: whitelist the production callback URL (`https://yourdomain.com/auth/callback`) as an authorized redirect URI
4. For production launch: submit `calendar.events` scope for Google app verification (users will see "unverified app" warning until verified)
5. Manual test: Settings → Conectar Google Agenda → create appointment → verify event in Google Calendar
