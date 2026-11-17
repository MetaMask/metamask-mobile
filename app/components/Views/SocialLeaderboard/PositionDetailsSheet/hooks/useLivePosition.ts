import { useEffect, useMemo, useRef, useState } from 'react';
import type { Position } from '@metamask/social-controllers';
import Engine from '../../../../../core/Engine';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import {
  acquireSocialRealtime,
  type SocialRealtimeLeaseStatus,
} from '../../../../UI/SocialFeed/data/socialRealtimeLease';
import { useTraderPosition } from '../../TraderPositionView/hooks/useTraderPosition';

export interface UseLivePositionParams {
  positionId: string;
  /** The tapped card's position, rendered until something newer arrives. */
  snapshot?: Position;
  /** True when the snapshot came from a feed that was streaming revisions. */
  isSnapshotLive?: boolean;
}

export interface UseLivePositionResult {
  position: Position | undefined;
  /** True once the position came from the API or the socket, not the snapshot. */
  isRefreshed: boolean;
  /** True while the first fetch runs with nothing to show. */
  isLoading: boolean;
}

interface LiveRevision {
  revision: number;
  position: Position;
}

const noop = () => undefined;

/**
 * Keeps the sheet's position current while it is open. Leases the `all`
 * socket channel, which carries every position's revisions, and applies the
 * newest one for this position. Fetches it by id when there is no snapshot,
 * when the snapshot came from a feed without live updates, when the socket
 * cannot go live, and after a reconnect.
 *
 * A socket revision wins over the API response, which wins over the snapshot.
 */
export const useLivePosition = ({
  positionId,
  snapshot,
  isSnapshotLive = false,
}: UseLivePositionParams): UseLivePositionResult => {
  // `null` is unknown, so only a confirmed `NONE` skips the socket.
  const isOffline = useNetworkTier() === 'NONE';
  const [leaseStatus, setLeaseStatus] =
    useState<SocialRealtimeLeaseStatus | null>(null);
  const [liveRevision, setLiveRevision] = useState<LiveRevision | null>(null);
  const [didCatchUp, setDidCatchUp] = useState(false);
  const lastRevisionRef = useRef(-Infinity);

  const shouldFetch =
    !snapshot || !isSnapshotLive || isOffline || leaseStatus === 'unavailable';
  const fetched = useTraderPosition(positionId, { enabled: shouldFetch });
  // A disabled query still returns an earlier sheet's cached copy, which can
  // be older than a live snapshot.
  const fetchedPosition =
    shouldFetch || didCatchUp ? fetched.position : undefined;

  const refetchRef = useRef(fetched.refetch);
  refetchRef.current = fetched.refetch;

  useEffect(() => {
    if (isOffline) {
      return undefined;
    }
    const service = Engine.context.SocialRealtimeService;
    if (!service) {
      setLeaseStatus('unavailable');
      return undefined;
    }

    // The same revision can arrive on more than one leased channel.
    const removeListener = service.addListener((event) => {
      if (
        event.feedItemId !== positionId ||
        event.revision <= lastRevisionRef.current
      ) {
        return;
      }
      lastRevisionRef.current = event.revision;
      setLiveRevision({ revision: event.revision, position: event.data });
    });
    const removeReconnectListener = service.addReconnectListener(() => {
      // Revisions sent while disconnected are lost, so the API copy beats
      // anything older than the reconnect, but not what arrived during the
      // fetch: those are already ignored as duplicates if they come again.
      const revisionAtReconnect = lastRevisionRef.current;
      refetchRef
        .current()
        .then(() => {
          setDidCatchUp(true);
          setLiveRevision((current) =>
            current && current.revision > revisionAtReconnect ? current : null,
          );
        })
        .catch(noop);
    });
    const release = acquireSocialRealtime('all', setLeaseStatus);

    return () => {
      removeListener();
      removeReconnectListener();
      release();
    };
  }, [isOffline, positionId]);

  // The API copy carries no revision, so after a reconnect a late revision is
  // judged by its last fill: one older than the caught-up copy is stale.
  const livePosition =
    liveRevision &&
    !(
      fetchedPosition &&
      liveRevision.position.lastTradeAt < fetchedPosition.lastTradeAt
    )
      ? liveRevision.position
      : undefined;
  const basePosition = fetchedPosition ?? snapshot;
  // Merged like the feed merges revisions, so a field the event leaves out
  // keeps the known value.
  const position = useMemo(
    () =>
      livePosition && basePosition
        ? { ...basePosition, ...livePosition }
        : (livePosition ?? basePosition),
    [livePosition, basePosition],
  );

  return {
    position,
    isRefreshed: Boolean(livePosition ?? fetchedPosition),
    isLoading: !position && fetched.isLoading,
  };
};
