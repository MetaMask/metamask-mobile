import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { SentinelFeeTokensDataServiceMessenger } from '../../../components/UI/Bridge/services/SentinelFeeTokensDataService';
import type { RootMessenger } from '../types';

/**
 * Creates the scoped messenger for SentinelFeeTokensDataService.
 *
 * @param rootMessenger - The Engine root messenger.
 * @returns The scoped data-service messenger.
 */
export function getSentinelFeeTokensDataServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<SentinelFeeTokensDataServiceMessenger>,
    MessengerEvents<SentinelFeeTokensDataServiceMessenger>
  >,
): SentinelFeeTokensDataServiceMessenger {
  return new Messenger({
    namespace: 'SentinelFeeTokensDataService',
    parent: rootMessenger,
  });
}
