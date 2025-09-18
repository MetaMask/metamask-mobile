import { useEffect, useRef } from 'react';
import Engine from '../../../../core/Engine/Engine';

// Define a generic type for reward events to ensure type safety
type RewardEvent = `RewardsController:${string}`;

/**
 * A generic hook to manage subscriptions to reward-related events.
 * This hook simplifies event handling by abstracting the subscription and unsubscription logic.
 *
 * @param events - An array of reward controller event names to subscribe to.
 * @param callback - The function to execute when any of the specified events are triggered.
 */
export const useInvalidateByRewardEvents = (
  events: RewardEvent[],
  callback: () => void,
): void => {
  // Use refs to maintain stable references to events and callback
  const eventsRef = useRef(events);
  const callbackRef = useRef(callback);

  // Update refs when props change
  useEffect(() => {
    eventsRef.current = events;
    callbackRef.current = callback;
  });

  useEffect(() => {
    const currentEvents = eventsRef.current;
    const currentCallback = callbackRef.current;

    // Subscribe to each event in the provided array
    currentEvents.forEach((event) => {
      // @ts-expect-error - The event type is not assignable to the expected type
      Engine.controllerMessenger.subscribe(event, currentCallback);
    });

    // Return a cleanup function to unsubscribe from all events when the component unmounts
    return () => {
      currentEvents.forEach((event) => {
        // @ts-expect-error - The event type is not assignable to the expected type
        Engine.controllerMessenger.unsubscribe(event, currentCallback);
      });
    };
  }, []); // Empty dependency array means this effect runs only once
};
