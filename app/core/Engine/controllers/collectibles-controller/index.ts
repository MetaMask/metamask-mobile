import { createPackPartnerApi } from '../../../../components/UI/Collectibles/services/clients/PackPartnerApiClient';
import {
  CollectiblesController,
  getDefaultCollectiblesControllerState,
  type CollectiblesControllerMessenger,
} from '../../../../components/UI/Collectibles/controllers/CollectiblesController';
import type { MessengerClientInitFunction } from '../../types';

/**
 * Initializes the CollectiblesController. No network call happens at init:
 * interrupted operations resume when the wallet unlocks.
 *
 * The workflow gets its own uncached client: generated payments expire,
 * buyback amounts must be checked fresh before signing, and lost submission
 * responses require observation by memo rather than a new purchase or sale.
 * Provider owns same-memo opening polls and reconciliation; DataService read
 * retry/cache policy must not replay these operations or mask their progress.
 * Both paths use the same client response validation. See the Collectibles
 * services/data README for the operation-specific policy boundary.
 *
 * @param request - The init request.
 * @returns The controller.
 */
export const collectiblesControllerInit: MessengerClientInitFunction<
  CollectiblesController,
  CollectiblesControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new CollectiblesController({
    messenger: controllerMessenger,
    packPartner: { api: createPackPartnerApi() },
    state:
      persistedState.CollectiblesController ??
      getDefaultCollectiblesControllerState(),
  });
  return { controller };
};
