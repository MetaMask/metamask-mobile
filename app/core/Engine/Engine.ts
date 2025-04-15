/* eslint-disable @typescript-eslint/no-shadow */
import Crypto from 'react-native-quick-crypto';

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
  type TransactionParams,
} from '@metamask/transaction-controller';
import { GasFeeController } from '@metamask/gas-fee-controller';
import {
  AcceptOptions,
  ApprovalController,
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
import { getDecimalChainId, isTestNet } from '../../util/networks';
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
import {
  SignatureController,
  SignatureControllerOptions,
} from '@metamask/signature-controller';
import { Hex, Json } from '@metamask/utils';
import { providerErrors } from '@metamask/rpc-errors';

import { PPOM, ppomInit } from '../../lib/ppom/PPOMView';
import RNFSStorageBackend from '../../lib/ppom/ppom-storage-backend';
import { createRemoteFeatureFlagController } from './controllers/remote-feature-flag-controller';
import { captureException } from '@sentry/react-native';
import { lowerCase } from 'lodash';
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
import { ApprovalType, ChainId, handleFetch } from '@metamask/controller-utils';
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
} from './controllers/snaps';
///: END:ONLY_INCLUDE_IF
import { trace } from '../../util/trace';
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
} from './constants';
import {
  getGlobalChainId,
  getGlobalNetworkClientId,
} from '../../util/networks/global-network';
import { logEngineCreation } from './utils/logger';
import { initModularizedControllers } from './utils';
import { accountsControllerInit } from './controllers/accounts-controller';
import { createTokenSearchDiscoveryController } from './controllers/TokenSearchDiscoveryController';
import {
  BRIDGE_DEV_API_BASE_URL,
  BridgeClientId,
  BridgeController,
} from '@metamask/bridge-controller';
import { BridgeStatusController } from '@metamask/bridge-status-controller';
import { multichainNetworkControllerInit } from './controllers/multichain-network-controller/multichain-network-controller-init';
import { currencyRateControllerInit } from './controllers/currency-rate-controller/currency-rate-controller-init';
import { EarnController } from '@metamask/earn-controller';
import { TransactionControllerInit } from './controllers/transaction-controller';
import { GasFeeControllerInit } from './controllers/gas-fee-controller';
import I18n from '../../../locales/i18n';
import { Platform } from '@metamask/profile-sync-controller/sdk';
import { isProductSafetyDappScanningEnabled } from '../../util/phishingDetection';
import { getFailoverUrlsForInfuraNetwork } from '../../util/networks/customNetworks';
import {
  onRpcEndpointDegraded,
  onRpcEndpointUnavailable,
} from './controllers/network-controller/messenger-action-handlers';
import { INFURA_PROJECT_ID, NETWORKS_CHAIN_ID } from '../../constants/network';
import { getIsQuicknodeEndpointUrl } from './controllers/network-controller/utils';
import { appMetadataControllerInit } from './controllers/app-metadata-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { toFormattedAddress } from '../../util/address';

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
  subjectMetadataController: SubjectMetadataController;
  ///: END:ONLY_INCLUDE_IF

  accountsController: AccountsController;
  gasFeeController: GasFeeController;
  keyringController: KeyringController;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;

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

    const approvalController = new ApprovalController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'ApprovalController',
        allowedEvents: [],
        allowedActions: [],
      }),
      showApprovalRequest: () => undefined,
      typesExcludedFromRateLimiting: [
        ApprovalType.Transaction,
        ApprovalType.WatchAsset,
      ],
    });

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

    const networkControllerMessenger = this.controllerMessenger.getRestricted({
      name: 'NetworkController',
      allowedEvents: [],
      allowedActions: [],
    });

    const additionalDefaultNetworks = [ChainId['megaeth-testnet']];

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
    }

    const infuraProjectId = INFURA_PROJECT_ID || NON_EMPTY;
    const networkControllerOpts = {
      infuraProjectId,
      state: initialNetworkControllerState,
      messenger: networkControllerMessenger,
      getRpcServiceOptions: (rpcEndpointUrl: string) => {
        const commonOptions = {
          fetch: globalThis.fetch.bind(globalThis),
          btoa: globalThis.btoa.bind(globalThis),
        };

        if (getIsQuicknodeEndpointUrl(rpcEndpointUrl)) {
          return {
            ...commonOptions,
            policyOptions: {
              // There is currently a bug in the block tracker (and probably
              // also the middleware layers) that result in a flurry of retries
              // when an RPC endpoint goes down, causing us to pretty
              // immediately enter a 30-minute cooldown period during which all
              // requests will be dropped. This isn't a problem for Infura, as
              // we need a long cooldown anyway to prevent spamming it while it
              // is down. But Quicknode is a different story. When we fail over
              // to it, we expect it to be down at first while it is being
              // automatically activated. So dropping requests for a lengthy
              // period would defeat the point. Shortening the cooldown period
              // mitigates this problem.
              circuitBreakDuration: 5000,
            },
          };
        }

        return commonOptions;
      },
      additionalDefaultNetworks,
    };
    const networkController = new NetworkController(networkControllerOpts);
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
        });
      },
    );
    networkControllerMessenger.subscribe(
      'NetworkController:rpcEndpointDegraded',
      async ({ chainId, endpointUrl }) => {
        onRpcEndpointDegraded({
          chainId,
          endpointUrl,
          infuraProjectId,
          trackEvent: ({ event, properties }) => {
            const metricsEvent = MetricsEventBuilder.createEventBuilder(event)
              .addProperties(properties)
              .build();
            MetaMetrics.getInstance().trackEvent(metricsEvent);
          },
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
    const remoteFeatureFlagController = createRemoteFeatureFlagController({
      state: initialState.RemoteFeatureFlagController,
      messenger: this.controllerMessenger.getRestricted({
        name: 'RemoteFeatureFlagController',
        allowedActions: [],
        allowedEvents: [],
      }),
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
        'AccountsController:listMultichainAccounts',
        'SnapController:handleRequest',
        SnapControllerGetSnapAction,
      ],
      allowedEvents: [],
    });

    // Necessary to persist the keyrings and update the accounts both within the keyring controller and accounts controller
    const persistAndUpdateAccounts = async () => {
      await this.keyringController.persistAllKeyrings();
      await this.accountsController.updateAccounts();
    };

    additionalKeyrings.push(
      snapKeyringBuilder(snapKeyringBuildMessenger, {
        persistKeyringHelper: () => persistAndUpdateAccounts(),
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      getSnapState: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        SnapControllerGetSnapStateAction,
      ),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
        approvalController.addAndShowApprovalRequest({
          origin,
          type,
          requestData: { content, placeholder },
        }),
      showInAppNotification: (origin: string, args: NotificationArgs) => {
        Logger.log(
          'Snaps/ showInAppNotification called with args: ',
          args,
          ' and origin: ',
          origin,
        );
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
      requestUserApproval:
        approvalController.addAndShowApprovalRequest.bind(approvalController),
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
      state: initialState.AccountTrackerController ?? { accounts: {} },
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
          `${approvalController.name}:addRequest`,
          `${approvalController.name}:hasRequest`,
          `${approvalController.name}:acceptRequest`,
          `${approvalController.name}:rejectRequest`,
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
        getInternalAccounts: (...args) =>
          this.accountsController.listAccounts(...args),
        findNetworkClientIdByChainId:
          networkController.findNetworkClientIdByChainId.bind(
            networkController,
          ),
      }),
      // @ts-expect-error Typecast permissionType from getPermissionSpecifications to be of type PermissionType.RestrictedMethod
      permissionSpecifications: {
        ...getPermissionSpecifications({
          getAllAccounts: () => this.keyringController.getAccounts(),
          getInternalAccounts: (...args) =>
            this.accountsController.listAccounts(...args),
          captureKeyringTypesWithMissingIdentities: (
            internalAccounts = [],
            accounts = [],
          ) => {
            const accountsMissingIdentities = accounts.filter((address) => {
              const lowerCaseAddress = lowerCase(address);
              return !internalAccounts.some(
                (account) => account.address.toLowerCase() === lowerCaseAddress,
              );
            });
            const keyringTypesWithMissingIdentities =
              accountsMissingIdentities.map((address) =>
                this.keyringController.getAccountKeyringType(address),
              );

            const internalAccountCount = internalAccounts.length;

            const accountTrackerCount = Object.keys(
              accountTrackerController.state.accounts || {},
            ).length;

            captureException(
              new Error(
                `Attempt to get permission specifications failed because there were ${accounts.length} accounts, but ${internalAccountCount} identities, and the ${keyringTypesWithMissingIdentities} keyrings included accounts with missing identities. Meanwhile, there are ${accountTrackerCount} accounts in the account tracker.`,
              ),
            );
          },
        }),
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
      useRequestQueuePreference: !!process.env.MULTICHAIN_V1,
      // TODO we need to modify core PreferencesController for better cross client support
      onPreferencesStateChange: (
        listener: ({ useRequestQueue }: { useRequestQueue: boolean }) => void,
      ) => listener({ useRequestQueue: !!process.env.MULTICHAIN_V1 }),
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
      env: {
        isAccountSyncingEnabled: true,
      },
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
    });

    /* bridge controller Initialization */
    const bridgeController = new BridgeController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'BridgeController',
        allowedActions: [
          'AccountsController:getSelectedAccount',
          'NetworkController:findNetworkClientIdByChainId',
          'NetworkController:getState',
          'NetworkController:getNetworkClientById',
        ],
        allowedEvents: [],
      }),
      clientId: BridgeClientId.MOBILE,
      // TODO: change getLayer1GasFee type to match transactionController.getLayer1GasFee
      getLayer1GasFee: async ({
        transactionParams,
        chainId,
      }: {
        transactionParams: TransactionParams;
        chainId: ChainId;
      }) =>
        this.transactionController.getLayer1GasFee({
          transactionParams,
          chainId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any,
      fetchFn: handleFetch,
      config: {
        customBridgeApiBaseUrl: BRIDGE_DEV_API_BASE_URL,
      },
    });

    const bridgeStatusController = new BridgeStatusController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'BridgeStatusController',
        allowedActions: [
          'AccountsController:getSelectedAccount',
          'NetworkController:getNetworkClientById',
          'NetworkController:findNetworkClientIdByChainId',
          'NetworkController:getState',
          'TransactionController:getState',
        ],
        allowedEvents: [],
      }),
      clientId: BridgeClientId.MOBILE,
      fetchFn: fetch,
    });

    const existingControllersByName = {
      ApprovalController: approvalController,
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
        AppMetadataController: appMetadataControllerInit,
        GasFeeController: GasFeeControllerInit,
        TransactionController: TransactionControllerInit,
        CurrencyRateController: currencyRateControllerInit,
        MultichainNetworkController: multichainNetworkControllerInit,
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        ExecutionService: executionServiceInit,
        SnapController: snapControllerInit,
        CronjobController: cronjobControllerInit,
        SnapInterfaceController: snapInterfaceControllerInit,
        SnapsRegistry: snapsRegistryInit,
        NotificationServicesController: notificationServicesControllerInit,
        NotificationServicesPushController:
          notificationServicesPushControllerInit,
        ///: END:ONLY_INCLUDE_IF
        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
        MultichainAssetsController: multichainAssetsControllerInit,
        MultichainAssetsRatesController: multichainAssetsRatesControllerInit,
        MultichainBalancesController: multichainBalancesControllerInit,
        MultichainTransactionsController: multichainTransactionsControllerInit,
        ///: END:ONLY_INCLUDE_IF
      },
      persistedState: initialState as EngineState,
      existingControllersByName,
      baseControllerMessenger: this.controllerMessenger,
      ...initRequest,
    });

    const accountsController = controllersByName.AccountsController;
    const transactionController = controllersByName.TransactionController;
    const gasFeeController = controllersByName.GasFeeController;

    // Backwards compatibility for existing references
    this.accountsController = accountsController;
    this.gasFeeController = gasFeeController;
    this.transactionController = transactionController;

    const multichainNetworkController =
      controllersByName.MultichainNetworkController;
    const currencyRateController = controllersByName.CurrencyRateController;

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    const cronjobController = controllersByName.CronjobController;
    const executionService = controllersByName.ExecutionService;
    const snapController = controllersByName.SnapController;
    const snapInterfaceController = controllersByName.SnapInterfaceController;
    const snapsRegistry = controllersByName.SnapsRegistry;
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

    // Set up currency rate sync
    setupCurrencyRateSync(
      multichainRatesControllerMessenger,
      multichainRatesController,
    );
    ///: END:ONLY_INCLUDE_IF

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    // Notification Setup
    notificationServicesController.init();
    ///: END:ONLY_INCLUDE_IF

    const nftController = new NftController({
      chainId: getGlobalChainId(networkController),
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
        ],
        allowedEvents: [
          'PreferencesController:stateChange',
          'NetworkController:networkDidChange',
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
        ],
        allowedEvents: [
          'PreferencesController:stateChange',
          'NetworkController:networkDidChange',
          'NetworkController:stateChange',
          'TokenListController:stateChange',
          'AccountsController:selectedEvmAccountChange',
        ],
      }),
    });

    const earnController = new EarnController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'EarnController',
        allowedEvents: [
          'AccountsController:selectedAccountChange',
          'NetworkController:stateChange',
          'TransactionController:transactionConfirmed',
        ],
        allowedActions: [
          'AccountsController:getSelectedAccount',
          'NetworkController:getNetworkClientById',
          'NetworkController:getState',
        ],
      }),
    });

    this.context = {
      KeyringController: this.keyringController,
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
          ],
          allowedEvents: [
            'KeyringController:lock',
            'KeyringController:unlock',
            'PreferencesController:stateChange',
            'NetworkController:networkDidChange',
            'TokenListController:stateChange',
            'TokensController:stateChange',
            'AccountsController:selectedEvmAccountChange',
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
          ],
          allowedEvents: [
            'TokensController:stateChange',
            'PreferencesController:stateChange',
            'NetworkController:stateChange',
          ],
        }),
        // TODO: This is long, can we decrease it?
        interval: 180000,
        state: initialState.TokenBalancesController,
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
        supportedChainIds: [
          swapsUtils.ETH_CHAIN_ID,
          swapsUtils.BSC_CHAIN_ID,
          swapsUtils.SWAPS_TESTNET_CHAIN_ID,
          swapsUtils.POLYGON_CHAIN_ID,
          swapsUtils.AVALANCHE_CHAIN_ID,
          swapsUtils.ARBITRUM_CHAIN_ID,
          swapsUtils.OPTIMISM_CHAIN_ID,
          swapsUtils.ZKSYNC_ERA_CHAIN_ID,
          swapsUtils.LINEA_CHAIN_ID,
          swapsUtils.BASE_CHAIN_ID,
          NETWORKS_CHAIN_ID.SEI,
        ],
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
      SignatureController: new SignatureController({
        messenger: this.controllerMessenger.getRestricted({
          name: 'SignatureController',
          allowedActions: [
            `${approvalController.name}:addRequest`,
            `${this.keyringController.name}:signPersonalMessage`,
            `${this.keyringController.name}:signMessage`,
            `${this.keyringController.name}:signTypedMessage`,
            `${loggingController.name}:add`,
            `${networkController.name}:getNetworkClientById`,
          ],
          allowedEvents: [],
        }),
        // This casting expected due to mismatch of browser and react-native version of Sentry traceContext
        trace: trace as unknown as SignatureControllerOptions['trace'],
        decodingApiUrl: AppConstants.DECODING_API_URL,
        // TODO: check preferences useExternalServices
        isDecodeSignatureRequestEnabled: () =>
          preferencesController.state.useTransactionSimulations,
      }),
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
      ///: END:ONLY_INCLUDE_IF
      MultichainNetworkController: multichainNetworkController,
      BridgeController: bridgeController,
      BridgeStatusController: bridgeStatusController,
      EarnController: earnController,
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

    AccountTrackerController.refresh();
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

    if (selectedInternalAccount) {
      const selectedInternalAccountFormattedAddress = toFormattedAddress(
        selectedInternalAccount.address,
      );
      const { currentCurrency } = CurrencyRateController.state;
      const { chainId, ticker } = NetworkController.getNetworkClientById(
        getGlobalNetworkClientId(NetworkController),
      ).configuration;
      const { settings: { showFiatOnTestnets } = {} } = store.getState();

      if (isTestNet(chainId) && !showFiatOnTestnets) {
        return {
          ethFiat: 0,
          tokenFiat: 0,
          ethFiat1dAgo: 0,
          tokenFiat1dAgo: 0,
          totalNativeTokenBalance: '0',
          ticker: '',
        };
      }

      const conversionRate =
        CurrencyRateController.state?.currencyRates?.[ticker]?.conversionRate ??
        0;

      const { accountsByChainId } = AccountTrackerController.state;
      const chainIdHex = toHexadecimal(chainId);
      const tokens =
        TokensController.state.allTokens?.[chainIdHex]?.[
          selectedInternalAccount.address
        ] || [];
      const { marketData } = TokenRatesController.state;
      const tokenExchangeRates = marketData?.[toHexadecimal(chainId)];

      let ethFiat = 0;
      let ethFiat1dAgo = 0;
      let tokenFiat = 0;
      let tokenFiat1dAgo = 0;
      let totalNativeTokenBalance = '0';
      const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;
      if (
        accountsByChainId?.[toHexadecimal(chainId)]?.[
          selectedInternalAccountFormattedAddress
        ]
      ) {
        const balanceHex =
          accountsByChainId[toHexadecimal(chainId)][
            selectedInternalAccountFormattedAddress
          ].balance;

        const balanceBN = hexToBN(balanceHex);
        totalNativeTokenBalance = renderFromWei(balanceHex);

        // TODO - Non EVM accounts like BTC do not use hex formatted balances. We will need to modify this to use CAIP-2 identifiers in the future.
        const stakedBalanceBN = hexToBN(
          accountsByChainId[toHexadecimal(chainId)][
            selectedInternalAccountFormattedAddress
          ].stakedBalance || '0x00',
        );
        const totalAccountBalance = balanceBN
          .add(stakedBalanceBN)
          .toString('hex');
        ethFiat = weiToFiatNumber(
          totalAccountBalance,
          conversionRate,
          decimalsToShow,
        );
      }

      const ethPricePercentChange1d =
        tokenExchangeRates?.[zeroAddress() as Hex]?.pricePercentChange1d;

      ethFiat1dAgo =
        ethPricePercentChange1d !== undefined
          ? ethFiat / (1 + ethPricePercentChange1d / 100)
          : ethFiat;

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

            const tokenBalance =
              item.balance ||
              (item.address in tokenBalances
                ? renderFromTokenMinimalUnit(
                    tokenBalances[item.address as Hex],
                    item.decimals,
                  )
                : undefined);
            const tokenBalanceFiat = balanceToFiatNumber(
              // TODO: Fix this by handling or eliminating the undefined case
              // @ts-expect-error This variable can be `undefined`, which would break here.
              tokenBalance,
              conversionRate,
              exchangeRate,
              decimalsToShow,
            );

            const tokenPricePercentChange1d =
              tokenExchangeRates?.[item.address as Hex]?.pricePercentChange1d;

            const tokenBalance1dAgo =
              tokenPricePercentChange1d !== undefined
                ? tokenBalanceFiat / (1 + tokenPricePercentChange1d / 100)
                : tokenBalanceFiat;

            tokenFiat += tokenBalanceFiat;
            tokenFiat1dAgo += tokenBalance1dAgo;
          },
        );
      }

      return {
        ethFiat: ethFiat ?? 0,
        ethFiat1dAgo: ethFiat1dAgo ?? 0,
        tokenFiat: tokenFiat ?? 0,
        tokenFiat1dAgo: tokenFiat1dAgo ?? 0,
        totalNativeTokenBalance: totalNativeTokenBalance ?? '0',
        ticker,
      };
    }
    // if selectedInternalAccount is undefined, return default 0 value.
    return {
      ethFiat: 0,
      tokenFiat: 0,
      ethFiat1dAgo: 0,
      tokenFiat1dAgo: 0,
      totalNativeTokenBalance: '0',
      ticker: '',
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
    } = this.context.PreferencesController.state;

    return {
      securityAlertsEnabled,
      useTransactionSimulations,
      useTokenDetection,
      privacyMode,
      useNftDetection,
      displayNftMedia,
      isMultiAccountBalancesEnabled,
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
    // Remove all associated permissions
    await removeAccountsFromPermissions([address]);
    // Remove account from the keyring
    await this.keyringController.removeAccount(address as Hex);
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
    SnapController.clearState();
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
      lastFetchedBlockNumbers: {},
      submitHistory: [],
      swapsTransactions: {},
    }));

    LoggingController.clear();
  };

  removeAllListeners() {
    this.controllerMessenger.clearSubscriptions();
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
      SignatureController,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      MultichainBalancesController,
      RatesController,
      MultichainAssetsController,
      MultichainAssetsRatesController,
      MultichainTransactionsController,
      ///: END:ONLY_INCLUDE_IF
      MultichainNetworkController,
      BridgeController,
      BridgeStatusController,
      EarnController,
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
      SignatureController,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      MultichainBalancesController,
      RatesController,
      MultichainAssetsController,
      MultichainAssetsRatesController,
      MultichainTransactionsController,
      ///: END:ONLY_INCLUDE_IF
      MultichainNetworkController,
      BridgeController,
      BridgeStatusController,
      EarnController,
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
