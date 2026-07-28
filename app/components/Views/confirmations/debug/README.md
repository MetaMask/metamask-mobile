# MM Pay visual state picker (**DEV**)

Flask → bottom sheet → named presets for MetaMask Pay amount confirmations
(`CustomAmountInfo` / Perps Add funds and sibling flows).

## Usage

1. Open **Perps → Add funds** in a `__DEV__` build.
2. Tap the **flask** in the navbar.
3. Pick an error preset. Flow-specific presets also change the navbar title
   (e.g. Perps withdraw → **Withdraw**, Money withdraw → **Send**).
4. Select **Live (no override)** to clear.

## Intentional exclusions

- **Amount-update toast** — transient toast after `updateTokenAmount` failure;
  not forced (would need a one-shot toast trigger).
- **Alert banner chrome** — still the legacy `AlertMessage` StyleSheet component
  (out of MMDS migration scope).
- **Non-error happy paths** — keyboard defaults, fee skeletons, Paid by MetaMask,
  etc. were omitted so the sheet stays focused on error / empty states.

Canonical store: `mmPayVisualValidation.ts`. Skill aliases live under
`app/components/UI/Perps/Debug/`.
