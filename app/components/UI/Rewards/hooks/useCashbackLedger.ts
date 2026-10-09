import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { setCashbackLedger } from '../../../../reducers/rewardsMoney';
import { selectCashbackLedger } from '../../../../reducers/rewardsMoney/selectors';
import type { RootState } from '../../../../reducers';
import type {
  EarningOriginType,
  EarningsLedgerPageDto,
  LedgerEarningEntryDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  useCursorPaginatedList,
  type UseCursorPaginatedListResult,
} from './useCursorPaginatedList';

export const CASHBACK_LEDGER_ORIGIN_TYPES: EarningOriginType[] = [
  'SWAPS_FEE_CASHBACK',
  'PERPS_FEE_CASHBACK',
];

export type UseCashbackLedgerResult =
  UseCursorPaginatedListResult<LedgerEarningEntryDto>;

function earningEntriesFromPage(
  page: EarningsLedgerPageDto,
): LedgerEarningEntryDto[] {
  return page.results.filter(
    (entry): entry is LedgerEarningEntryDto => entry.type === 'earning',
  );
}

export const useCashbackLedger = (
  profileId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): UseCashbackLedgerResult => {
  const dispatch = useDispatch();
  const cachedItems = useSelector((state: RootState) =>
    selectCashbackLedger(state, profileId),
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
          originTypes: CASHBACK_LEDGER_ORIGIN_TYPES,
          cursor: isFirstPage ? undefined : cursor,
          includeClaims: false,
          forceFresh: isFirstPage ? forceFresh : undefined,
        },
      );
      return {
        results: earningEntriesFromPage(page),
        cursor: page.cursor,
        has_more: page.has_more,
      };
    },
    [],
  );

  const onFirstPage = useCallback(
    (items: LedgerEarningEntryDto[]) => {
      if (!profileId) {
        return;
      }
      dispatch(setCashbackLedger({ profileId, items }));
    },
    [dispatch, profileId],
  );

  return useCursorPaginatedList<LedgerEarningEntryDto>({
    enabled: Boolean(profileId) && enabled,
    resetKey: `${profileId ?? ''}:cashback`,
    cachedItems,
    fetchPage,
    onFirstPage,
    errorMessage: 'Failed to fetch cashback ledger',
  });
};
