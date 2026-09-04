import { useEffect } from 'react';
import Engine from '../../../../core/Engine/Engine';
import type { RewardsMoneyControllerEvents } from '../../../../core/Engine/controllers/rewards-money-controller/types';

/**
 * The RewardsMoneyController events a screen may subscribe to.
 *
 * Derived from the controller's own event union rather than a `${string}`
 * template, so a typo is a compile error and no suppression is needed.
 */
export type RewardsMoneyEventName = RewardsMoneyControllerEvents['type'];

type RewardsMoneyEventHandler = () => void;

/**
 * Minimal messenger surface this hook needs. Declared structurally so the
 * subscription is typed without casting `Engine.controllerMessenger`.
 */
interface RewardsMoneyEventMessenger {
  subscribe(
    event: RewardsMoneyEventName,
    handler: RewardsMoneyEventHandler,
  ): void;
  unsubscribe(
    event: RewardsMoneyEventName,
    handler: RewardsMoneyEventHandler,
  ): void;
}

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
  events: readonly RewardsMoneyEventName[],
  callback: RewardsMoneyEventHandler,
): void => {
  useEffect(() => {
    const messenger =
      Engine.controllerMessenger as unknown as RewardsMoneyEventMessenger;

    events.forEach((event) => messenger.subscribe(event, callback));

    return () => {
      events.forEach((event) => messenger.unsubscribe(event, callback));
    };
  }, [events, callback]);
};

export default useRewardsMoneyEvents;
