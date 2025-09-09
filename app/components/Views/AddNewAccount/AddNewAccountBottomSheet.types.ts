import { CaipChainId } from '@metamask/utils';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';

export interface AddNewAccountBottomSheetParams {
  scope: CaipChainId;
  clientType: WalletClientType;
}
