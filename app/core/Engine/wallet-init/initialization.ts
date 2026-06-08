import { Wallet } from '@metamask/wallet';
import { Json } from '@metamask/utils';
import { ApprovalType } from '@metamask/controller-utils';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';
import {
  ClientConfigApiService,
  ClientType,
} from '@metamask/remote-feature-flag-controller';
import { getKeyringBuilders } from './keyrings';
import { RootMessenger } from '../types';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../Encryptor';
import { mobileStorageAdapter } from '../utils/storage-service-utils';
import { ApprovalTypes } from '../../RPCMethods/RPCMethodMiddleware';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from '../controllers/remote-feature-flag-controller';
import { getBaseSemVerVersion } from '../../../util/version';
import AppConstants from '../../AppConstants';

export function initializeWallet({
  messenger,
  state,
  analyticsId,
  remoteFeatureFlagControllerDisabled,
}: {
  messenger: RootMessenger;
  state: Record<string, Record<string, Json> | undefined>;
  analyticsId: string;
  remoteFeatureFlagControllerDisabled: boolean;
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
      remoteFeatureFlagController: {
        clientConfigApiService: new ClientConfigApiService({
          fetch,
          config: {
            client: ClientType.Mobile,
            environment: getFeatureFlagAppEnvironment(),
            distribution: getFeatureFlagAppDistribution(),
          },
        }),
        getMetaMetricsId: () => analyticsId,
        clientVersion: getBaseSemVerVersion(),
        // Read from the persisted state so the controller can invalidate its
        // cached flags when the client version changes between sessions.
        prevClientVersion: state?.AppMetadataController?.currentAppVersion as
          | string
          | undefined,
        fetchInterval: __DEV__
          ? 1000
          : AppConstants.FEATURE_FLAGS_API.DEFAULT_FETCH_INTERVAL,
        // The wallet only takes the initial `disabled` value; the dynamic
        // enable/disable toggling and the startup `updateRemoteFeatureFlags()`
        // kickoff stay client-side (see `Engine`).
        disabled: remoteFeatureFlagControllerDisabled,
      },
      storageService: {
        storage: mobileStorageAdapter,
      },
    },
  });
}
