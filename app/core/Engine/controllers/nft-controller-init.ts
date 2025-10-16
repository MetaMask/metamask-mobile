import { ControllerInitFunction } from '../types';
import { NftController } from '@metamask/assets-controllers';
import { NftControllerMessenger } from '../messengers/nft-controller-messenger';

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
  });

  return {
    controller,
  };
};
