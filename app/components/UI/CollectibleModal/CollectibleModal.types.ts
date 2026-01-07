import { Nft } from '@metamask/assets-controllers';

export interface CollectibleModalParams {
  contractName: string;
  collectible: Nft;
  source?: 'mobile-nft-list' | 'mobile-nft-list-page';
}

export interface ReusableModalRef {
  dismissModal: () => void;
}
