/* eslint-disable dot-notation */
import { UserFeedback, captureUserFeedback } from '@sentry/react-native';
import {
  deriveSentryEnvironment,
  excludeEvents,
  captureSentryFeedback,
  maskObject,
  SENTRY_STATE,
} from './utils';

const rootState = {
  legalNotices: {
    newPrivacyPolicyToastClickedOrClosed: true,
    newPrivacyPolicyToastShownDate: null,
  },
  collectibles: { favorites: {}, isNftFetchingProgress: false },
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0x6312c98831D74754F86dd4936668A13B7e9bA411': {
            balance: '0x0',
          },
        },
        accountsByChainId: {
          '0x1': {
            '0x6312c98831D74754F86dd4936668A13B7e9bA411': {
              balance: '0x0',
            },
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            '1be55f5b-eba9-41a7-a9ed-a6a8274aca27': {
              address: '0x6312c98831d74754f86dd4936668a13b7e9ba411',
              id: '1be55f5b-eba9-41a7-a9ed-a6a8274aca27',
              metadata: {
                importTime: 1720023898234,
                keyring: {
                  type: 'HD Key Tree',
                },
                lastSelected: 1720023898236,
                name: 'Account 1',
              },
              methods: [
                'personal_sign',
                'eth_sign',
                'eth_signTransaction',
                'eth_signTypedData_v1',
                'eth_signTypedData_v3',
                'eth_signTypedData_v4',
              ],
              options: {},
              type: 'eip155:eoa',
            },
          },
          selectedAccount: '1be55f5b-eba9-41a7-a9ed-a6a8274aca27',
        },
      },
      AddressBookController: {
        addressBook: {},
      },
      ApprovalController: {
        approvalFlows: [],
        pendingApprovalCount: 0,
        pendingApprovals: {},
      },
      AssetsContractController: {},
      CurrencyRateController: {
        currencyRates: {
          ETH: {
            conversionDate: '1720196397.083',
            conversionRate: '2985.14',
            usdConversionRate: '2985.14',
          },
        },
        currentCurrency: 'usd',
      },
      GasFeeController: {
        estimatedGasFeeTimeBounds: {},
        gasEstimateType: 'none',
        gasFeeEstimates: {},
        gasFeeEstimatesByChainId: {},
        nonRPCGasFeeApisDisabled: 0,
      },
      KeyringController: {
        isUnlocked: 1,
        keyrings: [
          {
            accounts: ['0x6312c98831d74754f86dd4936668a13b7e9ba411'],
            type: 'HD Key Tree',
          },
        ],
        vault: '{"cipher":""}',
      },
      LoggingController: {
        logs: {},
      },
      NetworkController: {
        networkConfigurations: {},
        networksMetadata: {
          mainnet: {
            EIPS: {
              1559: 1,
            },
            status: 'available',
          },
        },
        providerConfig: {
          chainId: '0x1',
          ticker: 'ETH',
          type: 'mainnet',
        },
        selectedNetworkClientId: 'mainnet',
      },
      NftController: {
        allNftContracts: {},
        allNfts: {},
        ignoredNfts: [],
      },
      NftDetectionController: {},
      PermissionController: {
        subjects: {},
      },
      PreferencesController: {
        disabledRpcMethodPreferences: {
          eth_sign: 0,
        },
        displayNftMedia: 1,
        featureFlags: {},
        identities: {
          '0x6312c98831D74754F86dd4936668A13B7e9bA411': {
            address: '0x6312c98831D74754F86dd4936668A13B7e9bA411',
            importTime: 1720023898223,
            name: 'Account 1',
          },
        },
        ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
        isIpfsGatewayEnabled: 1,
        isMultiAccountBalancesEnabled: 1,
        lostIdentities: {},
        securityAlertsEnabled: 1,
        selectedAddress: '0x6312c98831D74754F86dd4936668A13B7e9bA411',
        showIncomingTransactions: {
          '0x1': true,
          '0x13881': true,
          '0x38': true,
          '0x5': true,
          '0x504': true,
          '0x505': true,
          '0x507': true,
          '0x61': true,
          '0x64': true,
          '0x89': true,
          '0xa': true,
          '0xa869': true,
          '0xa86a': true,
          '0xaa36a7': true,
          '0xaa37dc': true,
          '0xe704': true,
          '0xe705': true,
          '0xe708': true,
          '0xfa': true,
          '0xfa2': true,
        },
        showTestNetworks: false,
        smartTransactionsOptInStatus: false,
        useNftDetection: true,
        useSafeChainsListValidation: true,
        useTokenDetection: true,
        useTransactionSimulations: true,
      },
      SmartTransactionsController: {
        smartTransactionsState: {
          fees: {},
          feesByChainId: {
            '0x1': {},
            '0xaa36a7': {},
          },
          liveness: true,
          livenessByChainId: {
            '0x1': true,
            '0xaa36a7': true,
          },
          smartTransactions: {
            '0x1': [],
          },
        },
      },
    },
  },
  privacy: {},
  bookmarks: {},
  browser: {
    activeTab: null,
    favicons: [],
    history: [],
    tabs: [],
    visitedDappsByHostname: {},
    whitelist: [],
  },
  modals: {
    collectibleContractModalVisible: false,
    dappTransactionModalVisible: false,
    networkModalVisible: false,
    receiveAsset: undefined,
    receiveModalVisible: false,
    shouldNetworkSwitchPopToWallet: true,
    signMessageModalVisible: true,
  },
  settings: {
    basicFunctionalityEnabled: true,
    hideZeroBalanceTokens: false,
    lockTime: 30000,
    primaryCurrency: 'ETH',
    searchEngine: 'DuckDuckGo',
    useBlockieIcon: true,
  },
  alert: {
    autodismiss: null,
    content: null,
    data: null,
    isVisible: false,
  },
  transaction: {
    assetType: undefined,
    ensRecipient: undefined,
    id: undefined,
    nonce: undefined,
    paymentRequest: undefined,
    proposedNonce: undefined,
    readableValue: undefined,
    selectedAsset: {},
    symbol: undefined,
    transaction: {
      data: undefined,
      from: undefined,
      gas: undefined,
      gasPrice: undefined,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
      to: undefined,
      value: undefined,
    },
    transactionFromName: undefined,
    transactionTo: undefined,
    transactionToName: undefined,
    transactionValue: undefined,
    type: undefined,
    warningGasPriceHigh: undefined,
  },
  smartTransactions: {
    optInModalAppVersionSeen: null,
  },
  user: {
    ambiguousAddressEntries: {},
    appTheme: 'os',
    backUpSeedphraseVisible: false,
    gasEducationCarouselSeen: false,
    initialScreen: '',
    isAuthChecked: false,
    loadingMsg: '',
    loadingSet: false,
    passwordSet: true,
    protectWalletModalVisible: false,
    seedphraseBackedUp: true,
    userLoggedIn: true,
  },
  wizard: {
    step: 1,
  },
  onboarding: {
    events: [],
  },
  notification: {
    notification: {
      notificationsSettings: {},
    },
    notifications: [],
  },
  swaps: {
    '0x1': {
      isLive: true,
    },
    featureFlags: undefined,
    hasOnboarded: true,
    isLive: true,
  },
  fiatOrders: {
    activationKeys: [],
    authenticationUrls: [],
    customOrderIds: [],
    getStartedAgg: false,
    getStartedSell: false,
    networks: [],
    orders: [],
    selectedPaymentMethodAgg: null,
    selectedRegionAgg: null,
  },
  infuraAvailability: {
    isBlocked: false,
  },
  navigation: {
    currentBottomNavRoute: 'Wallet',
    currentRoute: 'Login',
  },
  networkOnboarded: {
    networkOnboardedState: {},
    networkState: {
      nativeToken: '',
      networkType: '',
      networkUrl: '',
      showNetworkOnboarding: false,
    },
    switchedNetwork: {
      networkStatus: false,
      networkUrl: '',
    },
  },
  security: {
    allowLoginWithRememberMe: false,
    automaticSecurityChecksEnabled: false,
    dataCollectionForMarketing: null,
    hasUserSelectedAutomaticSecurityCheckOption: false,
    isAutomaticSecurityChecksModalOpen: false,
    isNFTAutoDetectionModalViewed: false,
  },
  signatureRequest: {
    securityAlertResponse: undefined,
  },
  sdk: {
    connections: {},
    approvedHosts: {},
    dappConnections: {},
    wc2Metadata: undefined,
  },
  experimentalSettings: {
    securityAlertsEnabled: true,
  },
  rpcEvents: {
    signingEvent: {
      eventStage: 'idle',
      rpcName: '',
    },
  },
  accounts: {
    reloadAccounts: false,
  },
  inpageProvider: {
    networkId: '1',
  },
  transactionMetrics: {
    metricsByTransactionId: {},
  },
};

jest.mock('@sentry/react-native', () => ({
  ...jest.requireActual('@sentry/react-native'),
  captureUserFeedback: jest.fn(),
}));
const mockedCaptureUserFeedback = jest.mocked(captureUserFeedback);

describe('deriveSentryEnvironment', () => {
  test('returns production-flask for non-dev production environment and flask build type', async () => {
    const METAMASK_ENVIRONMENT = 'production';
    const METAMASK_BUILD_TYPE = 'flask';
    const isDev = false;

    const env = deriveSentryEnvironment(
      isDev,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );
    expect(env).toBe('production-flask');
  });

  test('returns local-flask for non-dev undefined environment and flask build type', async () => {
    const METAMASK_BUILD_TYPE = 'flask';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, undefined, METAMASK_BUILD_TYPE);
    expect(env).toBe('local-flask');
  });

  test('returns debug-flask for non-dev flask environment debug build type', async () => {
    const METAMASK_BUILD_TYPE = 'flask';
    const METAMASK_ENVIRONMENT = 'debug';
    const isDev = false;

    const env = deriveSentryEnvironment(
      isDev,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );
    expect(env).toBe('debug-flask');
  });

  test('returns local for non-dev local environment and undefined build type', async () => {
    const isDev = false;
    const METAMASK_ENVIRONMENT = 'local';

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT);
    expect(env).toBe('local');
  });

  test('returns local for non-dev with both undefined environment and build type', async () => {
    const isDev = false;

    const env = deriveSentryEnvironment(isDev);
    expect(env).toBe('local');
  });

  test('returns production for non-dev production environment and undefined  build type', async () => {
    const METAMASK_ENVIRONMENT = 'production';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT, undefined);
    expect(env).toBe('production');
  });

  test('returns development for dev environment', async () => {
    const isDev = true;

    const env = deriveSentryEnvironment(isDev, '', '');
    expect(env).toBe('development');
  });

  test('returns development for dev environment regardless of environment and build type', async () => {
    const isDev = true;
    const METAMASK_ENVIRONMENT = 'production';
    const METAMASK_BUILD_TYPE = 'flask';

    const env = deriveSentryEnvironment(
      isDev,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );
    expect(env).toBe('development');
  });

  test('return performance event Route Change', async () => {
    const event = { transaction: 'Route Change' };
    const eventExcluded = excludeEvents(event);
    expect(eventExcluded).toBe(null);
  });

  test('return performance event anything', async () => {
    const event = { transaction: 'Login' };
    const eventExcluded = excludeEvents(event);
    expect(eventExcluded).toBe(event);
  });

  test('return performance event null if empty', async () => {
    const eventExcluded = excludeEvents(null);
    expect(eventExcluded).toBe(null);
  });
});

describe('captureSentryFeedback', () => {
  it('should capture Sentry user feedback', async () => {
    const mockSentryId = '123';
    const mockComments = 'Comment';
    const expectedUserFeedback: UserFeedback = {
      event_id: mockSentryId,
      name: '',
      email: '',
      comments: mockComments,
    };
    captureSentryFeedback({
      sentryId: expectedUserFeedback.event_id,
      comments: expectedUserFeedback.comments,
    });
    expect(mockedCaptureUserFeedback).toHaveBeenCalledWith(
      expectedUserFeedback,
    );
  });
  describe('maskObject', () => {
    it('masks initial root state fixture', () => {
      const maskedState = maskObject(rootState, SENTRY_STATE);

      expect(maskedState).toMatchSnapshot();
    });
  });
});
