import { ControllerInitFunction } from '../types';
import {
  PPOMController,
  type PPOMControllerMessenger,
} from '@metamask/ppom-validator';
import { PPOMControllerInitMessenger } from '../messengers/ppom-controller-messenger';
import { getGlobalChainId } from '../../../util/networks/global-network';
import { PPOM, ppomInit } from '../../../lib/ppom/PPOMView';
import RNFSStorageBackend from '../../../lib/ppom/ppom-storage-backend';
import { assert } from '@metamask/utils';
import Crypto from 'react-native-quick-crypto';

/**
 * Initialize the PPOM controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const ppomControllerInit: ControllerInitFunction<
  PPOMController,
  PPOMControllerMessenger,
  PPOMControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState, getController }) => {
  const networkController = getController('NetworkController');
  const preferencesState = initMessenger.call('PreferencesController:getState');
  const provider = initMessenger.call(
    'NetworkController:getSelectedNetworkClient',
  )?.provider;

  assert(provider, 'Provider is required to initialize `PPOMController`.');

  const controller = new PPOMController({
    messenger: controllerMessenger,

    // @ts-expect-error: `PPOMController` does not accept partial state.
    state: persistedState.PPOMController,

    chainId: getGlobalChainId(networkController),
    blockaidPublicKey: process.env.BLOCKAID_PUBLIC_KEY as string,
    cdnBaseUrl: process.env.BLOCKAID_FILE_CDN as string,

    onPreferencesChange: (listener) =>
      initMessenger.subscribe('PreferencesController:stateChange', listener),

    provider,

    ppomProvider: {
      // @ts-expect-error: Type of `PPOM` does not match.
      PPOM,
      ppomInit,
    },

    storageBackend: new RNFSStorageBackend('PPOMDB'),
    securityAlertsEnabled: preferencesState.securityAlertsEnabled ?? false,

    // @ts-expect-error: Type of `Crypto` does not match.
    nativeCrypto: Crypto,
  });

  return {
    controller,
  };
};
