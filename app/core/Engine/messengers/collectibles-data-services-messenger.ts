import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { RootMessenger } from '../types';
import type { PackPartnerDataServiceMessenger } from '../../../components/UI/Collectibles/services/data/PackPartnerDataService';
import type { DataServiceInvalidateQueriesAction } from '@metamask/base-data-service';
export const getPackPartnerDataServiceMessenger = (
  root: RootMessenger<
    MessengerActions<PackPartnerDataServiceMessenger>,
    MessengerEvents<PackPartnerDataServiceMessenger>
  >,
): PackPartnerDataServiceMessenger => {
  const messenger: PackPartnerDataServiceMessenger = new Messenger({
    namespace: 'PackPartnerDataService',
    parent: root,
  });
  root.delegate({
    actions: [
      'StorageService:getItem',
      'StorageService:setItem',
      'StorageService:clear',
    ],
    events: [],
    messenger,
  });
  return messenger;
};
