/* eslint-disable no-undef */

import { getGanachePort } from './utils';
import { merge } from 'lodash';
import { CustomNetworks, PopularNetworksList } from '../resources/networks.e2e';
const DAPP_URL = 'localhost';

/**
 * FixtureBuilder class provides a fluent interface for building fixture data.
 */
class FixtureBuilder {
  /**
   * Create a new instance of FixtureBuilder.
   * @param {Object} options - Options for the fixture builder.
   * @param {boolean} options.onboarding - Flag indicating if onboarding fixture should be used.
   */
  constructor({ onboarding = false } = {}) {
    // Initialize the fixture based on the onboarding flag
    onboarding === true
      ? this.withOnboardingFixture()
      : this.withDefaultFixture();
  }

  /**
   * Set the asyncState property of the fixture.
   * @param {any} asyncState - The value to set for asyncState.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withAsyncState(asyncState) {
    this.fixture.asyncState = asyncState;
    return this;
  }

  /**
   * Set the state property of the fixture.
   * @param {any} state - The value to set for state.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withState(state) {
    this.fixture.state = state;
    return this;
  }

  /**
   * Set the default fixture values.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withDefaultFixture() {
    this.fixture = {
      state: {
        legalNotices: {
          newPrivacyPolicyToastClickedOrClosed: true,
          newPrivacyPolicyToastShownDate: Date.now(),
        },
        collectibles: {
          favorites: {},
        },
        engine: {
          backgroundState: {
            AccountTrackerController: {
              accounts: {
                '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': {
                  balance: '0x0',
                },
              },
              accountsByChainId: {
                0x40: {
                  '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': {
                    balance: '0x0',
                  },
                },
                0x1: {
                  '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': {
                    balance: '0x0',
                  },
                },
              },
              _U: 0,
              _V: 1,
              _X: null,
            },
            AddressBookController: {
              addressBook: {},
            },
            AssetsContractController: {},
            NftController: {
              allNftContracts: {},
              allNfts: {},
              ignoredNfts: [],
            },
            TokenListController: {
              tokenList: {
                '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': {
                  address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
                  symbol: 'SNX',
                  decimals: 18,
                  name: 'Synthetix Network Token',
                  iconUrl:
                    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f.png',
                  type: 'erc20',
                  aggregators: [
                    'Aave',
                    'Bancor',
                    'CMC',
                    'Crypto.com',
                    'CoinGecko',
                    '1inch',
                    'PMM',
                    'Synthetix',
                    'Zerion',
                    'Lifi',
                  ],
                  occurrences: 10,
                  fees: {
                    '0x5fd79d46eba7f351fe49bff9e87cdea6c821ef9f': 0,
                    '0xda4ef8520b1a57d7d63f1e249606d1a459698876': 0,
                  },
                },
              },
              tokensChainsCache: {},
              preventPollingOnNetworkRestart: false,
            },
            CurrencyRateController: {
              currentCurrency: 'usd',
              currencyRates: {
                ETH: {
                  conversionDate: 1684232383.997,
                  conversionRate: 1815.41,
                  usdConversionRate: 1815.41,
                },
              },
            },
            KeyringController: {
              vault:
                '{"cipher":"ynNI8tAH4fcpmXo8S88A/3T3Dd1w0LY5ftpL59gW0ObYxovgFhrtKpRe/WD7WU42KwGBNKVicB9W9at4ePgOJGS6IMWr//C3jh0vKQTabkDzDy1ZfSvztRxGpVjmrnU3fC5B0eq/MBMSrgu8Bww309pk5jghyRfzp9YsG0ONo1CXUm2brQo/eRve7i9aDbiGXiEK0ch0BO7AvZPGMhHtYRrrOro4QrDVHGUgAF5SA1LD4dv/2AB8ctHwn4YbUmICieqlhJhprx3CNOJ086g7vPQOr21T4IbvtTumFaTibfoD3GWHQo11CvE04z3cN3rRERriP7bww/tZOe8OAMFGWANkmOJHwPPwEo1NBr6w3GD2VObEmqNhXeNc6rrM23Vm1JU40Hl+lVKubnbT1vujdGLmOpDY0GdekscQQrETEQJfhKlXIT0wwyPoLwR+Ja+GjyOhBr0nfWVoVoVrcTUwAk5pStBMt+5OwDRpP29L1+BL9eMwDgKpjVXRTh4MGagKYmFc6eKDf6jV0Yt9pG+jevv5IuyhwX0TRtfQCGgRTtS7oxhDQPxGqu01rr+aI7vGMfRQpaKEEXEWVmMaqCmktyUV35evK9h/xv1Yif00XBll55ShxN8t2/PnATvZxFKQfjJe5f/monbwf8rpfXHuFoh8M9hzjbcS5eh/TPYZZu1KltpeHSIAh5C+4aFyZw0e1DeAg/wdRO3PhBrVztsHSyISHlRdfEyw7QF4Lemr++2MVR1dTxS2I5mUEHjh+hmp64euH1Vb/RUppXlmE8t1RYYXfcsF2DlRwPswP739E/EpVtY3Syf/zOTyHyrOJBldzw22sauIzt8Q5Fe5qA/hGRWiejjK31P/P5j7wEKY7vrOJB1LWNXHSuSjffx9Ai9E","iv":"d5dc0252424ac0c08ca49ef320d09569","salt":"feAPSGdL4R2MVj2urJFl4A==","lib":"original"}',
              keyrings: [
                {
                  accounts: ['0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3'],
                  index: 0,
                  type: 'HD Key Tree',
                },
              ],
            },
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              providerConfig: {
                type: 'mainnet',
                chainId: '0x1',
                ticker: 'ETH',
              },
              networksMetadata: {
                goerli: {
                  EIPS: {},
                  status: 'unknown',
                },
                'linea-goerli': {
                  EIPS: {},
                  status: 'unknown',
                },
                'linea-sepolia': {
                  EIPS: {},
                  status: 'unknown',
                },
                'linea-mainnet': {
                  EIPS: {},
                  status: 'unknown',
                },
                mainnet: {
                  EIPS: {},
                  status: 'unknown',
                },
                sepolia: {
                  EIPS: {},
                  status: 'unknown',
                },
              },
              networkConfigurations: {
                networkId1: {
                  rpcUrl: `http://localhost:${getGanachePort()}`,
                  chainId: '1338',
                  ticker: 'ETH',
                  nickname: 'Localhost',
                },
              },
            },
            PhishingController: {
              listState: {
                allowlist: [],
                fuzzylist: [
                  'cryptokitties.co',
                  'launchpad.ethereum.org',
                  'etherscan.io',
                  'makerfoundation.com',
                  'metamask.io',
                  'myetherwallet.com',
                  'opensea.io',
                  'satoshilabs.com',
                ],
                version: 2,
                name: 'MetaMask',
                tolerance: 1,
                lastUpdated: 1684231917,
              },
              whitelist: [],
              hotlistLastFetched: 1684231917,
              stalelistLastFetched: 1684231917,
            },
            AccountsController: {
              internalAccounts: {
                accounts: {
                  1: {
                    address: '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
                    id: '1',
                    metadata: {
                      name: 'Account 1',
                      importTime: 1684232000456,
                      keyring: {
                        type: 'HD Key Tree',
                      },
                    },
                    options: {},
                    methods: [
                      'personal_sign',
                      'eth_sign',
                      'eth_signTransaction',
                      'eth_signTypedData_v1',
                      'eth_signTypedData_v3',
                      'eth_signTypedData_v4',
                    ],
                    type: 'eip155:eoa',
                  },
                },
                selectedAccount: 1,
              },
            },
            PreferencesController: {
              featureFlags: {},
              identities: {
                '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': {
                  address: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
                  name: 'Account 1',
                  importTime: 1684232000456,
                },
              },
              ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
              lostIdentities: {},
              selectedAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
              useTokenDetection: true,
              useNftDetection: true,
              displayNftMedia: true,
              useSafeChainsListValidation: false,
              isMultiAccountBalancesEnabled: true,
              disabledRpcMethodPreferences: {
                eth_sign: false,
              },
              showTestNetworks: true,
              _U: 0,
              _V: 1,
              _W: {
                featureFlags: {},
                frequentRpcList: [],
                identities: {
                  '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': {
                    address: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
                    name: 'Account 1',
                    importTime: 1684232000456,
                  },
                },
                ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
                lostIdentities: {},
                selectedAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
                useTokenDetection: true,
                useNftDetection: false,
                displayNftMedia: true,
                useSafeChainsListValidation: false,
                isMultiAccountBalancesEnabled: true,
                disabledRpcMethodPreferences: {
                  eth_sign: false,
                },
                showTestNetworks: true,
                showIncomingTransactions: {
                  '0x1': true,
                  '0x5': true,
                  '0x38': true,
                  '0x61': true,
                  '0xa': true,
                  '0xa869': true,
                  '0x1a4': true,
                  '0x89': true,
                  '0x13881': true,
                  '0xa86a': true,
                  '0xfa': true,
                  '0xfa2': true,
                  '0xaa36a7': true,
                  '0xe704': true,
                  '0xe705': true,
                  '0xe708': true,
                  '0x504': true,
                  '0x507': true,
                  '0x505': true,
                  '0x64': true,
                },
              },
              _X: null,
            },
            TokenBalancesController: {
              contractBalances: {},
            },
            TokenRatesController: {
              marketData: {},
            },
            TokensController: {
              tokens: [],
              ignoredTokens: [],
              detectedTokens: [],
              allTokens: {},
              allIgnoredTokens: {},
              allDetectedTokens: {},
            },
            TransactionController: {
              methodData: {},
              transactions: [],
              internalTransactions: [],
              swapsTransactions: {},
            },
            SwapsController: {
              quotes: {},
              quoteValues: {},
              fetchParams: {
                slippage: 0,
                sourceToken: '',
                sourceAmount: 0,
                destinationToken: '',
                walletAddress: '',
              },
              fetchParamsMetaData: {
                sourceTokenInfo: {
                  decimals: 0,
                  address: '',
                  symbol: '',
                },
                destinationTokenInfo: {
                  decimals: 0,
                  address: '',
                  symbol: '',
                },
              },
              topAggSavings: null,
              aggregatorMetadata: null,
              tokens: null,
              topAssets: null,
              approvalTransaction: null,
              aggregatorMetadataLastFetched: 0,
              quotesLastFetched: 0,
              topAssetsLastFetched: 0,
              error: {
                key: null,
                description: null,
              },
              topAggId: null,
              tokensLastFetched: 0,
              isInPolling: false,
              pollingCyclesLeft: 3,
              quoteRefreshSeconds: null,
              usedGasEstimate: null,
              usedCustomGas: null,
              chainCache: {
                '0x1': {
                  aggregatorMetadata: null,
                  tokens: null,
                  topAssets: null,
                  aggregatorMetadataLastFetched: 0,
                  topAssetsLastFetched: 0,
                  tokensLastFetched: 0,
                },
              },
            },
            GasFeeController: {
              gasFeeEstimates: {},
              estimatedGasFeeTimeBounds: {},
              gasEstimateType: 'none',
              gasFeeEstimatesByChainId: {},
              nonRPCGasFeeApisDisabled: false,
            },
            TokenDetectionController: {},
            NftDetectionController: {},
            PermissionController: {
              subjects: {},
            },
            ApprovalController: {
              pendingApprovals: {},
              pendingApprovalCount: 0,
              approvalFlows: [],
            },
          },
        },
        privacy: {
          approvedHosts: {},
          revealSRPTimestamps: [],
        },
        bookmarks: [],
        browser: {
          history: [],
          whitelist: [],
          tabs: [
            {
              url: 'https://home.metamask.io/',
              id: 1692550481062,
            },
          ],
          activeTab: 1692550481062,
        },
        modals: {
          networkModalVisible: false,
          shouldNetworkSwitchPopToWallet: true,
          collectibleContractModalVisible: false,
          receiveModalVisible: false,
          dappTransactionModalVisible: false,
          signMessageModalVisible: true,
        },
        settings: {
          searchEngine: 'DuckDuckGo',
          primaryCurrency: 'ETH',
          lockTime: 30000,
          useBlockieIcon: true,
          hideZeroBalanceTokens: false,
          basicFunctionalityEnabled: true,
        },
        alert: {
          isVisible: false,
          autodismiss: null,
          content: null,
          data: null,
        },
        transaction: {
          selectedAsset: {},
          transaction: {},
        },
        user: {
          loadingMsg: '',
          loadingSet: false,
          passwordSet: true,
          seedphraseBackedUp: true,
          backUpSeedphraseVisible: false,
          protectWalletModalVisible: false,
          gasEducationCarouselSeen: false,
          userLoggedIn: true,
          isAuthChecked: false,
          initialScreen: '',
          appTheme: 'os',
        },
        wizard: {
          step: 0,
        },
        onboarding: {
          events: [],
        },
        notification: {
          notifications: [],
        },
        swaps: {
          '0x1': {
            isLive: true,
          },
          isLive: true,
          hasOnboarded: false,
        },
        fiatOrders: {
          orders: [],
          customOrderIds: [],
          networks: [
            {
              active: true,
              chainId: 1,
              chainName: 'Ethereum Mainnet',
              shortName: 'Ethereum',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 10,
              chainName: 'Optimism Mainnet',
              shortName: 'Optimism',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 25,
              chainName: 'Cronos Mainnet',
              shortName: 'Cronos',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 56,
              chainName: 'BNB Chain Mainnet',
              shortName: 'BNB Chain',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 137,
              chainName: 'Polygon Mainnet',
              shortName: 'Polygon',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 250,
              chainName: 'Fantom Mainnet',
              shortName: 'Fantom',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 1284,
              chainName: 'Moonbeam Mainnet',
              shortName: 'Moonbeam',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 1285,
              chainName: 'Moonriver Mainnet',
              shortName: 'Moonriver',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 42161,
              chainName: 'Arbitrum Mainnet',
              shortName: 'Arbitrum',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 42220,
              chainName: 'Celo Mainnet',
              shortName: 'Celo',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 43114,
              chainName: 'Avalanche C-Chain Mainnet',
              shortName: 'Avalanche C-Chain',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 1313161554,
              chainName: 'Aurora Mainnet',
              shortName: 'Aurora',
              nativeTokenSupported: false,
            },
            {
              active: true,
              chainId: 1666600000,
              chainName: 'Harmony Mainnet (Shard 0)',
              shortName: 'Harmony  (Shard 0)',
              nativeTokenSupported: true,
            },
            {
              active: true,
              chainId: 11297108109,
              chainName: 'Palm Mainnet',
              shortName: 'Palm',
              nativeTokenSupported: false,
            },
            {
              active: true,
              chainId: 1338,
              chainName: 'Localhost',
              shortName: 'Localhost',
              nativeTokenSupported: true,
            },
            {
              chainId: 1,
              chainName: 'Tenderly',
              shortName: 'Tenderly',
              nativeTokenSupported: true,
            },
          ],
          selectedRegionAgg: null,
          selectedPaymentMethodAgg: null,
          getStartedAgg: false,
          authenticationUrls: [],
          activationKeys: [],
        },
        infuraAvailability: {
          isBlocked: false,
        },
        navigation: {
          currentRoute: 'AdvancedSettings',
          currentBottomNavRoute: 'Wallet',
        },
        networkOnboarded: {
          networkOnboardedState: {},
          networkState: {
            showNetworkOnboarding: false,
            nativeToken: '',
            networkType: '',
            networkUrl: '',
          },
          switchedNetwork: {
            networkUrl: '',
            networkStatus: false,
          },
        },
        security: {
          allowLoginWithRememberMe: false,
          automaticSecurityChecksEnabled: false,
          hasUserSelectedAutomaticSecurityCheckOption: true,
          isAutomaticSecurityChecksModalOpen: false,
        },
        experimentalSettings: {
          securityAlertsEnabled: true,
        },
        inpageProvider: {
          networkId: '1',
        },
      },
      asyncState: {
        '@MetaMask:existingUser': 'true',
        '@MetaMask:onboardingWizard': 'explored',
        '@MetaMask:UserTermsAcceptedv1.0': 'true',
        '@MetaMask:WhatsNewAppVersionSeen': '7.24.3',
      },
    };
    return this;
  }

  /**
   * Merges provided data into the background state of the PermissionController.
   * @param {object} data - Data to merge into the PermissionController's state.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withPermissionController(data) {
    merge(this.fixture.state.engine.backgroundState.PermissionController, data);
    return this;
  }

  /**
   * Merges provided data into the background state of the NetworkController.
   * @param {object} data - Data to merge into the NetworkController's state.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withNetworkController(data) {
    merge(this.fixture.state.engine.backgroundState.NetworkController, data);

    if (data.providerConfig.ticker !== 'ETH')
      this.fixture.state.engine.backgroundState.CurrencyRateController.pendingNativeCurrency =
        data.providerConfig.ticker;
    return this;
  }

  withAddressBookController(data) {
    merge(
      this.fixture.state.engine.backgroundState.AddressBookController
        ? this.fixture.state.engine.backgroundState.AddressBookController
        : (this.fixture.state.engine.backgroundState.AddressBookController =
            {}),
      data,
    );
    return this;
  }

  /**
   * Connects the PermissionController to a test dapp with specific permissions and origins.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withPermissionControllerConnectedToTestDapp() {
    return this.withPermissionController({
      subjects: {
        [DAPP_URL]: {
          origin: DAPP_URL,
          permissions: {
            eth_accounts: {
              id: 'ZaqPEWxyhNCJYACFw93jE',
              parentCapability: 'eth_accounts',
              invoker: DAPP_URL,
              caveats: [
                {
                  type: 'restrictReturnedAccounts',
                  value: ['0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3'],
                },
              ],
              date: 1664388714636,
            },
          },
        },
      },
    });
  }

  /**
   * Set the fixture to an empty object for onboarding.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withOnboardingFixture() {
    this.fixture = {
      asyncState: {},
    };
    return this;
  }

  withGanacheNetwork() {
    const fixtures = this.fixture.state.engine.backgroundState;

    fixtures.NetworkController = {
      isCustomNetwork: true,
      providerConfig: {
        type: 'rpc',
        chainId: '0x53a',
        rpcUrl: `http://localhost:${getGanachePort()}`,
        nickname: 'Localhost',
        ticker: 'ETH',
      },
    };
    return this;
  }

  withSepoliaNetwork() {
    const fixtures = this.fixture.state.engine.backgroundState;

    fixtures.NetworkController = {
      isCustomNetwork: true,
      providerConfig: {
        type: 'rpc',
        chainId: CustomNetworks.Sepolia.providerConfig.chainId,
        rpcUrl: CustomNetworks.Sepolia.providerConfig.rpcTarget,
        nickname: CustomNetworks.Sepolia.providerConfig.nickname,
        ticker: CustomNetworks.Sepolia.providerConfig.ticker,
      },
    };
    return this;
  }

  withPopularNetworks() {
    const fixtures = this.fixture.state.engine.backgroundState;
    const networkIDs = {}; // Object to store network configurations

    // Loop through each network in PopularNetworkList
    for (const key in PopularNetworksList) {
      const network = PopularNetworksList[key];
      const { rpcUrl, chainId, ticker, nickname } = network.providerConfig;

      networkIDs[nickname] = { rpcUrl, chainId, ticker, nickname };
    }

    // Assign networkIDs object to NetworkController in fixtures
    fixtures.NetworkController = {
      isCustomNetwork: true,
      networkConfigurations: networkIDs,
    };

    return this;
  }

  withPreferencesController(data) {
    merge(
      this.fixture.state.engine.backgroundState.PreferencesController,
      data,
    );
    return this;
  }

  withKeyringController() {
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          type: 'HD Key Tree',
          accounts: ['0x37cc5ef6bfe753aeaf81f945efe88134b238face'],
        },
        { type: 'QR Hardware Wallet Device', accounts: [] },
      ],
      vault:
        '{"cipher":"T+MXWPPwXOh8RLxpryUuoFCObwXqNQdwak7FafAoVeXOehhpuuUDbjWiHkeVs9slsy/uzG8z+4Va+qyz4dlRnd/Gvc/2RbHTAb/LG1ECk1rvLZW23JPGkBBVAu36FNGCTtT+xrF4gRzXPfIBVAAgg40YuLJWkcfVty6vGcHr3R3/9gpsqs3etrF5tF4tHYWPEhzhhx6HN6Tr4ts3G9sqgyEhyxTLCboAYWp4lsq2iTEl1vQ6T/UyBRNhfDj8RyQMF6hwkJ0TIq2V+aAYkr5NJguBBSi0YKPFI/SGLrin9/+d66gcOSFhIH0GhUbez3Yf54852mMtvOH8Vj7JZc664ukOvEdJIpvCw1CbtA9TItyVApkjQypLtE+IdV3sT5sy+v0mK7Xc054p6+YGiV8kTiTG5CdlI4HkKvCOlP9axwXP0aRwc4ffsvp5fKbnAVMf9+otqmOmlA5nCKdx4FOefTkr/jjhMlTGV8qUAJ2c6Soi5X02fMcrhAfdUtFxtUqHovOh3KzOe25XhjxZ6KCuix8OZZiGtbNDu3xJezPc3vzkTFwF75ubYozLDvw8HzwI+D5Ifn0S3q4/hiequ6NGiR3Dd0BIhWODSvFzbaD7BKdbgXhbJ9+3FXFF9Xkp74msFp6o7nLsx02ywv/pmUNqQhwtVBfoYhcFwqZZQlOPKcH8otguhSvZ7dPgt7VtUuf8gR23eAV4ffVsYK0Hll+5n0nZztpLX4jyFZiV/kSaBp+D2NZM2dnQbsWULKOkjo/1EpNBIjlzjXRBg5Ui3GgT3JXUDx/2GmJXceacrbMcos3HC2yfxwUTXC+yda4IrBx/81eYb7sIjEVNxDuoBxNdRLKoxwmAJztxoQLF3gRexS45QKoFZZ0kuQ9MqLyY6HDK","iv":"3271713c2b35a7c246a2a9b263365c3d","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","salt":"l4e+sn/jdsaofDWIB/cuGQ=="}',
    });
    return this;
  }

  /**
   * Build and return the fixture object.
   * @returns {Object} - The built fixture object.
   */
  build() {
    return this.fixture;
  }
}

export default FixtureBuilder;
