import { SolScope } from '@metamask/keyring-api';

/** Rarity tiers, from most to least common. */
export const COLLECTOR_CRYPT_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
] as const;

/**
 * CollectorCrypt Gacha API. The POC calls CollectorCrypt directly and without
 * an API key (memos then carry the `cc-` slug). Switch to the MetaMask proxy
 * route by changing this URL only.
 */
export const COLLECTOR_CRYPT_API_URL = 'https://gacha.collectorcrypt.com/api';

/** CollectorCrypt cards API, used to enrich wallet holdings. No key needed. */
export const COLLECTOR_CRYPT_CARDS_API_URL = 'https://api.collectorcrypt.com';

/** Public CollectorCrypt page of a card (redemption and details handoff). */
export const getCollectorCryptCardUrl = (mint: string): string =>
  `https://collectorcrypt.com/assets/solana/${mint}`;

/** Only mainnet is supported by the POC. */
export const COLLECTOR_CRYPT_SCOPE = SolScope.Mainnet;

/** USDC on Solana mainnet. */
export const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const SOLANA_USDC_ASSET_ID = `${SolScope.Mainnet}/token:${SOLANA_USDC_MINT}`;
export const USDC_DECIMALS = 6;
export const SOLANA_USDC_ICON_URL = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/${SOLANA_USDC_MINT}.png`;

/**
 * On-chain collections of CollectorCrypt cards: Metaplex Core collection and
 * verified pNFT collection. Update authority is the fallback identifier.
 */
export const COLLECTOR_CRYPT_COLLECTIONS: readonly string[] = [
  'CCryptUfeFSZ3Fgc9FLeKrhLVAP67FSqi1GuVoj9CRac',
  'CCryptWBYktukHDQ2vHGtVcmtjXxYzvw8XNVY64YN2Yf',
];
export const COLLECTOR_CRYPT_UPDATE_AUTHORITY =
  'DQPERZ9e86pNJ4mhUnCEP8V75yxZofsipoVrRWT5Wdxd';

/** Timings driving recovery and cache expiry (ms). */
export const COLLECTOR_CRYPT_TIMINGS = {
  /** HTTP request timeout. */
  REQUEST_TIMEOUT: 15_000,
  /** An unsigned generated pack is useless after this (blockhash lifetime). */
  GENERATED_TTL: 60_000,
  /**
   * A signed purchase not seen as paid by `pack/status` after this delay can
   * safely be considered expired: the blockhash lifetime (~90s) plus a large
   * margin for CollectorCrypt's payment webhook.
   */
  SIGNED_TTL: 5 * 60_000,
  /** CollectorCrypt refuses `openPack` 2h after `generatePack`. */
  OPEN_WINDOW: 2 * 60 * 60_000,
  /** `openPack` polling while the payment webhook is pending. */
  OPEN_POLL_INTERVAL: 1_500,
  OPEN_POLL_ATTEMPTS: 30,
  /** Keep a freshly opened card while the NFT indexers catch up. */
  INDEXER_GRACE: 15 * 60_000,
  /** Buyback cache lifetimes. The offer is re-checked before any sale. */
  BUYBACK_AVAILABLE_TTL: 2 * 60_000,
  BUYBACK_UNAVAILABLE_TTL: 6 * 60 * 60_000,
  /** Terminal operations and sale tombstones are pruned after this. */
  TERMINAL_TTL: 24 * 60 * 60_000,
  /** Max concurrent `buyback/available` calls during a sync. */
  BUYBACK_CHECK_CONCURRENCY: 4,
} as const;
