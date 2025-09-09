import { Nft } from '@metamask/assets-controllers';

export interface CollectibleModalParams {
  contractName: string;
  collectible: Nft;
}

export interface ReusableModalRef {
  dismissModal: () => void;
}
