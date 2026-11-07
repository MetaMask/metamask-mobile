# Ideas

Append ideas here instead of chasing them immediately. Delete a line once it has been tried.
- isStakedTokenAssetId: skip re-parse/checksum — compare lowercase reference against a lowercase precomputed set (or reuse the caller's already-parsed type).
- getTokensControllerAllIgnoredTokens: hoist the EVM-account list out of the per-asset loop; derive once, slice per chain.
- allTokens/accountsAssets: replace Object.fromEntries + double Set spread with single-pass loops (same key order!).
- parseCaipAssetType: bounded Map cache keyed on the raw id string.
- currencyRates: avoid full localeCompare sort — order only matters for first-wins per symbol.
- marketData: hoist repeated property lookups; avoid re-checksumming native addresses (getNativeTokenAddress + toChecksumHexAddress per asset).
- parseBalanceWithDecimals: shortcut the common '0' amount (BigInt('0') path allocates strings).
