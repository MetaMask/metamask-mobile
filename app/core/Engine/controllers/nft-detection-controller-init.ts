import { MessengerClientInitFunction } from '../types';
import {
  NftDetectionController,
  type NftDetectionControllerMessenger,
} from '@metamask/assets-controllers';

/**
 * Initialize the NFT detection controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const nftDetectionControllerInit: MessengerClientInitFunction<
  NftDetectionController,
  NftDetectionControllerMessenger
> = ({ controllerMessenger, getMessengerClient }) => {
  const nftController = getMessengerClient('NftController');

  const controller = new NftDetectionController({
    messenger: controllerMessenger,
    disabled: false,
    addNfts: nftController.addNfts.bind(nftController),
    getNftState: () => nftController.state,
  });

  return {
    controller,
  };
};
