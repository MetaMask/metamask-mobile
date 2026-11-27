import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import { selectCardTransactionHistoryEnabled } from '../../../../selectors/featureFlagController/card';
import {
  selectCardActiveProviderId,
  selectCardFundingTokens,
} from '../../../../selectors/cardController';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import { MONEY_ACCOUNT_LAUNCH_MS } from '../../../../core/Engine/controllers/card-controller/types';
import { CardProviderIds } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { FundingStatus, type CardFundingToken } from '../types';
import { useCardCapabilities } from './useCardCapabilities';
import { useCardHomeData } from './useCardHomeData';

export type CardTransactionHistoryDestination = 'card' | 'money';

function isCreatedOnOrAfterMoneyLaunch(
  createdAt: string | null | undefined,
): boolean {
  if (!createdAt) {
    return false;
  }
  const createdDate = new Date(createdAt);
  if (isNaN(createdDate.getTime())) {
    return false;
  }
  return createdDate.getTime() >= MONEY_ACCOUNT_LAUNCH_MS;
}

function hasOnlyMoneyAccountFunding(fundingTokens: CardFundingToken[]) {
  const delegatedTokens = fundingTokens.filter(
    (token) => token.fundingStatus !== FundingStatus.NotEnabled,
  );
  return (
    delegatedTokens.length > 0 &&
    delegatedTokens.every((token) => token.isMoneyAccountEntry === true)
  );
}

/**
 * Immersve cards funded only by the Money Account keep their history in
 * Money Activity. Money reads this too, so it loads Immersve declines exactly
 * when Card Home hides its own history.
 */
export const selectIsImmersveCardHistoryInMoney = createSelector(
  [
    selectCardTransactionHistoryEnabled,
    selectCardActiveProviderId,
    selectCardFundingTokens,
    selectIsMoneyAccountVisible,
  ],
  (enabled, providerId, fundingTokens, isMoneyAccountVisible) =>
    enabled &&
    providerId === CardProviderIds.Immersve &&
    isMoneyAccountVisible &&
    hasOnlyMoneyAccountFunding(fundingTokens),
);

/**
 * Money Activity is Accounts-API driven and does not need provider transaction
 * history, so that branch is evaluated before `supportsTransactionHistory`.
 */
export function useCardTransactionHistoryDestination(): CardTransactionHistoryDestination | null {
  const enabled = useSelector(selectCardTransactionHistoryEnabled);
  const capabilities = useCardCapabilities();
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const fundingTokens = useSelector(selectCardFundingTokens);
  const isImmersveCardHistoryInMoney = useSelector(
    selectIsImmersveCardHistoryInMoney,
  );
  const { data } = useCardHomeData();

  return useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (isImmersveCardHistoryInMoney) {
      return 'money';
    }

    // Prefer Money Activity when the user signed up after launch and only
    // spends from a Money Account — that feed already owns their card history.
    if (
      isCreatedOnOrAfterMoneyLaunch(data?.account?.createdAt) &&
      hasOnlyMoneyAccountFunding(fundingTokens) &&
      isMoneyAccountVisible
    ) {
      return 'money';
    }

    if (capabilities?.supportsTransactionHistory) {
      return 'card';
    }

    return null;
  }, [
    capabilities?.supportsTransactionHistory,
    data?.account?.createdAt,
    enabled,
    fundingTokens,
    isImmersveCardHistoryInMoney,
    isMoneyAccountVisible,
  ]);
}
