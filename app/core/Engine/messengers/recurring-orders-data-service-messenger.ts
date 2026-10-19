import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { RecurringOrdersDataServiceMessenger } from '../../../components/UI/Bridge/services/RecurringOrdersDataService';
import type { RootMessenger } from '../types';

export function getRecurringOrdersDataServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<RecurringOrdersDataServiceMessenger>,
    MessengerEvents<RecurringOrdersDataServiceMessenger>
  >,
): RecurringOrdersDataServiceMessenger {
  return new Messenger({
    namespace: 'RecurringOrdersDataService',
    parent: rootMessenger,
  });
}
