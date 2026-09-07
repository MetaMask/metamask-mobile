import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCardTransactionHistoryEnabled } from '../../../../selectors/featureFlagController/card';
import { selectCardFundingTokens } from '../../../../selectors/cardController';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import { MONEY_ACCOUNT_LAUNCH_MS } from '../../../../core/Engine/controllers/card-controller/types';
import { FundingStatus } from '../types';
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

/**
 * Money Activity is Accounts-API driven and does not need provider transaction
 * history, so that branch is evaluated before `supportsTransactionHistory`.
 */
export function useCardTransactionHistoryDestination(): CardTransactionHistoryDestination | null {
  const enabled = useSelector(selectCardTransactionHistoryEnabled);
  const capabilities = useCardCapabilities();
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const fundingTokens = useSelector(selectCardFundingTokens);
  const { data } = useCardHomeData();

  return useMemo(() => {
    if (!enabled) {
      return null;
    }

    const delegatedTokens = fundingTokens.filter(
      (token) => token.fundingStatus !== FundingStatus.NotEnabled,
    );
    const onlyMoneyAccountDelegated =
      delegatedTokens.length > 0 &&
      delegatedTokens.every((token) => token.isMoneyAccountEntry === true);

    // Prefer Money Activity when the user signed up after launch and only
    // spends from a Money Account — that feed already owns their card history.
    if (
      isCreatedOnOrAfterMoneyLaunch(data?.account?.createdAt) &&
      onlyMoneyAccountDelegated &&
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
    isMoneyAccountVisible,
  ]);
}
