import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { Hex, Json } from '@metamask/utils';
import { RootState } from '../../../reducers';

export const ATTEMPTS_MAX_DEFAULT = 2;
export const BUFFER_INITIAL_DEFAULT = 0.025;
export const BUFFER_STEP_DEFAULT = 0.025;
export const BUFFER_SUBSEQUENT_DEFAULT = 0.05;
export const SLIPPAGE_DEFAULT = 0.005;

export interface PreferredToken {
  address: string;
  chainId: string;
  name?: string;
  successRate: number;
}

export interface PreferredTokensConfig {
  default: PreferredToken[];
  overrides: Record<string, PreferredToken[]>;
}

export interface MetaMaskPayFlags {
  attemptsMax: number;
  bufferInitial: number;
  bufferStep: number;
  bufferSubsequent: number;
  slippage: number;
  predictWithdrawAnyToken: boolean;
  perpsWithdrawAnyToken: boolean;
  preferredTokens: PreferredTokensConfig;
  minimumRequiredTokenBalance: number;
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

    const payTokenFlags = (featureFlags as Record<string, Json>)?.confirmations_pay_tokens as Record<string, Json | PreferredTokensConfig> | undefined;

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
      predictWithdrawAnyToken:
        (metaMaskPayFlags?.predictWithdrawAnyToken as boolean) ?? false,
      perpsWithdrawAnyToken:
        (metaMaskPayFlags?.perpsWithdrawAnyToken as boolean) ?? false,
      preferredTokens: {
        default:
          ((payTokenFlags?.preferredTokens as PreferredTokensConfig)
            ?.default as PreferredToken[]) ?? [],
        overrides:
          ((payTokenFlags?.preferredTokens as PreferredTokensConfig)
            ?.overrides as Record<string, PreferredToken[]>) ?? {},
      },
      minimumRequiredTokenBalance:
        (payTokenFlags?.minimumRequiredTokenBalance as number) ?? 0,
    };
  },
);

export function getPreferredTokensForTransactionType(
  preferredTokens: PreferredTokensConfig,
  transactionType?: string,
): PreferredToken[] {
  if (transactionType && preferredTokens.overrides[transactionType]) {
    return preferredTokens.overrides[transactionType];
  }
  return preferredTokens.default;
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
