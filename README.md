# Samuel's laptop fund

Static fundraiser built locally for GitHub Pages. FCMB bank details are public by design. No bank screenshot, credentials, donor identities or transfer receipts are stored here.

## Contribution flow

Choose a preset or enter a whole-naira amount, then select **Add amount**. This prepares the FCMB transfer instructions and visibly confirms the selected amount. Editing the amount clears that prepared selection. The visitor completes the actual transfer in their banking app; the button never charges money or changes the public total. The gallery starts paused and can be played or navigated manually. Typography is self-hosted; its license is in assets/Manrope-OFL.txt.

## Preview

Run `npm start` in this folder, then open http://127.0.0.1:4174 . Requires Node 24+. No dependency installation needed. The existing preview may still be running on port 4173.

## Confirmed transfers

Verify money in FCMB first. Run `node update-fund.mjs 5000 1 "First contribution received. Thank you!"` with the **cumulative direct-FCMB total only** and its confirmed contribution count, then publish fund.json. Do not include Flutterwave donations or settlement payouts. The payment server combines that manual total with verified live Flutterwave payments and visitors refresh every 30 seconds. No visitor button can inflate the total. Do not publish donor information without consent.

## GitHub Pages

Create a public repository named laptop-fund. Push these files to main. In Settings → Pages, choose Deploy from a branch, main, / (root), Save. The expected URL is https://Feraz-hub.github.io/laptop-fund/ after deployment succeeds. GitHub publishes subsequent pushed changes automatically.

The target comes from the supplied screenshot, not a live price quote. The listing has inconsistent hardware specifications; confirm configuration and price with the seller before purchase. Zero raised is the initial placeholder until actual receipts are confirmed.

## Flutterwave setup

See [PAYMENTS-SETUP.md](PAYMENTS-SETUP.md). Flutterwave Standard checkout, verification, webhook handling and persistent records are implemented. There is no Flutterwave account or key configured yet, so online checkout is disabled. GitHub Pages can serve the static FCMB fallback but cannot run this backend. A Node host with HTTPS and persistent storage is required before live payment activation. `npm test` runs isolated checks with mocked provider responses; no real transaction has been tested.
