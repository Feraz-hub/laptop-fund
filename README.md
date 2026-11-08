# Samuel's laptop fund

Static fundraiser built locally for GitHub Pages. FCMB bank details are public by design. No bank screenshot, credentials, donor identities or transfer receipts are stored here.

## Contribution flow

Choose a preset or enter a whole-naira amount, then select **Add amount**. This prepares the FCMB transfer instructions and visibly confirms the selected amount. Editing the amount clears that prepared selection. The visitor completes the actual transfer in their banking app; the button never charges money or changes the public total. The gallery starts paused and can be played or navigated manually. Typography is self-hosted; its license is in assets/Manrope-OFL.txt.

## Preview

Run `node serve.mjs` in this folder, then open http://localhost:4173 . No installation needed.

## Confirmed transfers

Verify money in FCMB first. Run `node update-fund.mjs 5000 1 "First contribution received. Thank you!"` with the **cumulative total** and confirmed contribution count, then commit/push fund.json. Visitors refresh the published data every 30 seconds, after GitHub Pages deploys the change. No visitor button can inflate the total. No automatic bank integration is connected. Do not publish donor information without consent.

## GitHub Pages

Create a public repository named laptop-fund. Push these files to main. In Settings → Pages, choose Deploy from a branch, main, / (root), Save. The expected URL is https://Feraz-hub.github.io/laptop-fund/ after deployment succeeds. GitHub publishes subsequent pushed changes automatically.

The target comes from the supplied screenshot, not a live price quote. The listing has inconsistent hardware specifications; confirm configuration and price with the seller before purchase. Zero raised is the initial placeholder until actual receipts are confirmed.

For automatic FCMB transaction detection, connect a suitable verified payment provider and a server-side webhook; never put bank credentials, secret keys or GitHub access tokens in this public frontend.
