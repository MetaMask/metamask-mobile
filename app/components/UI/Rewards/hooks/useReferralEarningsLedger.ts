import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import type {
  EarningOriginType,
  EarningsLedgerPageDto,
  LedgerEarningEntryDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  useCursorPaginatedList,
  type UseCursorPaginatedListResult,
} from './useCursorPaginatedList';

/**
 * The earnings the referral page lists: what other people's trades paid the
 * profile as their referrer.
 */
export const REFERRAL_LEDGER_ORIGIN_TYPES: EarningOriginType[] = [
  'REFERRAL_REV_SHARE',
];

export type UseReferralEarningsLedgerResult =
  UseCursorPaginatedListResult<LedgerEarningEntryDto>;

function earningEntriesFromPage(
  page: EarningsLedgerPageDto,
): LedgerEarningEntryDto[] {
  return page.results.filter(
    (entry): entry is LedgerEarningEntryDto => entry.type === 'earning',
  );
}

/**
 * Referral earnings, newest first. Claim rows stay out: this page lists what
 * was earned, and the full history screen lists payouts.
 */
export const useReferralEarningsLedger = (
  profileId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): UseReferralEarningsLedgerResult => {
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
          originTypes: REFERRAL_LEDGER_ORIGIN_TYPES,
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

  return useCursorPaginatedList<LedgerEarningEntryDto>({
    enabled: Boolean(profileId) && enabled,
    resetKey: `${profileId ?? ''}:referral-earnings`,
    fetchPage,
    errorMessage: 'Failed to fetch referral earnings',
    feature: 'rewards-money',
    laterPageRetryLimit: 1,
  });
};
