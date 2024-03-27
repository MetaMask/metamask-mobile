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
  TokenBalancesState,
  TokenDetectionController,
  TokenListController,
  TokenListState,
  TokenListStateChange,
  TokenRatesController,
  TokenRatesState,
  TokensController,
  TokensState,
  CodefiTokenPricesServiceV2,
} from '@metamask/assets-controllers';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { AppState } from 'react-native';
///: END:ONLY_INCLUDE_IF
import {
  AddressBookController,
  AddressBookState,
} from '@metamask/address-book-controller';
import { BaseState, ControllerMessenger } from '@metamask/base-controller';
import { ComposableController } from '@metamask/composable-controller';
import {
  KeyringController,
  SignTypedDataVersion,
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
  PhishingState,
} from '@metamask/phishing-controller';
import {
  PreferencesController,
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
  WebViewExecutionService,
} from '@metamask/snaps-controllers';
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
import Encryptor from './Encryptor';
import {
  isMainnetByChainId,
  getDecimalChainId,
  fetchEstimatedMultiLayerL1Fee,
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
import { ethErrors } from 'eth-rpc-errors';

import { PPOM, ppomInit } from '../lib/ppom/PPOMView';
import RNFSStorageBackend from '../lib/ppom/ppom-storage-backend';
import { isHardwareAccount } from '../util/address';
import { ledgerSignTypedMessage } from './Ledger/Ledger';
import ExtendedKeyringTypes from '../constants/keyringTypes';
import {
  AccountsController,
  AccountsControllerActions,
  AccountsControllerEvents,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import { lowerCase } from 'lodash';

const NON_EMPTY = 'NON_EMPTY';

const encryptor = new Encryptor();
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
  | NetworkControllerActions
  | PermissionControllerActions
  | SignatureControllerActions
  | LoggingControllerActions
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  | SnapsGlobalActions
  ///: END:ONLY_INCLUDE_IF
  | KeyringControllerActions
  | AccountsControllerActions;
type GlobalEvents =
  | ApprovalControllerEvents
  | CurrencyRateStateChange
  | GasFeeStateChange
  | TokenListStateChange
  | NetworkControllerEvents
  | PermissionControllerEvents
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  | SnapsGlobalEvents
  ///: END:ONLY_INCLUDE_IF
  | SignatureControllerEvents
  | KeyringControllerEvents
  | PPOMControllerEvents
  | AccountsControllerEvents;

type PermissionsByRpcMethod = ReturnType<typeof getPermissionSpecifications>;
type Permissions = PermissionsByRpcMethod[keyof PermissionsByRpcMethod];

export interface EngineState {
  AccountTrackerController: AccountTrackerState;
  AddressBookController: AddressBookState;
  AssetsContractController: BaseState;
  NftController: NftState;
  TokenListController: TokenListState;
  CurrencyRateController: CurrencyRateState;
  KeyringController: KeyringControllerState;
  NetworkController: NetworkState;
  PreferencesController: PreferencesState;
  PhishingController: PhishingState;
  TokenBalancesController: TokenBalancesState;
  TokenRatesController: TokenRatesState;
  TransactionController: TransactionState;
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
}

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
  context:
    | {
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
        PPOMController?: PPOMController;
        TokenBalancesController: TokenBalancesController;
        TokenListController: TokenListController;
        TokenDetectionController: TokenDetectionController;
        TokenRatesController: TokenRatesController;
        TokensController: TokensController;
        TransactionController: TransactionController;
        SignatureController: SignatureController;
        SwapsController: SwapsController;
        AccountsController: AccountsController;
      }
    | any;
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

  /**
   * Creates a CoreController instance
   */
  // eslint-disable-next-line @typescript-eslint/default-param-last
  constructor(
    initialState: Partial<EngineState> = {},
    initialKeyringState?: KeyringControllerState | null,
  ) {
    this.controllerMessenger = new ControllerMessenger();

    const approvalController = new ApprovalController({
      // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
      messenger: this.controllerMessenger.getRestricted<
        'ApprovalController',
        never,
        never
      >({
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

    const preferencesController = new PreferencesController(
      {},
      {
        ipfsGateway: AppConstants.IPFS_DEFAULT_GATEWAY_URL,
        useTokenDetection:
          initialState?.PreferencesController?.useTokenDetection ?? true,
        // TODO: Use previous value when preferences UI is available
        useNftDetection: false,
        displayNftMedia: true,
        securityAlertsEnabled: true,
      },
    );

    const networkControllerOpts = {
      infuraProjectId: process.env.MM_INFURA_PROJECT_ID || NON_EMPTY,
      state: initialState.NetworkController,
      messenger: this.controllerMessenger.getRestricted<
        'NetworkController',
        never,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore // TODO: fix this type mismatch after the base-controller version is updated
        'NetworkController:networkDidChange'
      >({
        name: 'NetworkController',
        allowedEvents: ['NetworkController:networkDidChange'],
        allowedActions: [],
      }),
      // Metrics event tracking is handled in this repository instead
      // TODO: Use events for controller metric events
      trackMetaMetricsEvent: () => {
        // noop
      },
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const networkController = new NetworkController(networkControllerOpts);

    networkController.initializeProvider();

    const assetsContractController = new AssetsContractController({
      onPreferencesStateChange: (listener) =>
        preferencesController.subscribe(listener),
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          listener,
        ),
      chainId: networkController.state.providerConfig.chainId,
      getNetworkClientById:
        networkController.getNetworkClientById.bind(networkController),
    });

    const nftController = new NftController(
      {
        onPreferencesStateChange: (listener) =>
          preferencesController.subscribe(listener),
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),
        // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
        messenger: this.controllerMessenger.getRestricted<
          'NftController',
          'ApprovalController:addRequest',
          never
        >({
          name: 'NftController',
          allowedActions: [`${approvalController.name}:addRequest`],
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

    const accountsControllerMessenger = this.controllerMessenger.getRestricted({
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
      // TODO: The tokens controller currently does not support internalAccounts. This is done to match the behavior of the previous tokens controller subscription.
      onPreferencesStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          `AccountsController:selectedAccountChange`,
          (newlySelectedInternalAccount) => {
            const prevState = preferencesController.state;
            listener({
              ...prevState,
              selectedAddress: newlySelectedInternalAccount.address,
            });
          },
        ),
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          listener,
        ),
      onTokenListStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.TOKEN_LIST_STATE_CHANGE_EVENT,
          listener,
        ),

      chainId: networkController.state.providerConfig.chainId,
      config: {
        provider: networkController.getProviderAndBlockTracker().provider,
        chainId: networkController.state.providerConfig.chainId,
        selectedAddress: accountsController.getSelectedAccount().address,
      },
      // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
      messenger: this.controllerMessenger.getRestricted<
        'TokensController',
        'ApprovalController:addRequest',
        'AccountsController:selectedAccountChange'
      >({
        name: 'TokensController',
        allowedActions: [`${approvalController.name}:addRequest`],
        allowedEvents: ['AccountsController:selectedAccountChange'],
      }),
      getERC20TokenName: assetsContractController.getERC20TokenName.bind(
        assetsContractController,
      ),
    });

    const tokenListController = new TokenListController({
      chainId: networkController.state.providerConfig.chainId,
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          listener,
        ),
      // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
      messenger: this.controllerMessenger.getRestricted<
        'TokenListController',
        never,
        'NetworkController:stateChange'
      >({
        name: 'TokenListController',
        allowedEvents: ['NetworkController:stateChange'],
      }),
    });
    const currencyRateController = new CurrencyRateController({
      // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
      messenger: this.controllerMessenger.getRestricted<
        'CurrencyRateController',
        never,
        never
      >({
        name: 'CurrencyRateController',
      }),
      state: initialState.CurrencyRateController,
    });
    currencyRateController.start();

    const gasFeeController = new GasFeeController({
      // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
      messenger: this.controllerMessenger.getRestricted<
        'GasFeeController',
        never,
        'NetworkController:stateChange'
      >({
        name: 'GasFeeController',
        allowedEvents: ['NetworkController:stateChange'],
      }),
      getProvider: () =>
        // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
        networkController.getProviderAndBlockTracker().provider,
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          listener,
        ),
      getCurrentNetworkEIP1559Compatibility: async () =>
        (await networkController.getEIP1559Compatibility()) ?? false,
      getChainId: () => networkController.state.providerConfig.chainId,
      getCurrentNetworkLegacyGasAPICompatibility: () => {
        const chainId = networkController.state.providerConfig.chainId;
        return (
          isMainnetByChainId(chainId) ||
          chainId === addHexPrefix(swapsUtils.BSC_CHAIN_ID) ||
          chainId === addHexPrefix(swapsUtils.POLYGON_CHAIN_ID)
        );
      },
      clientId: AppConstants.SWAPS.CLIENT_ID,
      legacyAPIEndpoint:
        'https://gas-api.metaswap.codefi.network/networks/<chain_id>/gasPrices',
      EIP1559APIEndpoint:
        'https://gas-api.metaswap.codefi.network/networks/<chain_id>/suggestedGasFees',
    });

    const phishingController = new PhishingController();
    phishingController.maybeUpdateState();

    const qrKeyringBuilder = () => new QRHardwareKeyring();
    qrKeyringBuilder.type = QRHardwareKeyring.type;

    const ledgerKeyringBuilder = () => new LedgerKeyring();
    ledgerKeyringBuilder.type = LedgerKeyring.type;

    const keyringController = new KeyringController({
      removeIdentity: preferencesController.removeIdentity.bind(
        preferencesController,
      ),
      syncIdentities: (identities) =>
        preferencesController.syncIdentities(identities),
      updateIdentities: preferencesController.updateIdentities.bind(
        preferencesController,
      ),
      setSelectedAddress: (address) => {
        const accountToBeSet = accountsController.getAccountByAddress(address);
        if (accountToBeSet === undefined) {
          throw new Error(`No account found for address: ${address}`);
        }
        accountsController.setSelectedAccount(accountToBeSet.id);
        preferencesController.setSelectedAddress(address);
      },
      setAccountLabel: (address, label) => {
        const accountToBeNamed =
          accountsController.getAccountByAddress(address);
        if (accountToBeNamed === undefined) {
          throw new Error(`No account found for address: ${address}`);
        }
        accountsController.setAccountName(accountToBeNamed.id, label);
        preferencesController.setAccountLabel(address, label);
      },
      encryptor,
      // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
      messenger: this.controllerMessenger.getRestricted<
        'KeyringController',
        never,
        never
      >({
        name: 'KeyringController',
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
          encrypt: encryptor.encrypt.bind(encryptor),
          decrypt: encryptor.decrypt.bind(encryptor),
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
      onPreferencesStateChange: (listener) =>
        preferencesController.subscribe(listener),
      getIdentities: () => preferencesController.state.identities,
      getSelectedAddress: () => accountsController.getSelectedAccount().address,
      getMultiAccountBalancesEnabled: () =>
        preferencesController.state.isMultiAccountBalancesEnabled,
      getCurrentChainId: () =>
        toHexadecimal(networkController.state.providerConfig.chainId),
    });

    const permissionController = new PermissionController({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
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
      }),
      state: initialState.PermissionController,
      caveatSpecifications: getCaveatSpecifications({
        getInternalAccounts:
          accountsController.listAccounts.bind(accountsController),
      }),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
      messenger: this.controllerMessenger.getRestricted<
        'SubjectMetadataController',
        'PermissionController:hasPermissions',
        never
      >({
        name: 'SubjectMetadataController',
        allowedActions: [`${permissionController.name}:hasPermissions`],
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

    const snapsRegistryMessenger = this.controllerMessenger.getRestricted({
      name: 'SnapsRegistry',
      allowedEvents: [],
      allowedActions: [],
    });
    const snapsRegistry = new JsonSnapsRegistry({
      state: initialState.SnapsRegistry,
      messenger: snapsRegistryMessenger,
      refetchOnAllowlistMiss: requireAllowlist,
      failOnUnavailableRegistry: requireAllowlist,
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
    });
    ///: END:ONLY_INCLUDE_IF

    const codefiTokenApiV2 = new CodefiTokenPricesServiceV2();

    const controllers = [
      keyringController,
      accountTrackerController,
      new AddressBookController(),
      assetsContractController,
      nftController,
      tokensController,
      tokenListController,
      new TokenDetectionController({
        onPreferencesStateChange: (listener) =>
          preferencesController.subscribe(listener),
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),
        onTokenListStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            `${tokenListController.name}:stateChange`,
            listener,
          ),
        addDetectedTokens: async (tokens) => {
          // Track detected tokens event
          MetaMetrics.getInstance().trackEvent(
            MetaMetricsEvents.TOKEN_DETECTED,
            {
              token_standard: 'ERC20',
              asset_type: 'token',
              chain_id: getDecimalChainId(
                networkController.state.providerConfig.chainId,
              ),
            },
          );
          tokensController.addDetectedTokens(tokens);
        },
        getTokensState: () => tokensController.state,
        getTokenListState: () => tokenListController.state,
        getNetworkState: () => networkController.state,
        getPreferencesState: () => preferencesController.state,
        getBalancesInSingleCall:
          assetsContractController.getBalancesInSingleCall.bind(
            assetsContractController,
          ),
      }),
      new NftDetectionController({
        onNftsStateChange: (listener) => nftController.subscribe(listener),
        onPreferencesStateChange: (listener) =>
          preferencesController.subscribe(listener),
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
      }),
      currencyRateController,
      networkController,
      phishingController,
      preferencesController,
      new TokenBalancesController(
        {
          onTokensStateChange: (listener) =>
            tokensController.subscribe(listener),
          getSelectedAddress: () =>
            accountsController.getSelectedAccount().address,
          getERC20BalanceOf: assetsContractController.getERC20BalanceOf.bind(
            assetsContractController,
          ),
        },
        { interval: 10000 },
      ),
      new TokenRatesController({
        onTokensStateChange: (listener) => tokensController.subscribe(listener),
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),
        onPreferencesStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            `AccountsController:selectedAccountChange`,
            (newlySelectedInternalAccount) => {
              const prevState = preferencesController.state;
              listener({
                ...prevState,
                selectedAddress: newlySelectedInternalAccount.address,
              });
            },
          ),
        chainId: networkController.state.providerConfig.chainId,
        ticker: networkController.state.providerConfig.ticker,
        selectedAddress: accountsController.getSelectedAccount().address,
        tokenPricesService: codefiTokenApiV2,
        interval: 30 * 60 * 1000,
      }),
      new TransactionController({
        // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
        blockTracker:
          networkController.getProviderAndBlockTracker().blockTracker,
        getGasFeeEstimates: () => gasFeeController.fetchGasFeeEstimates(),
        getNetworkState: () => networkController.state,
        getSelectedAddress: () =>
          accountsController.getSelectedAccount().address,
        incomingTransactions: {
          apiKey: process.env.MM_ETHERSCAN_KEY,
          isEnabled: () => {
            const currentHexChainId =
              networkController.state.providerConfig.chainId;
            return Boolean(
              preferencesController?.state?.showIncomingTransactions?.[
                currentHexChainId
              ],
            );
          },
          updateTransactions: true,
        },
        // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
        messenger: this.controllerMessenger.getRestricted<
          'TransactionController',
          'ApprovalController:addRequest',
          never
        >({
          name: 'TransactionController',
          allowedActions: [`${approvalController.name}:addRequest`],
        }),
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),
        // @ts-expect-error at this point in time the provider will be defined by the `networkController.initializeProvider`
        provider: networkController.getProviderAndBlockTracker().provider,
      }),
      new SwapsController(
        {
          // @ts-expect-error TODO: Resolve mismatch between gas fee and swaps controller types
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
          ],
        },
      ),
      gasFeeController,
      approvalController,
      permissionController,
      new SignatureController({
        // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
        messenger: this.controllerMessenger.getRestricted<
          'SignatureController',
          'ApprovalController:addRequest',
          never
        >({
          name: 'SignatureController',
          allowedActions: [`${approvalController.name}:addRequest`],
        }),
        isEthSignEnabled: () =>
          Boolean(
            preferencesController.state?.disabledRpcMethodPreferences?.eth_sign,
          ),
        getAllState: () => store.getState(),
        getCurrentChainId: () => networkController.state.providerConfig.chainId,
        keyringController: {
          signMessage: keyringController.signMessage.bind(keyringController),
          signPersonalMessage:
            keyringController.signPersonalMessage.bind(keyringController),
          signTypedMessage: (msgParams, { version }) => {
            if (
              isHardwareAccount(msgParams.from, [ExtendedKeyringTypes.ledger])
            ) {
              return ledgerSignTypedMessage(
                msgParams,
                version as SignTypedDataVersion,
              );
            }
            return keyringController.signTypedMessage(
              msgParams,
              version as SignTypedDataVersion,
            );
          },
        },
      }),
      new LoggingController({
        // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
        messenger: this.controllerMessenger.getRestricted<
          'LoggingController',
          never,
          never
        >({
          name: 'LoggingController',
        }),
        state: initialState.LoggingController,
      }),
      ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      snapController,
      subjectMetadataController,
      ///: END:ONLY_INCLUDE_IF
      accountsController,
    ];

    if (isBlockaidFeatureEnabled()) {
      try {
        const ppomController = new PPOMController({
          chainId: networkController.state.providerConfig.chainId,
          blockaidPublicKey: process.env.BLOCKAID_PUBLIC_KEY as string,
          cdnBaseUrl: process.env.BLOCKAID_FILE_CDN as string,
          // @ts-expect-error TODO: Resolve/patch mismatch between base-controller versions. Before: never, never. Now: string, string, which expects 3rd and 4th args to be informed for restrictedControllerMessengers
          messenger: this.controllerMessenger.getRestricted<
            'PPOMController',
            never,
            'NetworkController:stateChange'
          >({
            name: 'PPOMController',
            allowedEvents: ['NetworkController:stateChange'],
          }),
          onPreferencesChange: (listener) =>
            preferencesController.subscribe(listener as any),
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
        controllers.push(ppomController as any);
      } catch (e) {
        Logger.log(`Error initializing PPOMController: ${e}`);
        return;
      }
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
        controller.subscribe !== undefined
      ) {
        // The following type error can be addressed by passing initial state into controller constructors instead
        // @ts-expect-error No type-level guarantee that the correct state is being applied to the correct controller here.
        controller.update(initialState[controller.name]);
      }
    }

    this.datamodel = new ComposableController(
      // @ts-expect-error The ComposableController needs to be updated to support BaseControllerV2
      controllers,
      this.controllerMessenger,
    );
    this.context = controllers.reduce<Partial<typeof this.context>>(
      (context, controller) => ({
        ...context,
        [controller.name]: controller,
      }),
      {
        controllerMessenger: this.controllerMessenger,
      },
    ) as typeof this.context;

    const {
      NftController: nfts,
      KeyringController: keyring,
      TransactionController: transaction,
    } = this.context;

    if (process.env.MM_OPENSEA_KEY) {
      nfts.setApiKey(process.env.MM_OPENSEA_KEY);
    }

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

    provider.sendAsync = provider.sendAsync.bind(provider);
    AccountTrackerController.configure({ provider });
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
    const networkProvider = NetworkController.state.providerConfig;
    const conversionRate =
      CurrencyRateController.state.conversionRate === null
        ? 0
        : CurrencyRateController.state.conversionRate;
    const { accountsByChainId } = AccountTrackerController.state;

    const { tokens } = TokensController.state;
    let ethFiat = 0;
    let tokenFiat = 0;
    const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;
    if (
      accountsByChainId?.[toHexadecimal(networkProvider.chainId)]?.[
        selectedAddress
      ]
    ) {
      ethFiat = weiToFiatNumber(
        accountsByChainId[toHexadecimal(networkProvider.chainId)][
          selectedAddress
        ].balance,
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
      ignoredTokens: [],
      tokens: [],
    });
    NftController.update({
      allNftContracts: {},
      allNfts: {},
      ignoredNfts: [],
    });

    TokensController.update({
      allTokens: {},
      allIgnoredTokens: {},
      ignoredTokens: [],
      tokens: [],
    });

    TokenBalancesController.update({ contractBalances: {} });
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
    reason: Error = ethErrors.provider.userRejectedRequest(),
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
};
