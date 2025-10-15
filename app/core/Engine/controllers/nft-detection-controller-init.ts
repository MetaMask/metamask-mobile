import { ControllerInitFunction } from '../types';
import { NftDetectionController } from '@metamask/assets-controllers';
import { NftDetectionControllerMessenger } from '../messengers/nft-detection-controller-messenger';

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
    addNft: nftController.addNft.bind(nftController),
    getNftState: () => nftController.state,
  });

  return {
    controller,
  };
};
