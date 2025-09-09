import { CaipChainId } from '@metamask/utils';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';

export type AddNewAccountBottomSheetParams = {
  scope: CaipChainId;
  clientType: WalletClientType;
};
