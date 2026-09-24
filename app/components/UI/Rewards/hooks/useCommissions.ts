import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { setCommissions } from '../../../../reducers/rewardsMoney';
import { selectCommissions } from '../../../../reducers/rewardsMoney/selectors';
import type { RootState } from '../../../../reducers';
import type {
  CommissionEntryView,
  CommissionsPageDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import {
  useCursorPaginatedList,
  type UseCursorPaginatedListResult,
} from './useCursorPaginatedList';

export const FOLLOW_TRADE_COMMISSIONS_ORIGIN = 'SOCIAL_FOLLOW_TRADE' as const;

export type UseCommissionsResult =
  UseCursorPaginatedListResult<CommissionEntryView>;

export const useCommissions = (
  profileId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): UseCommissionsResult => {
  const dispatch = useDispatch();
  const cachedItems = useSelector((state: RootState) =>
    selectCommissions(state, profileId),
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
      const page: CommissionsPageDto = await Engine.controllerMessenger.call(
        'RewardsMoneyController:getCommissions',
        {
          originType: FOLLOW_TRADE_COMMISSIONS_ORIGIN,
          cursor: isFirstPage ? undefined : cursor,
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
    (items: CommissionEntryView[]) => {
      if (!profileId) {
        return;
      }
      dispatch(setCommissions({ profileId, items }));
    },
    [dispatch, profileId],
  );

  return useCursorPaginatedList<CommissionEntryView>({
    enabled: Boolean(profileId) && enabled,
    resetKey: `${profileId ?? ''}:${FOLLOW_TRADE_COMMISSIONS_ORIGIN}`,
    cachedItems,
    fetchPage,
    onFirstPage,
    errorMessage: 'Failed to fetch commissions',
  });
};
