/* eslint-disable @typescript-eslint/no-shadow */
import {
  AccountTrackerController,
  AssetsContractController,
  TokenListController,
  CurrencyRateController,
  TokenBalancesController,
  TokenRatesController,
  TokensController,
  NftController,
  TokenDetectionController,
  NftDetectionController,
} from '@metamask/assets-controllers';
import { AddressBookController } from '@metamask/address-book-controller';
import { ControllerMessenger } from '@metamask/base-controller';
import { ComposableController } from '@metamask/composable-controller';
import {
  KeyringController,
  SignTypedDataVersion,
} from '@metamask/keyring-controller';
import { NetworkController } from '@metamask/network-controller';
import { PhishingController } from '@metamask/phishing-controller';
import { PreferencesController } from '@metamask/preferences-controller';
import { TransactionController } from '@metamask/transaction-controller';
import { GasFeeController } from '@metamask/gas-fee-controller';
import { ApprovalController } from '@metamask/approval-controller';
import { PermissionController } from '@metamask/permission-controller';
import SwapsController, { swapsUtils } from '@metamask/swaps-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MetaMaskKeyring as QRHardwareKeyring } from '@keystonehq/metamask-airgapped-keyring';
import Encryptor from './Encryptor';
import Networks, {
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
} from '../util/number';
import NotificationManager from './NotificationManager';
import Logger from '../util/Logger';
import { LAST_INCOMING_TX_BLOCK_INFO } from '../constants/storage';
import { isZero } from '../util/lodash';
import { MetaMetricsEvents } from './Analytics';
import AnalyticsV2 from '../util/analyticsV2';
import {
  getCaveatSpecifications,
  getPermissionSpecifications,
  unrestrictedMethods,
} from './Permissions/specifications.js';
import { backupVault } from './BackupVault';
import { SignatureController } from '@metamask/signature-controller';
import { Json } from '@metamask/controller-utils';

const NON_EMPTY = 'NON_EMPTY';

const encryptor = new Encryptor();
let currentChainId: any;

/**
 * Core controller responsible for composing other metamask controllers together
 * and exposing convenience methods for common wallet operations.
 */
class Engine {
  /**
   * ComposableController reference containing all child controllers
   */
  datamodel;

  /**
   * Object containing the info for the latest incoming tx block
   * for each address and network
   */
  lastIncomingTxBlockInfo: any;

  /**
   * Creates a CoreController instance
   */
  // eslint-disable-next-line @typescript-eslint/default-param-last
  constructor(initialState = {}, initialKeyringState) {
    if (!Engine.instance) {
      this.controllerMessenger = new ControllerMessenger();

      const approvalController = new ApprovalController({
        messenger: this.controllerMessenger.getRestricted({
          name: 'ApprovalController',
        }),
        showApprovalRequest: () => null,
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
      };

      const networkController = new NetworkController(networkControllerOpts);
      // This still needs to be set because it has the side-effect of initializing the provider
      networkController.providerConfig = {};
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
          getERC1155BalanceOf:
            assetsContractController.getERC1155BalanceOf.bind(
              assetsContractController,
            ),
          getERC1155TokenURI: assetsContractController.getERC1155TokenURI.bind(
            assetsContractController,
          ),
        },
        {
          useIPFSSubdomains: false,
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
          provider: networkController.provider,
          chainId: networkController.state.providerConfig.chainId,
        },
        messenger: this.controllerMessenger.getRestricted({
          name: 'TokensController',
          allowedActions: [`${approvalController.name}:addRequest`],
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
        messenger: this.controllerMessenger,
      });
      const currencyRateController = new CurrencyRateController({
        messenger: this.controllerMessenger,
        state: initialState.CurrencyRateController,
      });
      currencyRateController.start();

      const gasFeeController = new GasFeeController({
        messenger: this.controllerMessenger,
        getProvider: () => networkController.provider,
        onNetworkStateChange: (listener) =>
          this.controllerMessenger.subscribe(
            AppConstants.NETWORK_STATE_CHANGE_EVENT,
            listener,
          ),
        getCurrentNetworkEIP1559Compatibility: async () =>
          await networkController.getEIP1559Compatibility(),
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
        const newIdentities = {};
        Object.keys(identities).forEach((key) => {
          newIdentities[key.toLowerCase()] = identities[key];
        });
        return newIdentities;
      };

      const keyringState =
        initialKeyringState || initialState.KeyringController;

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
          getSelectedAddress: () => preferencesController.state.selectedAddress,
          getMultiAccountBalancesEnabled: () =>
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
          addDetectedTokens: (tokens) => {
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
          updateTokensName: (tokenList) =>
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
            getSelectedAddress: () =>
              preferencesController.state.selectedAddress,
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
          onNetworkStateChange: (listener) =>
            this.controllerMessenger.subscribe(
              AppConstants.NETWORK_STATE_CHANGE_EVENT,
              listener,
            ),
          getProvider: () => networkController.provider,
          messenger: this.controllerMessenger.getRestricted({
            name: 'TransactionController',
            allowedActions: [`${approvalController.name}:addRequest`],
          }),
        }),
        new SwapsController(
          {
            fetchGasFeeEstimates: () => gasFeeController.fetchGasFeeEstimates(),
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
          messenger: this.controllerMessenger.getRestricted({
            name: 'SignatureController',
            allowedActions: [
              `${approvalController.name}:addRequest`,
              `${approvalController.name}:acceptRequest`,
              `${approvalController.name}:rejectRequest`,
            ],
          }),
          isEthSignEnabled: () =>
            Boolean(
              preferencesController.state?.disabledRpcMethodPreferences
                ?.eth_sign,
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
                msgParams,
                version as SignTypedDataVersion,
              ),
          },
        }),
      ];

      // set initial state
      // TODO: Pass initial state into each controller constructor instead
      // This is being set post-construction for now to ensure it's functionally equivalent with
      // how the `ComponsedController` used to set initial state.
      //
      // The check for `controller.subscribe !== undefined` is to filter out BaseControllerV2
      // controllers. They should be initialized via the constructor instead.
      for (const controller of controllers) {
        if (
          initialState[controller.name] &&
          controller.subscribe !== undefined
        ) {
          controller.update(initialState[controller.name]);
        }
      }

      this.datamodel = new ComposableController(
        controllers,
        this.controllerMessenger,
      );
      this.context = controllers.reduce((context, controller) => {
        context[controller.name] = controller;
        return context;
      }, {});

      const {
        NftController: nfts,
        KeyringController: keyring,
        TransactionController: transaction,
      } = this.context;

      nfts.setApiKey(process.env.MM_OPENSEA_KEY);

      transaction.configure({ sign: keyring.signTransaction.bind(keyring) });
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

    return Engine.instance;
  }

  handleVaultBackup() {
    const { KeyringController } = this.context;
    KeyringController.subscribe((state) =>
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
    } = this.context;
    TokenListController.start();
    NftDetectionController.start();
    TokenDetectionController.start();
  }

  configureControllersOnNetworkChange() {
    const {
      AccountTrackerController,
      AssetsContractController,
      TokenDetectionController,
      NftDetectionController,
      NetworkController: { provider, state: NetworkControllerState },
      TransactionController,
      SwapsController,
    } = this.context;

    provider.sendAsync = provider.sendAsync.bind(provider);
    AccountTrackerController.configure({ provider });
    AssetsContractController.configure({ provider });

    SwapsController.configure({
      provider,
      chainId: NetworkControllerState?.providerConfig?.chainId,
      pollCountLimit: AppConstants.SWAPS.POLL_COUNT_LIMIT,
    });
    TransactionController.configure({ provider });
    TransactionController.hub.emit('networkChange');
    TokenDetectionController.detectTokens();
    NftDetectionController.detectNfts();
    AccountTrackerController.refresh();
  }

  refreshTransactionHistory = async (forceCheck: any) => {
    const { TransactionController, PreferencesController, NetworkController } =
      this.context;
    const { selectedAddress } = PreferencesController.state;
    const { type: networkType } = NetworkController.state.providerConfig;
    const { networkId } = Networks[networkType];
    try {
      const lastIncomingTxBlockInfoStr = await AsyncStorage.getItem(
        LAST_INCOMING_TX_BLOCK_INFO,
      );
      const allLastIncomingTxBlocks =
        (lastIncomingTxBlockInfoStr &&
          JSON.parse(lastIncomingTxBlockInfoStr)) ||
        {};
      let blockNumber = null;
      if (allLastIncomingTxBlocks[`${selectedAddress}`]?.[`${networkId}`]) {
        blockNumber =
          allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`]
            .blockNumber;
        // Let's make sure we're not doing this too often...
        const timeSinceLastCheck =
          allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`]
            .lastCheck;
        const delta = Date.now() - timeSinceLastCheck;
        if (delta < AppConstants.TX_CHECK_MAX_FREQUENCY && !forceCheck) {
          return false;
        }
      } else {
        allLastIncomingTxBlocks[`${selectedAddress}`] = {};
      }
      //Fetch txs and get the new lastIncomingTxBlock number
      const newlastIncomingTxBlock = await TransactionController.fetchAll(
        selectedAddress,
        {
          blockNumber,
          etherscanApiKey: process.env.MM_ETHERSCAN_KEY,
        },
      );
      // Check if it's a newer block and store it so next time we ask for the newer txs only
      if (
        allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`] &&
        allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`]
          .blockNumber !== newlastIncomingTxBlock &&
        newlastIncomingTxBlock &&
        newlastIncomingTxBlock !== blockNumber
      ) {
        allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`] = {
          blockNumber: newlastIncomingTxBlock,
          lastCheck: Date.now(),
        };

        NotificationManager.gotIncomingTransaction(newlastIncomingTxBlock);
      } else {
        allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`] = {
          ...allLastIncomingTxBlocks[`${selectedAddress}`][`${networkId}`],
          lastCheck: Date.now(),
        };
      }
      await AsyncStorage.setItem(
        LAST_INCOMING_TX_BLOCK_INFO,
        JSON.stringify(allLastIncomingTxBlocks),
      );
    } catch (e) {
      // Logger.log('Error while fetching all txs', e);
    }
  };

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
        (item: {
          address: string;
          balance: string | undefined;
          decimals: number;
        }) => {
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

      const fiatBalance = this.getTotalFiatAccountBalance();

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
      internalTransactions: [],
      swapsTransactions: {},
      methodData: {},
      transactions: [],
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

  rejectPendingApproval(id: string, reason: Error) {
    const { ApprovalController } = this.context;

    try {
      ApprovalController.reject(id, reason);
    } catch (error: any) {
      Logger.error(error, 'Reject while rejecting pending connection request');
    }
  }

  acceptPendingApproval(id: string, requestData?: Record<string, Json>) {
    const { ApprovalController } = this.context;
    try {
      ApprovalController.accept(id, requestData);
    } catch (err) {
      // Ignore err if request already approved or doesn't exists.
    }
  }
}

let instance: Engine;

export default {
  get context() {
    return instance?.context;
  },
  get controllerMessenger() {
    return instance?.controllerMessenger;
  },
  get state() {
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
    return instance.datamodel;
  },
  getTotalFiatAccountBalance() {
    return instance.getTotalFiatAccountBalance();
  },
  hasFunds() {
    return instance.hasFunds();
  },
  resetState() {
    return instance.resetState();
  },
  destroyEngine() {
    instance?.destroyEngineInstance();
    instance = null;
  },
  refreshTransactionHistory(forceCheck = false) {
    return instance.refreshTransactionHistory(forceCheck);
  },
  init(state: Record<string, never> | undefined, keyringState = null) {
    instance = new Engine(state, keyringState);
    Object.freeze(instance);
    return instance;
  },
  acceptPendingApproval: (id: string, requestData?: Record<string, Json>) =>
    instance?.acceptPendingApproval(id, requestData),
  rejectPendingApproval: (id: string, reason: Error) =>
    instance?.rejectPendingApproval(id, reason),
};
