import {
  ConnectivityController,
  type ConnectivityControllerMessenger,
} from '@metamask/connectivity-controller';

import { ControllerInitFunction } from '../../types';

import { NetInfoConnectivityAdapter } from './netinfo-connectivity-adapter';

/**
 * Initialize the ConnectivityController.
 *
 * This controller stores device connectivity status. For mobile,
 * we use NetInfoConnectivityAdapter which uses @react-native-community/netinfo
 * to detect network connectivity and internet reachability.
 *
 * @param request - The controller init request.
 * @param request.controllerMessenger - The messenger for the controller.
 * @returns The controller init result.
 */
export const connectivityControllerInit: ControllerInitFunction<
  ConnectivityController,
  ConnectivityControllerMessenger
> = ({ controllerMessenger }) => {
  // Use NetInfoConnectivityAdapter for mobile since we have direct access
  // to NetInfo in the same context
  const connectivityAdapter = new NetInfoConnectivityAdapter();

  const controller = new ConnectivityController({
    messenger: controllerMessenger,
    connectivityAdapter,
  });

  return {
    controller,
  };
};
