/**
 * Account actions navigation parameters
 */

import type { InternalAccount } from '@metamask/keyring-internal-api';

/** Account actions parameters */
export interface AccountActionsParams {
  selectedAccount: InternalAccount;
}

/** Account permissions parameters */
export interface AccountPermissionsParams {
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
}

/** Revoke all account permissions parameters */
export interface RevokeAllAccountPermissionsParams {
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
}

/** Connection details parameters */
export interface ConnectionDetailsParams {
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
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
