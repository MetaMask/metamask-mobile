import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCashbackLedger } from '../../../../reducers/rewardsMoney';
import { selectCashbackLedger } from '../../../../reducers/rewardsMoney/selectors';
import type { RootState } from '../../../../reducers';
import type {
  EarningOriginType,
  LedgerEarningEntryDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { createEarningsLedgerFetchPage } from './createEarningsLedgerFetchPage';
import {
  useCursorPaginatedList,
  type UseCursorPaginatedListResult,
} from './useCursorPaginatedList';

/**
 * Cashback the rebates list asks for.
 *
 * Predict is the same rebate as swaps and perps. The ledger returns
 * `PREDICT_FEE_CASHBACK` only when a request names it, and a named list
 * replaces the default scope, so this list names all three.
 */
export const CASHBACK_LEDGER_ORIGIN_TYPES: EarningOriginType[] = [
  'SWAPS_FEE_CASHBACK',
  'PERPS_FEE_CASHBACK',
  'PREDICT_FEE_CASHBACK',
];

export type UseCashbackLedgerResult =
  UseCursorPaginatedListResult<LedgerEarningEntryDto>;

const fetchPage = createEarningsLedgerFetchPage(CASHBACK_LEDGER_ORIGIN_TYPES);

export const useCashbackLedger = (
  profileId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): UseCashbackLedgerResult => {
  const dispatch = useDispatch();
  const cachedItems = useSelector((state: RootState) =>
    selectCashbackLedger(state, profileId),
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
    feature: 'rewards-money',
    laterPageRetryLimit: 1,
  });
};
