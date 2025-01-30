/* eslint-disable @typescript-eslint/no-shadow */
import Crypto from 'react-native-quick-crypto';
import { scrypt } from 'react-native-fast-crypto';

import {
  AccountTrackerController,
  AssetsContractController,
  CurrencyRateController,
  NftController,
  NftDetectionController,
  TokenBalancesController,
  TokenDetectionController,
  TokenListController,
  TokenRatesController,
  TokensController,
  CodefiTokenPricesServiceV2,
} from '@metamask/assets-controllers';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { AppState } from 'react-native';
import PREINSTALLED_SNAPS from '../../lib/snaps/preinstalled-snaps';
///: END:ONLY_INCLUDE_IF
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
  NetworkController,
  NetworkControllerMessenger,
  NetworkState,
  NetworkStatus,
} from '@metamask/network-controller';
import { PhishingController } from '@metamask/phishing-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import {
  TransactionController,
  TransactionMeta,
  TransactionControllerOptions,
} from '@metamask/transaction-controller';
import { GasFeeController } from '@metamask/gas-fee-controller';
import {
  AcceptOptions,
  ApprovalController,
} from '@metamask/approval-controller';
import HDKeyring from '@metamask/eth-hd-keyring';
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
import {
  JsonSnapsRegistry,
  SnapController,
  SnapsRegistryMessenger,
} from '@metamask/snaps-controllers';

import { WebViewExecutionService } from '@metamask/snaps-controllers/react-native';
import type { NotificationArgs } from '@metamask/snaps-rpc-methods/dist/restricted/notify.cjs';
import { getSnapsWebViewPromise } from '../../lib/snaps';
import {
  buildSnapEndowmentSpecifications,
  buildSnapRestrictedMethodSpecifications,
} from '@metamask/snaps-rpc-methods';
import type { EnumToUnion, DialogType } from '@metamask/snaps-sdk';
// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
///: END:ONLY_INCLUDE_IF
import { MetaMaskKeyring as QRHardwareKeyring } from '@keystonehq/metamask-airgapped-keyring';
import { LoggingController } from '@metamask/logging-controller';
import {
  LedgerKeyring,
  LedgerMobileBridge,
  LedgerTransportMiddleware,
} from '@metamask/eth-ledger-bridge-keyring';
import { Encryptor, LEGACY_DERIVATION_OPTIONS, pbkdf2 } from '../Encryptor';
import {
  isMainnetByChainId,
  isTestNet,
  getDecimalChainId,
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
  addHexPrefix,
  hexToBN,
} from '../../util/number';
import NotificationManager from '../NotificationManager';
import Logger from '../../util/Logger';
import { isZero } from '../../util/lodash';
import { MetaMetricsEvents, MetaMetrics } from '../Analytics';

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  SnapBridge,
  ExcludedSnapEndowments,
  ExcludedSnapPermissions,
  EndowmentPermissions,
  detectSnapLocation,
} from '../Snaps';
import { getRpcMethodMiddleware } from '../RPCMethods/RPCMethodMiddleware';

import {
  AuthenticationController,
  UserStorageController,
} from '@metamask/profile-sync-controller';
import {
  NotificationServicesController,
  NotificationServicesPushController,
} from '@metamask/notification-services-controller';
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
import { hasProperty, Hex, Json } from '@metamask/utils';
import { providerErrors } from '@metamask/rpc-errors';

import { PPOM, ppomInit } from '../../lib/ppom/PPOMView';
import RNFSStorageBackend from '../../lib/ppom/ppom-storage-backend';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  AccountsControllerSetSelectedAccountAction,
  AccountsControllerGetAccountByAddressAction,
  AccountsControllerSetAccountNameAction,
  ///: END:ONLY_INCLUDE_IF
  AccountsControllerGetAccountAction,
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerListAccountsAction,
  AccountsControllerUpdateAccountMetadataAction,
  AccountsControllerSelectedEvmAccountChangeEvent,
  AccountsControllerSelectedAccountChangeEvent,
  AccountsControllerAccountAddedEvent,
  AccountsControllerAccountRenamedEvent,
} from './controllers/AccountsController/constants';
import { AccountsControllerMessenger } from '@metamask/accounts-controller';
import { createAccountsController } from './controllers/AccountsController/utils';
import { createRemoteFeatureFlagController } from './controllers/RemoteFeatureFlagController';
import { captureException } from '@sentry/react-native';
import { lowerCase } from 'lodash';
import {
  networkIdUpdated,
  networkIdWillUpdate,
} from '../../core/redux/slices/inpageProvider';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import { getAllowedSmartTransactionsChainIds } from '../../../app/constants/smartTransactions';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';
import { selectShouldUseSmartTransaction } from '../../selectors/smartTransactionsController';
import { selectSwapsChainFeatureFlags } from '../../reducers/swaps';
import {
  SmartTransactionStatuses,
  ClientId,
} from '@metamask/smart-transactions-controller/dist/types';
import { submitSmartTransactionHook } from '../../util/smart-transactions/smart-publish-hook';
import { zeroAddress } from 'ethereumjs-util';
import { ApprovalType, toChecksumHexAddress } from '@metamask/controller-utils';
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
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { HandleSnapRequestArgs } from '../Snaps/types';
import { handleSnapRequest } from '../Snaps/utils';
///: END:ONLY_INCLUDE_IF
import { getSmartTransactionMetricsProperties } from '../../util/smart-transactions';
import { trace } from '../../util/trace';
import { MetricsEventBuilder } from '../Analytics/MetricsEventBuilder';
import { JsonMap } from '../Analytics/MetaMetrics.types';
import {
  ControllerMessenger,
  EngineState,
  EngineContext,
  TransactionEventPayload,
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
  controllerMessenger: ControllerMessenger;
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
   * Object that runs and manages the execution of Snaps
   */
  snapExecutionService: WebViewExecutionService;
  snapController: SnapController;
  subjectMetadataController: SubjectMetadataController;

  ///: END:ONLY_INCLUDE_IF

  transactionController: TransactionController;
  smartTransactionsController: SmartTransactionsController;

  keyringController: KeyringController;

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

    const networkControllerOpts = {
      infuraProjectId: process.env.MM_INFURA_PROJECT_ID || NON_EMPTY,
      state: initialState.NetworkController,
      messenger: this.controllerMessenger.getRestricted({
        name: 'NetworkController',
        allowedEvents: [],
        allowedActions: [],
      }) as unknown as NetworkControllerMessenger,
      // Metrics event tracking is handled in this repository instead
      // TODO: Use events for controller metric events
      trackMetaMetricsEvent: () => {
        // noop
      },
    };
    const networkController = new NetworkController(networkControllerOpts);

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

    // Create AccountsController
    const accountsControllerMessenger: AccountsControllerMessenger =
      this.controllerMessenger.getRestricted({
        name: 'AccountsController',
        allowedEvents: [
          'SnapController:stateChange',
          'KeyringController:accountRemoved',
          'KeyringController:stateChange',
        ],
        allowedActions: [
          'KeyringController:getAccounts',
          'KeyringController:getKeyringsByType',
          'KeyringController:getKeyringForAccount',
        ],
      });
    const accountsController = createAccountsController({
      messenger: accountsControllerMessenger,
      initialState: initialState.AccountsController,
    });

    const nftController = new NftController({
      chainId: getGlobalChainId(networkController),
      useIpfsSubdomains: false,
      messenger: this.controllerMessenger.getRestricted({
        name: 'NftController',
        allowedActions: [
          `${approvalController.name}:addRequest`,
          `${networkController.name}:getNetworkClientById`,
          AccountsControllerGetAccountAction,
          AccountsControllerGetSelectedAccountAction,
          'AssetsContractController:getERC721AssetName',
          'AssetsContractController:getERC721AssetSymbol',
          'AssetsContractController:getERC721TokenURI',
          'AssetsContractController:getERC721OwnerOf',
          'AssetsContractController:getERC1155BalanceOf',
          'AssetsContractController:getERC1155TokenURI',
        ],
        allowedEvents: [
          'PreferencesController:stateChange',
          'NetworkController:networkDidChange',
          AccountsControllerSelectedEvmAccountChangeEvent,
        ],
      }),
      state: initialState.NftController,
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
    const tokensController = new TokensController({
      chainId: getGlobalChainId(networkController),
      // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
      provider: networkController.getProviderAndBlockTracker().provider,
      state: initialState.TokensController,
      messenger: this.controllerMessenger.getRestricted({
        name: 'TokensController',
        allowedActions: [
          `${approvalController.name}:addRequest`,
          'NetworkController:getNetworkClientById',
          AccountsControllerGetAccountAction,
          AccountsControllerGetSelectedAccountAction,
        ],
        allowedEvents: [
          'PreferencesController:stateChange',
          'NetworkController:networkDidChange',
          'NetworkController:stateChange',
          'TokenListController:stateChange',
          AccountsControllerSelectedEvmAccountChangeEvent,
        ],
      }),
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
    const currencyRateController = new CurrencyRateController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'CurrencyRateController',
        allowedActions: [`${networkController.name}:getNetworkClientById`],
        allowedEvents: [],
      }),
      // normalize `null` currencyRate to `0`
      // TODO: handle `null` currencyRate by hiding fiat values instead
      state: {
        ...initialState.CurrencyRateController,
        currencyRates: Object.fromEntries(
          Object.entries(
            initialState.CurrencyRateController?.currencyRates ?? {
              ETH: {
                conversionRate: 0,
                conversionDate: 0,
                usdConversionRate: null,
              },
            },
          ).map(([k, v]) => [
            k,
            { ...v, conversionRate: v.conversionRate ?? 0 },
          ]),
        ),
      },
    });

    const gasFeeController = new GasFeeController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'GasFeeController',
        allowedActions: [
          `${networkController.name}:getNetworkClientById`,
          `${networkController.name}:getEIP1559Compatibility`,
          `${networkController.name}:getState`,
        ],
        allowedEvents: [AppConstants.NETWORK_DID_CHANGE_EVENT],
      }),
      getProvider: () =>
        // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
        networkController.getProviderAndBlockTracker().provider,
      getCurrentNetworkEIP1559Compatibility: async () =>
        (await networkController.getEIP1559Compatibility()) ?? false,
      getCurrentNetworkLegacyGasAPICompatibility: () => {
        const chainId = getGlobalChainId(networkController);
        return (
          isMainnetByChainId(chainId) ||
          chainId === addHexPrefix(swapsUtils.BSC_CHAIN_ID) ||
          chainId === addHexPrefix(swapsUtils.POLYGON_CHAIN_ID)
        );
      },
      clientId: AppConstants.SWAPS.CLIENT_ID,
      legacyAPIEndpoint:
        'https://gas.api.cx.metamask.io/networks/<chain_id>/gasPrices',
      EIP1559APIEndpoint:
        'https://gas.api.cx.metamask.io/networks/<chain_id>/suggestedGasFees',
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

    const phishingController = new PhishingController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'PhishingController',
        allowedActions: [],
        allowedEvents: [],
      }),
    });
    phishingController.maybeUpdateState();

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
      new HDKeyring({
        cryptographicFunctions: { pbkdf2Sha512: pbkdf2 },
      });
    hdKeyringBuilder.type = HDKeyring.type;
    additionalKeyrings.push(hdKeyringBuilder);

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const snapKeyringBuildMessenger = this.controllerMessenger.getRestricted({
      name: 'SnapKeyringBuilder',
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
        AccountsControllerSetSelectedAccountAction,
        AccountsControllerGetAccountByAddressAction,
        AccountsControllerSetAccountNameAction,
      ],
      allowedEvents: [],
    });

    const getSnapController = () => this.snapController;

    // Necessary to persist the keyrings and update the accounts both within the keyring controller and accounts controller
    const persistAndUpdateAccounts = async () => {
      await this.keyringController.persistAllKeyrings();
      await accountsController.updateAccounts();
    };

    additionalKeyrings.push(
      snapKeyringBuilder(
        snapKeyringBuildMessenger,
        getSnapController,
        persistAndUpdateAccounts,
        (address) => this.removeAccount(address),
      ),
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
    });

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    /**
     * Gets the mnemonic of the user's primary keyring.
     */
    const getPrimaryKeyringMnemonic = () => {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [keyring]: any = this.keyringController.getKeyringsByType(
        KeyringTypes.hd,
      );
      if (!keyring.mnemonic) {
        throw new Error('Primary keyring mnemonic unavailable.');
      }

      return keyring.mnemonic;
    };

    const getAppState = () => {
      const state = AppState.currentState;
      return state === 'active';
    };

    const snapRestrictedMethods = {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      clearSnapState: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'SnapController:clearSnapState',
      ),
      getMnemonic: getPrimaryKeyringMnemonic.bind(this),
      getUnlockPromise: getAppState.bind(this),
      getSnap: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'SnapController:get',
      ),
      handleSnapRpcRequest: async (args: HandleSnapRequestArgs) =>
        await handleSnapRequest(this.controllerMessenger, args),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      getSnapState: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'SnapController:getSnapState',
      ),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      updateSnapState: this.controllerMessenger.call.bind(
        this.controllerMessenger,
        'SnapController:updateSnapState',
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
      hasPermission: (origin: string, target: string) =>
        this.controllerMessenger.call<'PermissionController:hasPermission'>(
          'PermissionController:hasPermission',
          origin,
          target,
        ),
      getClientCryptography: () => ({ pbkdf2Sha512: pbkdf2 }),
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
          AccountsControllerGetSelectedAccountAction,
          AccountsControllerListAccountsAction,
          'PreferencesController:getState',
          'NetworkController:getState',
          'NetworkController:getNetworkClientById',
        ],
        allowedEvents: [
          AccountsControllerSelectedEvmAccountChangeEvent,
          AccountsControllerSelectedAccountChangeEvent,
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
        getInternalAccounts:
          accountsController.listAccounts.bind(accountsController),
        findNetworkClientIdByChainId:
          networkController.findNetworkClientIdByChainId.bind(
            networkController,
          ),
      }),
      // @ts-expect-error Typecast permissionType from getPermissionSpecifications to be of type PermissionType.RestrictedMethod
      permissionSpecifications: {
        ...getPermissionSpecifications({
          getAllAccounts: () => this.keyringController.getAccounts(),
          getInternalAccounts:
            accountsController.listAccounts.bind(accountsController),
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

    const setupSnapProvider = (snapId: string, connectionStream: Duplex) => {
      Logger.log(
        '[ENGINE LOG] Engine+setupSnapProvider: Setup stream for Snap',
        snapId,
      );
      // TO DO:
      // Develop a simpler getRpcMethodMiddleware object for SnapBridge
      // Consider developing an abstract class to derived custom implementations for each use case
      const bridge = new SnapBridge({
        snapId,
        connectionStream,
        getRPCMethodMiddleware: ({ hostname, getProviderState }) =>
          getRpcMethodMiddleware({
            hostname,
            getProviderState,
            navigation: null,
            title: { current: 'Snap' },
            icon: { current: undefined },
            isHomepage: () => false,
            fromHomepage: { current: false },
            toggleUrlModal: () => null,
            wizardScrollAdjusted: { current: false },
            tabId: false,
            isWalletConnect: true,
            isMMSDK: false,
            url: { current: '' },
            analytics: {},
            injectHomePageScripts: () => null,
          }),
      });

      bridge.setupProviderConnection();
    };

    const requireAllowlist = process.env.METAMASK_BUILD_TYPE === 'main';
    const disableSnapInstallation = process.env.METAMASK_BUILD_TYPE === 'main';
    const allowLocalSnaps = process.env.METAMASK_BUILD_TYPE === 'flask';
    const snapsRegistryMessenger: SnapsRegistryMessenger =
      this.controllerMessenger.getRestricted({
        name: 'SnapsRegistry',
        allowedEvents: [],
        allowedActions: [],
      });
    const snapsRegistry = new JsonSnapsRegistry({
      state: initialState.SnapsRegistry,
      messenger: snapsRegistryMessenger,
      refetchOnAllowlistMiss: requireAllowlist,
      url: {
        registry: 'https://acl.execution.metamask.io/latest/registry.json',
        signature: 'https://acl.execution.metamask.io/latest/signature.json',
      },
      publicKey:
        '0x025b65308f0f0fb8bc7f7ff87bfc296e0330eee5d3c1d1ee4a048b2fd6a86fa0a6',
    });

    this.snapExecutionService = new WebViewExecutionService({
      messenger: this.controllerMessenger.getRestricted({
        name: 'ExecutionService',
        allowedActions: [],
        allowedEvents: [],
      }),
      setupSnapProvider: setupSnapProvider.bind(this),
      getWebView: () => getSnapsWebViewPromise,
    });

    const snapControllerMessenger = this.controllerMessenger.getRestricted({
      name: 'SnapController',
      allowedEvents: [
        'ExecutionService:unhandledError',
        'ExecutionService:outboundRequest',
        'ExecutionService:outboundResponse',
      ],
      allowedActions: [
        `${approvalController.name}:addRequest`,
        `${permissionController.name}:getEndowments`,
        `${permissionController.name}:getPermissions`,
        `${permissionController.name}:hasPermission`,
        `${permissionController.name}:hasPermissions`,
        `${permissionController.name}:requestPermissions`,
        `${permissionController.name}:revokeAllPermissions`,
        `${permissionController.name}:revokePermissions`,
        `${permissionController.name}:revokePermissionForAllSubjects`,
        `${permissionController.name}:getSubjectNames`,
        `${permissionController.name}:updateCaveat`,
        `${approvalController.name}:addRequest`,
        `${approvalController.name}:updateRequestState`,
        `${permissionController.name}:grantPermissions`,
        `${this.subjectMetadataController.name}:getSubjectMetadata`,
        `${this.subjectMetadataController.name}:addSubjectMetadata`,
        `${phishingController.name}:maybeUpdateState`,
        `${phishingController.name}:testOrigin`,
        `${snapsRegistry.name}:get`,
        `${snapsRegistry.name}:getMetadata`,
        `${snapsRegistry.name}:update`,
        'ExecutionService:executeSnap',
        'ExecutionService:terminateSnap',
        'ExecutionService:terminateAllSnaps',
        'ExecutionService:handleRpcRequest',
        'SnapsRegistry:get',
        'SnapsRegistry:getMetadata',
        'SnapsRegistry:update',
        'SnapsRegistry:resolveVersion',
      ],
    });

    this.snapController = new SnapController({
      environmentEndowmentPermissions: Object.values(EndowmentPermissions),
      excludedPermissions: {
        ...ExcludedSnapPermissions,
        ...ExcludedSnapEndowments,
      },
      featureFlags: {
        requireAllowlist,
        allowLocalSnaps,
        disableSnapInstallation,
      },
      state: initialState.SnapController || undefined,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messenger: snapControllerMessenger as any,
      detectSnapLocation,
      //@ts-expect-error types need to be aligned with snaps-controllers
      preinstalledSnaps: PREINSTALLED_SNAPS,
      //@ts-expect-error types need to be aligned between new encryptor and snaps-controllers
      encryptor,
      getMnemonic: getPrimaryKeyringMnemonic.bind(this),
      getFeatureFlags: () => ({
        disableSnaps: !isBasicFunctionalityToggleEnabled(),
      }),
      clientCryptography: {
        pbkdf2Sha512: pbkdf2,
      },
    });

    const authenticationController = new AuthenticationController.Controller({
      state: initialState.AuthenticationController,
      messenger: this.controllerMessenger.getRestricted({
        name: 'AuthenticationController',
        allowedActions: [
          'KeyringController:getState',
          'KeyringController:getAccounts',

          'SnapController:handleRequest',
          'UserStorageController:enableProfileSyncing',
        ],
        allowedEvents: ['KeyringController:unlock', 'KeyringController:lock'],
      }),
      metametrics: {
        agent: 'mobile',
        getMetaMetricsId: async () =>
          (await MetaMetrics.getInstance().getMetaMetricsId()) || '',
      },
    });

    const userStorageController = new UserStorageController.Controller({
      getMetaMetricsState: () => MetaMetrics.getInstance().isEnabled(),
      env: {
        isAccountSyncingEnabled: Boolean(process.env.IS_TEST),
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
        },
      },
      state: initialState.UserStorageController,
      messenger: this.controllerMessenger.getRestricted({
        name: 'UserStorageController',
        allowedActions: [
          'SnapController:handleRequest',
          'KeyringController:getState',
          'KeyringController:addNewAccount',
          'AuthenticationController:getBearerToken',
          'AuthenticationController:getSessionProfile',
          'AuthenticationController:isSignedIn',
          'AuthenticationController:performSignOut',
          'AuthenticationController:performSignIn',
          'NotificationServicesController:disableNotificationServices',
          'NotificationServicesController:selectIsNotificationServicesEnabled',
          AccountsControllerListAccountsAction,
          AccountsControllerUpdateAccountMetadataAction,
          'NetworkController:getState',
          'NetworkController:addNetwork',
          'NetworkController:removeNetwork',
          'NetworkController:updateNetwork',
        ],
        allowedEvents: [
          'KeyringController:unlock',
          'KeyringController:lock',
          AccountsControllerAccountAddedEvent,
          AccountsControllerAccountRenamedEvent,
          'NetworkController:networkRemoved',
        ],
      }),
      nativeScryptCrypto: scrypt,
    });

    const notificationServicesController =
      new NotificationServicesController.Controller({
        messenger: this.controllerMessenger.getRestricted({
          name: 'NotificationServicesController',
          allowedActions: [
            'KeyringController:getState',
            'KeyringController:getAccounts',
            'AuthenticationController:getBearerToken',
            'AuthenticationController:isSignedIn',
            'UserStorageController:enableProfileSyncing',
            'UserStorageController:getStorageKey',
            'UserStorageController:performGetStorage',
            'UserStorageController:performSetStorage',
            'NotificationServicesPushController:enablePushNotifications',
            'NotificationServicesPushController:disablePushNotifications',
            'NotificationServicesPushController:updateTriggerPushNotifications',
          ],
          allowedEvents: [
            'KeyringController:unlock',
            'KeyringController:lock',
            'KeyringController:stateChange',
          ],
        }),
        state: initialState.NotificationServicesController,
        env: {
          isPushIntegrated: false,
          featureAnnouncements: {
            platform: 'mobile',
            accessToken: process.env
              .FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN as string,
            spaceId: process.env.FEATURES_ANNOUNCEMENTS_SPACE_ID as string,
          },
        },
      });

    const notificationServicesPushControllerMessenger =
      this.controllerMessenger.getRestricted({
        name: 'NotificationServicesPushController',
        allowedActions: ['AuthenticationController:getBearerToken'],
        allowedEvents: [],
      });

    const notificationServicesPushController =
      new NotificationServicesPushController.Controller({
        messenger: notificationServicesPushControllerMessenger,
        state: initialState.NotificationServicesPushController || {
          fcmToken: '',
        },
        env: {
          apiKey: process.env.FIREBASE_API_KEY ?? '',
          authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? '',
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
          projectId: process.env.FIREBASE_PROJECT_ID ?? '',
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
          appId: process.env.FIREBASE_APP_ID ?? '',
          measurementId: process.env.FIREBASE_MEASUREMENT_ID ?? '',
          vapidKey: process.env.VAPID_KEY ?? '',
        },
        config: {
          isPushEnabled: true,
          platform: 'mobile',
          // TODO: Implement optionability for push notification handlers (depending of the platform) on the NotificationServicesPushController.
          onPushNotificationReceived: () => Promise.resolve(undefined),
          onPushNotificationClicked: () => Promise.resolve(undefined),
        },
      });
    ///: END:ONLY_INCLUDE_IF

    this.transactionController = new TransactionController({
      disableHistory: true,
      disableSendFlowHistory: true,
      disableSwaps: true,
      // @ts-expect-error TransactionController is missing networkClientId argument in type
      getCurrentNetworkEIP1559Compatibility:
        networkController.getEIP1559Compatibility.bind(networkController),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      getExternalPendingTransactions: (address: string) =>
        this.smartTransactionsController.getTransactions({
          addressFrom: address,
          status: SmartTransactionStatuses.PENDING,
        }),
      getGasFeeEstimates:
        gasFeeController.fetchGasFeeEstimates.bind(gasFeeController),
      // but only breaking change is Node version and bumped dependencies
      getNetworkClientRegistry:
        networkController.getNetworkClientRegistry.bind(networkController),
      getNetworkState: () => networkController.state,
      hooks: {
        publish: (transactionMeta) => {
          const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
            store.getState(),
          );

          return submitSmartTransactionHook({
            transactionMeta,
            transactionController: this.transactionController,
            smartTransactionsController: this.smartTransactionsController,
            shouldUseSmartTransaction,
            approvalController,
            // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
            controllerMessenger: this.controllerMessenger,
            featureFlags: selectSwapsChainFeatureFlags(store.getState()),
          }) as Promise<{ transactionHash: string }>;
        },
      },
      incomingTransactions: {
        isEnabled: () => {
          const currentHexChainId = getGlobalChainId(networkController);

          const showIncomingTransactions =
            preferencesController?.state?.showIncomingTransactions;

          return Boolean(
            hasProperty(showIncomingTransactions, currentChainId) &&
              showIncomingTransactions?.[currentHexChainId],
          );
        },
        updateTransactions: true,
      },
      isSimulationEnabled: () =>
        preferencesController.state.useTransactionSimulations,
      messenger: this.controllerMessenger.getRestricted({
        name: 'TransactionController',
        allowedActions: [
          AccountsControllerGetSelectedAccountAction,
          `${approvalController.name}:addRequest`,
          `${networkController.name}:getNetworkClientById`,
          `${networkController.name}:findNetworkClientIdByChainId`,
        ],
        allowedEvents: [`NetworkController:stateChange`],
      }),
      pendingTransactions: {
        isResubmitEnabled: () => false,
      },
      sign: this.keyringController.signTransaction.bind(
        this.keyringController,
      ) as unknown as TransactionControllerOptions['sign'],
      state: initialState.TransactionController,
    });

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
      getNonceLock: this.transactionController.getNonceLock.bind(
        this.transactionController,
      ),
      confirmExternalTransaction:
        this.transactionController.confirmExternalTransaction.bind(
          this.transactionController,
        ),
      trackMetaMetricsEvent: smartTransactionsControllerTrackMetaMetricsEvent,
      state: initialState.SmartTransactionsController,
      messenger: this.controllerMessenger.getRestricted({
        name: 'SmartTransactionsController',
        allowedActions: [
          'NetworkController:getNetworkClientById',
          'NetworkController:getState',
        ],
        allowedEvents: ['NetworkController:stateChange'],
      }),
      getTransactions: this.transactionController.getTransactions.bind(
        this.transactionController,
      ),
      updateTransaction: this.transactionController.updateTransaction.bind(
        this.transactionController,
      ),
      getFeatureFlags: () => selectSwapsChainFeatureFlags(store.getState()),
      getMetaMetricsProps: () => Promise.resolve({}), // Return MetaMetrics props once we enable HW wallets for smart transactions.
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
      AssetsContractController: assetsContractController,
      NftController: nftController,
      TokensController: tokensController,
      TokenListController: tokenListController,
      TokenDetectionController: new TokenDetectionController({
        messenger: this.controllerMessenger.getRestricted({
          name: 'TokenDetectionController',
          allowedActions: [
            AccountsControllerGetSelectedAccountAction,
            'NetworkController:getNetworkClientById',
            'NetworkController:getNetworkConfigurationByNetworkClientId',
            'NetworkController:getState',
            'KeyringController:getState',
            'PreferencesController:getState',
            'TokenListController:getState',
            'TokensController:getState',
            'TokensController:addDetectedTokens',
            AccountsControllerGetAccountAction,
          ],
          allowedEvents: [
            'KeyringController:lock',
            'KeyringController:unlock',
            'PreferencesController:stateChange',
            'NetworkController:networkDidChange',
            'TokenListController:stateChange',
            'TokensController:stateChange',
            AccountsControllerSelectedEvmAccountChangeEvent,
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
            AccountsControllerGetSelectedAccountAction,
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
            AccountsControllerGetAccountAction,
            AccountsControllerGetSelectedAccountAction,
          ],
          allowedEvents: [
            'TokensController:stateChange',
            'NetworkController:stateChange',
            AccountsControllerSelectedEvmAccountChangeEvent,
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
        ],
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
        fetchGasFeeEstimates: () => gasFeeController.fetchGasFeeEstimates(),
        fetchEstimatedMultiLayerL1Fee,
      }),
      GasFeeController: gasFeeController,
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
      LoggingController: loggingController,
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      SnapController: this.snapController,
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
    this._addTransactionControllerListeners();

    Engine.instance = this;
  }

  // Logs the "Transaction Finalized" event after a transaction was either confirmed, dropped or failed.
  _handleTransactionFinalizedEvent = async (
    transactionEventPayload: TransactionEventPayload,
    properties: JsonMap,
  ) => {
    const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
      store.getState(),
    );
    if (
      !shouldUseSmartTransaction ||
      !transactionEventPayload.transactionMeta
    ) {
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.TRANSACTION_FINALIZED,
        )
          .addProperties(properties)
          .build(),
      );
      return;
    }
    const { transactionMeta } = transactionEventPayload;
    const { SmartTransactionsController } = this.context;
    const waitForSmartTransaction = true;
    const smartTransactionMetricsProperties =
      await getSmartTransactionMetricsProperties(
        SmartTransactionsController,
        transactionMeta,
        waitForSmartTransaction,
        this.controllerMessenger,
      );
    MetaMetrics.getInstance().trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.TRANSACTION_FINALIZED,
      )
        .addProperties(smartTransactionMetricsProperties)
        .addProperties(properties)
        .build(),
    );
  };

  _handleTransactionDropped = async (
    transactionEventPayload: TransactionEventPayload,
  ) => {
    const properties = { status: 'dropped' };
    await this._handleTransactionFinalizedEvent(
      transactionEventPayload,
      properties,
    );
  };

  _handleTransactionConfirmed = async (transactionMeta: TransactionMeta) => {
    const properties = { status: 'confirmed' };
    await this._handleTransactionFinalizedEvent(
      { transactionMeta },
      properties,
    );
  };

  _handleTransactionFailed = async (
    transactionEventPayload: TransactionEventPayload,
  ) => {
    const properties = { status: 'failed' };
    await this._handleTransactionFinalizedEvent(
      transactionEventPayload,
      properties,
    );
  };

  _addTransactionControllerListeners() {
    this.controllerMessenger.subscribe(
      'TransactionController:transactionDropped',
      this._handleTransactionDropped,
    );

    this.controllerMessenger.subscribe(
      'TransactionController:transactionConfirmed',
      this._handleTransactionConfirmed,
    );

    this.controllerMessenger.subscribe(
      'TransactionController:transactionFailed',
      this._handleTransactionFailed,
    );
  }

  handleVaultBackup() {
    this.controllerMessenger.subscribe(
      AppConstants.KEYRING_STATE_CHANGE_EVENT,
      (state: KeyringControllerState) =>
        backupVault(state)
          .then((result) => {
            if (result.success) {
              Logger.log('Engine', 'Vault back up successful');
            } else {
              Logger.log('Engine', 'Vault backup failed', result.error);
            }
          })
          .catch((error) => {
            Logger.error(error, 'Engine Vault backup failed');
          }),
    );
  }

  startPolling() {
    const { NetworkController, TransactionController } = this.context;

    const chainId = getGlobalChainId(NetworkController);

    TransactionController.stopIncomingTransactionPolling();

    // leaving the reference of TransactionController here, rather than importing it from utils to avoid circular dependency
    TransactionController.startIncomingTransactionPolling([chainId]);
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

  getTotalFiatAccountBalance = (): {
    ethFiat: number;
    tokenFiat: number;
    tokenFiat1dAgo: number;
    ethFiat1dAgo: number;
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

    const selectedInternalAccount = AccountsController.getAccount(
      AccountsController.state.internalAccounts.selectedAccount,
    );

    if (selectedInternalAccount) {
      const selectSelectedInternalAccountFormattedAddress =
        toChecksumHexAddress(selectedInternalAccount.address);
      const { currentCurrency } = CurrencyRateController.state;
      const { chainId, ticker } = NetworkController.getNetworkClientById(
        getGlobalNetworkClientId(NetworkController),
      ).configuration;
      const { settings: { showFiatOnTestnets } = {} } = store.getState();

      if (isTestNet(chainId) && !showFiatOnTestnets) {
        return { ethFiat: 0, tokenFiat: 0, ethFiat1dAgo: 0, tokenFiat1dAgo: 0 };
      }

      const conversionRate =
        CurrencyRateController.state?.currencyRates?.[ticker]?.conversionRate ??
        0;

      const { accountsByChainId } = AccountTrackerController.state;
      const { tokens } = TokensController.state;
      const { marketData } = TokenRatesController.state;
      const tokenExchangeRates = marketData?.[toHexadecimal(chainId)];

      let ethFiat = 0;
      let ethFiat1dAgo = 0;
      let tokenFiat = 0;
      let tokenFiat1dAgo = 0;
      const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;
      if (
        accountsByChainId?.[toHexadecimal(chainId)]?.[
          selectSelectedInternalAccountFormattedAddress
        ]
      ) {
        // TODO - Non EVM accounts like BTC do not use hex formatted balances. We will need to modify this to use CAIP-2 identifiers in the future.
        const balanceBN = hexToBN(
          accountsByChainId[toHexadecimal(chainId)][
            selectSelectedInternalAccountFormattedAddress
          ].balance,
        );
        // TODO - Non EVM accounts like BTC do not use hex formatted balances. We will need to modify this to use CAIP-2 identifiers in the future.
        const stakedBalanceBN = hexToBN(
          accountsByChainId[toHexadecimal(chainId)][
            selectSelectedInternalAccountFormattedAddress
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
      };
    }
    // if selectedInternalAccount is undefined, return default 0 value.
    return {
      ethFiat: 0,
      tokenFiat: 0,
      ethFiat1dAgo: 0,
      tokenFiat1dAgo: 0,
    };
  };

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  getSnapKeyring = async () => {
    let [snapKeyring] = this.keyringController.getKeyringsByType(
      KeyringTypes.snap,
    );
    if (!snapKeyring) {
      snapKeyring = await this.keyringController.addNewKeyring(
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
    return address;
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

      const fiatBalance = this.getTotalFiatAccountBalance() || 0;
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
    } = instance.datamodel.state;

    return {
      AccountTrackerController,
      AddressBookController,
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
    };
  },

  get datamodel() {
    assertEngineExists(instance);
    return instance.datamodel;
  },

  getTotalFiatAccountBalance() {
    assertEngineExists(instance);
    return instance.getTotalFiatAccountBalance();
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
    instance = Engine.instance || new Engine(state, keyringState, metaMetricsId);
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
