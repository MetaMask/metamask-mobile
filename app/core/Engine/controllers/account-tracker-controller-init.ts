import { MessengerClientInitFunction } from '../types';
import {
  AccountTrackerController,
  AccountTrackerControllerMessenger,
} from '@metamask/assets-controllers';
import { selectAssetsAccountApiBalancesEnabled } from '../../../selectors/featureFlagController/assetsAccountApiBalances';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectHomepageSectionsV1Enabled } from '../../../selectors/featureFlagController/homepage';

/**
 * Initialize the accountTracker controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const accountTrackerControllerInit: MessengerClientInitFunction<
  AccountTrackerController,
  AccountTrackerControllerMessenger
> = ({ controllerMessenger, persistedState, getMessengerClient, getState }) => {
  const assetsContractController = getMessengerClient(
    'AssetsContractController',
  );

  const controller = new AccountTrackerController({
    messenger: controllerMessenger,
    state: persistedState.AccountTrackerController ?? {
      accountsByChainId: {},
    },
    includeStakedAssets: true,
    getStakedBalanceForChain:
      assetsContractController.getStakedBalanceForChain.bind(
        assetsContractController,
      ),
    accountsApiChainIds: () =>
      selectAssetsAccountApiBalancesEnabled(getState()) as `0x${string}`[],
    allowExternalServices: () => selectBasicFunctionalityEnabled(getState()),
    isHomepageSectionsV1Enabled: () =>
      selectHomepageSectionsV1Enabled(getState()),
  });

  return {
    controller,
  };
};
