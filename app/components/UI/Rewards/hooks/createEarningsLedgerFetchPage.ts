import Engine from '../../../../core/Engine';
import type {
  EarningOriginType,
  EarningsLedgerPageDto,
  LedgerEarningEntryDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { UseCursorPaginatedListParams } from './useCursorPaginatedList';

function earningEntriesFromPage(
  page: EarningsLedgerPageDto,
): LedgerEarningEntryDto[] {
  return page.results.filter(
    (entry): entry is LedgerEarningEntryDto => entry.type === 'earning',
  );
}

/**
 * The `fetchPage` of a list of earnings for the given origin types, for
 * `useCursorPaginatedList`. Claim rows stay out of the request and of the
 * result. Only a first page carries `forceFresh`, and a later page is asked
 * for by its cursor. The origin types are fixed per list, so call this once
 * at module level and the function keeps its identity.
 */
export function createEarningsLedgerFetchPage(
  originTypes: EarningOriginType[],
): UseCursorPaginatedListParams<LedgerEarningEntryDto>['fetchPage'] {
  return async ({ cursor, isFirstPage, forceFresh }) => {
    const page: EarningsLedgerPageDto = await Engine.controllerMessenger.call(
      'RewardsMoneyController:getEarningsLedger',
      {
        originTypes,
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
  };
}
