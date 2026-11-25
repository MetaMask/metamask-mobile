# Vault Composition Percentage Formatting

## Goal

Use one percentage formatter for vault allocation and APY values in the
markets table and composition chart. Values use maximum one decimal place with
BigNumber `ROUND_HALF_UP`; positive values below `0.1%` display as `<0.1%`.

## Design

`app/components/UI/Money/utils/moneyVaultComposition.ts` remains the
authoritative formatter through `formatVaultCompositionPercentage`. It keeps
the existing `parseApy` and `toApyPercent` path for validation and
`ROUND_HALF_UP` rounding, then applies the lower-bound display before rounding
can turn a value below `0.1%` into `0.1%`.

`MoneyVaultCompositionMarketRow` already uses this helper for both Allocation
and APY. `MoneyVaultCompositionChart` will use the same helper for its center
percentage, and the duplicate chart-local Intl formatter will be removed.
`MoneyVaultCompositionMarketsTable` continues to render rows, so its displayed
Allocation and APY values inherit the shared formatter through each row.

## Behavior

- `0` -> `0%`
- `0.0005` (`0.05%`) -> `<0.1%`
- `0.001` (`0.1%`) -> `0.1%`
- `0.1235` (`12.35%`) -> `12.4%`
- Invalid numeric input continues to throw a descriptive error.

## Verification

Update focused formatter and chart utility tests for the shared behavior,
including the lower-bound and half-up boundary cases. Run the affected Jest
tests, lint the edited files, and run TypeScript checks if the repository
configuration requires them.
