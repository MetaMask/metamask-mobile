import { CaipChainId } from '@metamask/utils';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';

export interface AddNewAccountBottomSheetRouteParams {
  scope: CaipChainId;
  clientType: WalletClientType;
}
