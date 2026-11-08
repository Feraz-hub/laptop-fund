# Samuel's laptop fund

A static personal fundraiser for an HP OMEN 16 for Blender, 3D modelling, animation and web design. Contributions are direct transfers to FCMB. No payment gateway, API key, bank API, database or backend payment service is needed.

## Preview

Run `npm start` and open http://127.0.0.1:4173 . No dependency installation needed. The local server serves only public site files.

## Update the confirmed total

After checking that a donation arrived in FCMB, run this example from the project folder:

`node update-fund.mjs 5000 1 "First donation confirmed. Thank you!"`

Replace 5000 with the cumulative confirmed donation total in naira, and 1 with the cumulative number of confirmed contributions. This sets the total; it does not add another 5000 each time. Keep unrelated account credits out of the fundraiser total.

Publish the changed fund.json to GitHub:

`git add fund.json`

`git commit -m "Update confirmed donations"`

`git push origin main`

After GitHub Pages deploys the update, visitors' open pages pick it up on their next 30-second check. The page shows both the last confirmed update and its most recent check. No public button can change the total. Visitors copy the receiving account number and make their transfer in their banking app.

## Hosting

GitHub Pages can host this complete site. Use main and / (root) as the Pages source. Public address: https://feraz-hub.github.io/laptop-fund/ . The previously observed connection issue to that domain is separate from these source changes. Keep .env files and private data out of publication; the remaining ignore rules protect any old local configuration.

## Assets

The target price comes from the supplied screenshot. Confirm the seller's final price and hardware configuration before buying. Reference-photo sources are linked on the site. Manrope's license is in assets/Manrope-OFL.txt. Public FCMB receiving details are included at the owner's request; no donor names or receipts are published.
