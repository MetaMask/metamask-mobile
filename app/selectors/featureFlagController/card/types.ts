/**
 * Shape of a version-gated remote flag. LaunchDarkly may additionally wrap this
 * in a progressive-rollout envelope (`{ name, value }`), which
 * `validatedVersionGatedFeatureFlag` unwraps for us.
 */
export interface GateVersionedFeatureFlag {
  enabled: boolean;
  minimumVersion: string;
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
 * Immersve provider config — the `cardImmersveConfig` flag. The on/off switch
 * is the separate `cardImmersve` flag, not a field in here.
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
  appUrl?: string;
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

/** The four remote-flag keys that make up one provider's contract. */
export interface CardProviderFlagKeys {
  gate: string;
  config: string;
  chains: string;
  countries: string;
}
