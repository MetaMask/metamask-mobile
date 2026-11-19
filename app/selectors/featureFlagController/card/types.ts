import type { CaipAssetType, CaipChainId } from '@metamask/utils';

/**
 * Shape of a version-gated remote flag. LaunchDarkly may additionally wrap this
 * in a progressive-rollout envelope (`{ name, value }`), which
 * `validatedVersionGatedFeatureFlag` unwraps for us.
 */
export interface GateVersionedFeatureFlag {
  enabled: boolean;
  minimumVersion: string;
}

export type ProvisioningPlatform = 'ios' | 'android';
export type ProvisioningWallet =
  | 'apple_wallet'
  | 'google_wallet'
  | 'samsung_pay';
export type ProvisioningDevice = 'phone' | 'watch';

export interface ProvisioningEligibilityRules {
  cardProcessors?: string[];
}

export interface ProvisioningWalletRule {
  enabled: boolean;
  minimumVersion: string;
  devices?: ProvisioningDevice[];
  eligibility?: ProvisioningEligibilityRules;
}

export interface ProvisioningCountryRule {
  enabled: boolean;
  eligibility?: ProvisioningEligibilityRules;
  ios?: { apple_wallet?: ProvisioningWalletRule };
  android?: {
    google_wallet?: ProvisioningWalletRule;
    samsung_pay?: ProvisioningWalletRule;
  };
}

/** One provider's provisioning flag: a gate, then countries, then wallets. */
export interface CardProvisioningFlag {
  enabled: boolean;
  minimumVersion: string;
  countries: Record<string, ProvisioningCountryRule>;
}

export interface CardProvisioningFacts {
  platform: ProvisioningPlatform;
  countryCode?: string;
  cardProcessor?: string;
}

export interface ResolvedProvisioningWallet {
  wallet: ProvisioningWallet;
  devices?: ProvisioningDevice[];
}

export type CardUkMigrationPhase = 'off' | 'soft' | 'forced';

/** Remote `cardUkMigration` flag — version gate plus migration schedule.
 * Both `startDate` and `endDate` are required for any active phase; missing,
 * invalid, or inverted (`startDate >= endDate`) dates resolve to off
 * (same as `enabled: false`). Eligibility is fixed to GB (UK) Baanx users.
 */
export interface CardUkMigrationFlag {
  enabled: boolean;
  minimumVersion: string;
  startDate?: string;
  endDate?: string;
}

export interface CardUkMigrationState {
  phase: CardUkMigrationPhase;
  /** `soft` or `forced` — migration prompts may show. */
  isActive: boolean;
  /** Parsed from `endDate` for sheet / blocking copy. */
  deadline: Date | null;
}

export interface SupportedToken {
  address?: string | null;
  decimals?: number | null;
  enabled?: boolean | null;
  name?: string | null;
  symbol?: string | null;
}

export interface SupportedChain {
  enabled?: boolean | null;
  balanceScannerAddress?: `0x${string}` | null;
  foxConnectAddresses?: {
    global?: `0x${string}` | null;
    us?: `0x${string}` | null;
  };
  tokens?: SupportedToken[] | null;
}

/**
 * The `cardFeature` remote flag.
 *
 * Holds provider-agnostic constants plus the Baanx chain/token config.
 * Immersve reads exclusively from its own `cardImmersve*` flags — the legacy
 * `immersve` / `immersveCountries` keys are no longer read at all.
 */
export interface CardFeatureFlag {
  constants?: Record<string, string>;
  chains?: Record<string, SupportedChain>;
}

export interface CardProgramIdOption {
  name: string;
  id: string;
}

/**
 * Where an Immersve card draws its balance: the user's own wallet (an EOA
 * allowance) or the primary Money account.
 */
export type ImmersveFundingSourceType = 'wallet' | 'moneyAccount';

/**
 * One entry of `cardImmersveConfig.fundingChannels`, keyed by a channel name
 * such as `usdcBase`, `usdcLinea`, or `moneyAccount`. Chain, token, RPC, and
 * Immersve network name are not stored here — they are resolved from
 * `assetId` through `cardImmersveChains`.
 */
export interface ImmersveFundingChannelConfig {
  source: ImmersveFundingSourceType;
  /** Immersve funding channel id sent to the funding-sources API. */
  fundingChannelId: string;
  /** CAIP-19 asset the channel spends. */
  assetId: CaipAssetType;
  /** Spender used for allowance reads, revoke, and re-approve. */
  spenderAddress: string;
  /** Falls back to the top-level `cardProgramId` when omitted. */
  cardProgramId?: string;
}

/**
 * A funding channel joined with its chain and token from `cardImmersveChains`.
 */
export interface ImmersveFundingChannel extends ImmersveFundingChannelConfig {
  caipChainId: CaipChainId;
  /** Immersve network name, e.g. `base-mainnet` or `monad-mainnet`. */
  network: string;
  tokenAddress: string;
  decimals: number;
  symbol?: string;
  rpcUrl?: string;
  fallbackRpcUrl?: string;
}

/**
 * Immersve provider config — the `cardImmersveConfig` flag. The on/off switch
 * is the separate `cardImmersve` flag, not a field in here.
 *
 * `network`, `fundingChannelId`, and `spenderAddress` are the USDC wallet
 * channel that released builds read. New builds use them when
 * `cardImmersveCountries` is a legacy string array or is absent.
 */
export interface ImmersveProgramConfig {
  network?: string;
  cardProgramId?: string;
  /** Temporary: multi-program list for internal testing selectors. Easy to remove. */
  cardProgramIds?: CardProgramIdOption[];
  clientApplicationId?: string;
  partnerAccountId?: string;
  fundingChannelId?: string;
  spenderAddress?: string;
  apiBaseUrl?: string;
  /** Separate Immersve secure host used for set-PIN (and similar) calls. */
  secureApiBaseUrl?: string;
  appUrl?: string;
  reportTransactionUrl?: string;
  /** Channel name -> channel. See {@link ImmersveFundingChannelConfig}. */
  fundingChannels?: Record<string, ImmersveFundingChannelConfig>;
}

// -- Generic per-provider shapes --

/**
 * Per-token config in a `card<Provider>Chains` flag.
 *
 * Deliberately minimal: the token is identified by its CAIP-19 key, and only
 * `decimals` is carried, because providers must scale on-chain amounts before
 * any wallet lookup is available. Display metadata (name, icon) comes from
 * wallet state, and Immersve reads `symbol` from its own API.
 */
export interface CardProviderTokenConfig {
  decimals: number;
  symbol?: string;
}

/** One chain entry in a `card<Provider>Chains` flag, keyed by CAIP-2 chain ID. */
export interface CardProviderChain {
  /** The provider's own name for this network, e.g. `base-mainnet`. */
  network?: string;
  rpcUrl?: string;
  fallbackRpcUrl?: string;
  /** CAIP-19 asset ID -> token config. */
  tokens?: Record<string, CardProviderTokenConfig>;
}

/** CAIP-2 chain ID -> chain config. */
export type CardProviderChains = Record<string, CardProviderChain>;

/**
 * One country in the object form of `cardImmersveCountries`. Released builds
 * only accept that flag as a string array, so they ignore this shape and fall
 * back to GB on the top-level USDC channel.
 */
export interface ImmersveCountryConfig {
  /** Name of an entry in `cardImmersveConfig.fundingChannels`. */
  fundingChannel: string;
  /**
   * Builds older than this are not offered the country. Omitted means no
   * floor.
   */
  minimumVersion?: string;
}

/** The remote-flag keys that make up one provider's contract. */
export interface CardProviderFlagKeys {
  gate: string;
  config: string;
  chains: string;
  countries: string;
}
