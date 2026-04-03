# Unified Buy v2 — Build Quote payment pill screenshots

Committed in this folder:

| File                                                 | Role                                                                                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `unified-buy-v2-build-quote-payment-pill-before.png` | **Before** — pill without `paymentMethod` passed from Build Quote (generic card icon while label can still show the selected method, e.g. Apple Pay). Recapture after a full reload if Metro HMR did not apply the temporary change. |
| `unified-buy-v2-build-quote-payment-pill-after.png`  | **After** — pill with `paymentMethod={selectedPaymentMethod}` and branded / per-method icons.                                                                                                                                        |

## GitHub PR description (raw URLs)

After pushing this branch:

```markdown
### Before

![Build Quote payment pill — generic card icon](https://raw.githubusercontent.com/MetaMask/metamask-mobile/fix/unified-buy-v2-payment-pill-icons/docs/ramps/unified-buy-v2-build-quote-payment-pill-before.png)

### After

![Build Quote payment pill — Apple Pay mark / correct method icon](https://raw.githubusercontent.com/MetaMask/metamask-mobile/fix/unified-buy-v2-payment-pill-icons/docs/ramps/unified-buy-v2-build-quote-payment-pill-after.png)
```

Replace the branch name in the URL if your PR uses a different head branch.
