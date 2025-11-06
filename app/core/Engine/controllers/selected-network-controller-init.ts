import { ControllerInitFunction } from '../types';
import { SelectedNetworkController } from '@metamask/selected-network-controller';
import { SelectedNetworkControllerMessenger } from '../messengers/selected-network-controller-messenger';
import DomainProxyMap from '../../../lib/DomainProxyMap/DomainProxyMap';

/**
 * Initialize the selected network controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @returns The initialized controller.
 */
export const selectedNetworkControllerInit: ControllerInitFunction<
  SelectedNetworkController,
  SelectedNetworkControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new SelectedNetworkController({
    messenger: controllerMessenger,

    // @ts-expect-error: `SelectedNetworkController` does not accept partial
    // state.
    state: persistedState.SelectedNetworkController || {
      domains: {},
      activeDappNetwork: null,
    },

    domainProxyMap: new DomainProxyMap(),
  });

  return {
    controller,
  };
};
