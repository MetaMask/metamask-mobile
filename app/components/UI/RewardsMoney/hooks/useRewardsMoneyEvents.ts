import { useEffect } from 'react';
import Engine from '../../../../core/Engine/Engine';

type RewardsMoneyEvent = `RewardsMoneyController:${string}`;

/**
 * Subscribe to RewardsMoneyController events for the life of a screen.
 *
 * The Rewards tree's `useInvalidateByRewardEvents` is typed to
 * `RewardsController:*` only, so this is its RewardsMoney sibling rather than a
 * widening of a shared hook that other features depend on.
 *
 * @param events - Event names to subscribe to. Must be referentially stable.
 * @param callback - Runs on any of them. Must be referentially stable.
 */
export const useRewardsMoneyEvents = (
  events: readonly RewardsMoneyEvent[],
  callback: () => void,
): void => {
  useEffect(() => {
    events.forEach((event) => {
      // @ts-expect-error - The event type is not assignable to the expected type
      Engine.controllerMessenger.subscribe(event, callback);
    });

    return () => {
      events.forEach((event) => {
        // @ts-expect-error - The event type is not assignable to the expected type
        Engine.controllerMessenger.unsubscribe(event, callback);
      });
    };
  }, [events, callback]);
};

export default useRewardsMoneyEvents;
