import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { selectIsUnlocked } from '../../../../../selectors/keyringController';
import {
  reportSocialServiceFailure,
  useLogSocialQueryError,
} from '../../../../../util/social/socialServiceTelemetry';
import {
  BLOCKED_PROFILE_IDS_QUERY_KEY,
  fetchBlockedProfileIds,
} from '../../../../../components/UI/SocialFeed/moderationApi';
import { blockTrader, unblockTrader } from '../traderBlockApi';

const TRADER_BLOCK_SOURCE = 'useTraderBlock';

export interface UseTraderBlockResult {
  isBlocked: boolean;
  /** Resolves `true` when the block was recorded. */
  block: () => Promise<boolean>;
  /** Resolves `true` when the block was removed. */
  unblock: () => Promise<boolean>;
}

/**
 * Block state for one trader, keyed by Clicker `profileId` (UUID).
 *
 * The initial state is read from the viewer's fully paginated blocked-profile
 * list. Writes flip an optimistic override that rolls back on failure and is
 * dropped once the refetched list agrees with it.
 *
 * @param profileId - Trader profile id; `undefined` until the profile loads.
 * @returns Block state and block/unblock actions.
 */
export const useTraderBlock = (
  profileId: string | undefined,
): UseTraderBlockResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const { data, error, refetch } = useQuery<string[]>({
    queryKey: BLOCKED_PROFILE_IDS_QUERY_KEY,
    queryFn: fetchBlockedProfileIds,
    enabled: Boolean(profileId) && isUnlocked,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useLogSocialQueryError(error, {
    surface: 'trader_profile',
    operation: 'fetch_blocked_profiles',
    extraMessage: 'Blocked profiles fetch failed',
    source: TRADER_BLOCK_SOURCE,
    endpoint: 'blocked_profiles',
  });

  const isBlockedOnServer = Boolean(profileId && data?.includes(profileId));
  const [override, setOverride] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (override !== undefined && override === isBlockedOnServer) {
      setOverride(undefined);
    }
  }, [override, isBlockedOnServer]);

  const write = useCallback(
    async (nextBlocked: boolean): Promise<boolean> => {
      if (!profileId) {
        return false;
      }
      setOverride(nextBlocked);
      try {
        await (nextBlocked ? blockTrader(profileId) : unblockTrader(profileId));
      } catch (err) {
        setOverride(undefined);
        reportSocialServiceFailure(
          err,
          {
            surface: 'trader_profile',
            operation: nextBlocked ? 'block_trader' : 'unblock_trader',
            extraMessage: nextBlocked
              ? 'Block trader failed'
              : 'Unblock trader failed',
            source: TRADER_BLOCK_SOURCE,
            endpoint: nextBlocked ? 'block' : 'unblock',
          },
          { breadcrumb: false },
        );
        return false;
      }
      refetch().catch(() => undefined);
      return true;
    },
    [profileId, refetch],
  );

  const block = useCallback(() => write(true), [write]);
  const unblock = useCallback(() => write(false), [write]);

  return {
    isBlocked: override ?? isBlockedOnServer,
    block,
    unblock,
  };
};

export default useTraderBlock;
