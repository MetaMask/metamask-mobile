import { CaipChainId } from '@metamask/utils';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';

/**
 * AddNewAccountProps props.
 */
export interface AddNewAccountProps {
  /**
   * Props that are passed in while navigating to screen.
   */
  route: {
    params?: {
      scope: CaipChainId;
      clientType: WalletClientType;
    };
  };
}
