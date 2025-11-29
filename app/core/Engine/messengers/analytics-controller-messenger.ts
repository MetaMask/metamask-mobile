import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { AnalyticsControllerMessenger } from '@metamask/analytics-controller';
import { RootMessenger } from '../types';

const name = 'AnalyticsController';

export function getAnalyticsControllerMessenger(
  rootMessenger: RootMessenger,
): AnalyticsControllerMessenger {
  const messenger = new Messenger<
    typeof name,
    MessengerActions<AnalyticsControllerMessenger>,
    MessengerEvents<AnalyticsControllerMessenger>,
    RootMessenger
  >({
    namespace: name,
    // @ts-expect-error - AnalyticsControllerMessenger type doesn't include parent parameter,
    // causing TypeScript to infer undefined. Parent is correctly passed at runtime.
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: [],
    messenger,
  });
  return messenger as AnalyticsControllerMessenger;
}
