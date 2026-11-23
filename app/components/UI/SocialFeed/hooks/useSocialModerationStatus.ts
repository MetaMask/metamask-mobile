import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { useLogSocialQueryError } from '../../../../util/social/socialServiceTelemetry';
import {
  fetchModerationStatus,
  MODERATION_STATUS_QUERY_KEY,
} from '../moderationApi';

export interface SocialModerationStatusState {
  /** Whether the moderation team banned the viewer. */
  isBanned: boolean;
  /** The reason they gave the viewer, if any. */
  reason: string | null;
}

/** A ban is rare and refetched when a write is refused, so no polling. */
const STALE_TIME_MS = 5 * 60 * 1000;

const NOT_BANNED: SocialModerationStatusState = {
  isBanned: false,
  reason: null,
};

/**
 * Whether the viewer's social account is disabled by the moderation team.
 *
 * Not banned while the wallet is locked, while loading, and on a failed
 * fetch: the social API still refuses a banned viewer's writes, so failing
 * open only delays the explanation.
 */
export const useSocialModerationStatus = (): SocialModerationStatusState => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const { data, error } = useQuery({
    queryKey: MODERATION_STATUS_QUERY_KEY,
    queryFn: fetchModerationStatus,
    enabled: isUnlocked,
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useLogSocialQueryError(error, {
    surface: 'moderation',
    operation: 'fetch_moderation_status',
    extraMessage: 'Moderation status fetch failed',
    source: 'useSocialModerationStatus',
    endpoint: 'moderation_status',
  });

  if (!data?.banned) {
    return NOT_BANNED;
  }
  return { isBanned: true, reason: data.reason?.trim() || null };
};
