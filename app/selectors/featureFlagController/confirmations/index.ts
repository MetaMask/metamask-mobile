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
    const metaMaskPayFlags = featureFlags?.confirmation_pay as
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
