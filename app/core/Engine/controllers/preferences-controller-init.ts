import { ControllerInitFunction } from '../types';
import { PreferencesController } from '@metamask/preferences-controller';
import AppConstants from '../../AppConstants';
import { PreferencesControllerMessenger } from '../messengers/preferences-controller-messenger';

/**
 * Initialize the preferences controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const preferencesControllerInit: ControllerInitFunction<
  PreferencesController,
  PreferencesControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new PreferencesController({
    messenger: controllerMessenger,
    state: {
      ipfsGateway: AppConstants.IPFS_DEFAULT_GATEWAY_URL,
      useTokenDetection:
        persistedState?.PreferencesController?.useTokenDetection ?? true,
      useNftDetection: true,
      displayNftMedia: true,
      securityAlertsEnabled: true,
      smartTransactionsOptInStatus: true,
      tokenSortConfig: {
        key: 'tokenFiatAmount',
        order: 'dsc',
        sortCallback: 'stringNumeric',
      },
      ...persistedState.PreferencesController,
    },
  });

  return {
    controller,
  };
};
