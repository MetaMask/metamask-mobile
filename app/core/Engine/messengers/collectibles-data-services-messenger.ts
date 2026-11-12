import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { RootMessenger } from '../types';
import type { PackPartnerDataServiceMessenger } from '../../../components/UI/Collectibles/services/data/PackPartnerDataService';
import type { CollectiblesApiDataServiceMessenger } from '../../../components/UI/Collectibles/services/data/CollectiblesApiDataService';
import type { CollectiblesSocialApiDataServiceMessenger } from '../../../components/UI/Collectibles/services/data/CollectiblesSocialApiDataService';
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

export const getCollectiblesApiDataServiceMessenger = (
  root: RootMessenger<
    MessengerActions<CollectiblesApiDataServiceMessenger>,
    MessengerEvents<CollectiblesApiDataServiceMessenger>
  >,
): CollectiblesApiDataServiceMessenger =>
  new Messenger({ namespace: 'CollectiblesApiDataService', parent: root });

export const getCollectiblesSocialApiDataServiceMessenger = (
  root: RootMessenger<
    MessengerActions<CollectiblesSocialApiDataServiceMessenger>,
    MessengerEvents<CollectiblesSocialApiDataServiceMessenger>
  >,
): CollectiblesSocialApiDataServiceMessenger =>
  new Messenger({
    namespace: 'CollectiblesSocialApiDataService',
    parent: root,
  });
