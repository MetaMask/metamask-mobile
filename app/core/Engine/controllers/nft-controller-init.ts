import { ControllerInitFunction } from '../types';
import {
  NftController,
  type NftControllerMessenger,
} from '@metamask/assets-controllers';

/**
 * Initialize the NFT controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const nftControllerInit: ControllerInitFunction<
  NftController,
  NftControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new NftController({
    messenger: controllerMessenger,
    state: persistedState.NftController,
    useIpfsSubdomains: false,
    displayNftMedia: persistedState.PreferencesController?.displayNftMedia,
    ipfsGateway: 'dweb.link',
  });

  return {
    controller,
  };
};
