import { useMemo } from 'react';
import type { RampIntent } from '../Ramp/types';
import {
  getTokenBuyabilityKey,
  useTokensBuyability,
} from '../Ramp/hooks/useTokenBuyability';
import { WALLET_HOME_ONBOARDING_FUND_RAMP_PRIORITY } from './fundRampPriorityAssets';

export interface UseWalletHomeOnboardingFundRampIntentResult {
  rampIntent: RampIntent | undefined;
  isLoading: boolean;
}

/**
 * Resolves the ramp buy intent for the wallet home onboarding fund step (TMCU-681).
 * Prefers mainnet mUSD when buyable, otherwise mainnet ETH; undefined while loading
 * or when neither asset is supported for the user's region.
 */
export function useWalletHomeOnboardingFundRampIntent(): UseWalletHomeOnboardingFundRampIntentResult {
  const priorityTokens = useMemo(
    () =>
      WALLET_HOME_ONBOARDING_FUND_RAMP_PRIORITY.map(
        (candidate) => candidate.token,
      ),
    [],
  );

  const { buyabilityByTokenKey, isLoading } =
    useTokensBuyability(priorityTokens);

  const rampIntent = useMemo((): RampIntent | undefined => {
    if (isLoading) {
      return undefined;
    }

    const selected = WALLET_HOME_ONBOARDING_FUND_RAMP_PRIORITY.find(
      (candidate) =>
        buyabilityByTokenKey[getTokenBuyabilityKey(candidate.token)] === true,
    );

    return selected ? { assetId: selected.assetId } : undefined;
  }, [buyabilityByTokenKey, isLoading]);

  return { rampIntent, isLoading };
}
