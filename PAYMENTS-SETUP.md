# Flutterwave + direct FCMB transfers

## Current state

The implementation is ready for configuration and testing. There is no Flutterwave account or API key yet, so online checkout is disabled. Tests use mocked provider responses, not real payments. Direct FCMB transfers remain available.

## What the account owner must do

1. Create a Flutterwave account at https://flutterwave.com/ and complete its verification. Describe the personal fundraiser truthfully; receiving live payments depends on Flutterwave's approval.
2. Add FCMB as the settlement account in Flutterwave and verify the account details there. This is separate from the website's direct FCMB transfer option. Settlement timing and fees are controlled by Flutterwave.
3. Enter test credentials into private server environment settings (or a local `.env` copied from `.env.example`). Never put them in app.js, GitHub files, or chat. This Standard v3 integration uses `FLW_SECRET_KEY` and `FLW_SECRET_HASH`; no public key is needed because checkout starts on the server.

## Start locally

### Private test-key setup on Windows

After creating your Flutterwave account, select test mode in its dashboard and find the V3 secret API key. In PowerShell, from this project folder, run `./configure-payments.ps1`. Paste the key at its hidden prompt. The helper saves a Git-ignored `.env`, generates a random webhook secret, preserves existing settings, and refuses to overwrite live mode. It does not display the key. Never paste the key into chat.

Run `npm run payments:check` to make a read-only test API request. It checks that Flutterwave accepts the key and lists FCMB, without creating a checkout, sending a payment, or linking the settlement bank. This remains an account-owner dashboard step. `./configure-payments.ps1 -Check` reports configuration flags without displaying secrets.

Restart the server after saving credentials. The helper defaults to the existing preview port 4173; the server otherwise defaults to 4174. Localhost can test return verification, but receiving real Flutterwave webhook deliveries requires a reachable public HTTPS deployment.

Requires Node 24+. No npm dependencies to install.

`npm start`

Open http://127.0.0.1:4174 . Empty credentials mean Flutterwave is unavailable. `PAYMENT_MODE=test` accepts test keys only and excludes all test payments from the public total. `npm test` runs isolated automated checks with mocked Flutterwave responses.

## Hosting needed

GitHub Pages hosts static files only and cannot run this payment server. Keep the code on GitHub, but deploy the whole application on a Node 24 host with HTTPS and a **persistent disk** (single server instance). For example, use a paid Render service with persistent disk or an existing VPS. No paid service or account has been provisioned. Configure:

- start command: `npm start`
- health check: `/healthz`
- `HOST=0.0.0.0`
- `PORT`: the port assigned by the host
- `PUBLIC_ORIGIN`: your exact HTTPS origin, with no trailing slash
- `DATA_DIRECTORY`: the mounted persistent disk directory
- `FLW_SECRET_KEY`, `FLW_SECRET_HASH`, `PAYMENT_MODE`: private environment settings

The SQLite database must survive restarts/redeployments. Back it up. Do not scale this setup to multiple separate disks/instances. Rate limits currently apply to the direct socket address; behind a shared proxy the per-minute checkout limit is shared unless the host supplies a trusted client-address integration.

## Flutterwave webhook

Set `https://YOUR-HOST/api/flutterwave/webhook` under Flutterwave's webhook settings. Set the same random secret hash as `FLW_SECRET_HASH` and enable webhook retries. This implements Standard v3's documented `verif-hash` header. The server independently re-verifies payment status, ID, currency, amount, and server-created reference. Duplicate notifications count once. The return page also verifies; a background pass checks pending references every five minutes in batches of 20.

Before switching to live: verify a provider test checkout, return flow and webhook delivery using actual test credentials. Then use an approved live key and `PAYMENT_MODE=live`. Live requires HTTPS. Test records never count toward the fund. A real payment/refund smoke test remains an owner-run financial action.

## Manual FCMB totals

`fund.json` and `node update-fund.mjs TOTAL_NAIRA CONFIRMED_COUNT "Optional update"` now represent **direct FCMB transfers only**. Do not add Flutterwave payments or Flutterwave settlement payouts to that file: those online donations are counted separately. Publish the updated file to the Node host when recording manual receipts. The API combines both sources for all visitors. Public online totals show the donation amount **before fees**, not the amount settled to FCMB. Donor email and optional name are sent only to Flutterwave and are not stored in the local payment database or published.

## Refunds and disputes

Successful payment automation is implemented. Refund and chargeback deductions are not yet automated; reconcile these in Flutterwave and adjust online records through a controlled maintenance process before relying on net totals. Do not treat this total as a bank balance. Resolve refund/dispute accounting and complete real provider test checks before live launch.

## Sources

- https://developer.flutterwave.com/docs/flutterwave-standard-1
- https://developer.flutterwave.com/docs/webhooks
- https://developer.flutterwave.com/docs/transaction-verification
- https://developer.flutterwave.com/reference/verify-transaction-with-tx_ref
