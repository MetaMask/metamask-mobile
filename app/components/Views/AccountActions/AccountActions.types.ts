/**
 * Account actions navigation parameters
 */

import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountPermissionsScreens } from '../AccountPermissions/AccountPermissions.types';

/** Account actions parameters */
export interface AccountActionsParams {
  selectedAccount: InternalAccount;
}

/** Account permissions parameters */
export interface AccountPermissionsParams {
  hostInfo: {
    metadata: { origin: string };
  };
  isRenderedAsBottomSheet?: boolean;
  initialScreen?: AccountPermissionsScreens;
  isNonDappNetworkSwitch?: boolean;
}

/** Revoke all account permissions parameters */
export interface RevokeAllAccountPermissionsParams {
  hostInfo: {
    metadata: { origin: string };
  };
  onRevokeAll?: () => void;
}

/** Connection details parameters */
export interface ConnectionDetailsParams {
  connectionDateTime?: number;
}

/** Add account parameters */
export interface AddAccountParams {
  onAccountCreated?: (address: string) => void;
}

/** Ambiguous address parameters */
export interface AmbiguousAddressParams {
  addresses?: string[];
  onSelect?: (address: string) => void;
}
