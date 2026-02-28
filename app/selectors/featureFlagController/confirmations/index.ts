import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { Hex, Json } from '@metamask/utils';
import { RootState } from '../../../reducers';

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
  overrides?: Record<string, PayPostQuoteConfig>;
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

interface RawPayPostQuoteFlag {
  default?: PayPostQuoteConfig;
  overrides?: Record<string, PayPostQuoteConfig>;
}

const selectPayPostQuoteFlags = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags): PayPostQuoteFlags => {
    const raw = featureFlags?.confirmations_pay_post_quote as
      | RawPayPostQuoteFlag
      | undefined;

    const defaultConfig: PayPostQuoteConfig = {
      enabled: raw?.default?.enabled ?? false,
      tokens: raw?.default?.tokens,
    };

    return {
      default: defaultConfig,
      overrides: raw?.overrides,
    };
  },
);

/**
 * Resolves the effective post-quote config for a given transaction type.
 * If the type has an override entry, unset properties fall back to default.
 */
export const selectPayQuoteConfig = createSelector(
  [
    selectPayPostQuoteFlags,
    (_state: RootState, transactionType?: string) => transactionType,
  ],
  (flags, transactionType): PayPostQuoteConfig => {
    const override = transactionType
      ? flags.overrides?.[transactionType]
      : undefined;

    if (!override) {
      return flags.default;
    }

    return {
      enabled: override.enabled ?? flags.default.enabled,
      tokens: override.tokens ?? flags.default.tokens,
    };
  },
);

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
