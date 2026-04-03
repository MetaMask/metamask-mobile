# Unified Buy v2 — payment pill screenshots (for PR template)

Use the **Screenshots/Recordings** section of `.github/pull-request-template.md`.

## Before

Capture on **`main`** (or any build **without** this branch): same flow as below. The Build Quote payment pill showed the **generic card** icon for every selected method (e.g. **Apple Pay** still showed the card glyph).

Save the image next to this file as:

`unified-buy-v2-build-quote-payment-pill-before.png`

## After

Captured on iOS Simulator (Build Quote, **Buy ETH** on Ethereum, **Apple Pay** selected). The pill shows the **Apple Pay mark** and other methods resolve through `PaymentMethodIcon`.

File: `unified-buy-v2-build-quote-payment-pill-after.png`

## Paste into GitHub PR (recommended)

GitHub renders images reliably if you **drag the PNGs into the PR description** (uploads to `user-images.githubusercontent.com`). Alternatively, after pushing your branch, use **raw** URLs:

```markdown
### Before

![Build Quote payment pill on main — generic card icon with Apple Pay label](https://raw.githubusercontent.com/MetaMask/metamask-mobile/<YOUR_BRANCH>/docs/ramps/unified-buy-v2-build-quote-payment-pill-before.png)

### After

![Build Quote payment pill with Apple Pay mark](https://raw.githubusercontent.com/MetaMask/metamask-mobile/<YOUR_BRANCH>/docs/ramps/unified-buy-v2-build-quote-payment-pill-after.png)
```

Replace `<YOUR_BRANCH>` with your branch name (and ensure both images are committed and pushed).
