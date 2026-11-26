import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { setEarningsHistory } from '../../../../reducers/rewardsMoney';
import { selectEarningsHistory } from '../../../../reducers/rewardsMoney/selectors';
import type { RootState } from '../../../../reducers';
import type {
  EarningOriginType,
  EarningsLedgerPageDto,
  LedgerEntryDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  useCursorPaginatedList,
  type UseCursorPaginatedListResult,
} from './useCursorPaginatedList';

export type UseEarningsHistoryResult =
  UseCursorPaginatedListResult<LedgerEntryDto>;

/**
 * Every origin this feed asks for.
 *
 * A ledger request that names no origin type leaves `PREDICT_FEE_CASHBACK`
 * out, and one that names a subset returns only that subset. Naming the full
 * set is what puts Predict rows in this feed without dropping the others.
 */
export const EARNINGS_HISTORY_ORIGIN_TYPES: EarningOriginType[] = [
  'SWAPS_FEE_CASHBACK',
  'PERPS_FEE_CASHBACK',
  'PREDICT_FEE_CASHBACK',
  'REFERRAL_REV_SHARE',
  'SOCIAL_FOLLOW_TRADE',
];

/**
 * Unified earnings history: accruals and settled claims in one feed.
 *
 * `includeClaims` defaults to true on the controller, and this hook passes it
 * explicitly so a cashback consumer's `false` cannot be copied here by
 * accident. Claim rows stay in the page — unlike `useCashbackLedger`, which
 * drops them.
 */
export const useEarningsHistory = (
  profileId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): UseEarningsHistoryResult => {
  const dispatch = useDispatch();
  const cachedItems = useSelector((state: RootState) =>
    selectEarningsHistory(state, profileId),
  );

  const fetchPage = useCallback(
    async ({
      cursor,
      isFirstPage,
      forceFresh,
    }: {
      cursor: string | null;
      isFirstPage: boolean;
      forceFresh: boolean;
    }) => {
      const page: EarningsLedgerPageDto = await Engine.controllerMessenger.call(
        'RewardsMoneyController:getEarningsLedger',
        {
          originTypes: EARNINGS_HISTORY_ORIGIN_TYPES,
          cursor: isFirstPage ? undefined : cursor,
          includeClaims: true,
          forceFresh: isFirstPage ? forceFresh : undefined,
        },
      );
      return {
        results: page.results,
        cursor: page.cursor,
        has_more: page.has_more,
      };
    },
    [],
  );

  const onFirstPage = useCallback(
    (items: LedgerEntryDto[]) => {
      if (!profileId) {
        return;
      }
      dispatch(setEarningsHistory({ profileId, items }));
    },
    [dispatch, profileId],
  );

  return useCursorPaginatedList<LedgerEntryDto>({
    enabled: Boolean(profileId) && enabled,
    resetKey: `${profileId ?? ''}:earnings-history`,
    cachedItems,
    fetchPage,
    onFirstPage,
    errorMessage: 'Failed to fetch earnings history',
    feature: 'rewards-money',
    laterPageRetryLimit: 1,
  });
};
