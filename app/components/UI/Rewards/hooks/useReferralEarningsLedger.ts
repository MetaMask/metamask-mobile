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
 * The earnings the referral page lists: what other people's trades paid the
 * profile as their referrer.
 */
export const REFERRAL_LEDGER_ORIGIN_TYPES: EarningOriginType[] = [
  'REFERRAL_REV_SHARE',
];

export type UseReferralEarningsLedgerResult =
  UseCursorPaginatedListResult<LedgerEarningEntryDto>;

const fetchPage = createEarningsLedgerFetchPage(REFERRAL_LEDGER_ORIGIN_TYPES);

/**
 * Referral earnings, newest first. Claim rows stay out: this page lists what
 * was earned, and the full history screen lists payouts.
 */
export const useReferralEarningsLedger = (
  profileId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): UseReferralEarningsLedgerResult =>
  useCursorPaginatedList<LedgerEarningEntryDto>({
    enabled: Boolean(profileId) && enabled,
    resetKey: `${profileId ?? ''}:referral-earnings`,
    fetchPage,
    errorMessage: 'Failed to fetch referral earnings',
    feature: 'rewards-money',
    laterPageRetryLimit: 1,
  });
