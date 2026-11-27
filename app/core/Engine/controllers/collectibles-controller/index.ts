import { createPackPartnerApi } from '../../../../components/UI/Collectibles/services/clients/PackPartnerApiClient';
import {
  CollectiblesController,
  getDefaultCollectiblesControllerState,
  type CollectiblesControllerMessenger,
} from '../../../../components/UI/Collectibles/controllers/CollectiblesController';
import type { MessengerClientInitFunction } from '../../types';

/** Initializes the Collectibles controller in Engine. */
export const collectiblesControllerInit: MessengerClientInitFunction<
  CollectiblesController,
  CollectiblesControllerMessenger
> = ({ controllerMessenger, persistedState }) => ({
  controller: new CollectiblesController({
    messenger: controllerMessenger,
    packPartner: { api: createPackPartnerApi() },
    state:
      persistedState.CollectiblesController ??
      getDefaultCollectiblesControllerState(),
  }),
});
