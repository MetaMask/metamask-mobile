import { CaipChainId } from '@metamask/utils';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';

export interface AddNewAccountRouteParams {
  scope: CaipChainId;
  clientType: WalletClientType;
}

/**
 * AddNewAccountProps props.
 */
export interface AddNewAccountBottomSheetProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params?: AddNewAccountRouteParams;
  };
}
