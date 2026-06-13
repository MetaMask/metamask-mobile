import { Wallet } from '@metamask/wallet';
import { Json } from '@metamask/utils';
import { ApprovalType } from '@metamask/controller-utils';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';
import { getKeyringBuilders } from './keyrings';
import { RootMessenger } from '../types';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../Encryptor';
import { mobileStorageAdapter } from '../utils/storage-service-utils';
import { ApprovalTypes } from '../../RPCMethods/RPCMethodMiddleware';

export function initializeWallet({
  messenger,
  state,
}: {
  messenger: RootMessenger;
  state: Record<string, Record<string, Json> | undefined>;
}) {
  const encryptor = new Encryptor({
    keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
  });

  return new Wallet({
    messenger,
    state,
    instanceOptions: {
      approvalController: {
        // Mobile drives approvals through state, so `showApprovalRequest` is a
        // no-op. It is omitted here because the wallet defaults it to a no-op.
        typesExcludedFromRateLimiting: [
          ApprovalType.Transaction,
          ApprovalType.WatchAsset,
          ApprovalTypes.SMART_TRANSACTION_STATUS,

          // Allow one flavor of snap_dialog to be queued.
          DIALOG_APPROVAL_TYPES.default,
        ],
      },
      keyringController: {
        encryptor,
        keyringBuilders: getKeyringBuilders(messenger),
      },
      storageService: {
        storage: mobileStorageAdapter,
      },
    },
  });
}
