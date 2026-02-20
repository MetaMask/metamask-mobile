import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { Hex, Json } from '@metamask/utils';

export const ATTEMPTS_MAX_DEFAULT = 2;
export const BUFFER_INITIAL_DEFAULT = 0.025;
export const BUFFER_STEP_DEFAULT = 0.025;
export const BUFFER_SUBSEQUENT_DEFAULT = 0.05;
export const SLIPPAGE_DEFAULT = 0.005;

export interface MetaMaskPayFlags {
  attemptsMax: number;
  bufferInitial: number;
  bufferStep: number;
  bufferSubsequent: number;
  slippage: number;
}

export interface PayPostQuoteConfig {
  enabled?: boolean;
  tokens?: Record<Hex, Hex[]>;
}

export interface PayPostQuoteFlags {
  default: PayPostQuoteConfig;
  override?: Record<string, PayPostQuoteConfig>;
}

export interface GasFeeTokenFlags {
  gasFeeTokens: {
    [chainId: Hex]: {
      name: string;
      tokens: {
        name: string;
        address: Hex;
      }[];
    };
  };
}

export const selectMetaMaskPayFlags = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags): MetaMaskPayFlags => {
    const metaMaskPayFlags = featureFlags?.confirmations_pay as
      | Record<string, Json>
      | undefined;

    const attemptsMax =
      (metaMaskPayFlags?.attemptsMax as number) ?? ATTEMPTS_MAX_DEFAULT;

    const bufferInitial =
      (metaMaskPayFlags?.bufferInitial as number) ?? BUFFER_INITIAL_DEFAULT;

    const bufferStep =
      (metaMaskPayFlags?.bufferStep as number) ?? BUFFER_STEP_DEFAULT;

    const bufferSubsequent =
      (metaMaskPayFlags?.bufferSubsequent as number) ??
      BUFFER_SUBSEQUENT_DEFAULT;

    const slippage = (metaMaskPayFlags?.slippage as number) ?? SLIPPAGE_DEFAULT;

    return {
      attemptsMax,
      bufferInitial,
      bufferStep,
      bufferSubsequent,
      slippage,
    };
  },
);

const PAY_POST_QUOTE_DEFAULT: PayPostQuoteConfig = {
  enabled: false,
};

export const selectPayPostQuoteFlags = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags): PayPostQuoteFlags => {
    const raw = featureFlags?.confirmations_pay_post_quote as
      | Record<string, Json>
      | undefined;

    const rawDefault = raw?.default as Record<string, Json> | undefined;
    const rawOverride = raw?.override as
      | Record<string, Record<string, Json>>
      | undefined;

    const defaultConfig: PayPostQuoteConfig = {
      enabled: (rawDefault?.enabled as boolean) ?? false,
      tokens: rawDefault?.tokens as Record<Hex, Hex[]> | undefined,
    };

    const override = rawOverride
      ? Object.fromEntries(
          Object.entries(rawOverride).map(([key, value]) => [
            key,
            {
              enabled: value?.enabled as boolean | undefined,
              tokens: value?.tokens as Record<Hex, Hex[]> | undefined,
            },
          ]),
        )
      : undefined;

    return {
      default: defaultConfig,
      override,
    };
  },
);

/**
 * Resolves the effective config for a given override key.
 * If the key exists in override, the entire override entry is used (no merging with default).
 */
export function resolvePayPostQuoteConfig(
  flags: PayPostQuoteFlags | undefined,
  overrideKey?: string,
): PayPostQuoteConfig {
  if (!flags) {
    return PAY_POST_QUOTE_DEFAULT;
  }

  const override = overrideKey ? flags.override?.[overrideKey] : undefined;

  if (!override) {
    return flags.default;
  }

  return {
    enabled: override.enabled ?? flags.default.enabled,
    tokens: override.tokens ?? flags.default.tokens,
  };
}

/**
 * Selector to get the allow list for non-zero unused approvals from remote feature flags.
 *
 * @param state - The MetaMask state object
 * @returns {string[]} Array of URL strings for the allow list
 */
export const selectNonZeroUnusedApprovalsAllowList = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags: ReturnType<typeof selectRemoteFeatureFlags>) =>
    remoteFeatureFlags?.nonZeroUnusedApprovals ?? [],
);

export const selectGasFeeTokenFlags = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): GasFeeTokenFlags => {
    const gasFeeTokenFlags =
      remoteFeatureFlags?.confirmations_gas_fee_tokens as
        | Record<string, Json>
        | undefined;

    const gasFeeTokens =
      (gasFeeTokenFlags?.gasFeeTokens as
        | GasFeeTokenFlags['gasFeeTokens']
        | undefined) ?? {};

    return {
      gasFeeTokens,
    };
  },
);
