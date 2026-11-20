# Vault composition label formatting

## Goal

Format the Money vault composition chart's center label as:

```text
<protocol> · <asset symbol>
```

Examples:

- `Aave v3 · mUSD`
- `Morpho v2 · USDC`
- `Cash reserve · mUSD`

The formatter must be reusable by other Money components.

## Design

Add `formatVaultCompositionLabel(component)` to
`app/components/UI/Money/utils/moneyVaultComposition.ts`.

The formatter will:

1. Use `Cash reserve` for the `liquidity_buffer` protocol.
2. Dynamically format all other protocol identifiers:
   - Split on underscores.
   - Title-case ordinary words.
   - Preserve version tokens such as `v3` in lowercase.
3. Use the first item in `component.assets`.
4. Join the protocol label and asset symbol with the literal middle dot `·`.
5. Throw an explicit error when the component has no first asset symbol, avoiding
   silently incomplete user-facing copy.

The `Cash reserve` string will be added to the Money English locale and read
through the existing i18n helper. The chart will use the formatter for visible
center text. Existing accessibility text will continue using the API-provided
component label because this change targets visual center text only.

## Alternatives considered

### Static protocol map

A map would give precise control over every known protocol name, but every new
protocol or version would require a code change. It does not meet the requirement
that protocol formatting adapt dynamically.

### Generic parser inside the chart

Parsing directly in the chart would minimize files, but it would couple
presentation code to API naming rules and prevent reuse by other Money
components.

## Testing

Add focused Jest tests for the formatter covering:

- Aave version formatting.
- Morpho version formatting.
- `liquidity_buffer` formatting.
- A dynamically named protocol.
- First-asset-only behavior.
- Missing first asset error.
