import { Nft } from '@metamask/assets-controllers';

export type CollectibleModalParams = {
  contractName: string;
  collectible: Nft;
};

export interface ReusableModalRef {
  dismissModal: () => void;
}
