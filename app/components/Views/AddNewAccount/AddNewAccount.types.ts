import { CaipChainId } from '@metamask/utils';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { InternalAccount } from '@metamask/keyring-internal-api';

/**
 * AddNewAccountProps props.
 */
export interface AddNewAccountProps {
  scope?: CaipChainId;
  clientType?: WalletClientType;
  onActionComplete?: (account: InternalAccount) => void;
  onBack?: () => void;
}
