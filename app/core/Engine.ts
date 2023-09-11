/* eslint-disable @typescript-eslint/no-shadow */
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
} from '@metamask/assets-controllers';
import {
  AddressBookController,
  AddressBookState,
} from '@metamask/address-book-controller';
import { BaseState, ControllerMessenger } from '@metamask/base-controller';
import { ComposableController } from '@metamask/composable-controller';
import {
  KeyringController,
  KeyringState,
  SignTypedDataVersion,
} from '@metamask/keyring-controller';
import {
  NetworkController,
  NetworkControllerActions,
  NetworkControllerEvents,
  NetworkState,
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
} from '@metamask/permission-controller';
import SwapsController, { swapsUtils } from '@metamask/swaps-controller';
import { PPOMController } from '@metamask/ppom-validator';
import { MetaMaskKeyring as QRHardwareKeyring } from '@keystonehq/metamask-airgapped-keyring';
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
import { isZero } from '../util/lodash';
import { MetaMetricsEvents } from './Analytics';
import AnalyticsV2 from '../util/analyticsV2';
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
import { hasProperty, Json } from '@metamask/controller-utils';
// TODO: Export this type from the package directly
import { SwapsState } from '@metamask/swaps-controller/dist/SwapsController';
import { ethErrors } from 'eth-rpc-errors';

import { PPOM, ppomInit } from '../lib/ppom/PPOMView';
import RNFSStorageBackend from '../lib/ppom/rnfs-storage-backend';

const NON_EMPTY = 'NON_EMPTY';

const encryptor = new Encryptor();
let currentChainId: any;

type GlobalActions =
  | ApprovalControllerActions
  | GetCurrencyRateState
  | GetGasFeeState
  | GetTokenListState
  | NetworkControllerActions
  | PermissionControllerActions
  | SignatureControllerActions;
type GlobalEvents =
  | ApprovalControllerEvents
  | CurrencyRateStateChange
  | GasFeeStateChange
  | TokenListStateChange
  | NetworkControllerEvents
  | PermissionControllerEvents
  | SignatureControllerEvents;

type PermissionsByRpcMethod = ReturnType<typeof getPermissionSpecifications>;
type Permissions = PermissionsByRpcMethod[keyof PermissionsByRpcMethod];

export interface EngineState {
  AccountTrackerController: AccountTrackerState;
  AddressBookController: AddressBookState;
  AssetsContractController: BaseState;
  NftController: NftState;
  TokenListController: TokenListState;
  CurrencyRateController: CurrencyRateState;
  KeyringController: KeyringState;
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
  PermissionController: PermissionControllerState<Permissions>;
  ApprovalController: ApprovalControllerState;
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

  /**
   * Creates a CoreController instance
   */
  // eslint-disable-next-line @typescript-eslint/default-param-last
  constructor(
    initialState: Partial<EngineState> = {},
    initialKeyringState?: KeyringState | null,
  ) {
    this.controllerMessenger = new ControllerMessenger();

    const approvalController = new ApprovalController({
      // @ts-expect-error Error might be caused by base controller version mismatch
      messenger: this.controllerMessenger.getRestricted({
        name: 'ApprovalController',
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
        openSeaEnabled: false,
      },
    );

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
      onPreferencesStateChange: (listener) =>
        preferencesController.subscribe(listener),
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          listener,
        ),
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
        // @ts-expect-error NftController constructor config type is wrong
        useIPFSSubdomains: false,
        chainId: networkController.state.providerConfig.chainId,
      },
    );
    const tokensController = new TokensController({
      onPreferencesStateChange: (listener) =>
        preferencesController.subscribe(listener),
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          listener,
        ),
      config: {
        provider: networkController.getProviderAndBlockTracker().provider,
        chainId: networkController.state.providerConfig.chainId,
      },
      messenger: this.controllerMessenger.getRestricted({
        name: 'TokensController',
        allowedActions: [`${approvalController.name}:addRequest`],
      }),
      // @ts-expect-error This is added in a patch, but types weren't updated
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
      messenger: this.controllerMessenger.getRestricted({
        name: 'TokenListController',
        allowedEvents: ['NetworkController:providerConfigChange'],
      }),
    });
    const currencyRateController = new CurrencyRateController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'CurrencyRateController',
      }),
      state: initialState.CurrencyRateController,
    });
    currencyRateController.start();

    const gasFeeController = new GasFeeController({
      messenger: this.controllerMessenger.getRestricted({
        name: 'GasFeeController',
      }),
      getProvider: () =>
        networkController.getProviderAndBlockTracker().provider,
      onNetworkStateChange: (listener) =>
        this.controllerMessenger.subscribe(
          AppConstants.NETWORK_STATE_CHANGE_EVENT,
          listener,
        ),
      getCurrentNetworkEIP1559Compatibility: async () =>
        await networkController.getEIP1559Compatibility(),
      // @ts-expect-error Incompatible string types, fixed in upcoming version
      getChainId: () => networkController.state.providerConfig.chainId,
      getCurrentNetworkLegacyGasAPICompatibility: () => {
        const chainId = networkController.state.providerConfig.chainId;
        return (
          isMainnetByChainId(chainId) ||
          chainId === swapsUtils.BSC_CHAIN_ID ||
          chainId === swapsUtils.POLYGON_CHAIN_ID
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

    const additionalKeyrings = [QRHardwareKeyring];

    const getIdentities = () => {
      const identities = preferencesController.state.identities;
      const lowerCasedIdentities: PreferencesState['identities'] = {};
      Object.keys(identities).forEach((key) => {
        lowerCasedIdentities[key.toLowerCase()] = identities[key];
      });
      return lowerCasedIdentities;
    };

    const keyringState = initialKeyringState || initialState.KeyringController;

    const keyringController = new KeyringController(
      {
        removeIdentity: preferencesController.removeIdentity.bind(
          preferencesController,
        ),
        syncIdentities: preferencesController.syncIdentities.bind(
          preferencesController,
        ),
        updateIdentities: preferencesController.updateIdentities.bind(
          preferencesController,
        ),
        setSelectedAddress: preferencesController.setSelectedAddress.bind(
          preferencesController,
        ),
        setAccountLabel: preferencesController.setAccountLabel.bind(
          preferencesController,
        ),
      },
      { encryptor, keyringTypes: additionalKeyrings },
      keyringState,
    );

    const controllers = [
      keyringController,
      new AccountTrackerController({
        onPreferencesStateChange: (listener) =>
          preferencesController.subscribe(listener),
        getIdentities: () => preferencesController.state.identities,
        // @ts-expect-error This is added in a patch, but types weren't updated
        getSelectedAddress: () => preferencesController.state.selectedAddress,
        getMultiAccountBalancesEnabled: () =>
          // @ts-expect-error This is added in a patch, but types weren't updated
          preferencesController.state.isMultiAccountBalancesEnabled,
      }),
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
          AnalyticsV2.trackEvent(MetaMetricsEvents.TOKEN_DETECTED, {
            token_standard: 'ERC20',
            asset_type: 'token',
            chain_id: getDecimalChainId(
              networkController.state.providerConfig.chainId,
            ),
          });
          tokensController.addDetectedTokens(tokens);
        },
        // @ts-expect-error This is added in a patch, but types weren't updated
        updateTokensName: (tokenList) =>
          // @ts-expect-error This is added in a patch, but types weren't updated
          tokensController.updateTokensName(tokenList),
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
        getOpenSeaApiKey: () => nftController.openSeaApiKey,
        addNft: nftController.addNft.bind(nftController),
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
          getSelectedAddress: () => preferencesController.state.selectedAddress,
          getERC20BalanceOf: assetsContractController.getERC20BalanceOf.bind(
            assetsContractController,
          ),
        },
        { interval: 10000 },
      ),
      new TokenRatesController(
        {
          onTokensStateChange: (listener) =>
            tokensController.subscribe(listener),
          onCurrencyRateStateChange: (listener) =>
            this.controllerMessenger.subscribe(
              `${currencyRateController.name}:stateChange`,
              listener,
            ),
          onNetworkStateChange: (listener) =>
            this.controllerMessenger.subscribe(
              AppConstants.NETWORK_STATE_CHANGE_EVENT,
              listener,
            ),
        },
        {
          chainId: networkController.state.providerConfig.chainId,
        },
      ),
      new TransactionController({
        getNetworkState: () => networkController.state,
        getProvider: () =>
          networkController.getProviderAndBlockTracker().provider,
        getSelectedAddress: () => preferencesController.state.selectedAddress,
        incomingTransactions: {
          apiKey: process.env.MM_ETHERSCAN_KEY,
          isEnabled: () =>
            Boolean(store.getState()?.privacy?.thirdPartyApiMode),
          updateTransactions: true,
        },
        messenger: this.controllerMessenger.getRestricted({
          name: 'TransactionController',
          allowedActions: [`${approvalController.name}:addRequest`],
        }),
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),
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
          ],
        },
      ),
      gasFeeController,
      approvalController,
      new PermissionController({
        // @ts-expect-error Error might be caused by base controller version mismatch
        messenger: this.controllerMessenger.getRestricted({
          name: 'PermissionController',
          allowedActions: [
            `${approvalController.name}:addRequest`,
            `${approvalController.name}:hasRequest`,
            `${approvalController.name}:acceptRequest`,
            `${approvalController.name}:rejectRequest`,
          ],
        }),
        state: initialState.PermissionController,
        caveatSpecifications: getCaveatSpecifications({ getIdentities }),
        // @ts-expect-error Inferred permission specification type is incorrect, fix after migrating to TypeScript
        permissionSpecifications: {
          ...getPermissionSpecifications({
            getAllAccounts: () => keyringController.getAccounts(),
          }),
          /*
            ...this.getSnapPermissionSpecifications(),
            */
        },
        unrestrictedMethods,
      }),
      new SignatureController({
        // @ts-expect-error Error might be caused by base controller version mismatch
        messenger: this.controllerMessenger.getRestricted({
          name: 'SignatureController',
          allowedActions: [`${approvalController.name}:addRequest`],
        }),
        isEthSignEnabled: () =>
          Boolean(
            preferencesController.state?.disabledRpcMethodPreferences?.eth_sign,
          ),
        getAllState: () => store.getState(),
        getCurrentChainId: () =>
          toHexadecimal(networkController.state.providerConfig.chainId),
        keyringController: {
          signMessage: keyringController.signMessage.bind(keyringController),
          signPersonalMessage:
            keyringController.signPersonalMessage.bind(keyringController),
          signTypedMessage: (msgParams, { version }) =>
            keyringController.signTypedMessage(
              // @ts-expect-error Error might be caused by base controller version mismatch
              msgParams,
              version as SignTypedDataVersion,
            ),
        },
      }),
    ];

    if (process.env.MM_BLOCKAID_UI_ENABLED) {
      try {
        const ppomController = new PPOMController({
          chainId: addHexPrefix(networkController.state.providerConfig.chainId),
          blockaidPublicKey: process.env.BLOCKAID_PUBLIC_KEY as string,
          cdnBaseUrl: process.env.BLOCKAID_FILE_CDN as string,
          // @ts-expect-error Error might be caused by base controller version mismatch
          messenger: this.controllerMessenger.getRestricted({
            name: 'PPOMController',
          }),
          onNetworkChange: (listener) =>
            this.controllerMessenger.subscribe(
              AppConstants.NETWORK_STATE_CHANGE_EVENT,
              listener,
            ),
          onPreferencesChange: () => undefined,
          provider: () =>
            networkController.getProviderAndBlockTracker().provider,
          ppomProvider: {
            PPOM,
            ppomInit,
          },
          storageBackend: new RNFSStorageBackend('PPOMDB'),
          securityAlertsEnabled: true,
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

    transaction.configure({ sign: keyring.signTransaction.bind(keyring) });

    transaction.hub.on('incomingTransactionBlock', (blockNumber: number) => {
      NotificationManager.gotIncomingTransaction(blockNumber);
    });

    this.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      (state: { network: string; providerConfig: { chainId: any } }) => {
        if (
          state.network !== 'loading' &&
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
    const { KeyringController } = this.context;
    KeyringController.subscribe((state: any) =>
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
    } = this.context;

    TokenListController.start();
    NftDetectionController.start();
    TokenDetectionController.start();
    TransactionController.startIncomingTransactionPolling();
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

  getTotalFiatAccountBalance = () => {
    const {
      CurrencyRateController,
      PreferencesController,
      AccountTrackerController,
      TokenBalancesController,
      TokenRatesController,
      TokensController,
    } = this.context;
    const { selectedAddress } = PreferencesController.state;
    const { currentCurrency } = CurrencyRateController.state;
    const conversionRate =
      CurrencyRateController.state.conversionRate === null
        ? 0
        : CurrencyRateController.state.conversionRate;
    const { accounts } = AccountTrackerController.state;
    const { tokens } = TokensController.state;
    let ethFiat = 0;
    let tokenFiat = 0;
    const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;
    if (accounts[selectedAddress]) {
      ethFiat = weiToFiatNumber(
        accounts[selectedAddress].balance,
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

    const total = ethFiat + tokenFiat;
    return total;
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

      return fiatBalance > 0 || tokenFound || nfts.length > 0;
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
  };

  removeAllListeners() {
    this.controllerMessenger.clearSubscriptions();
  }

  async destroyEngineInstance() {
    this.removeAllListeners();
    await this.resetState();
    Engine.instance = null;
  }

  rejectPendingApproval(
    id: string,
    reason: Error = ethErrors.provider.userRejectedRequest(),
    { ignoreMissing, logErrors } = {
      ignoreMissing: false,
      logErrors: true,
    },
  ) {
    const { ApprovalController } = this.context;

    if (ignoreMissing && !ApprovalController.has({ id })) {
      return;
    }

    try {
      ApprovalController.reject(id, reason);
    } catch (error: any) {
      if (logErrors) {
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
      PermissionController,
      ApprovalController,
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
      PermissionController,
      ApprovalController,
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
    {
      ignoreMissing,
      logErrors,
    }: {
      ignoreMissing: boolean;
      logErrors: boolean;
    },
  ) =>
    instance?.rejectPendingApproval(id, reason, { ignoreMissing, logErrors }),
};
