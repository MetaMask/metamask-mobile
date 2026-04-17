import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { selectFollowingProfileIds } from '../../selectors/socialController';

export interface UseFollowToggleManyResult {
  isFollowing: (addressOrId: string) => boolean;
  toggleFollow: (addressOrId: string) => Promise<void>;
}

/**
 * Shared primitive that optimistically toggles follow/unfollow state for one
 * or more traders against `SocialController`, using the current session's
 * `profileId` from `AuthenticationController`.
 *
 * Local optimistic overrides are kept per trader id and cleared automatically
 * once Redux catches up with the intended value, or when the underlying
 * messenger call fails.
 */
export const useFollowToggleMany = (): UseFollowToggleManyResult => {
  const followingProfileIds = useSelector(selectFollowingProfileIds);

  const [optimisticFollowState, setOptimisticFollowState] = useState<
    Record<string, boolean>
  >({});
  const inflightIdsRef = useRef<Set<string>>(new Set());

  const isFollowing = useCallback(
    (addressOrId: string): boolean =>
      optimisticFollowState[addressOrId] ??
      followingProfileIds.includes(addressOrId),
    [optimisticFollowState, followingProfileIds],
  );

  const toggleFollow = useCallback(
    async (addressOrId: string): Promise<void> => {
      if (inflightIdsRef.current.has(addressOrId)) {
        return;
      }
      inflightIdsRef.current.add(addressOrId);

      const currentlyFollowing =
        optimisticFollowState[addressOrId] ??
        followingProfileIds.includes(addressOrId);
      const nextValue = !currentlyFollowing;

      setOptimisticFollowState((prev) => ({
        ...prev,
        [addressOrId]: nextValue,
      }));

      try {
        const { profileId } =
          await Engine.context.AuthenticationController.getSessionProfile();
        const opts = { addressOrUid: profileId, targets: [addressOrId] };
        await (Engine.controllerMessenger.call as CallableFunction)(
          nextValue
            ? 'SocialController:followTrader'
            : 'SocialController:unfollowTrader',
          opts,
        );
      } catch (err) {
        setOptimisticFollowState((prev) => {
          const next = { ...prev };
          delete next[addressOrId];
          return next;
        });
        Logger.error(err as Error, 'useFollowToggle: toggleFollow failed');
      } finally {
        inflightIdsRef.current.delete(addressOrId);
      }
    },
    [optimisticFollowState, followingProfileIds],
  );

  useEffect(() => {
    setOptimisticFollowState((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const [id, value] of Object.entries(prev)) {
        if (followingProfileIds.includes(id) === value) {
          changed = true;
          continue;
        }
        next[id] = value;
      }
      return changed ? next : prev;
    });
  }, [followingProfileIds]);

  return { isFollowing, toggleFollow };
};

export interface UseFollowToggleResult {
  isFollowing: boolean;
  toggleFollow: () => Promise<void>;
}

/**
 * Single-trader convenience wrapper around {@link useFollowToggleMany}.
 */
export const useFollowToggle = (addressOrId: string): UseFollowToggleResult => {
  const { isFollowing, toggleFollow } = useFollowToggleMany();
  const toggle = useCallback(
    () => toggleFollow(addressOrId),
    [toggleFollow, addressOrId],
  );
  return {
    isFollowing: isFollowing(addressOrId),
    toggleFollow: toggle,
  };
};

export default useFollowToggle;
