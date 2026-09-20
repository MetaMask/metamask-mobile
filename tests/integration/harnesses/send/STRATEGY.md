# Send integration harness

## Harness inventory

| Harness              | Shape | Real                                                                 | Mocked                                                                                              | Use when                                                                                               |
| -------------------- | ----- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `send-component.tsx` | C     | `useAccountTokens`, Redux settings selector, `TokenList`, token rows | Wallet assets input, fiat-rate I/O, account override/fetch shell, navigation, send context, metrics | A send asset-list regression crosses Redux preference state, token derivation, and rendered row output |

The harness takes deterministic wallet assets and rates while preserving the production chain from the `showFiatOnTestnets` Redux setting through `useAccountTokens` to the rendered send token row.
