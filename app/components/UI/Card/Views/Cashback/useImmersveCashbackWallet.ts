import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { selectRewardsMoneyControllerEnabled } from '../../../../../selectors/featureFlagController/rewardsMoneyController';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import { meetsClaimMinimum } from '../../../Rewards/utils/claimEarnings';
import { strings } from '../../../../../../locales/i18n';
import type { RedeemableWalletState } from '../../hooks/useRedeemableWallet';
import type { RedeemWithdrawEstimationResponse } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import type { CardSummaryResponse } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { useCardCashbackClaim } from './useCardCashbackClaim';
import {
  cardCashbackBreakdown,
  cardCashbackClaimFailure,
  cardCashbackCopy,
  musdFromBaseUnits,
} from './cardCashbackCopy';

export const CARD_CASHBACK_SUMMARY_QUERY_KEY = [
  'card',
  'cashback',
  'rewards-summary',
] as const;

/** A card claim deposits into the Money vault on Monad, gas sponsored. */
const SPONSORED_ESTIMATION: RedeemWithdrawEstimationResponse = {
  wei: '0',
  eth: '0',
  price: '0',
  network: 'monad',
};
const fetchSponsoredEstimation = async () =>
  Promise.resolve(SPONSORED_ESTIMATION);

type ClaimOutcome =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'failed'; category: string };

/**
 * mUSD back for an Immersve card: the same screen as Baanx, fed by Rewards
 * Money's card summary and claimed through the Rewards claim route.
 */
const useImmersveCashbackWallet = (): RedeemableWalletState => {
  const queryClient = useQueryClient();
  const enabled = useSelector(selectRewardsMoneyControllerEnabled);
  const moneyAccount = useSelector(selectPrimaryMoneyAccount);

  const summaryQuery = useQuery({
    queryKey: CARD_CASHBACK_SUMMARY_QUERY_KEY,
    queryFn: async () => Engine.context.RewardsMoneyController.getCardSummary(),
    enabled,
  });
  const { refetch } = summaryQuery;

  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        refetch().catch(() => undefined);
      }
    }, [enabled, refetch]),
  );

  const refreshSummary = useCallback(async () => {
    const result = await refetch();
    if (result.error) throw result.error;
  }, [refetch]);

  const { claim, isClaiming, canClaim, mpcAccount } =
    useCardCashbackClaim(refreshSummary);
  const [outcome, setOutcome] = useState<ClaimOutcome>({ status: 'idle' });

  const summary = summaryQuery.data;
  const copy = summary ? cardCashbackCopy(summary, { mpcAccount }) : undefined;
  const isWithdrawable =
    !!summary &&
    !!copy &&
    !copy.blocksClaim &&
    canClaim &&
    meetsClaimMinimum(summary.claimable, summary.minimum_musd_base_units);

  const wallet = useMemo(
    () =>
      summary
        ? {
            id: 'card-cashback',
            balance: musdFromBaseUnits(summary.claimable),
            currency: 'musd',
            isWithdrawable,
            type: 'cashback',
          }
        : null,
    [summary, isWithdrawable],
  );

  const withdraw = useCallback(() => {
    setOutcome({ status: 'idle' });
    claim()
      .then((result) => {
        if (result.status === 'failed') {
          setOutcome({ status: 'failed', category: result.category });
          return;
        }
        if (result.status === 'skipped') return;
        if (result.status === 'submitted_stale') {
          // Paid, but the reload failed, so the cache still shows the claimed
          // amount as claimable. Zero it until a load succeeds, so the screen
          // never offers the same mUSD back twice.
          queryClient.setQueryData<CardSummaryResponse>(
            CARD_CASHBACK_SUMMARY_QUERY_KEY,
            (cached) => cached && { ...cached, claimable: '0' },
          );
        }
        setOutcome({ status: 'success' });
      })
      .catch(() => setOutcome({ status: 'failed', category: 'retry' }));
  }, [claim, queryClient]);

  const failureLabel =
    outcome.status === 'failed'
      ? cardCashbackClaimFailure(outcome.category)
      : undefined;

  // The failure toast is visual; say it to screen readers too.
  useEffect(() => {
    if (failureLabel) {
      AccessibilityInfo.announceForAccessibility(failureLabel);
    }
  }, [failureLabel]);

  const monitoringError = useMemo(
    () => (outcome.status === 'failed' ? new Error(outcome.category) : null),
    [outcome],
  );

  const resetWithdraw = useCallback(() => setOutcome({ status: 'idle' }), []);

  const destination = useMemo(
    () => ({
      caipChainId: 'eip155:143' as CaipChainId,
      symbol: 'mUSD',
      isResolved: true,
      isMoneyAccountDestination: true,
      hasApprovedDestination: true,
      delegationToken: null,
      receivingAddress: moneyAccount?.address,
    }),
    [moneyAccount?.address],
  );

  let notice = copy?.notice;
  if (!enabled) {
    notice = {
      severity: 'info',
      description: strings('card.card_home.cashback_screen.unavailable'),
    };
  }

  return {
    wallet,
    isLoading: summaryQuery.isLoading,
    error: summaryQuery.error,
    estimation: SPONSORED_ESTIMATION,
    isEstimating: false,
    estimationError: null,
    fetchEstimation: fetchSponsoredEstimation,
    withdraw,
    isWithdrawing: isClaiming,
    withdrawError: null,
    monitoringStatus: outcome.status === 'idle' ? 'idle' : outcome.status,
    monitoringError,
    resetWithdraw,
    breakdown: summary ? cardCashbackBreakdown(summary) : undefined,
    notice,
    labels: {
      action: strings('card.card_home.cashback_screen.claim'),
      actionUnavailable:
        copy?.actionUnavailable ??
        strings('card.card_home.cashback_screen.action_unavailable'),
      success: strings('card.card_home.cashback_screen.claim_success'),
      failure: failureLabel,
    },
    destination,
  };
};

export default useImmersveCashbackWallet;
