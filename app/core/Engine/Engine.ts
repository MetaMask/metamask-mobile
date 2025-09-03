/* eslint-disable @typescript-eslint/no-shadow */
import Crypto from 'react-native-quick-crypto';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
///: END:ONLY_INCLUDE_IF
import {
  AccountTrackerController,
  AssetsContractController,
  NftController,
  NftDetectionController,
  TokenBalancesController,
  TokenDetectionController,
  TokenListController,
  TokenRatesController,
  TokensController,
  CodefiTokenPricesServiceV2,
  TokenSearchDiscoveryDataController,
} from '@metamask/assets-controllers';
import { AccountsController } from '@metamask/accounts-controller';
import { AddressBookController } from '@metamask/address-book-controller';
import { ComposableController } from '@metamask/composable-controller';
import {
  KeyringController,
  KeyringControllerState,
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  KeyringTypes,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-controller';
import {
  getDefaultNetworkControllerState,
  NetworkController,
  NetworkState,
  NetworkStatus,
} from '@metamask/network-controller';
import { PhishingController } from '@metamask/phishing-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import {
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { GasFeeController } from '@metamask/gas-fee-controller';
import {
  AcceptOptions,
  AddApprovalOptions,
} from '@metamask/approval-controller';
import { HdKeyring } from '@metamask/eth-hd-keyring';
import { SelectedNetworkController } from '@metamask/selected-network-controller';
import {
  PermissionController,
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  SubjectMetadataController,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/permission-controller';
import SwapsController, { swapsUtils } from '@metamask/swaps-controller';
import { PPOMController } from '@metamask/ppom-validator';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import type { NotificationArgs } from '@metamask/snaps-rpc-methods/dist/restricted/notify.cjs';
import {
  buildSnapEndowmentSpecifications,
  buildSnapRestrictedMethodSpecifications,
} from '@metamask/snaps-rpc-methods';
import type { EnumToUnion, DialogType } from '@metamask/snaps-sdk';
///: END:ONLY_INCLUDE_IF
import { MetaMaskKeyring as QRHardwareKeyring } from '@keystonehq/metamask-airgapped-keyring';
import { LoggingController } from '@metamask/logging-controller';
import { TokenSearchDiscoveryControllerMessenger } from '@metamask/token-search-discovery-controller';
import {
  LedgerKeyring,
  LedgerMobileBridge,
  LedgerTransportMiddleware,
} from '@metamask/eth-ledger-bridge-keyring';
import { Encryptor, LEGACY_DERIVATION_OPTIONS, pbkdf2 } from '../Encryptor';
import {
  getDecimalChainId,
  isTestNet,
  isPerDappSelectedNetworkEnabled,
} from '../../util/networks';
import {
  fetchEstimatedMultiLayerL1Fee,
  deprecatedGetNetworkId,
} from '../../util/networks/engineNetworkUtils';
import AppConstants from '../AppConstants';
import { store } from '../../store';
import {
  renderFromTokenMinimalUnit,
  balanceToFiatNumber,
  weiToFiatNumber,
  toHexadecimal,
  hexToBN,
  renderFromWei,
} from '../../util/number';
import NotificationManager from '../NotificationManager';
import Logger from '../../util/Logger';
import { isZero } from '../../util/lodash';
import { MetaMetricsEvents, MetaMetrics } from '../Analytics';

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { ExcludedSnapEndowments, ExcludedSnapPermissions } from '../Snaps';
import { calculateScryptKey } from './controllers/identity/calculate-scrypt-key';
import { notificationServicesControllerInit } from './controllers/notifications/notification-services-controller-init';
import { notificationServicesPushControllerInit } from './controllers/notifications/notification-services-push-controller-init';

import { getAuthenticationControllerMessenger } from './messengers/identity/authentication-controller-messenger';
import { createAuthenticationController } from './controllers/identity/create-authentication-controller';
import { getUserStorageControllerMessenger } from './messengers/identity/user-storage-controller-messenger';
import { createUserStorageController } from './controllers/identity/create-user-storage-controller';
///: END:ONLY_INCLUDE_IF
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from '../Permissions/specifications.js';
import { backupVault } from '../BackupVault';
import { Hex, Json } from '@metamask/utils';
import { providerErrors } from '@metamask/rpc-errors';

import { PPOM, ppomInit } from '../../lib/ppom/PPOMView';
import RNFSStorageBackend from '../../lib/ppom/ppom-storage-backend';
import { createRemoteFeatureFlagController } from './controllers/remote-feature-flag-controller';
import {
  networkIdUpdated,
  networkIdWillUpdate,
} from '../../core/redux/slices/inpageProvider';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import { getAllowedSmartTransactionsChainIds } from '../../../app/constants/smartTransactions';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';
import { selectSwapsChainFeatureFlags } from '../../reducers/swaps';
import { ClientId } from '@metamask/smart-transactions-controller/dist/types';
import { zeroAddress } from 'ethereumjs-util';
import {
  ChainId,
  type TraceCallback,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  toHex,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/controller-utils';
import { ExtendedControllerMessenger } from '../ExtendedControllerMessenger';
import DomainProxyMap from '../../lib/DomainProxyMap/DomainProxyMap';
import {
  MetaMetricsEventCategory,
  MetaMetricsEventName,
} from '@metamask/smart-transactions-controller/dist/constants';
import {
  getSmartTransactionMetricsProperties as getSmartTransactionMetricsPropertiesType,
  getSmartTransactionMetricsSensitiveProperties as getSmartTransactionMetricsSensitivePropertiesType,
} from '@metamask/smart-transactions-controller/dist/utils';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { snapKeyringBuilder } from '../SnapKeyring';
import { removeAccountsFromPermissions } from '../Permissions';
import { keyringSnapPermissionsBuilder } from '../SnapKeyring/keyringSnapsPermissions';
import { multichainBalancesControllerInit } from './controllers/multichain-balances-controller/multichain-balances-controller-init';
import { createMultichainRatesController } from './controllers/RatesController/utils';
import { setupCurrencyRateSync } from './controllers/RatesController/subscriptions';
import { multichainAssetsControllerInit } from './controllers/multichain-assets-controller/multichain-assets-controller-init';
import { multichainAssetsRatesControllerInit } from './controllers/multichain-assets-rates-controller/multichain-assets-rates-controller-init';
import { multichainTransactionsControllerInit } from './controllers/multichain-transactions-controller/multichain-transactions-controller-init';
import { multichainAccountServiceInit } from './controllers/multichain-account-service/multichain-account-service-init';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { HandleSnapRequestArgs } from '../Snaps/types';
import { handleSnapRequest } from '../Snaps/utils';
import {
  cronjobControllerInit,
  executionServiceInit,
  snapControllerInit,
  snapInterfaceControllerInit,
  snapsRegistryInit,
  SnapControllerClearSnapStateAction,
  SnapControllerGetSnapAction,
  SnapControllerGetSnapStateAction,
  SnapControllerUpdateSnapStateAction,
  SnapControllerIsMinimumPlatformVersionAction,
  SnapControllerHandleRequestAction,
} from './controllers/snaps';
import { RestrictedMethods } from '../Permissions/constants';
///: END:ONLY_INCLUDE_IF
import { MetricsEventBuilder } from '../Analytics/MetricsEventBuilder';
import {
  BaseControllerMessenger,
  EngineState,
  EngineContext,
  StatefulControllers,
} from './types';
import {
  BACKGROUND_STATE_CHANGE_EVENT_NAMES,
  STATELESS_NON_CONTROLLER_NAMES,
  swapsSupportedChainIds,
} from './constants';
import { getGlobalChainId } from '../../util/networks/global-network';
import { trace } from '../../util/trace';
import { logEngineCreation } from './utils/logger';
import { initModularizedControllers } from './utils';
import { accountsControllerInit } from './controllers/accounts-controller';
import { accountTreeControllerInit } from '../../multichain-accounts/controllers/account-tree-controller';
import { ApprovalControllerInit } from './controllers/approval-controller';
import { createTokenSearchDiscoveryController } from './controllers/TokenSearchDiscoveryController';
import { bridgeControllerInit } from './controllers/bridge-controller/bridge-controller-init';
import { bridgeStatusControllerInit } from './controllers/bridge-status-controller/bridge-status-controller-init';
import { multichainNetworkControllerInit } from './controllers/multichain-network-controller/multichain-network-controller-init';
import { currencyRateControllerInit } from './controllers/currency-rate-controller/currency-rate-controller-init';
import { EarnController } from '@metamask/earn-controller';
import { TransactionControllerInit } from './controllers/transaction-controller';
import { defiPositionsControllerInit } from './controllers/defi-positions-controller/defi-positions-controller-init';
import { SignatureControllerInit } from './controllers/signature-controller';
import { GasFeeControllerInit } from './controllers/gas-fee-controller';
import I18n from '../../../locales/i18n';
import { Platform } from '@metamask/profile-sync-controller/sdk';
import { isProductSafetyDappScanningEnabled } from '../../util/phishingDetection';
import { appMetadataControllerInit } from './controllers/app-metadata-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { toFormattedAddress } from '../../util/address';
import { getFailoverUrlsForInfuraNetwork } from '../../util/networks/customNetworks';
import {
  onRpcEndpointDegraded,
  onRpcEndpointUnavailable,
} from './controllers/network-controller/messenger-action-handlers';
import { INFURA_PROJECT_ID } from '../../constants/network';
import { SECOND } from '../../constants/time';
import { getIsQuicknodeEndpointUrl } from './controllers/network-controller/utils';
import {
  MultichainRouter,
  MultichainRouterMessenger,
  MultichainRouterArgs,
} from '@metamask/snaps-controllers';
import {
  MultichainRouterGetSupportedAccountsEvent,
  MultichainRouterIsSupportedScopeEvent,
} from './controllers/multichain-router/constants';
import { ErrorReportingService } from '@metamask/error-reporting-service';
import { captureException } from '@sentry/react-native';
import { WebSocketServiceInit } from './controllers/snaps/websocket-service-init';
import { networkEnablementControllerInit } from './controllers/network-enablement-controller/network-enablement-controller-init';

import { seedlessOnboardingControllerInit } from './controllers/seedless-onboarding-controller';
import { perpsControllerInit } from './controllers/perps-controller';
import { selectUseTokenDetection } from '../../selectors/preferencesController';
import { rewardsControllerInit } from './controllers/rewards-controller';
import { RewardsDataService } from './controllers/rewards-controller/services/rewards-data-service';

const NON_EMPTY = 'NON_EMPTY';

const encryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentChainId: any;

/**
 * Core controller responsible for composing other metamask controllers together
 * and exposing convenience methods for common wallet operations.
 */
export class Engine {
  /**
   * The global Engine singleton
   */
  static instance: Engine | null;
  /**
   * A collection of all controller instances
   */
  context: EngineContext;
  /**
   * The global controller messenger.
   */
  controllerMessenger: BaseControllerMessenger;
  /**
   * ComposableController reference containing all child controllers
   */
  datamodel: ComposableController<EngineState, StatefulControllers>;

  /**
   * Object containing the info for the latest incoming tx block
   * for each address and network
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastIncomingTxBlockInfo: any;

  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  /**
   * The app state event listener.
   * This is used to handle app state changes in snaps lifecycle hooks.
   */
  appStateListener: NativeEventSubscription;

  subjectMetadataController: SubjectMetadataController;
  ///: END:ONLY_INCLUDE_IF

  accountsController: AccountsController;
  gasFeeController: GasFeeController;
  keyringController: KeyringController;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  multichainRouter: MultichainRouter;
  rewardsDataService: RewardsDataService;
  /**
   * Creates a CoreController instance
   */
  // eslint-disable-next-line @typescript-eslint/default-param-last
  constructor(
    initialState: Partial<EngineState> = {},
    initialKeyringState?: KeyringControllerState | null,
    metaMetricsId?: string,
  ) {
    logEngineCreation(initialState, initialKeyringState);

    this.controllerMessenger = new ExtendedControllerMessenger();

    const isBasicFunctionalityToggleEnabled = () =>
      selectBasicFunctionalityEnabled(store.getState());

    const preferencesController = new PreferencesController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'PreferencesController',
        allowedActions: [],
        allowedEvents: ['KeyringController:stateChange'],
      }),
      state: {
        ipfsGateway: AppConstants.IPFS_DEFAULT_GATEWAY_URL,
        useTokenDetection:
          initialState?.PreferencesController?.useTokenDetection ?? true,
        useNftDetection: true, // set this to true to enable nft detection by default to new users
        displayNftMedia: true,
        securityAlertsEnabled: true,
        smartTransactionsOptInStatus: true,
        tokenSortConfig: {
          key: 'tokenFiatAmount',
          order: 'dsc',
          sortCallback: 'stringNumeric',
        },
        ...initialState.PreferencesController,
      },
    });

    const errorReportingServiceMessenger =
      this.controllerMessenger.getRestricted({
        name: 'ErrorReportingService',
        allowedActions: [],
        allowedEvents: [],
      });
    // We only use the ErrorReportingService through the
    // messenger. But we need to assign a variable to make Sonar happy.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const errorReportingService = new ErrorReportingService({
      messenger: errorReportingServiceMessenger,
      captureException,
    });

    const networkControllerMessenger = this.controllerMessenger.getRestricted({
      name: 'NetworkController',
      allowedEvents: [],
      allowedActions: ['ErrorReportingService:captureException'],
    });

    const additionalDefaultNetworks = [
      ChainId['megaeth-testnet'],
      ChainId['monad-testnet'],
    ];

    let initialNetworkControllerState = initialState.NetworkController;
    if (!initialNetworkControllerState) {
      initialNetworkControllerState = getDefaultNetworkControllerState(
        additionalDefaultNetworks,
      );

      // Add failovers for default Infura RPC endpoints
      initialNetworkControllerState.networkConfigurationsByChainId[
        ChainId.mainnet
      ].rpcEndpoints[0].failoverUrls =
        getFailoverUrlsForInfuraNetwork('ethereum-mainnet');
      initialNetworkControllerState.networkConfigurationsByChainId[
        ChainId['linea-mainnet']
      ].rpcEndpoints[0].failoverUrls =
        getFailoverUrlsForInfuraNetwork('linea-mainnet');
      initialNetworkControllerState.networkConfigurationsByChainId[
        ChainId['base-mainnet']
      ].rpcEndpoints[0].failoverUrls =
        getFailoverUrlsForInfuraNetwork('base-mainnet');
    }

    const infuraProjectId = INFURA_PROJECT_ID || NON_EMPTY;
    const networkControllerOptions = {
      infuraProjectId,
      state: initialNetworkControllerState,
      messenger: networkControllerMessenger,
      getBlockTrackerOptions: () =>
        process.env.IN_TEST
          ? {}
          : {
              pollingInterval: 20 * SECOND,
              // The retry timeout is pretty short by default, and if the endpoint is
              // down, it will end up exhausting the max number of consecutive
              // failures quickly.
              retryTimeout: 20 * SECOND,
            },
      getRpcServiceOptions: (rpcEndpointUrl: string) => {
        const maxRetries = 4;
        const commonOptions = {
          fetch: globalThis.fetch.bind(globalThis),
          btoa: globalThis.btoa.bind(globalThis),
        };

        if (getIsQuicknodeEndpointUrl(rpcEndpointUrl)) {
          return {
            ...commonOptions,
            policyOptions: {
              maxRetries,
              // When we fail over to Quicknode, we expect it to be down at
              // first while it is being automatically activated. If an endpoint
              // is down, the failover logic enters a "cooldown period" of 30
              // minutes. We'd really rather not enter that for Quicknode, so
              // keep retrying longer.
              maxConsecutiveFailures: (maxRetries + 1) * 14,
            },
          };
        }

        return {
          ...commonOptions,
          policyOptions: {
            maxRetries,
            // Ensure that the circuit does not break too quickly.
            maxConsecutiveFailures: (maxRetries + 1) * 7,
          },
        };
      },
      additionalDefaultNetworks,
    };
    const networkController = new NetworkController(networkControllerOptions);
    networkControllerMessenger.subscribe(
      'NetworkController:rpcEndpointUnavailable',
      async ({ chainId, endpointUrl, error }) => {
        onRpcEndpointUnavailable({
          chainId,
          endpointUrl,
          infuraProjectId,
          error,
          trackEvent: ({ event, properties }) => {
            const metricsEvent = MetricsEventBuilder.createEventBuilder(event)
              .addProperties(properties)
              .build();
            MetaMetrics.getInstance().trackEvent(metricsEvent);
          },
          metaMetricsId: await MetaMetrics.getInstance().getMetaMetricsId(),
        });
      },
    );
    networkControllerMessenger.subscribe(
      'NetworkController:rpcEndpointDegraded',
      async ({ chainId, endpointUrl, error }) => {
        onRpcEndpointDegraded({
          chainId,
          endpointUrl,
          error,
          infuraProjectId,
          trackEvent: ({ event, properties }) => {
            const metricsEvent = MetricsEventBuilder.createEventBuilder(event)
              .addProperties(properties)
              .build();
            MetaMetrics.getInstance().trackEvent(metricsEvent);
          },
          metaMetricsId: await MetaMetrics.getInstance().getMetaMetricsId(),
        });
      },
    );
    networkController.initializeProvider();

    const assetsContractController = new AssetsContractController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'AssetsContractController',
        allowedActions: [
          'NetworkController:getNetworkClientById',
          'NetworkController:getNetworkConfigurationByNetworkClientId',
          'NetworkController:getSelectedNetworkClient',
          'NetworkController:getState',
        ],
        allowedEvents: [
          'PreferencesController:stateChange',
          'NetworkController:networkDidChange',
        ],
      }),
      chainId: getGlobalChainId(networkController),
    });

    const loggingController = new LoggingController({
      messenger: this.controllerMessenger.getRestricted<
        'LoggingController',
        never,
        never
      >({
        name: 'LoggingController',
        allowedActions: [],
        allowedEvents: [],
      }),
      state: initialState.LoggingController,
    });
    const tokenListController = new TokenListController({
      chainId: getGlobalChainId(networkController),
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          listener,
        ),
      messenger: this.controllerMessenger.getRestricted({
        name: 'TokenListController',
        allowedActions: [`${networkController.name}:getNetworkClientById`],
        allowedEvents: [`${networkController.name}:stateChange`],
      }),
    });
    const remoteFeatureFlagControllerMessenger =
      this.controllerMessenger.getRestricted({
        name: 'RemoteFeatureFlagController',
        allowedActions: [],
        allowedEvents: [],
      });
    remoteFeatureFlagControllerMessenger.subscribe(
      'RemoteFeatureFlagController:stateChange',
      (isRpcFailoverEnabled) => {
        if (isRpcFailoverEnabled) {
          Logger.log(
            'isRpcFailoverEnabled = ',
            isRpcFailoverEnabled,
            ', enabling RPC failover',
          );
          networkController.enableRpcFailover();
        } else {
          Logger.log(
            'isRpcFailoverEnabled = ',
            isRpcFailoverEnabled,
            ', disabling RPC failover',
          );
          networkController.disableRpcFailover();
        }
      },
      (state) => state.remoteFeatureFlags.walletFrameworkRpcFailoverEnabled,
    );
    const remoteFeatureFlagController = createRemoteFeatureFlagController({
      messenger: remoteFeatureFlagControllerMessenger,
      disabled: !isBasicFunctionalityToggleEnabled(),
      getMetaMetricsId: () => metaMetricsId ?? '',
    });

    const tokenSearchDiscoveryController = createTokenSearchDiscoveryController(
      {
        state: initialState.TokenSearchDiscoveryController,
        messenger: this.controllerMessenger.getRestricted({
          name: 'TokenSearchDiscoveryController',
          allowedActions: [],
          allowedEvents: [],
        }) as TokenSearchDiscoveryControllerMessenger,
      },
    );

    const phishingController = new PhishingController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'PhishingController',
        allowedActions: [],
        allowedEvents: [],
      }),
    });
    if (!isProductSafetyDappScanningEnabled()) {
      phishingController.maybeUpdateState();
    }

    const additionalKeyrings = [];

    const qrKeyringBuilder = () => {
      const keyring = new QRHardwareKeyring();
      // to fix the bug in #9560, forgetDevice will reset all keyring properties to default.
      keyring.forgetDevice();
      return keyring;
    };
    qrKeyringBuilder.type = QRHardwareKeyring.type;

    additionalKeyrings.push(qrKeyringBuilder);

    const bridge = new LedgerMobileBridge(new LedgerTransportMiddleware());
    const ledgerKeyringBuilder = () => new LedgerKeyring({ bridge });
    ledgerKeyringBuilder.type = LedgerKeyring.type;

    additionalKeyrings.push(ledgerKeyringBuilder);

    const hdKeyringBuilder = () =>
      new HdKeyring({
        cryptographicFunctions: { pbkdf2Sha512: pbkdf2 },
      });
    hdKeyringBuilder.type = HdKeyring.type;
    additionalKeyrings.push(hdKeyringBuilder);

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const snapKeyringBuildMessenger = this.controllerMessenger.getRestricted({
      name: 'SnapKeyring',
      allowedActions: [
        'ApprovalController:addRequest',
        'ApprovalController:acceptRequest',
        'ApprovalController:rejectRequest',
        'ApprovalController:startFlow',
        'ApprovalController:endFlow',
        'ApprovalController:showSuccess',
        'ApprovalController:showError',
        'PhishingController:testOrigin',
        'PhishingController:maybeUpdateState',
        'KeyringController:getAccounts',
        'AccountsController:setSelectedAccount',
        'AccountsController:getAccountByAddress',
        'AccountsController:setAccountName',
        'AccountsController:setAccountNameAndSelectAccount',
        'AccountsController:listMultichainAccounts',
        SnapControllerHandleRequestAction,
        SnapControllerGetSnapAction,
        SnapControllerIsMinimumPlatformVersionAction,
      ],
      allowedEvents: [],
    });

    additionalKeyrings.push(
      snapKeyringBuilder(snapKeyringBuildMessenger, {
        persistKeyringHelper: async () => {
          // Necessary to only persist the keyrings, the `AccountsController` will
          // automatically react to `KeyringController:stateChange`.
          await this.keyringController.persistAllKeyrings();
        },
        removeAccountHelper: (address) => this.removeAccount(address),
      }),
    );

    ///: END:ONLY_INCLUDE_IF

    this.keyringController = new KeyringController({
      removeIdentity: preferencesController.removeIdentity.bind(
        preferencesController,
      ),
      encryptor,
      messenger: this.controllerMessenger.getRestricted({
        name: 'KeyringController',
        allowedActions: [],
        allowedEvents: [],
      }),
      state: initialKeyringState || initialState.KeyringController,
      // @ts-expect-error To Do: Update the type of QRHardwareKeyring to Keyring<Json>
      keyringBuilders: additionalKeyrings,
      cacheEncryptionKey: true,
    });

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    /**
     * Gets the mnemonic of the user's primary keyring.
     */
    const getPrimaryKeyringMnemonic = () => {
      const [keyring] = this.keyringController.getKeyringsByType(
        KeyringTypes.hd,
      ) as HdKeyring[];

      if (!keyring.mnemonic) {
        throw new Error('Primary keyring mnemonic unavailable.');
      }

      return keyring.mnemonic;
    };

    const getPrimaryKeyringMnemonicSeed = () => {
      const [keyring] = this.keyringController.getKeyringsByType(
        KeyringTypes.hd,
      ) as HdKeyring[];

      if (!keyring.seed) {
        throw new Error('Primary keyring mnemonic unavailable.');
      }

      return keyring.seed;
    };

    const getUnlockPromise = () => {
      if (this.keyringController.isUnlocked()) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        this.controllerMessenger.subscribeOnceIf(
          'KeyringController:unlock',
          resolve,
          () => true,
        );
      });
    };

    const snapRestrictedMethods = {
      clearSnapState: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        SnapControllerClearSnapStateAction,
      ),
      getMnemonic: async (source?: string) => {
        if (!source) {
          return getPrimaryKeyringMnemonic();
        }

        try {
          const { type, mnemonic } = (await this.controllerMessenger.call(
            'KeyringController:withKeyring',
            {
              id: source,
            },
            async ({ keyring }) => ({
              type: keyring.type,
              mnemonic: (keyring as unknown as HdKeyring).mnemonic,
            }),
          )) as { type: string; mnemonic?: Uint8Array };

          if (type !== KeyringTypes.hd || !mnemonic) {
            // The keyring isn't guaranteed to have a mnemonic (e.g.,
            // hardware wallets, which can't be used as entropy sources),
            // so we throw an error if it doesn't.
            throw new Error(`Entropy source with ID "${source}" not found.`);
          }

          return mnemonic;
        } catch {
          throw new Error(`Entropy source with ID "${source}" not found.`);
        }
      },
      getMnemonicSeed: async (source?: string) => {
        if (!source) {
          return getPrimaryKeyringMnemonicSeed();
        }

        try {
          const { type, seed } = (await this.controllerMessenger.call(
            'KeyringController:withKeyring',
            {
              id: source,
            },
            async ({ keyring }) => ({
              type: keyring.type,
              seed: (keyring as unknown as HdKeyring).seed,
            }),
          )) as { type: string; seed?: Uint8Array };

          if (type !== KeyringTypes.hd || !seed) {
            // The keyring isn't guaranteed to have a seed (e.g.,
            // hardware wallets, which can't be used as entropy sources),
            // so we throw an error if it doesn't.
            throw new Error(`Entropy source with ID "${source}" not found.`);
          }

          return seed;
        } catch {
          throw new Error(`Entropy source with ID "${source}" not found.`);
        }
      },
      getUnlockPromise: getUnlockPromise.bind(this),
      getSnap: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        SnapControllerGetSnapAction,
      ),
      handleSnapRpcRequest: async (args: HandleSnapRequestArgs) =>
        await handleSnapRequest(this.controllerMessenger, args),
      getSnapState: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        SnapControllerGetSnapStateAction,
      ),
      updateSnapState: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        SnapControllerUpdateSnapStateAction,
      ),
      maybeUpdatePhishingList: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'PhishingController:maybeUpdateState',
      ),
      isOnPhishingList: (origin: string) =>
        this.controllerMessenger.call<'PhishingController:testOrigin'>(
          'PhishingController:testOrigin',
          origin,
        ).result,
      showDialog: (
        origin: string,
        type: EnumToUnion<DialogType>,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: any, // should be Component from '@metamask/snaps-ui';
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        placeholder?: any,
      ) =>
        this.controllerMessenger.call<'ApprovalController:addRequest'>(
          'ApprovalController:addRequest',
          {
            origin,
            type,
            requestData: { content, placeholder },
          },
          true,
        ),
      showInAppNotification: (origin: string, args: NotificationArgs) => {
        Logger.log(
          'Snaps/ showInAppNotification called with args: ',
          args,
          ' and origin: ',
          origin,
        );

        return null;
      },
      createInterface: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'SnapInterfaceController:createInterface',
      ),
      getInterface: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'SnapInterfaceController:getInterface',
      ),
      updateInterface: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'SnapInterfaceController:updateInterface',
      ),
      requestUserApproval: (opts: AddApprovalOptions) =>
        this.controllerMessenger.call<'ApprovalController:addRequest'>(
          'ApprovalController:addRequest',
          opts,
          true,
        ),
      hasPermission: (origin: string, target: string) =>
        this.controllerMessenger.call<'PermissionController:hasPermission'>(
          'PermissionController:hasPermission',
          origin,
          target,
        ),
      getClientCryptography: () => ({ pbkdf2Sha512: pbkdf2 }),
      getPreferences: () => {
        const {
          securityAlertsEnabled,
          useTransactionSimulations,
          useTokenDetection,
          privacyMode,
          useNftDetection,
          displayNftMedia,
          isMultiAccountBalancesEnabled,
          showTestNetworks,
        } = this.getPreferences();
        const locale = I18n.locale;
        return {
          locale,
          currency: this.context.CurrencyRateController.state.currentCurrency,
          hideBalances: privacyMode,
          useSecurityAlerts: securityAlertsEnabled,
          simulateOnChainActions: useTransactionSimulations,
          useTokenDetection,
          batchCheckBalances: isMultiAccountBalancesEnabled,
          displayNftMedia,
          useNftDetection,
          useExternalPricingData: true,
          showTestnets: showTestNetworks,
        };
      },
    };
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const keyringSnapMethods = {
      getAllowedKeyringMethods: (origin: string) =>
        keyringSnapPermissionsBuilder(origin),
      getSnapKeyring: this.getSnapKeyring.bind(this),
    };
    ///: END:ONLY_INCLUDE_IF

    const getSnapPermissionSpecifications = () => ({
      ...buildSnapEndowmentSpecifications(Object.keys(ExcludedSnapEndowments)),
      ...buildSnapRestrictedMethodSpecifications(
        Object.keys(ExcludedSnapPermissions),
        {
          ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
          ...snapRestrictedMethods,
          ///: END:ONLY_INCLUDE_IF
          ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          ...keyringSnapMethods,
          ///: END:ONLY_INCLUDE_IF
        },
      ),
    });

    const accountTrackerController = new AccountTrackerController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'AccountTrackerController',
        allowedActions: [
          'AccountsController:getSelectedAccount',
          'AccountsController:listAccounts',
          'PreferencesController:getState',
          'NetworkController:getState',
          'NetworkController:getNetworkClientById',
        ],
        allowedEvents: [
          'AccountsController:selectedEvmAccountChange',
          'AccountsController:selectedAccountChange',
        ],
      }),
      state: initialState.AccountTrackerController ?? {
        accountsByChainId: {},
      },
      getStakedBalanceForChain:
        assetsContractController.getStakedBalanceForChain.bind(
          assetsContractController,
        ),
      includeStakedAssets: true,
    });
    const permissionController = new PermissionController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'PermissionController',
        allowedActions: [
          `ApprovalController:addRequest`,
          `ApprovalController:hasRequest`,
          `ApprovalController:acceptRequest`,
          `ApprovalController:rejectRequest`,
          ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
          `SnapController:getPermitted`,
          `SnapController:install`,
          `SubjectMetadataController:getSubjectMetadata`,
          ///: END:ONLY_INCLUDE_IF
        ],
        allowedEvents: [],
      }),
      state: initialState.PermissionController,
      caveatSpecifications: getCaveatSpecifications({
        listAccounts: (...args) =>
          this.accountsController.listAccounts(...args),
        findNetworkClientIdByChainId:
          networkController.findNetworkClientIdByChainId.bind(
            networkController,
          ),
        isNonEvmScopeSupported: this.controllerMessenger.call.bind(
          this.controllerMessenger,
          MultichainRouterIsSupportedScopeEvent,
        ),
        getNonEvmAccountAddresses: this.controllerMessenger.call.bind(
          this.controllerMessenger,
          MultichainRouterGetSupportedAccountsEvent,
        ),
      }),
      permissionSpecifications: {
        ...getPermissionSpecifications(),
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        ...getSnapPermissionSpecifications(),
        ///: END:ONLY_INCLUDE_IF
      },
      unrestrictedMethods,
    });

    const selectedNetworkController = new SelectedNetworkController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'SelectedNetworkController',
        allowedActions: [
          'NetworkController:getNetworkClientById',
          'NetworkController:getState',
          'NetworkController:getSelectedNetworkClient',
          'PermissionController:hasPermissions',
          'PermissionController:getSubjectNames',
        ],
        allowedEvents: [
          'NetworkController:stateChange',
          'PermissionController:stateChange',
        ],
      }),
      state: initialState.SelectedNetworkController || { domains: {} },
      useRequestQueuePreference: isPerDappSelectedNetworkEnabled(),
      // TODO we need to modify core PreferencesController for better cross client support
      onPreferencesStateChange: (
        listener: ({ useRequestQueue }: { useRequestQueue: boolean }) => void,
      ) => listener({ useRequestQueue: isPerDappSelectedNetworkEnabled() }),
      domainProxyMap: new DomainProxyMap(),
    });

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    this.subjectMetadataController = new SubjectMetadataController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'SubjectMetadataController',
        allowedActions: [`${permissionController.name}:hasPermissions`],
        allowedEvents: [],
      }),
      state: initialState.SubjectMetadataController || {},
      subjectCacheLimit: 100,
    });

    const authenticationControllerMessenger =
      getAuthenticationControllerMessenger(this.controllerMessenger);
    const authenticationController = createAuthenticationController({
      messenger: authenticationControllerMessenger,
      initialState: initialState.AuthenticationController,
      metametrics: {
        agent: Platform.MOBILE,
        getMetaMetricsId: async () =>
          (await MetaMetrics.getInstance().getMetaMetricsId()) || '',
      },
    });

    const userStorageControllerMessenger = getUserStorageControllerMessenger(
      this.controllerMessenger,
    );
    const userStorageController = createUserStorageController({
      messenger: userStorageControllerMessenger,
      initialState: initialState.UserStorageController,
      nativeScryptCrypto: calculateScryptKey,
      // @ts-expect-error Controller uses string for names rather than enum
      trace,
      config: {
        accountSyncing: {
          onAccountAdded: (profileId) => {
            MetaMetrics.getInstance().trackEvent(
              MetricsEventBuilder.createEventBuilder(
                MetaMetricsEvents.ACCOUNTS_SYNC_ADDED,
              )
                .addProperties({
                  profile_id: profileId,
                })
                .build(),
            );
          },
          onAccountNameUpdated: (profileId) => {
            MetaMetrics.getInstance().trackEvent(
              MetricsEventBuilder.createEventBuilder(
                MetaMetricsEvents.ACCOUNTS_SYNC_NAME_UPDATED,
              )
                .addProperties({
                  profile_id: profileId,
                })
                .build(),
            );
          },
          onAccountSyncErroneousSituation(profileId, situationMessage) {
            MetaMetrics.getInstance().trackEvent(
              MetricsEventBuilder.createEventBuilder(
                MetaMetricsEvents.ACCOUNTS_SYNC_ERRONEOUS_SITUATION,
              )
                .addProperties({
                  profile_id: profileId,
                  situation_message: situationMessage,
                })
                .build(),
            );
          },
        },
        contactSyncing: {
          onContactUpdated: (profileId) => {
            MetaMetrics.getInstance().trackEvent(
              MetricsEventBuilder.createEventBuilder(
                MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED,
              )
                .addProperties({
                  profile_id: profileId,
                  feature_name: 'Contacts Sync',
                  action: 'Contacts Sync Contact Updated',
                })
                .build(),
            );
          },
          onContactDeleted: (profileId) => {
            MetaMetrics.getInstance().trackEvent(
              MetricsEventBuilder.createEventBuilder(
                MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED,
              )
                .addProperties({
                  profile_id: profileId,
                  feature_name: 'Contacts Sync',
                  action: 'Contacts Sync Contact Deleted',
                })
                .build(),
            );
          },
          onContactSyncErroneousSituation(profileId, situationMessage) {
            MetaMetrics.getInstance().trackEvent(
              MetricsEventBuilder.createEventBuilder(
                MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED,
              )
                .addProperties({
                  profile_id: profileId,
                  feature_name: 'Contacts Sync',
                  action: 'Contacts Sync Erroneous Situation',
                  additional_description: situationMessage,
                })
                .build(),
            );
          },
        },
      },
    });
    ///: END:ONLY_INCLUDE_IF

    const codefiTokenApiV2 = new CodefiTokenPricesServiceV2();

    const smartTransactionsControllerTrackMetaMetricsEvent = (
      params: {
        event: MetaMetricsEventName;
        category: MetaMetricsEventCategory;
        properties?: ReturnType<
          typeof getSmartTransactionMetricsPropertiesType
        >;
        sensitiveProperties?: ReturnType<
          typeof getSmartTransactionMetricsSensitivePropertiesType
        >;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      options?: {
        metaMetricsId?: string;
      },
    ) => {
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder({
          category: params.event,
        })
          .addProperties(params.properties || {})
          .addSensitiveProperties(params.sensitiveProperties || {})
          .build(),
      );
    };

    this.smartTransactionsController = new SmartTransactionsController({
      // @ts-expect-error TODO: resolve types
      supportedChainIds: getAllowedSmartTransactionsChainIds(),
      clientId: ClientId.Mobile,
      getNonceLock: (...args) =>
        this.transactionController.getNonceLock(...args),
      confirmExternalTransaction: (...args) =>
        this.transactionController.confirmExternalTransaction(...args),
      trackMetaMetricsEvent: smartTransactionsControllerTrackMetaMetricsEvent,
      state: initialState.SmartTransactionsController,
      // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
      messenger: this.controllerMessenger.getRestricted({
        name: 'SmartTransactionsController',
        allowedActions: [
          'NetworkController:getNetworkClientById',
          'NetworkController:getState',
        ],
        allowedEvents: ['NetworkController:stateChange'],
      }),
      getTransactions: (...args) =>
        this.transactionController.getTransactions(...args),
      updateTransaction: (...args) =>
        this.transactionController.updateTransaction(...args),
      getFeatureFlags: () => selectSwapsChainFeatureFlags(store.getState()),
      getMetaMetricsProps: () => Promise.resolve({}), // Return MetaMetrics props once we enable HW wallets for smart transactions.
      trace: trace as TraceCallback,
    });

    const tokenSearchDiscoveryDataController =
      new TokenSearchDiscoveryDataController({
        tokenPricesService: codefiTokenApiV2,
        swapsSupportedChainIds,
        fetchSwapsTokensThresholdMs: AppConstants.SWAPS.CACHE_TOKENS_THRESHOLD,
        fetchTokens: swapsUtils.fetchTokens,
        messenger: this.controllerMessenger.getRestricted({
          name: 'TokenSearchDiscoveryDataController',
          allowedActions: ['CurrencyRateController:getState'],
          allowedEvents: [],
        }),
      });

    const existingControllersByName = {
      KeyringController: this.keyringController,
      NetworkController: networkController,
      PreferencesController: preferencesController,
      SmartTransactionsController: this.smartTransactionsController,
    };

    const initRequest = {
      getState: () => store.getState(),
      getGlobalChainId: () => currentChainId,
    };

    const { controllersByName } = initModularizedControllers({
      controllerInitFunctions: {
        AccountsController: accountsControllerInit,
        AccountTreeController: accountTreeControllerInit,
        AppMetadataController: appMetadataControllerInit,
        ApprovalController: ApprovalControllerInit,
        GasFeeController: GasFeeControllerInit,
        TransactionController: TransactionControllerInit,
        SignatureController: SignatureControllerInit,
        CurrencyRateController: currencyRateControllerInit,
        MultichainNetworkController: multichainNetworkControllerInit,
        DeFiPositionsController: defiPositionsControllerInit,
        BridgeController: bridgeControllerInit,
        BridgeStatusController: bridgeStatusControllerInit,
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        ExecutionService: executionServiceInit,
        CronjobController: cronjobControllerInit,
        SnapController: snapControllerInit,
        SnapInterfaceController: snapInterfaceControllerInit,
        SnapsRegistry: snapsRegistryInit,
        NotificationServicesController: notificationServicesControllerInit,
        NotificationServicesPushController:
          notificationServicesPushControllerInit,
        WebSocketService: WebSocketServiceInit,
        ///: END:ONLY_INCLUDE_IF
        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
        MultichainAssetsController: multichainAssetsControllerInit,
        MultichainAssetsRatesController: multichainAssetsRatesControllerInit,
        MultichainBalancesController: multichainBalancesControllerInit,
        MultichainTransactionsController: multichainTransactionsControllerInit,
        MultichainAccountService: multichainAccountServiceInit,
        ///: END:ONLY_INCLUDE_IF
        SeedlessOnboardingController: seedlessOnboardingControllerInit,
        NetworkEnablementController: networkEnablementControllerInit,
        PerpsController: perpsControllerInit,
        RewardsController: rewardsControllerInit,
      },
      persistedState: initialState as EngineState,
      existingControllersByName,
      baseControllerMessenger: this.controllerMessenger,
      ...initRequest,
    });

    const accountsController = controllersByName.AccountsController;
    const accountTreeController = controllersByName.AccountTreeController;
    const approvalController = controllersByName.ApprovalController;
    const gasFeeController = controllersByName.GasFeeController;
    const signatureController = controllersByName.SignatureController;
    const transactionController = controllersByName.TransactionController;
    const seedlessOnboardingController =
      controllersByName.SeedlessOnboardingController;
    const perpsController = controllersByName.PerpsController;
    const rewardsController = controllersByName.RewardsController;

    // Initialize and store RewardsDataService
    this.rewardsDataService = new RewardsDataService({
      messenger: this.controllerMessenger.getRestricted({
        name: 'RewardsDataService',
        allowedActions: [],
        allowedEvents: [],
      }),
      fetch,
    });

    // Backwards compatibility for existing references
    this.accountsController = accountsController;
    this.gasFeeController = gasFeeController;
    this.transactionController = transactionController;

    const multichainNetworkController =
      controllersByName.MultichainNetworkController;
    const currencyRateController = controllersByName.CurrencyRateController;
    const bridgeController = controllersByName.BridgeController;

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    const cronjobController = controllersByName.CronjobController;
    const executionService = controllersByName.ExecutionService;
    const snapController = controllersByName.SnapController;
    const snapInterfaceController = controllersByName.SnapInterfaceController;
    const snapsRegistry = controllersByName.SnapsRegistry;
    const webSocketService = controllersByName.WebSocketService;
    const notificationServicesController =
      controllersByName.NotificationServicesController;
    const notificationServicesPushController =
      controllersByName.NotificationServicesPushController;
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const multichainAssetsController =
      controllersByName.MultichainAssetsController;
    const multichainAssetsRatesController =
      controllersByName.MultichainAssetsRatesController;
    const multichainBalancesController =
      controllersByName.MultichainBalancesController;
    const multichainTransactionsController =
      controllersByName.MultichainTransactionsController;
    const multichainAccountService = controllersByName.MultichainAccountService;
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const multichainRatesControllerMessenger =
      this.controllerMessenger.getRestricted({
        name: 'RatesController',
        allowedActions: [],
        allowedEvents: ['CurrencyRateController:stateChange'],
      });

    const multichainRatesController = createMultichainRatesController({
      messenger: multichainRatesControllerMessenger,
      initialState: initialState.RatesController,
    });

    const networkEnablementController =
      controllersByName.NetworkEnablementController;
    networkEnablementController.init();

    // Set up currency rate sync
    setupCurrencyRateSync(
      multichainRatesControllerMessenger,
      multichainRatesController,
    );
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    snapController.init();
    cronjobController.init();
    // Notification Setup
    notificationServicesController.init();
    // Notify Snaps that the app is active when the Engine is initialized.
    this.controllerMessenger.call('SnapController:setClientActive', true);
    ///: END:ONLY_INCLUDE_IF

    const nftController = new NftController({
      useIpfsSubdomains: false,
      messenger: this.controllerMessenger.getRestricted({
        name: 'NftController',
        allowedActions: [
          'AccountsController:getAccount',
          'AccountsController:getSelectedAccount',
          'ApprovalController:addRequest',
          'AssetsContractController:getERC721AssetName',
          'AssetsContractController:getERC721AssetSymbol',
          'AssetsContractController:getERC721TokenURI',
          'AssetsContractController:getERC721OwnerOf',
          'AssetsContractController:getERC1155BalanceOf',
          'AssetsContractController:getERC1155TokenURI',
          'NetworkController:getNetworkClientById',
          'NetworkController:findNetworkClientIdByChainId',
          'PhishingController:bulkScanUrls',
        ],
        allowedEvents: [
          'PreferencesController:stateChange',
          'AccountsController:selectedEvmAccountChange',
        ],
      }),
      state: initialState.NftController,
    });

    const tokensController = new TokensController({
      chainId: getGlobalChainId(networkController),
      // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
      provider: networkController.getProviderAndBlockTracker().provider,
      state: initialState.TokensController,
      messenger: this.controllerMessenger.getRestricted({
        name: 'TokensController',
        allowedActions: [
          'ApprovalController:addRequest',
          'NetworkController:getNetworkClientById',
          'AccountsController:getAccount',
          'AccountsController:getSelectedAccount',
          'AccountsController:listAccounts',
        ],
        allowedEvents: [
          'PreferencesController:stateChange',
          'NetworkController:networkDidChange',
          'NetworkController:stateChange',
          'TokenListController:stateChange',
          'AccountsController:selectedEvmAccountChange',
          'KeyringController:accountRemoved',
        ],
      }),
    });

    const earnController = new EarnController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'EarnController',
        allowedEvents: [
          'AccountsController:selectedAccountChange',
          'TransactionController:transactionConfirmed',
          'NetworkController:networkDidChange',
        ],
        allowedActions: [
          'AccountsController:getSelectedAccount',
          'NetworkController:getNetworkClientById',
        ],
      }),
      addTransactionFn: transactionController.addTransaction.bind(
        transactionController,
      ),
      selectedNetworkClientId: networkController.state.selectedNetworkClientId,
    });

    this.context = {
      KeyringController: this.keyringController,
      AccountTreeController: accountTreeController,
      AccountTrackerController: accountTrackerController,
      AddressBookController: new AddressBookController({
        messenger: this.controllerMessenger.getRestricted({
          name: 'AddressBookController',
          allowedActions: [],
          allowedEvents: [],
        }),
        state: initialState.AddressBookController,
      }),
      AppMetadataController: controllersByName.AppMetadataController,
      AssetsContractController: assetsContractController,
      NftController: nftController,
      TokensController: tokensController,
      TokenListController: tokenListController,
      TokenDetectionController: new TokenDetectionController({
        messenger: this.controllerMessenger.getRestricted({
          name: 'TokenDetectionController',
          allowedActions: [
            'AccountsController:getSelectedAccount',
            'NetworkController:getNetworkClientById',
            'NetworkController:getNetworkConfigurationByNetworkClientId',
            'NetworkController:getState',
            'KeyringController:getState',
            'PreferencesController:getState',
            'TokenListController:getState',
            'TokensController:getState',
            'TokensController:addDetectedTokens',
            'AccountsController:getAccount',
            'TokensController:addTokens',
            'NetworkController:findNetworkClientIdByChainId',
          ],
          allowedEvents: [
            'KeyringController:lock',
            'KeyringController:unlock',
            'PreferencesController:stateChange',
            'NetworkController:networkDidChange',
            'TokenListController:stateChange',
            'TokensController:stateChange',
            'AccountsController:selectedEvmAccountChange',
            'TransactionController:transactionConfirmed',
          ],
        }),
        trackMetaMetricsEvent: () =>
          MetaMetrics.getInstance().trackEvent(
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.TOKEN_DETECTED,
            )
              .addProperties({
                token_standard: 'ERC20',
                asset_type: 'token',
                chain_id: getDecimalChainId(
                  getGlobalChainId(networkController),
                ),
              })
              .build(),
          ),
        getBalancesInSingleCall:
          assetsContractController.getBalancesInSingleCall.bind(
            assetsContractController,
          ),
        platform: 'mobile',
        useAccountsAPI: true,
        disabled: false,
        useTokenDetection: () => selectUseTokenDetection(store.getState()),
        useExternalServices: () => isBasicFunctionalityToggleEnabled(),
      }),
      NftDetectionController: new NftDetectionController({
        messenger: this.controllerMessenger.getRestricted({
          name: 'NftDetectionController',
          allowedEvents: [
            'NetworkController:stateChange',
            'PreferencesController:stateChange',
          ],
          allowedActions: [
            'ApprovalController:addRequest',
            'NetworkController:getState',
            'NetworkController:getNetworkClientById',
            'PreferencesController:getState',
            'AccountsController:getSelectedAccount',
            'NetworkController:findNetworkClientIdByChainId',
          ],
        }),
        disabled: false,
        addNft: nftController.addNft.bind(nftController),
        getNftState: () => nftController.state,
      }),
      CurrencyRateController: currencyRateController,
      NetworkController: networkController,
      PhishingController: phishingController,
      PreferencesController: preferencesController,
      TokenBalancesController: new TokenBalancesController({
        messenger: this.controllerMessenger.getRestricted({
          name: 'TokenBalancesController',
          allowedActions: [
            'NetworkController:getNetworkClientById',
            'NetworkController:getState',
            'TokensController:getState',
            'PreferencesController:getState',
            'AccountsController:getSelectedAccount',
            'AccountsController:listAccounts',
            'AccountTrackerController:updateNativeBalances',
            'AccountTrackerController:updateStakedBalances',
          ],
          allowedEvents: [
            'TokensController:stateChange',
            'PreferencesController:stateChange',
            'NetworkController:stateChange',
            'KeyringController:accountRemoved',
          ],
        }),
        // TODO: This is long, can we decrease it?
        interval: 180000,
        state: initialState.TokenBalancesController,
        useAccountsAPI: false,
        allowExternalServices: () => isBasicFunctionalityToggleEnabled(),
        queryMultipleAccounts:
          preferencesController.state.isMultiAccountBalancesEnabled,
      }),
      TokenRatesController: new TokenRatesController({
        messenger: this.controllerMessenger.getRestricted({
          name: 'TokenRatesController',
          allowedActions: [
            'TokensController:getState',
            'NetworkController:getNetworkClientById',
            'NetworkController:getState',
            'AccountsController:getAccount',
            'AccountsController:getSelectedAccount',
          ],
          allowedEvents: [
            'TokensController:stateChange',
            'NetworkController:stateChange',
            'AccountsController:selectedEvmAccountChange',
          ],
        }),
        tokenPricesService: codefiTokenApiV2,
        interval: 30 * 60 * 1000,
        state: initialState.TokenRatesController || { marketData: {} },
      }),
      TransactionController: this.transactionController,
      SmartTransactionsController: this.smartTransactionsController,
      SwapsController: new SwapsController({
        clientId: AppConstants.SWAPS.CLIENT_ID,
        fetchAggregatorMetadataThreshold:
          AppConstants.SWAPS.CACHE_AGGREGATOR_METADATA_THRESHOLD,
        fetchTokensThreshold: AppConstants.SWAPS.CACHE_TOKENS_THRESHOLD,
        fetchTopAssetsThreshold: AppConstants.SWAPS.CACHE_TOP_ASSETS_THRESHOLD,
        supportedChainIds: swapsSupportedChainIds,
        // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
        messenger: this.controllerMessenger.getRestricted({
          name: 'SwapsController',
          // TODO: allow these internal calls once GasFeeController
          // export these action types and register its action handlers
          // allowedActions: [
          //   'GasFeeController:getEIP1559GasFeeEstimates',
          // ],
          allowedActions: ['NetworkController:getNetworkClientById'],
          allowedEvents: ['NetworkController:networkDidChange'],
        }),
        pollCountLimit: AppConstants.SWAPS.POLL_COUNT_LIMIT,
        // TODO: Remove once GasFeeController exports this action type
        fetchGasFeeEstimates: () =>
          this.gasFeeController.fetchGasFeeEstimates(),
        fetchEstimatedMultiLayerL1Fee,
      }),
      GasFeeController: this.gasFeeController,
      ApprovalController: approvalController,
      PermissionController: permissionController,
      RemoteFeatureFlagController: remoteFeatureFlagController,
      SelectedNetworkController: selectedNetworkController,
      SignatureController: signatureController,
      TokenSearchDiscoveryController: tokenSearchDiscoveryController,
      LoggingController: loggingController,
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      CronjobController: cronjobController,
      ExecutionService: executionService,
      SnapController: snapController,
      SnapInterfaceController: snapInterfaceController,
      SnapsRegistry: snapsRegistry,
      SubjectMetadataController: this.subjectMetadataController,
      AuthenticationController: authenticationController,
      UserStorageController: userStorageController,
      WebSocketService: webSocketService,
      NotificationServicesController: notificationServicesController,
      NotificationServicesPushController: notificationServicesPushController,
      ///: END:ONLY_INCLUDE_IF
      AccountsController: accountsController,
      PPOMController: new PPOMController({
        chainId: getGlobalChainId(networkController),
        blockaidPublicKey: process.env.BLOCKAID_PUBLIC_KEY as string,
        cdnBaseUrl: process.env.BLOCKAID_FILE_CDN as string,
        // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
        messenger: this.controllerMessenger.getRestricted({
          name: 'PPOMController',
          allowedActions: ['NetworkController:getNetworkClientById'],
          allowedEvents: [`${networkController.name}:networkDidChange`],
        }),
        onPreferencesChange: (listener) =>
          this.controllerMessenger.subscribe(
            `${preferencesController.name}:stateChange`,
            listener,
          ),
        // TODO: Replace "any" with type
        provider:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          networkController.getProviderAndBlockTracker().provider as any,
        ppomProvider: {
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          PPOM: PPOM as any,
          ppomInit,
        },
        storageBackend: new RNFSStorageBackend('PPOMDB'),
        securityAlertsEnabled:
          initialState.PreferencesController?.securityAlertsEnabled ?? false,
        state: initialState.PPOMController,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nativeCrypto: Crypto as any,
      }),
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      MultichainBalancesController: multichainBalancesController,
      RatesController: multichainRatesController,
      MultichainAssetsController: multichainAssetsController,
      MultichainAssetsRatesController: multichainAssetsRatesController,
      MultichainTransactionsController: multichainTransactionsController,
      MultichainAccountService: multichainAccountService,
      ///: END:ONLY_INCLUDE_IF
      TokenSearchDiscoveryDataController: tokenSearchDiscoveryDataController,
      MultichainNetworkController: multichainNetworkController,
      BridgeController: bridgeController,
      BridgeStatusController: controllersByName.BridgeStatusController,
      EarnController: earnController,
      DeFiPositionsController: controllersByName.DeFiPositionsController,
      SeedlessOnboardingController: seedlessOnboardingController,
      NetworkEnablementController: networkEnablementController,
      PerpsController: perpsController,
      RewardsController: rewardsController,
    };

    const childControllers = Object.assign({}, this.context);
    STATELESS_NON_CONTROLLER_NAMES.forEach((name) => {
      if (name in childControllers && childControllers[name]) {
        delete childControllers[name];
      }
    });
    this.datamodel = new ComposableController<EngineState, StatefulControllers>(
      {
        controllers: childControllers as StatefulControllers,
        messenger: this.controllerMessenger.getRestricted({
          name: 'ComposableController',
          allowedActions: [],
          allowedEvents: Array.from(BACKGROUND_STATE_CHANGE_EVENT_NAMES),
        }),
      },
    );

    const { NftController: nfts } = this.context;

    if (process.env.MM_OPENSEA_KEY) {
      nfts.setApiKey(process.env.MM_OPENSEA_KEY);
    }

    this.controllerMessenger.subscribe(
      'TransactionController:incomingTransactionsReceived',
      (incomingTransactions: TransactionMeta[]) => {
        NotificationManager.gotIncomingTransaction(incomingTransactions);
      },
    );

    this.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      (state: NetworkState) => {
        if (
          state.networksMetadata[state.selectedNetworkClientId].status ===
            NetworkStatus.Available &&
          getGlobalChainId(networkController) !== currentChainId
        ) {
          // We should add a state or event emitter saying the provider changed
          setTimeout(() => {
            this.configureControllersOnNetworkChange();
            currentChainId = getGlobalChainId(networkController);
          }, 500);
        }
      },
    );

    this.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      async () => {
        try {
          const networkId = await deprecatedGetNetworkId();
          store.dispatch(networkIdUpdated(networkId));
        } catch (error) {
          console.error(
            error,
            `Network ID not changed, current chainId: ${getGlobalChainId(
              networkController,
            )}`,
          );
        }
      },
    );

    this.controllerMessenger.subscribe(
      `${networkController.name}:networkWillChange`,
      () => {
        store.dispatch(networkIdWillUpdate());
      },
    );

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    this.controllerMessenger.subscribe(
      `${snapController.name}:snapTerminated`,
      (truncatedSnap) => {
        const pendingApprovals = this.controllerMessenger.call(
          'ApprovalController:getState',
        ).pendingApprovals;
        const approvals = Object.values(pendingApprovals).filter(
          (approval) =>
            approval.origin === truncatedSnap.id &&
            approval.type.startsWith(RestrictedMethods.snap_dialog),
        );
        for (const approval of approvals) {
          this.controllerMessenger.call<'ApprovalController:rejectRequest'>(
            'ApprovalController:rejectRequest',
            approval.id,
            new Error('Snap was terminated.'),
          );
        }
      },
    );

    this.appStateListener = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state !== 'active' && state !== 'background') {
          return;
        }
        // Notifies Snaps that the app may be in the background.
        // This is best effort as we cannot guarantee the messages are received in time.
        return this.controllerMessenger.call(
          'SnapController:setClientActive',
          state === 'active',
        );
      },
    );
    ///: END:ONLY_INCLUDE_IF

    // @TODO(snaps): This fixes an issue where `withKeyring` would lock the `KeyringController` mutex.
    // That meant that if a snap requested a keyring operation (like requesting entropy) while the `KeyringController` was locked,
    // it would cause a deadlock.
    // This is a temporary fix until we can refactor how we handle requests to the Snaps Keyring.
    const withSnapKeyring = async (
      operation: ({ keyring }: { keyring: unknown }) => void,
    ) => {
      const keyring = await this.getSnapKeyring();

      return operation({ keyring });
    };

    const multichainRouterMessenger = this.controllerMessenger.getRestricted({
      name: 'MultichainRouter',
      allowedActions: [
        `SnapController:getAll`,
        `SnapController:handleRequest`,
        `${permissionController.name}:getPermissions`,
        `AccountsController:listMultichainAccounts`,
      ],
      allowedEvents: [],
    }) as MultichainRouterMessenger;

    this.multichainRouter = new MultichainRouter({
      messenger: multichainRouterMessenger,
      withSnapKeyring:
        withSnapKeyring as MultichainRouterArgs['withSnapKeyring'],
    });

    this.configureControllersOnNetworkChange();
    this.startPolling();
    this.handleVaultBackup();

    Engine.instance = this;
  }

  handleVaultBackup() {
    this.controllerMessenger.subscribe(
      AppConstants.KEYRING_STATE_CHANGE_EVENT,
      (state: KeyringControllerState) => {
        if (!state.vault) {
          return;
        }

        // Back up vault if it exists
        backupVault(state)
          .then(() => {
            Logger.log('Engine', 'Vault back up successful');
          })
          .catch((error) => {
            Logger.error(error, 'Engine Vault backup failed');
          });
      },
    );
  }

  startPolling() {
    const { TransactionController } = this.context;

    TransactionController.stopIncomingTransactionPolling();

    // leaving the reference of TransactionController here, rather than importing it from utils to avoid circular dependency
    TransactionController.startIncomingTransactionPolling();

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    this.context.RatesController.start();
    ///: END:ONLY_INCLUDE_IF
  }

  configureControllersOnNetworkChange() {
    const { AccountTrackerController, NetworkController } = this.context;
    const { provider } = NetworkController.getProviderAndBlockTracker();

    // Skip configuration if this is called before the provider is initialized
    if (!provider) {
      return;
    }
    provider.sendAsync = provider.sendAsync.bind(provider);

    AccountTrackerController.refresh([
      NetworkController.state.networkConfigurationsByChainId[
        getGlobalChainId(NetworkController)
      ]?.rpcEndpoints?.[
        NetworkController.state.networkConfigurationsByChainId[
          getGlobalChainId(NetworkController)
        ]?.defaultRpcEndpointIndex
      ]?.networkClientId,
    ]);
  }

  getTotalEvmFiatAccountBalance = (
    account?: InternalAccount,
  ): {
    ethFiat: number;
    tokenFiat: number;
    tokenFiat1dAgo: number;
    ethFiat1dAgo: number;
    totalNativeTokenBalance: string;
    ticker: string;
  } => {
    const {
      CurrencyRateController,
      AccountsController,
      AccountTrackerController,
      TokenBalancesController,
      TokenRatesController,
      TokensController,
      NetworkController,
    } = this.context;

    const selectedInternalAccount =
      account ??
      AccountsController.getAccount(
        AccountsController.state.internalAccounts.selectedAccount,
      );

    if (!selectedInternalAccount) {
      return {
        ethFiat: 0,
        tokenFiat: 0,
        ethFiat1dAgo: 0,
        tokenFiat1dAgo: 0,
        totalNativeTokenBalance: '0',
        ticker: '',
      };
    }

    const selectedInternalAccountFormattedAddress = toFormattedAddress(
      selectedInternalAccount.address,
    );
    const { currentCurrency } = CurrencyRateController.state;
    const { settings: { showFiatOnTestnets } = {} } = store.getState();

    const { accountsByChainId } = AccountTrackerController.state;
    const { marketData } = TokenRatesController.state;

    let totalEthFiat = 0;
    let totalEthFiat1dAgo = 0;
    let totalTokenFiat = 0;
    let totalTokenFiat1dAgo = 0;
    let aggregatedNativeTokenBalance = '';
    let primaryTicker = '';

    const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;

    const networkConfigurations = Object.values(
      NetworkController.state.networkConfigurationsByChainId || {},
    );

    networkConfigurations.forEach((networkConfig) => {
      const { chainId } = networkConfig;
      const chainIdHex = toHexadecimal(chainId);

      if (isTestNet(chainId) && !showFiatOnTestnets) {
        return;
      }

      let ticker = '';
      try {
        const networkClientId =
          NetworkController.findNetworkClientIdByChainId(chainId);
        if (networkClientId) {
          const networkClient =
            NetworkController.getNetworkClientById(networkClientId);
          ticker = networkClient.configuration.ticker;
        }
      } catch (error) {
        return;
      }

      const conversionRate =
        CurrencyRateController.state?.currencyRates?.[ticker]?.conversionRate ??
        0;

      if (conversionRate === 0) {
        return;
      }

      if (!primaryTicker) {
        primaryTicker = ticker;
      }

      const accountData =
        accountsByChainId?.[chainIdHex]?.[
          selectedInternalAccountFormattedAddress
        ];
      if (accountData) {
        const balanceHex = accountData.balance;
        const balanceBN = hexToBN(balanceHex);

        const stakedBalanceBN = hexToBN(accountData.stakedBalance || '0x00');
        const totalAccountBalance = balanceBN
          .add(stakedBalanceBN)
          .toString('hex');

        const chainEthFiat = weiToFiatNumber(
          totalAccountBalance,
          conversionRate,
          decimalsToShow,
        );

        // Avoid NaN and Infinity values
        if (isFinite(chainEthFiat)) {
          totalEthFiat += chainEthFiat;
        }

        const tokenExchangeRates = marketData?.[chainIdHex];
        const ethPricePercentChange1d =
          tokenExchangeRates?.[zeroAddress() as Hex]?.pricePercentChange1d;

        let chainEthFiat1dAgo = chainEthFiat;
        if (
          ethPricePercentChange1d !== undefined &&
          isFinite(ethPricePercentChange1d) &&
          ethPricePercentChange1d !== -100
        ) {
          chainEthFiat1dAgo =
            chainEthFiat / (1 + ethPricePercentChange1d / 100);
        }

        if (isFinite(chainEthFiat1dAgo)) {
          totalEthFiat1dAgo += chainEthFiat1dAgo;
        }

        const chainNativeBalance = renderFromWei(balanceHex);
        if (chainNativeBalance && parseFloat(chainNativeBalance) > 0) {
          const currentAggregated = parseFloat(
            aggregatedNativeTokenBalance || '0',
          );
          aggregatedNativeTokenBalance = (
            currentAggregated + parseFloat(chainNativeBalance)
          ).toString();
        }
      }

      const tokens =
        TokensController.state.allTokens?.[chainIdHex]?.[
          selectedInternalAccount.address
        ] || [];
      const tokenExchangeRates = marketData?.[chainIdHex];

      if (tokens.length > 0) {
        const { tokenBalances: allTokenBalances } =
          TokenBalancesController.state;
        const tokenBalances =
          allTokenBalances?.[selectedInternalAccount.address as Hex]?.[
            chainId
          ] ?? {};

        tokens.forEach(
          (item: { address: string; balance?: string; decimals: number }) => {
            const exchangeRate =
              tokenExchangeRates?.[item.address as Hex]?.price;

            if (!exchangeRate || !isFinite(exchangeRate)) {
              return;
            }

            const tokenBalance =
              item.balance ||
              (item.address in tokenBalances
                ? renderFromTokenMinimalUnit(
                    tokenBalances[item.address as Hex],
                    item.decimals,
                  )
                : undefined);

            if (!tokenBalance) {
              return;
            }

            const tokenBalanceFiat = balanceToFiatNumber(
              tokenBalance,
              conversionRate,
              exchangeRate,
              decimalsToShow,
            );

            if (isFinite(tokenBalanceFiat)) {
              totalTokenFiat += tokenBalanceFiat;
            }

            const tokenPricePercentChange1d =
              tokenExchangeRates?.[item.address as Hex]?.pricePercentChange1d;
            let tokenBalance1dAgo = tokenBalanceFiat;

            if (
              tokenPricePercentChange1d !== undefined &&
              isFinite(tokenPricePercentChange1d) &&
              tokenPricePercentChange1d !== -100
            ) {
              tokenBalance1dAgo =
                tokenBalanceFiat / (1 + tokenPricePercentChange1d / 100);
            }

            if (isFinite(tokenBalance1dAgo)) {
              totalTokenFiat1dAgo += tokenBalance1dAgo;
            }
          },
        );
      }
    });

    return {
      ethFiat: totalEthFiat ?? 0,
      ethFiat1dAgo: totalEthFiat1dAgo ?? 0,
      tokenFiat: totalTokenFiat ?? 0,
      tokenFiat1dAgo: totalTokenFiat1dAgo ?? 0,
      totalNativeTokenBalance: aggregatedNativeTokenBalance ?? '0',
      ticker: primaryTicker,
    };
  };

  /**
   * Gets a subset of preferences from the PreferencesController to pass to a snap.
   */
  getPreferences = () => {
    const {
      securityAlertsEnabled,
      useTransactionSimulations,
      useTokenDetection,
      privacyMode,
      useNftDetection,
      displayNftMedia,
      isMultiAccountBalancesEnabled,
      showTestNetworks,
    } = this.context.PreferencesController.state;

    return {
      securityAlertsEnabled,
      useTransactionSimulations,
      useTokenDetection,
      privacyMode,
      useNftDetection,
      displayNftMedia,
      isMultiAccountBalancesEnabled,
      showTestNetworks,
    };
  };

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  getSnapKeyring = async () => {
    // TODO: Replace `getKeyringsByType` with `withKeyring`
    let [snapKeyring] = this.keyringController.getKeyringsByType(
      KeyringTypes.snap,
    );
    if (!snapKeyring) {
      await this.keyringController.addNewKeyring(KeyringTypes.snap);
      // TODO: Replace `getKeyringsByType` with `withKeyring`
      [snapKeyring] = this.keyringController.getKeyringsByType(
        KeyringTypes.snap,
      );
    }
    return snapKeyring;
  };

  /**
   * Removes an account from state / storage.
   *
   * @param {string} address - A hex address
   */
  removeAccount = async (address: string) => {
    const addressHex = toHex(address);
    // Remove all associated permissions
    await removeAccountsFromPermissions([addressHex]);
    // Remove account from the keyring
    await this.keyringController.removeAccount(addressHex);
  };
  ///: END:ONLY_INCLUDE_IF

  /**
   * Returns true or false whether the user has funds or not
   */
  hasFunds = () => {
    try {
      const {
        engine: { backgroundState },
      } = store.getState();
      // TODO: Check `allNfts[currentChainId]` property instead
      // @ts-expect-error This property does not exist
      const nfts = backgroundState.NftController.nfts;

      const { tokenBalances } = backgroundState.TokenBalancesController;

      let tokenFound = false;
      tokenLoop: for (const chains of Object.values(tokenBalances)) {
        for (const tokens of Object.values(chains)) {
          for (const balance of Object.values(tokens)) {
            if (!isZero(balance)) {
              tokenFound = true;
              break tokenLoop;
            }
          }
        }
      }

      const fiatBalance = this.getTotalEvmFiatAccountBalance() || 0;
      const totalFiatBalance = fiatBalance.ethFiat + fiatBalance.ethFiat;

      return totalFiatBalance > 0 || tokenFound || nfts.length > 0;
    } catch (e) {
      Logger.log('Error while getting user funds', e);
    }
  };

  resetState = async () => {
    // Whenever we are gonna start a new wallet
    // either imported or created, we need to
    // get rid of the old data from state
    const {
      TransactionController,
      TokensController,
      NftController,
      TokenBalancesController,
      TokenRatesController,
      PermissionController,
      // SelectedNetworkController,
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      SnapController,
      ///: END:ONLY_INCLUDE_IF
      LoggingController,
    } = this.context;

    // Remove all permissions.
    PermissionController?.clearState?.();
    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    await SnapController.clearState();
    ///: END:ONLY_INCLUDE_IF

    // Clear selected network
    // TODO implement this method on SelectedNetworkController
    // SelectedNetworkController.unsetAllDomains()

    //Clear assets info
    TokensController.resetState();
    NftController.resetState();

    TokenBalancesController.resetState();
    TokenRatesController.resetState();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (TransactionController as any).update(() => ({
      methodData: {},
      transactions: [],
      transactionBatches: [],
      lastFetchedBlockNumbers: {},
      submitHistory: [],
      swapsTransactions: {},
    }));

    LoggingController.clear();
  };

  removeAllListeners() {
    this.controllerMessenger.clearSubscriptions();

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    this.appStateListener?.remove();
    ///: END:ONLY_INCLUDE_IF
  }

  async destroyEngineInstance() {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(this.context).forEach((controller: any) => {
      if (controller.destroy) {
        controller.destroy();
      }
    });
    this.removeAllListeners();
    await this.resetState();

    Engine.instance = null;
  }

  rejectPendingApproval(
    id: string,
    reason: Error = providerErrors.userRejectedRequest(),
    opts: { ignoreMissing?: boolean; logErrors?: boolean } = {},
  ) {
    const { ApprovalController } = this.context;

    if (opts.ignoreMissing && !ApprovalController.has({ id })) {
      return;
    }

    try {
      ApprovalController.reject(id, reason);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (opts.logErrors !== false) {
        Logger.error(
          error,
          'Reject while rejecting pending connection request',
        );
      }
    }
  }

  async acceptPendingApproval(
    id: string,
    requestData?: Record<string, Json>,
    opts: AcceptOptions & { handleErrors?: boolean } = {
      waitForResult: false,
      deleteAfterResult: false,
      handleErrors: true,
    },
  ) {
    const { ApprovalController } = this.context;

    try {
      return await ApprovalController.accept(id, requestData, {
        waitForResult: opts.waitForResult,
        deleteAfterResult: opts.deleteAfterResult,
      });
    } catch (err) {
      if (opts.handleErrors === false) {
        throw err;
      }
    }
  }

  // This should be used instead of directly calling PreferencesController.setSelectedAddress or AccountsController.setSelectedAccount
  setSelectedAccount(address: string) {
    const { AccountsController, PreferencesController } = this.context;
    const account = AccountsController.getAccountByAddress(address);
    if (account) {
      AccountsController.setSelectedAccount(account.id);
      PreferencesController.setSelectedAddress(address);
    } else {
      throw new Error(`No account found for address: ${address}`);
    }
  }

  /**
   * This should be used instead of directly calling PreferencesController.setAccountLabel or AccountsController.setAccountName in order to keep the names in sync
   * We are currently incrementally migrating the accounts data to the AccountsController so we must keep these values
   * in sync until the migration is complete.
   */
  setAccountLabel(address: string, label: string) {
    const { AccountsController, PreferencesController } = this.context;
    const accountToBeNamed = AccountsController.getAccountByAddress(address);
    if (accountToBeNamed === undefined) {
      throw new Error(`No account found for address: ${address}`);
    }
    AccountsController.setAccountName(accountToBeNamed.id, label);
    PreferencesController.setAccountLabel(address, label);
  }
}

/**
 * Assert that the given Engine instance has been initialized
 *
 * @param instance - Either an Engine instance, or null
 */
function assertEngineExists(
  instance: Engine | null,
): asserts instance is Engine {
  if (!instance) {
    throw new Error('Engine does not exist');
  }
}

let instance: Engine | null;

export default {
  get context() {
    assertEngineExists(instance);
    return instance.context;
  },

  get controllerMessenger() {
    assertEngineExists(instance);
    return instance.controllerMessenger;
  },

  get state() {
    assertEngineExists(instance);
    const {
      AccountTrackerController,
      AddressBookController,
      AppMetadataController,
      SnapInterfaceController,
      NftController,
      TokenListController,
      CurrencyRateController,
      KeyringController,
      NetworkController,
      PreferencesController,
      PhishingController,
      RemoteFeatureFlagController,
      PPOMController,
      TokenBalancesController,
      TokenRatesController,
      TokenSearchDiscoveryController,
      TransactionController,
      SmartTransactionsController,
      SwapsController,
      GasFeeController,
      TokensController,
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      SnapController,
      CronjobController,
      SubjectMetadataController,
      AuthenticationController,
      UserStorageController,
      NotificationServicesController,
      NotificationServicesPushController,
      ///: END:ONLY_INCLUDE_IF
      PermissionController,
      SelectedNetworkController,
      ApprovalController,
      LoggingController,
      AccountsController,
      AccountTreeController,
      SignatureController,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      MultichainBalancesController,
      RatesController,
      MultichainAssetsController,
      MultichainAssetsRatesController,
      MultichainTransactionsController,
      ///: END:ONLY_INCLUDE_IF
      TokenSearchDiscoveryDataController,
      MultichainNetworkController,
      BridgeController,
      BridgeStatusController,
      EarnController,
      PerpsController,
      DeFiPositionsController,
      SeedlessOnboardingController,
      NetworkEnablementController,
      RewardsController,
    } = instance.datamodel.state;

    return {
      AccountTrackerController,
      AddressBookController,
      AppMetadataController,
      SnapInterfaceController,
      NftController,
      TokenListController,
      CurrencyRateController,
      KeyringController,
      NetworkController,
      PhishingController,
      RemoteFeatureFlagController,
      PPOMController,
      PreferencesController,
      TokenBalancesController,
      TokenRatesController,
      TokenSearchDiscoveryController,
      TokensController,
      TransactionController,
      SmartTransactionsController,
      SwapsController,
      GasFeeController,
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      SnapController,
      CronjobController,
      SubjectMetadataController,
      AuthenticationController,
      UserStorageController,
      NotificationServicesController,
      NotificationServicesPushController,
      ///: END:ONLY_INCLUDE_IF
      PermissionController,
      SelectedNetworkController,
      ApprovalController,
      LoggingController,
      AccountsController,
      AccountTreeController,
      SignatureController,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      MultichainBalancesController,
      RatesController,
      MultichainAssetsController,
      MultichainAssetsRatesController,
      MultichainTransactionsController,
      ///: END:ONLY_INCLUDE_IF
      TokenSearchDiscoveryDataController,
      MultichainNetworkController,
      BridgeController,
      BridgeStatusController,
      EarnController,
      PerpsController,
      DeFiPositionsController,
      SeedlessOnboardingController,
      NetworkEnablementController,
      RewardsController,
    };
  },

  get datamodel() {
    assertEngineExists(instance);
    return instance.datamodel;
  },

  getTotalEvmFiatAccountBalance(account?: InternalAccount) {
    assertEngineExists(instance);
    return instance.getTotalEvmFiatAccountBalance(account);
  },

  hasFunds() {
    assertEngineExists(instance);
    return instance.hasFunds();
  },

  resetState() {
    assertEngineExists(instance);
    return instance.resetState();
  },

  destroyEngine: async () => {
    await instance?.destroyEngineInstance();
    instance = null;
  },

  init(
    state: Partial<EngineState> | undefined,
    keyringState: KeyringControllerState | null = null,
    metaMetricsId?: string,
  ) {
    instance =
      Engine.instance || new Engine(state, keyringState, metaMetricsId);
    Object.freeze(instance);
    return instance;
  },

  acceptPendingApproval: async (
    id: string,
    requestData?: Record<string, Json>,
    opts?: AcceptOptions & { handleErrors?: boolean },
  ) => instance?.acceptPendingApproval(id, requestData, opts),

  rejectPendingApproval: (
    id: string,
    reason: Error,
    opts: {
      ignoreMissing?: boolean;
      logErrors?: boolean;
    } = {},
  ) => instance?.rejectPendingApproval(id, reason, opts),

  setSelectedAddress: (address: string) => {
    assertEngineExists(instance);
    instance.setSelectedAccount(address);
  },

  setAccountLabel: (address: string, label: string) => {
    assertEngineExists(instance);
    instance.setAccountLabel(address, label);
  },

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  getSnapKeyring: () => {
    assertEngineExists(instance);
    return instance.getSnapKeyring();
  },
  removeAccount: async (address: string) => {
    assertEngineExists(instance);
    return await instance.removeAccount(address);
  },
  ///: END:ONLY_INCLUDE_IF
};
