/* eslint-disable @typescript-eslint/no-shadow */
import Crypto from 'react-native-quick-crypto';
import {
  AccountTrackerController,
  AccountTrackerState,
  AssetsContractController,
  CurrencyRateController,
  CurrencyRateState,
  CurrencyRateStateChange,
  GetCurrencyRateState,
  GetTokenListState,
  NftController,
  NftDetectionController,
  NftState,
  TokenBalancesController,
  TokenBalancesControllerEvents,
  TokenDetectionController,
  TokenListController,
  TokenListState,
  TokenRatesController,
  TokenRatesState,
  TokensController,
  TokensState,
  CodefiTokenPricesServiceV2,
  TokensControllerActions,
  TokensControllerEvents,
  TokenListControllerActions,
  TokenListControllerEvents,
  TokenBalancesControllerState,
} from '@metamask/assets-controllers';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { AppState } from 'react-native';
import PREINSTALLED_SNAPS from '../lib/snaps/preinstalled-snaps';
///: END:ONLY_INCLUDE_IF
import {
  AddressBookController,
  AddressBookState,
} from '@metamask/address-book-controller';
import {
  BaseState,
  ControllerMessenger,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import { ComposableController } from '@metamask/composable-controller';
import {
  KeyringController,
  KeyringControllerState,
  KeyringControllerActions,
  KeyringControllerEvents,
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  KeyringTypes,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-controller';
import {
  NetworkController,
  NetworkControllerActions,
  NetworkControllerEvents,
  NetworkState,
  NetworkStatus,
} from '@metamask/network-controller';
import {
  PhishingController,
  PhishingControllerState,
} from '@metamask/phishing-controller';
import {
  PreferencesController,
  PreferencesControllerActions,
  PreferencesControllerEvents,
  PreferencesState,
} from '@metamask/preferences-controller';
import {
  TransactionController,
  TransactionState,
} from '@metamask/transaction-controller';
import {
  GasFeeController,
  GasFeeState,
  GasFeeStateChange,
  GetGasFeeState,
} from '@metamask/gas-fee-controller';
import {
  AcceptOptions,
  ApprovalController,
  ApprovalControllerActions,
  ApprovalControllerEvents,
  ApprovalControllerState,
} from '@metamask/approval-controller';
import {
  PermissionController,
  PermissionControllerActions,
  PermissionControllerEvents,
  PermissionControllerState,
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  SubjectMetadataController,
  SubjectMetadataControllerActions,
  SubjectMetadataControllerEvents,
  SubjectMetadataControllerState,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/permission-controller';
import SwapsController, { swapsUtils } from '@metamask/swaps-controller';
import {
  PPOMController,
  PPOMControllerEvents,
  PPOMState,
} from '@metamask/ppom-validator';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import {
  JsonSnapsRegistry,
  AllowedActions as SnapsAllowedActions,
  AllowedEvents as SnapsAllowedEvents,
  SnapController,
  SnapsRegistryState,
  SnapControllerEvents,
  SnapControllerActions,
  PersistedSnapControllerState,
  SnapsRegistryMessenger,
} from '@metamask/snaps-controllers';

import { WebViewExecutionService } from '@metamask/snaps-controllers/react-native';
import { NotificationArgs } from '@metamask/snaps-rpc-methods/dist/types/restricted/notify';
import { getSnapsWebViewPromise } from '../lib/snaps';
import {
  buildSnapEndowmentSpecifications,
  buildSnapRestrictedMethodSpecifications,
} from '@metamask/snaps-rpc-methods';
import type { EnumToUnion, DialogType } from '@metamask/snaps-sdk';
// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';
///: END:ONLY_INCLUDE_IF
import { MetaMaskKeyring as QRHardwareKeyring } from '@keystonehq/metamask-airgapped-keyring';
import {
  LoggingController,
  LoggingControllerState,
  LoggingControllerActions,
} from '@metamask/logging-controller';
import LedgerKeyring from '@consensys/ledgerhq-metamask-keyring';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from './Encryptor';
import {
  isMainnetByChainId,
  fetchEstimatedMultiLayerL1Fee,
  isTestNet,
  deprecatedGetNetworkId,
  getDecimalChainId,
} from '../util/networks';
import AppConstants from './AppConstants';
import { store } from '../store';
import {
  renderFromTokenMinimalUnit,
  balanceToFiatNumber,
  weiToFiatNumber,
  toHexadecimal,
  addHexPrefix,
} from '../util/number';
import NotificationManager from './NotificationManager';
import Logger from '../util/Logger';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { EndowmentPermissions } from '../constants/permissions';
///: END:ONLY_INCLUDE_IF
import { isZero } from '../util/lodash';
import { MetaMetricsEvents, MetaMetrics } from './Analytics';

///: BEGIN:ONLY_INCLUDE_IF(snaps)
import {
  SnapBridge,
  ExcludedSnapEndowments,
  ExcludedSnapPermissions,
  detectSnapLocation,
  fetchFunction,
  DetectSnapLocationOptions,
} from './Snaps';
import { getRpcMethodMiddleware } from './RPCMethods/RPCMethodMiddleware';
///: END:ONLY_INCLUDE_IF
import { isBlockaidFeatureEnabled } from '../util/blockaid';
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from './Permissions/specifications.js';
import { backupVault } from './BackupVault';
import {
  SignatureController,
  SignatureControllerActions,
  SignatureControllerEvents,
} from '@metamask/signature-controller';
import { hasProperty, Json } from '@metamask/utils';
// TODO: Export this type from the package directly
import { SwapsState } from '@metamask/swaps-controller/dist/SwapsController';
import { providerErrors } from '@metamask/rpc-errors';

import { PPOM, ppomInit } from '../lib/ppom/PPOMView';
import RNFSStorageBackend from '../lib/ppom/ppom-storage-backend';
import {
  AccountsController,
  AccountsControllerActions,
  AccountsControllerEvents,
  AccountsControllerMessenger,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import { lowerCase } from 'lodash';
import {
  networkIdUpdated,
  networkIdWillUpdate,
} from '../core/redux/slices/inpageProvider';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import { NETWORKS_CHAIN_ID } from '../../app/constants/network';
import { selectShouldUseSmartTransaction } from '../selectors/smartTransactionsController';
import { selectSwapsChainFeatureFlags } from '../reducers/swaps';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller/dist/types';
import { submitSmartTransactionHook } from '../util/smart-transactions/smart-publish-hook';
import { SmartTransactionsControllerState } from '@metamask/smart-transactions-controller/dist/SmartTransactionsController';

const NON_EMPTY = 'NON_EMPTY';

const encryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});
let currentChainId: any;

///: BEGIN:ONLY_INCLUDE_IF(snaps)
// TODO remove these custom types when the PhishingController is to version >= 7.0.0
interface MaybeUpdateState {
  type: `${PhishingController['name']}:maybeUpdateState`;
  handler: PhishingController['maybeUpdateState'];
}

interface TestOrigin {
  type: `${PhishingController['name']}:testOrigin`;
  handler: PhishingController['test'];
}

type PhishingControllerActions = MaybeUpdateState | TestOrigin;

type SnapsGlobalActions =
  | SnapControllerActions
  | SubjectMetadataControllerActions
  | PhishingControllerActions
  | SnapsAllowedActions;

type SnapsGlobalEvents =
  | SnapControllerEvents
  | SubjectMetadataControllerEvents
  | SnapsAllowedEvents;
///: END:ONLY_INCLUDE_IF

type GlobalActions =
  | ApprovalControllerActions
  | GetCurrencyRateState
  | GetGasFeeState
  | GetTokenListState
  | KeyringControllerActions
  | NetworkControllerActions
  | PermissionControllerActions
  | SignatureControllerActions
  | LoggingControllerActions
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  | SnapsGlobalActions
  ///: END:ONLY_INCLUDE_IF
  | KeyringControllerActions
  | AccountsControllerActions
  | PreferencesControllerActions
  | TokensControllerActions
  | TokenListControllerActions;
type GlobalEvents =
  | ApprovalControllerEvents
  | CurrencyRateStateChange
  | GasFeeStateChange
  | KeyringControllerEvents
  | NetworkControllerEvents
  | PermissionControllerEvents
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  | SnapsGlobalEvents
  ///: END:ONLY_INCLUDE_IF
  | SignatureControllerEvents
  | AccountsControllerEvents
  | PreferencesControllerEvents
  | TokenBalancesControllerEvents
  | TokenListControllerEvents
  | TokensControllerEvents
  // TODO: Replace with `LoggingControllerEvents` once it's defined to include `LoggingControllerStateChangeEvent`
  | ControllerStateChangeEvent<'LoggingController', LoggingControllerState>
  // TODO: Replace with `NftControllerEvents` once it's defined to include `NftControllerStateChangeEvent`
  | ControllerStateChangeEvent<
      'NftController',
      NftState & { [key: string]: Json }
    >
  // TODO: Replace with `PhishingControllerEvents` once it's defined to include `PhishingControllerStateChangeEvent`
  | ControllerStateChangeEvent<'PhishingController', PhishingControllerState>
  // TODO: `NetworkControllerStateChangeEvent` is already provided by `NetworkControllerEvents` and should be excluded from `PPOMControllerEvents`
  | PPOMControllerEvents
  // TODO: Remove once `PPOMControllerStateChangeEvent` is defined and is included in `PPOMControllerEvents`
  | ControllerStateChangeEvent<'PPOMController', PPOMState>
  // TODO: Replace with `TransactionControllerEvents` once it's defined to include `TransactionControllerStateChangeEvent`
  | ControllerStateChangeEvent<
      'TransactionController',
      TransactionState & { [key: string]: Json }
    >;

type PermissionsByRpcMethod = ReturnType<typeof getPermissionSpecifications>;
type Permissions = PermissionsByRpcMethod[keyof PermissionsByRpcMethod];

export type EngineState = {
  AccountTrackerController: AccountTrackerState;
  AddressBookController: AddressBookState;
  AssetsContractController: BaseState;
  NftController: NftState;
  TokenListController: TokenListState;
  CurrencyRateController: CurrencyRateState;
  KeyringController: KeyringControllerState;
  NetworkController: NetworkState;
  PreferencesController: PreferencesState;
  PhishingController: PhishingControllerState;
  TokenBalancesController: TokenBalancesControllerState;
  TokenRatesController: TokenRatesState;
  TransactionController: TransactionState;
  SmartTransactionsController: SmartTransactionsControllerState;
  SwapsController: SwapsState;
  GasFeeController: GasFeeState;
  TokensController: TokensState;
  TokenDetectionController: BaseState;
  NftDetectionController: BaseState;
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  SnapController: PersistedSnapControllerState;
  SnapsRegistry: SnapsRegistryState;
  SubjectMetadataController: SubjectMetadataControllerState;
  ///: END:ONLY_INCLUDE_IF
  PermissionController: PermissionControllerState<Permissions>;
  ApprovalController: ApprovalControllerState;
  LoggingController: LoggingControllerState;
  PPOMController: PPOMState;
  AccountsController: AccountsControllerState;
};

/**
 * All mobile controllers, keyed by name
 */
interface Controllers {
  AccountsController: AccountsController;
  AccountTrackerController: AccountTrackerController;
  AddressBookController: AddressBookController;
  ApprovalController: ApprovalController;
  AssetsContractController: AssetsContractController;
  CurrencyRateController: CurrencyRateController;
  GasFeeController: GasFeeController;
  KeyringController: KeyringController;
  LoggingController: LoggingController;
  NetworkController: NetworkController;
  NftController: NftController;
  NftDetectionController: NftDetectionController;
  // TODO: Fix permission types
  PermissionController: PermissionController<any, any>;
  PhishingController: PhishingController;
  PreferencesController: PreferencesController;
  PPOMController: PPOMController;
  TokenBalancesController: TokenBalancesController;
  TokenListController: TokenListController;
  TokenDetectionController: TokenDetectionController;
  TokenRatesController: TokenRatesController;
  TokensController: TokensController;
  TransactionController: TransactionController;
  SmartTransactionsController: SmartTransactionsController;
  SignatureController: SignatureController;
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  SnapController: SnapController;
  SubjectMetadataController: SubjectMetadataController;
  ///: END:ONLY_INCLUDE_IF
  SwapsController: SwapsController;
}

/**
 * Controllers that area always instantiated
 */
type RequiredControllers = Omit<Controllers, 'PPOMController'>;

/**
 * Controllers that are sometimes not instantiated
 */
type OptionalControllers = Pick<Controllers, 'PPOMController'>;

/**
 * Core controller responsible for composing other metamask controllers together
 * and exposing convenience methods for common wallet operations.
 */
class Engine {
  /**
   * The global Engine singleton
   */
  static instance: Engine | null;
  /**
   * A collection of all controller instances
   */
  context: RequiredControllers & Partial<OptionalControllers>;
  /**
   * The global controller messenger.
   */
  controllerMessenger: ControllerMessenger<GlobalActions, GlobalEvents>;
  /**
   * ComposableController reference containing all child controllers
   */
  datamodel: any;

  /**
   * Object containing the info for the latest incoming tx block
   * for each address and network
   */
  lastIncomingTxBlockInfo: any;

  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  /**
   * Object that runs and manages the execution of Snaps
   */
  snapExecutionService: WebViewExecutionService;

  ///: END:ONLY_INCLUDE_IF

  transactionController: TransactionController;
  smartTransactionsController: SmartTransactionsController;

  /**
   * Creates a CoreController instance
   */
  // eslint-disable-next-line @typescript-eslint/default-param-last
  constructor(
    initialState: Partial<EngineState> = {},
    initialKeyringState?: KeyringControllerState | null,
  ) {
    this.controllerMessenger = new ControllerMessenger();

    /**
     * Subscribes a listener to the state change events of Preferences Controller.
     *
     * @param listener - The callback function to execute when the state changes.
     */
    const onPreferencesStateChange = (
      listener: (preferencesState: PreferencesState) => void,
    ) => {
      const eventName = `PreferencesController:stateChange`;

      this.controllerMessenger.subscribe(eventName, listener);
    };

    const approvalController = new ApprovalController({
      // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
      messenger: this.controllerMessenger.getRestricted({
        name: 'ApprovalController',
        allowedEvents: [],
        allowedActions: [],
      }),
      showApprovalRequest: () => undefined,
      typesExcludedFromRateLimiting: [
        // TODO: Replace with ApprovalType enum from @metamask/controller-utils when breaking change is fixed
        'eth_sign',
        'personal_sign',
        'eth_signTypedData',
        'transaction',
        'wallet_watchAsset',
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
        useNftDetection: false,
        displayNftMedia: true,
        securityAlertsEnabled: true,
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
      }),
      // Metrics event tracking is handled in this repository instead
      // TODO: Use events for controller metric events
      trackMetaMetricsEvent: () => {
        // noop
      },
    };
    const networkController = new NetworkController(networkControllerOpts);

    networkController.initializeProvider();

    const assetsContractController = new AssetsContractController({
      //@ts-expect-error mismatch version, will disappear when bump assets-controllers to >=29
      onPreferencesStateChange,
      onNetworkDidChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_DID_CHANGE_EVENT,
          listener,
        ),
      chainId: networkController.state.providerConfig.chainId,
      //@ts-expect-error - Network Controller mismatch version
      getNetworkClientById:
        networkController.getNetworkClientById.bind(networkController),
    });
    const nftController = new NftController(
      {
        //@ts-expect-error mismatch version, will disappear when bump assets-controllers to >=29
        onPreferencesStateChange,
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),
        //@ts-expect-error - Network Controller mismatch version
        getNetworkClientById:
          networkController.getNetworkClientById.bind(networkController),
        //@ts-expect-error Misalign types because of Base Controller version
        messenger: this.controllerMessenger.getRestricted({
          name: 'NftController',
          allowedActions: [
            `${approvalController.name}:addRequest`,
            `${networkController.name}:getNetworkClientById`,
          ],
          allowedEvents: [],
        }),
        chainId: networkController.state.providerConfig.chainId,

        getERC721AssetName: assetsContractController.getERC721AssetName.bind(
          assetsContractController,
        ),
        getERC721AssetSymbol:
          assetsContractController.getERC721AssetSymbol.bind(
            assetsContractController,
          ),
        getERC721TokenURI: assetsContractController.getERC721TokenURI.bind(
          assetsContractController,
        ),
        getERC721OwnerOf: assetsContractController.getERC721OwnerOf.bind(
          assetsContractController,
        ),
        getERC1155BalanceOf: assetsContractController.getERC1155BalanceOf.bind(
          assetsContractController,
        ),
        getERC1155TokenURI: assetsContractController.getERC1155TokenURI.bind(
          assetsContractController,
        ),
      },
      {
        useIPFSSubdomains: false,
        chainId: networkController.state.providerConfig.chainId,
      },
    );

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

    //@ts-expect-error Misalign types because of Base Controller version
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

    const defaultAccountsControllerState: AccountsControllerState = {
      internalAccounts: {
        accounts: {},
        selectedAccount: '',
      },
    };

    const accountsController = new AccountsController({
      messenger: accountsControllerMessenger,
      state: initialState.AccountsController ?? defaultAccountsControllerState,
    });
    const tokensController = new TokensController({
      chainId: networkController.state.providerConfig.chainId,
      config: {
        //@ts-expect-error - Network Controller mismatch version
        provider: networkController.getProviderAndBlockTracker().provider,
        chainId: networkController.state.providerConfig.chainId,
        selectedAddress: preferencesController.state.selectedAddress,
      },
      //@ts-expect-error Misalign types because of Base Controller version
      messenger: this.controllerMessenger.getRestricted({
        name: 'TokensController',
        allowedActions: [`${approvalController.name}:addRequest`],
        allowedEvents: [
          'PreferencesController:stateChange',
          'NetworkController:networkDidChange',
          'TokenListController:stateChange',
        ],
      }),
    });
    const tokenListController = new TokenListController({
      chainId: networkController.state.providerConfig.chainId,
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          listener,
        ),
      //@ts-expect-error Misalign types because of Base Controller version
      messenger: this.controllerMessenger.getRestricted({
        name: 'TokenListController',
        allowedActions: [],
        allowedEvents: [`${networkController.name}:stateChange`],
      }),
    });
    const currencyRateController = new CurrencyRateController({
      //@ts-expect-error Misalign types because of Base Controller version
      messenger: this.controllerMessenger.getRestricted({
        name: 'CurrencyRateController',
        allowedActions: [`${networkController.name}:getNetworkClientById`],
        allowedEvents: [],
      }),
      state: initialState.CurrencyRateController,
    });
    currencyRateController.startPollingByNetworkClientId(
      networkController.state.selectedNetworkClientId,
    );
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
        const chainId = networkController.state.providerConfig.chainId;
        return (
          isMainnetByChainId(chainId) ||
          chainId === addHexPrefix(swapsUtils.BSC_CHAIN_ID) ||
          chainId === addHexPrefix(swapsUtils.POLYGON_CHAIN_ID)
        );
      },
      clientId: AppConstants.SWAPS.CLIENT_ID,
      infuraAPIKey: process.env.MM_INFURA_PROJECT_ID || NON_EMPTY,
    });

    const phishingController = new PhishingController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'PhishingController',
        allowedActions: [],
        allowedEvents: [],
      }),
    });
    phishingController.maybeUpdateState();

    const qrKeyringBuilder = () => {
      const keyring = new QRHardwareKeyring();
      // to fix the bug in #9560, forgetDevice will reset all keyring properties to default.
      keyring.forgetDevice();
      return keyring;
    };
    qrKeyringBuilder.type = QRHardwareKeyring.type;

    const ledgerKeyringBuilder = () => new LedgerKeyring();
    ledgerKeyringBuilder.type = LedgerKeyring.type;

    const keyringController = new KeyringController({
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
      keyringBuilders: [qrKeyringBuilder, ledgerKeyringBuilder],
    });

    ///: BEGIN:ONLY_INCLUDE_IF(snaps)
    /**
     * Gets the mnemonic of the user's primary keyring.
     */
    const getPrimaryKeyringMnemonic = () => {
      const [keyring]: any = keyringController.getKeyringsByType(
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

    const getSnapPermissionSpecifications = () => ({
      ...buildSnapEndowmentSpecifications(Object.keys(ExcludedSnapEndowments)),
      ...buildSnapRestrictedMethodSpecifications(
        Object.keys(ExcludedSnapPermissions),
        {
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
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          handleSnapRpcRequest: this.controllerMessenger.call.bind(
            this.controllerMessenger,
            'SnapController:handleRequest',
          ),
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
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          maybeUpdatePhishingList: this.controllerMessenger.call.bind(
            this.controllerMessenger,
            'PhishingController:maybeUpdateState',
          ),
          isOnPhishingList: (origin: string) =>
            this.controllerMessenger.call<'PhishingController:testOrigin'>(
              'PhishingController:testOrigin',
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              origin,
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
            ).result,
          showDialog: (
            origin: string,
            type: EnumToUnion<DialogType>,
            content: any, // should be Component from '@metamask/snaps-ui';
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
        },
      ),
    });
    ///: END:ONLY_INCLUDE_IF
    const accountTrackerController = new AccountTrackerController({
      //@ts-expect-error mismatch version, will disappear when bump assets-controllers to >=29
      onPreferencesStateChange,
      getIdentities: () => preferencesController.state.identities,
      getSelectedAddress: () => accountsController.getSelectedAccount().address,
      getMultiAccountBalancesEnabled: () =>
        preferencesController.state.isMultiAccountBalancesEnabled,
      getCurrentChainId: () =>
        toHexadecimal(networkController.state.providerConfig.chainId),
      //@ts-expect-error - Network Controller mismatch version
      getNetworkClientById:
        networkController.getNetworkClientById.bind(networkController),
    });
    const permissionController = new PermissionController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'PermissionController',
        allowedActions: [
          `${approvalController.name}:addRequest`,
          `${approvalController.name}:hasRequest`,
          `${approvalController.name}:acceptRequest`,
          `${approvalController.name}:rejectRequest`,
          ///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
      }),
      // @ts-expect-error Typecast permissionType from getPermissionSpecifications to be of type PermissionType.RestrictedMethod
      permissionSpecifications: {
        ...getPermissionSpecifications({
          getAllAccounts: () => keyringController.getAccounts(),
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
                keyringController.getAccountKeyringType(address),
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
        ///: BEGIN:ONLY_INCLUDE_IF(snaps)
        ...getSnapPermissionSpecifications(),
        ///: END:ONLY_INCLUDE_IF
      },
      unrestrictedMethods,
    });

    ///: BEGIN:ONLY_INCLUDE_IF(snaps)
    const subjectMetadataController = new SubjectMetadataController({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
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
            getApprovedHosts: () => null,
            setApprovedHosts: () => null,
            approveHost: () => null,
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
        `${subjectMetadataController.name}:getSubjectMetadata`,
        `${subjectMetadataController.name}:addSubjectMetadata`,
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

    const snapController = new SnapController({
      environmentEndowmentPermissions: Object.values(EndowmentPermissions),
      featureFlags: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        requireAllowlist,
      },
      state: initialState.SnapController || undefined,
      messenger: snapControllerMessenger as any,
      detectSnapLocation: (
        location: string | URL,
        options?: DetectSnapLocationOptions,
      ) =>
        detectSnapLocation(location, {
          ...options,
          allowLocal: allowLocalSnaps,
          fetch: fetchFunction,
        }),
      //@ts-expect-error types need to be aligned with snaps-controllers
      preinstalledSnaps: PREINSTALLED_SNAPS,
      //@ts-expect-error types need to be aligned between new encryptor and snaps-controllers
      encryptor,
      getMnemonic: getPrimaryKeyringMnemonic.bind(this),
    });
    ///: END:ONLY_INCLUDE_IF

    this.transactionController = new TransactionController({
      // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
      blockTracker: networkController.getProviderAndBlockTracker().blockTracker,
      disableSendFlowHistory: true,
      disableHistory: true,
      getGasFeeEstimates: () => gasFeeController.fetchGasFeeEstimates(),
      getCurrentNetworkEIP1559Compatibility:
        networkController.getEIP1559Compatibility.bind(networkController),
      //@ts-expect-error Expected due to Transaction Controller do not have controller utils containing linea-sepolia data
      // This can be removed when controller-utils be updated to v^9
      getNetworkState: () => networkController.state,
      getSelectedAddress: () => accountsController.getSelectedAccount().address,
      incomingTransactions: {
        isEnabled: () => {
          const currentHexChainId =
            networkController.state.providerConfig.chainId;

          const showIncomingTransactions =
            preferencesController?.state?.showIncomingTransactions;

          return Boolean(
            hasProperty(showIncomingTransactions, currentChainId) &&
              showIncomingTransactions?.[currentHexChainId],
          );
        },
        updateTransactions: true,
      },
      // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
      messenger: this.controllerMessenger.getRestricted({
        name: 'TransactionController',
        allowedActions: [`${approvalController.name}:addRequest`],
      }),
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          //@ts-expect-error This is because the network type is still missing linea-sepolia
          // When transaction controller be updated to v^25
          listener,
        ),
      // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
      provider: networkController.getProviderAndBlockTracker().provider,

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      getExternalPendingTransactions: (address: string) =>
        this.smartTransactionsController.getTransactions({
          addressFrom: address,
          status: SmartTransactionStatuses.PENDING,
        }),

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
            featureFlags: selectSwapsChainFeatureFlags(store.getState()),
          });
        },
      },
    });

    const codefiTokenApiV2 = new CodefiTokenPricesServiceV2();

    const smartTransactionsControllerTrackMetaMetricsEvent = (params: {
      event: string;
      category: string;
      sensitiveProperties: any;
    }) => {
      const { event, category, ...restParams } = params;

      MetaMetrics.getInstance().trackEvent(
        {
          category,
          properties: {
            name: event,
          },
        },
        restParams,
      );
    };
    this.smartTransactionsController = new SmartTransactionsController(
      {
        confirmExternalTransaction:
          this.transactionController.confirmExternalTransaction.bind(
            this.transactionController,
          ),
        getNetworkClientById:
          networkController.getNetworkClientById.bind(networkController),
        getNonceLock: this.transactionController.getNonceLock.bind(
          this.transactionController,
        ),
        // @ts-expect-error txController.getTransactions only uses txMeta.status and txMeta.hash, which v13 TxController has
        getTransactions: this.transactionController.getTransactions.bind(
          this.transactionController,
        ),
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),

        provider: networkController.getProviderAndBlockTracker()
          .provider as any,

        trackMetaMetricsEvent: smartTransactionsControllerTrackMetaMetricsEvent,
      },
      {
        supportedChainIds: [
          NETWORKS_CHAIN_ID.MAINNET,
          NETWORKS_CHAIN_ID.GOERLI,
          NETWORKS_CHAIN_ID.SEPOLIA,
        ],
      },
      initialState.SmartTransactionsController,
    );

    const controllers: Controllers[keyof Controllers][] = [
      keyringController,
      accountTrackerController,
      new AddressBookController(),
      assetsContractController,
      nftController,
      tokensController,
      tokenListController,
      new TokenDetectionController({
        //@ts-expect-error Misalign types because of Base Controller version
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
          ],
          allowedEvents: [
            'AccountsController:selectedAccountChange',
            'KeyringController:lock',
            'KeyringController:unlock',
            'PreferencesController:stateChange',
            'NetworkController:networkDidChange',
            'TokenListController:stateChange',
            'TokensController:stateChange',
          ],
        }),
        trackMetaMetricsEvent: () =>
          MetaMetrics.getInstance().trackEvent(
            MetaMetricsEvents.TOKEN_DETECTED,
            {
              token_standard: 'ERC20',
              asset_type: 'token',
              chain_id: getDecimalChainId(
                networkController.state.providerConfig.chainId,
              ),
            },
          ),
        // Remove this when TokensController is extending Base Controller v2
        getTokensState: () => tokensController.state,
        getBalancesInSingleCall:
          assetsContractController.getBalancesInSingleCall.bind(
            assetsContractController,
          ),
      }),
      new NftDetectionController({
        onNftsStateChange: (listener) => nftController.subscribe(listener),
        //@ts-expect-error mismatch version, will disappear when bump assets-controllers to >=29
        onPreferencesStateChange,
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),
        chainId: networkController.state.providerConfig.chainId,
        getOpenSeaApiKey: () => nftController.openSeaApiKey,
        addNft: nftController.addNft.bind(nftController),
        getNftApi: nftController.getNftApi.bind(nftController),
        getNftState: () => nftController.state,
        //@ts-expect-error - Network Controller mismatch version
        getNetworkClientById:
          networkController.getNetworkClientById.bind(networkController),
      }),
      currencyRateController,
      networkController,
      phishingController,
      preferencesController,
      new TokenBalancesController({
        //@ts-expect-error Misalign types because of Base Controller version
        messenger: this.controllerMessenger.getRestricted({
          name: 'TokenBalancesController',
          allowedActions: ['PreferencesController:getState'],
          allowedEvents: ['TokensController:stateChange'],
        }),
        // onTokensStateChange will be removed when Tokens Controller extends Base Controller v2
        onTokensStateChange: (listener) => tokensController.subscribe(listener),
        getERC20BalanceOf: assetsContractController.getERC20BalanceOf.bind(
          assetsContractController,
        ),
        interval: 180000,
      }),
      new TokenRatesController({
        onTokensStateChange: (listener) => tokensController.subscribe(listener),
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),
        //@ts-expect-error mismatch version, will disappear when bump assets-controllers to >=29
        onPreferencesStateChange,
        chainId: networkController.state.providerConfig.chainId,
        ticker: networkController.state.providerConfig.ticker,
        selectedAddress: preferencesController.state.selectedAddress,
        tokenPricesService: codefiTokenApiV2,
        interval: 30 * 60 * 1000,
        //@ts-expect-error - Network Controller mismatch version
        getNetworkClientById:
          networkController.getNetworkClientById.bind(networkController),
      }),
      this.transactionController,
      this.smartTransactionsController,
      new SwapsController(
        {
          fetchGasFeeEstimates: () => gasFeeController.fetchGasFeeEstimates(),
          // @ts-expect-error TODO: Resolve mismatch between gas fee and swaps controller types
          fetchEstimatedMultiLayerL1Fee,
        },
        {
          clientId: AppConstants.SWAPS.CLIENT_ID,
          fetchAggregatorMetadataThreshold:
            AppConstants.SWAPS.CACHE_AGGREGATOR_METADATA_THRESHOLD,
          fetchTokensThreshold: AppConstants.SWAPS.CACHE_TOKENS_THRESHOLD,
          fetchTopAssetsThreshold:
            AppConstants.SWAPS.CACHE_TOP_ASSETS_THRESHOLD,
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
        },
      ),
      gasFeeController,
      approvalController,
      permissionController,
      new SignatureController({
        messenger: this.controllerMessenger.getRestricted({
          name: 'SignatureController',
          allowedActions: [
            `${approvalController.name}:addRequest`,
            `${keyringController.name}:signPersonalMessage`,
            `${keyringController.name}:signMessage`,
            `${keyringController.name}:signTypedMessage`,
            `${loggingController.name}:add`,
          ],
          allowedEvents: [],
        }),
        isEthSignEnabled: () =>
          Boolean(
            preferencesController.state?.disabledRpcMethodPreferences?.eth_sign,
          ),
        getAllState: () => store.getState(),
        getCurrentChainId: () => networkController.state.providerConfig.chainId,
      }),
      loggingController,
      ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      snapController,
      subjectMetadataController,
      ///: END:ONLY_INCLUDE_IF
      accountsController,
    ];

    if (isBlockaidFeatureEnabled()) {
      const ppomController = new PPOMController({
        chainId: networkController.state.providerConfig.chainId,
        blockaidPublicKey: process.env.BLOCKAID_PUBLIC_KEY as string,
        cdnBaseUrl: process.env.BLOCKAID_FILE_CDN as string,
        // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
        messenger: this.controllerMessenger.getRestricted({
          name: 'PPOMController',
          allowedActions: [],
          allowedEvents: [`${networkController.name}:stateChange`],
        }),
        onPreferencesChange: (listener) =>
          this.controllerMessenger.subscribe(
            `${preferencesController.name}:stateChange`,
            listener,
          ),
        provider: networkController.getProviderAndBlockTracker()
          .provider as any,
        ppomProvider: {
          PPOM: PPOM as any,
          ppomInit,
        },
        storageBackend: new RNFSStorageBackend('PPOMDB'),
        securityAlertsEnabled:
          initialState.PreferencesController?.securityAlertsEnabled ?? false,
        state: initialState.PPOMController,
        nativeCrypto: Crypto as any,
      });
      controllers.push(ppomController);
    }

    // set initial state
    // TODO: Pass initial state into each controller constructor instead
    // This is being set post-construction for now to ensure it's functionally equivalent with
    // how the `ComponsedController` used to set initial state.
    //
    // The check for `controller.subscribe !== undefined` is to filter out BaseControllerV2
    // controllers. They should be initialized via the constructor instead.
    for (const controller of controllers) {
      if (
        hasProperty(initialState, controller.name) &&
        hasProperty(controller, 'subscribe') &&
        controller.subscribe !== undefined
      ) {
        // The following type error can be addressed by passing initial state into controller constructors instead
        // @ts-expect-error No type-level guarantee that the correct state is being applied to the correct controller here.
        controller.update(initialState[controller.name]);
      }
    }

    this.datamodel = new ComposableController<
      EngineState,
      Controllers[keyof Controllers]
    >({
      controllers,
      messenger: this.controllerMessenger.getRestricted({
        name: 'ComposableController',
        allowedActions: [],
        // Add `stateChange` event here and in the `GlobalEvents` type
        // whenever `messagingSystem` is added to a V1 child controller (or it is upgraded to V2)
        allowedEvents: [
          'AccountsController:stateChange',
          'ApprovalController:stateChange',
          'CurrencyRateController:stateChange',
          'GasFeeController:stateChange',
          'KeyringController:stateChange',
          'LoggingController:stateChange',
          'NetworkController:stateChange',
          'NftController:stateChange',
          'PermissionController:stateChange',
          'PhishingController:stateChange',
          'PreferencesController:stateChange',
          'PPOMController:stateChange',
          'TokenBalancesController:stateChange',
          'TokenListController:stateChange',
          'TokensController:stateChange',
          'TransactionController:stateChange',
          'SnapController:stateChange',
          'SubjectMetadataController:stateChange',
        ],
      }),
    });
    this.context = controllers.reduce<Partial<typeof this.context>>(
      (context, controller) => ({
        ...context,
        [controller.name]: controller,
      }),
      {},
    ) as typeof this.context;

    const {
      NftController: nfts,
      KeyringController: keyring,
      TransactionController: transaction,
    } = this.context;

    if (process.env.MM_OPENSEA_KEY) {
      nfts.setApiKey(process.env.MM_OPENSEA_KEY);
    }

    // @ts-expect-error TODO: Align transaction types between keyring and TransactionController
    transaction.configure({ sign: keyring.signTransaction.bind(keyring) });

    transaction.hub.on('incomingTransactionBlock', (blockNumber: number) => {
      NotificationManager.gotIncomingTransaction(blockNumber);
    });

    this.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      (state: NetworkState) => {
        if (
          state.networksMetadata[state.selectedNetworkClientId].status ===
            NetworkStatus.Available &&
          state.providerConfig.chainId !== currentChainId
        ) {
          // We should add a state or event emitter saying the provider changed
          setTimeout(() => {
            this.configureControllersOnNetworkChange();
            currentChainId = state.providerConfig.chainId;
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
            `Network ID not changed, current chainId: ${networkController.state.providerConfig.chainId}`,
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
    const {
      NftDetectionController,
      TokenDetectionController,
      TokenListController,
      TransactionController,
      TokenRatesController,
    } = this.context;

    TokenListController.start();
    NftDetectionController.start();
    TokenDetectionController.start();
    // leaving the reference of TransactionController here, rather than importing it from utils to avoid circular dependency
    TransactionController.startIncomingTransactionPolling();
    TokenRatesController.start();
  }

  configureControllersOnNetworkChange() {
    const {
      AccountTrackerController,
      AssetsContractController,
      TokenDetectionController,
      NftDetectionController,
      NetworkController,
      TransactionController,
      SwapsController,
    } = this.context;
    const { provider } = NetworkController.getProviderAndBlockTracker();

    // Skip configuration if this is called before the provider is initialized
    if (!provider) {
      return;
    }
    provider.sendAsync = provider.sendAsync.bind(provider);
    AccountTrackerController.configure({ provider });
    //@ts-expect-error This seems to be incosistency on the core repo between the provider type
    // AssetsContractController provider type = Provider | undefined
    // NetworkController provider type = SafeEventEmitterProvider
    AssetsContractController.configure({ provider });

    SwapsController.configure({
      provider,
      chainId: NetworkController.state?.providerConfig?.chainId,
      pollCountLimit: AppConstants.SWAPS.POLL_COUNT_LIMIT,
    });
    TransactionController.hub.emit('networkChange');
    TokenDetectionController.detectTokens();
    NftDetectionController.detectNfts();
    AccountTrackerController.refresh();
  }

  getTotalFiatAccountBalance = (): {
    ethFiat: number;
    tokenFiat: number;
  } => {
    const {
      CurrencyRateController,
      PreferencesController,
      AccountTrackerController,
      TokenBalancesController,
      TokenRatesController,
      TokensController,
      NetworkController,
    } = this.context;
    const { selectedAddress } = PreferencesController.state;
    const { currentCurrency } = CurrencyRateController.state;
    const { chainId, ticker } = NetworkController.state.providerConfig;
    const {
      settings: { showFiatOnTestnets },
    } = store.getState();

    if (isTestNet(chainId) && !showFiatOnTestnets) {
      return { ethFiat: 0, tokenFiat: 0 };
    }

    const conversionRate =
      CurrencyRateController.state?.currencyRates?.[ticker]?.conversionRate ??
      0;

    const { accountsByChainId } = AccountTrackerController.state;
    const { tokens } = TokensController.state;

    let ethFiat = 0;
    let tokenFiat = 0;
    const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;
    if (accountsByChainId?.[toHexadecimal(chainId)]?.[selectedAddress]) {
      ethFiat = weiToFiatNumber(
        accountsByChainId[toHexadecimal(chainId)][selectedAddress].balance,
        conversionRate,
        decimalsToShow,
      );
    }
    if (tokens.length > 0) {
      const { contractBalances: tokenBalances } = TokenBalancesController.state;
      const { contractExchangeRates: tokenExchangeRates } =
        TokenRatesController.state;
      tokens.forEach(
        (item: { address: string; balance?: string; decimals: number }) => {
          const exchangeRate =
            item.address in tokenExchangeRates
              ? tokenExchangeRates[item.address]
              : undefined;
          const tokenBalance =
            item.balance ||
            (item.address in tokenBalances
              ? renderFromTokenMinimalUnit(
                  tokenBalances[item.address],
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
          tokenFiat += tokenBalanceFiat;
        },
      );
    }

    return {
      ethFiat: ethFiat ?? 0,
      tokenFiat: tokenFiat ?? 0,
    };
  };

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
      const tokens = backgroundState.TokensController.tokens;
      const tokenBalances =
        backgroundState.TokenBalancesController.contractBalances;

      let tokenFound = false;
      tokens.forEach((token: { address: string | number }) => {
        if (
          tokenBalances[token.address] &&
          !isZero(tokenBalances[token.address])
        ) {
          tokenFound = true;
        }
      });

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
      LoggingController,
    } = this.context;

    // Remove all permissions.
    PermissionController?.clearState?.();

    //Clear assets info
    TokensController.update({
      allTokens: {},
      allIgnoredTokens: {},
      ignoredTokens: [],
      tokens: [],
    });
    NftController.update({
      allNftContracts: {},
      allNfts: {},
      ignoredNfts: [],
    });

    TokenBalancesController.reset();
    TokenRatesController.update({ contractExchangeRates: {} });

    TransactionController.update({
      methodData: {},
      transactions: [],
      lastFetchedBlockNumbers: {},
    });

    LoggingController.clear();
  };

  removeAllListeners() {
    this.controllerMessenger.clearSubscriptions();
  }

  async destroyEngineInstance() {
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
      AssetsContractController,
      NftController,
      TokenListController,
      CurrencyRateController,
      KeyringController,
      NetworkController,
      PreferencesController,
      PhishingController,
      PPOMController,
      TokenBalancesController,
      TokenRatesController,
      TransactionController,
      SmartTransactionsController,
      SwapsController,
      GasFeeController,
      TokensController,
      TokenDetectionController,
      NftDetectionController,
      ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      SnapController,
      SubjectMetadataController,
      ///: END:ONLY_INCLUDE_IF
      PermissionController,
      ApprovalController,
      LoggingController,
      AccountsController,
    } = instance.datamodel.state;

    // normalize `null` currencyRate to `0`
    // TODO: handle `null` currencyRate by hiding fiat values instead
    const modifiedCurrencyRateControllerState = {
      ...CurrencyRateController,
      conversionRate:
        CurrencyRateController.conversionRate === null
          ? 0
          : CurrencyRateController.conversionRate,
    };

    return {
      AccountTrackerController,
      AddressBookController,
      AssetsContractController,
      NftController,
      TokenListController,
      CurrencyRateController: modifiedCurrencyRateControllerState,
      KeyringController,
      NetworkController,
      PhishingController,
      PPOMController,
      PreferencesController,
      TokenBalancesController,
      TokenRatesController,
      TokensController,
      TransactionController,
      SmartTransactionsController,
      SwapsController,
      GasFeeController,
      TokenDetectionController,
      NftDetectionController,
      ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      SnapController,
      SubjectMetadataController,
      ///: END:ONLY_INCLUDE_IF
      PermissionController,
      ApprovalController,
      LoggingController,
      AccountsController,
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
  destroyEngine() {
    instance?.destroyEngineInstance();
    instance = null;
  },
  init(state: Record<string, never> | undefined, keyringState = null) {
    instance = Engine.instance || new Engine(state, keyringState);
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
};
