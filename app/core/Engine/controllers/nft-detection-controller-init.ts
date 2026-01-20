import { ControllerInitFunction } from '../types';
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
export const nftDetectionControllerInit: ControllerInitFunction<
  NftDetectionController,
  NftDetectionControllerMessenger
> = ({ controllerMessenger, getController }) => {
  const nftController = getController('NftController');

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
