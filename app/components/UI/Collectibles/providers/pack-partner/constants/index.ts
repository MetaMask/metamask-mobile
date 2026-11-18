import {
  PACK_PARTNER_CONFIG,
  type PackPartnerEnvironment,
} from './environment';
export * from './environment';

/** Only private machines explicitly approved for this integration may appear.
 * Availability still comes from the provider's live catalogue and status.
 * Populate each network independently when private machine codes are assigned.
 */
export const PACK_PARTNER_PRIVATE_PACK_CODES: Record<
  PackPartnerEnvironment,
  readonly string[]
> = {
  mainnet: [],
  devnet: [],
};

/** Public faucet for the configured devnet settlement token. */
export const PACK_PARTNER_DEVNET_FAUCET_URL =
  'https://spl-token-faucet.com/?token-name=USDC-Dev';

/** Rarity tiers, from most to least common. */
export const PACK_PARTNER_RARITIES = [
  'common',
  'uncommon',
  'rare',
  'epic',
] as const;

/** Environment-bound public API hosts. */
export const PACK_PARTNER_API_URL = PACK_PARTNER_CONFIG.apiUrl;
export const PACK_PARTNER_CARDS_API_URL = PACK_PARTNER_CONFIG.cardsApiUrl;
export const getPackPartnerCardUrl = (mint: string): string | undefined =>
  PACK_PARTNER_CONFIG.websiteUrl
    ? `${PACK_PARTNER_CONFIG.websiteUrl}/assets/solana/${encodeURIComponent(mint)}`
    : undefined;
export const PACK_PARTNER_SCOPE = PACK_PARTNER_CONFIG.scope;
export const SOLANA_USDC_MINT = PACK_PARTNER_CONFIG.usdcMint;
export const SOLANA_USDC_ASSET_ID =
  `${PACK_PARTNER_SCOPE}/token:${SOLANA_USDC_MINT}` as const;
export const USDC_DECIMALS = 6;
export const SOLANA_USDC_ICON_URL = `https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png`;

/** Timings driving the purchase and sale workflows (ms). */
export const PACK_PARTNER_TIMINGS = {
  /** HTTP request timeout. */
  REQUEST_TIMEOUT: 15_000,
  /** Local freshness limit for unsigned packs, not proof of chain expiry. */
  GENERATED_TTL: 60_000,
  /** `openPack` polling while the payment webhook is pending. */
  OPEN_POLL_INTERVAL: 1_500,
  OPEN_POLL_ATTEMPTS: 30,
  /**
   * PackPartner opens a pack only within 2h of `/generatePack`. A pack whose
   * status is still unpaid after this window was never paid: its blockhash
   * expired long before, and an abandoned checkout keeps a null status forever.
   */
  OPEN_WINDOW: 2 * 60 * 60_000,
  /** PackPartner buys a card back only within 72h of its award. */
  BUYBACK_WINDOW: 72 * 60 * 60_000,
  /** Terminal purchase and sale operations are pruned after this. */
  TERMINAL_TTL: 24 * 60 * 60_000,
  /** Max concurrent `buyback/available` calls while reading owned cards. */
  BUYBACK_CHECK_CONCURRENCY: 4,
} as const;

/** Product cap, shared by purchase review and provider/API validation. */
export const MAX_MULTIPACK_COUNT = 5;

/** Default bound for the public openings list and presentation queue. */
export const RECENT_OPENINGS_LIMIT = 20;
