/** Curated default watchlist asset IDs for the empty-state CTA (mainnet). */
export const DEFAULT_WATCHLIST_BASE_ASSET_IDS: readonly string[] = [
  'bip122:000000000019d6689c085ae165831e93/slip44:0',
  'eip155:1/slip44:60',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  'eip155:56/slip44:714',
  'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
] as const;

/** SpaceX (Ondo tokenized) on Ethereum mainnet — 6th default when geo-eligible. */
export const SPACEX_DEFAULT_ASSET_ID =
  'eip155:1/erc20:0xc9eef266834730340a55b6cc24621b31baf55581' as const;
