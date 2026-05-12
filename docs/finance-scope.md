# Finance / Sales Scope

This scope is parked until the test Supabase project is ready and the current operational bugs are stable.

## Roles

- `admin`: sees all sales, payments, balances, commissions, reports, and archive data.
- `sales_head`: sees all sales reports and can add upsells/payments if allowed.
- `seller`: can add a sale and see the full value/payment history for their own sales.
- `nurturer`: can see only paid/upfront amount connected to their commission, not full sale value.
- `upseller`: can add upsell sales and see their own upsell history.
- Future: `lead_gen`, but not active yet.
- Set the Roles if u think current roles are not good. Admin can able to change the roles of current user.


## Rules

- Only sellers can add a normal sale.
- Admin marks payments as received.
- Commission is calculated only on received payments, not unpaid total sale value.
- Admin manually sets commission splits per payment.
- Admin can add multiple commission split rows to a payment, then lock that payment's commission so no new split rows are added.
- Locked commission rows can still be edited by admin for correction.
- Lead generation commission applies only after a lead converts and payment is received.
- Monthly stats reset by reporting period, but historical sales records stay stored.

## Example

Sale total: `$200`
Upfront received: `$80`

Admin creates commission splits on the `$80` payment:

- Taha: `2.5%`
- Jawad: `2.5%`
- Krish: `5%`

The system calculates the dollar amount for each split.

## Visibility

- Admin sees total sale, paid, balance, invoice, commission, and every participant.
- Seller sees only sales where they are `client_sales.seller_user_id`, including sale total, paid, balance, and payment history.
- After a client transfer, the old seller keeps visibility only to sales they closed. New upsells belong to the new seller/upseller.
- Non-admin users do not see commission breakdowns in the client sales tab or ledger.
- Other sellers do not see another seller/upseller's amounts unless admin grants visibility later.

## Test DB Table History

- `client_sales`: finance sale header, tied to `clients.id` and `users.id` through `seller_user_id`.
- `client_sale_payments`: received payment records for each sale.
  - `commission_locked`: blocks adding new split rows after admin finalizes the payment commission.
- `sale_commission_splits`: admin-managed commission split rows per payment.
- `client_assignments`: existing client ownership/connected-people history used for CRM visibility.
- `lead_transfers`: existing transfer history used to understand client handoff, but sale visibility stays seller-based.
- `follow_ups`: test helper table defined in `supabase-follow-ups-test-table.sql`.

## Migration Notes

- For live merge, prefer `supabase-live-finance-migration.sql`. It creates the three finance tables with the current required columns, constraints, indexes, and authenticated grants.
- `supabase-finance-payment-stage.sql` adds `client_sale_payments.payment_stage`.
- `supabase-finance-commission-lock.sql` adds `client_sale_payments.commission_locked`.
- `supabase-finance-fix-recursive-rls.sql` adjusts finance RLS for the test database.
- Keep finance SQL separate and run in TEST first. Do not merge into live until the live migration order is reviewed.

Build only against the test Supabase project first.
