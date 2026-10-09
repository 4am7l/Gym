# Operations suite rollout notes

The frontend additions in this branch are immediately usable: member selection and confirmed batch deletion, phone lookup, expiry reminders, and UTF-8 CSV export (opens in Excel). The subscription export includes **current/latest** subscriptions only, not historical renewals.

The SQL migration is a **schema proposal only**, not automatically applied by GitHub or Render. Do not claim payments, attendance, audit history or renewal history are live until database migrations and authenticated server routes are implemented and tested.

## Important existing limitations
- The current POST /api/subscriptions updates the latest subscription in place; past renewals cannot be reconstructed from that table.
- Current members.notes stores debt as free text, not a trustworthy amount-paid/amount-due ledger.
- Current API mutation routes do not enforce server-side administrator authorization. Before exposing payments, attendance, activity logs, or batch financial operations, implement and verify server-side authentication/authorization.
- No live Supabase or Render smoke tests were run in this change.

## Suggested next rollout
1. Protect administrator API endpoints server-side.
2. Apply and verify the migration in Supabase with a privileged service-role server client and appropriate RLS.
3. Add atomic payment/attendance/audit routes with authorization and server-side validation.
4. Make renewal history append-only for new renewals, without rewriting old records.
5. Validate the deployed app and mobile UX.
