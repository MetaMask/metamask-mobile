import { ControllerInitFunction, EngineState } from '../types';
import {
  AccountTrackerController,
  AccountTrackerControllerMessenger,
} from '@metamask/assets-controllers';
import { selectAssetsAccountApiBalancesEnabled } from '../../../selectors/featureFlagController/assetsAccountApiBalances';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectCompletedOnboarding } from '../../../selectors/onboarding';

/**
 * Initialize the accountTracker controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const accountTrackerControllerInit: ControllerInitFunction<
  AccountTrackerController,
  AccountTrackerControllerMessenger
> = ({ controllerMessenger, persistedState, getController, getState }) => {
  const assetsContractController = getController('AssetsContractController');

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
      selectAssetsAccountApiBalancesEnabled({
        engine: { backgroundState: persistedState as EngineState },
      }) as `0x${string}`[],
    allowExternalServices: () => selectBasicFunctionalityEnabled(getState()),
    isOnboarded: () => selectCompletedOnboarding(getState()) ?? false,
  });

  return {
    controller,
  };
};
