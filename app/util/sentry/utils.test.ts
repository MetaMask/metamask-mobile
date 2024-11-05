/* eslint-disable dot-notation */
import { UserFeedback, captureUserFeedback } from '@sentry/react-native';
import {
  deriveSentryEnvironment,
  excludeEvents,
  captureSentryFeedback,
  maskObject,
  sentryStateMask,
  AllProperties,
} from './utils';
import { DeepPartial } from '../test/renderWithProvider';
import { RootState } from '../../reducers';
import { NetworkStatus } from '@metamask/network-controller';

jest.mock('@sentry/react-native', () => ({
  ...jest.requireActual('@sentry/react-native'),
  captureUserFeedback: jest.fn(),
}));
const mockedCaptureUserFeedback = jest.mocked(captureUserFeedback);

describe('deriveSentryEnvironment', () => {
  it('returns production-flask for non-dev production environment and flask build type', async () => {
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

  it('returns local-flask for non-dev undefined environment and flask build type', async () => {
    const METAMASK_BUILD_TYPE = 'flask';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, undefined, METAMASK_BUILD_TYPE);
    expect(env).toBe('local-flask');
  });

  it('returns debug-flask for non-dev flask environment debug build type', async () => {
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

  it('returns local for non-dev local environment and undefined build type', async () => {
    const isDev = false;
    const METAMASK_ENVIRONMENT = 'local';

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT);
    expect(env).toBe('local');
  });

  it('returns local for non-dev with both undefined environment and build type', async () => {
    const isDev = false;

    const env = deriveSentryEnvironment(isDev);
    expect(env).toBe('local');
  });

  it('returns production for non-dev production environment and undefined  build type', async () => {
    const METAMASK_ENVIRONMENT = 'production';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT, undefined);
    expect(env).toBe('production');
  });

  it('returns development for dev environment', async () => {
    const isDev = true;

    const env = deriveSentryEnvironment(isDev, '', '');
    expect(env).toBe('development');
  });

  it('returns development for dev environment regardless of environment and build type', async () => {
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

  it('returns performance event Route Change', async () => {
    const event = { transaction: 'Route Change' };
    const eventExcluded = excludeEvents(event);
    expect(eventExcluded).toBe(null);
  });

  it('returns performance event anything', async () => {
    const event = { transaction: 'Login' };
    const eventExcluded = excludeEvents(event);
    expect(eventExcluded).toBe(event);
  });

  it('returns performance event null if empty', async () => {
    const eventExcluded = excludeEvents(null);
    expect(eventExcluded).toBe(null);
  });
});

describe('captureSentryFeedback', () => {
  it('captures Sentry user feedback', async () => {
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
    const rootState: DeepPartial<RootState> = {
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
                conversionDate: 1720196397083,
                conversionRate: 298514,
                usdConversionRate: 298514,
              },
            },
            currentCurrency: 'usd',
          },
          GasFeeController: {
            estimatedGasFeeTimeBounds: {},
            gasEstimateType: 'none',
            gasFeeEstimates: {},
            gasFeeEstimatesByChainId: {},
            nonRPCGasFeeApisDisabled: false,
          },
          KeyringController: {
            isUnlocked: true,
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
            networkConfigurationsByChainId: {},
            networksMetadata: {
              mainnet: {
                EIPS: {
                  1559: true,
                },
                status: NetworkStatus.Available,
              },
            },
            selectedNetworkClientId: 'mainnet',
          },
          NftController: {
            allNftContracts: {},
            allNfts: {},
            ignoredNfts: [],
          },
          NftDetectionController: {},
          PermissionController: undefined,
          PreferencesController: {
            displayNftMedia: true,
            featureFlags: {},
            identities: {
              '0x6312c98831D74754F86dd4936668A13B7e9bA411': {
                address: '0x6312c98831D74754F86dd4936668A13B7e9bA411',
                importTime: 1720023898223,
                name: 'Account 1',
              },
            },
            ipfsGateway: 'https://dweb.link/ipfs/',
            isIpfsGatewayEnabled: true,
            isMultiAccountBalancesEnabled: true,
            lostIdentities: {},
            securityAlertsEnabled: true,
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
        searchEngine: 'Google',
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

    it('masks initial root state fixture', () => {
      const maskedState = maskObject(rootState, sentryStateMask);

      expect(maskedState).toMatchSnapshot();
    });
    it('handles undefined mask', () => {
      const maskedState = maskObject(rootState, undefined);
      expect(maskedState).toEqual({
        accounts: 'object',
        alert: 'object',
        bookmarks: 'object',
        browser: 'object',
        collectibles: 'object',
        engine: 'object',
        experimentalSettings: 'object',
        fiatOrders: 'object',
        infuraAvailability: 'object',
        inpageProvider: 'object',
        legalNotices: 'object',
        modals: 'object',
        navigation: 'object',
        networkOnboarded: 'object',
        notification: 'object',
        onboarding: 'object',
        privacy: 'object',
        rpcEvents: 'object',
        sdk: 'object',
        security: 'object',
        settings: 'object',
        signatureRequest: 'object',
        smartTransactions: 'object',
        swaps: 'object',
        transaction: 'object',
        transactionMetrics: 'object',
        user: 'object',
        wizard: 'object',
      });
    });
    it('handles empty rootState', () => {
      const maskedState = maskObject({}, sentryStateMask);
      expect(maskedState).toEqual({});
    });
    it('handles rootState with more keys than what is defined in the mask', () => {
      const maskedState = maskObject(rootState, { legalNotices: true });
      expect(maskedState).toEqual({
        legalNotices: {
          newPrivacyPolicyToastClickedOrClosed: true,
          newPrivacyPolicyToastShownDate: null,
        },
        accounts: 'object',
        alert: 'object',
        bookmarks: 'object',
        browser: 'object',
        collectibles: 'object',
        engine: 'object',
        experimentalSettings: 'object',
        fiatOrders: 'object',
        infuraAvailability: 'object',
        inpageProvider: 'object',
        modals: 'object',
        navigation: 'object',
        networkOnboarded: 'object',
        notification: 'object',
        onboarding: 'object',
        privacy: 'object',
        rpcEvents: 'object',
        sdk: 'object',
        security: 'object',
        settings: 'object',
        signatureRequest: 'object',
        smartTransactions: 'object',
        swaps: 'object',
        transaction: 'object',
        transactionMetrics: 'object',
        user: 'object',
        wizard: 'object',
      });
    });
    it('handles submask with { [AllProperties]: false, enabled: true }', () => {
      const submask = {
        [AllProperties]: false,
        enabled: true,
      };
      const maskedState = maskObject(rootState, submask);
      expect(maskedState).toEqual({
        accounts: 'object',
        alert: 'object',
        bookmarks: 'object',
        browser: 'object',
        collectibles: 'object',
        engine: 'object',
        experimentalSettings: 'object',
        fiatOrders: 'object',
        infuraAvailability: 'object',
        inpageProvider: 'object',
        legalNotices: 'object',
        modals: 'object',
        navigation: 'object',
        networkOnboarded: 'object',
        notification: 'object',
        onboarding: 'object',
        privacy: 'object',
        rpcEvents: 'object',
        sdk: 'object',
        security: 'object',
        settings: 'object',
        signatureRequest: 'object',
        smartTransactions: 'object',
        swaps: 'object',
        transaction: 'object',
        transactionMetrics: 'object',
        user: 'object',
        wizard: 'object',
      });
    });
  });

  it('handle root state with value null and mask false', () => {
    const submask = {
      SnapsController: {
        [AllProperties]: false,
      },
    };
    const maskedState = maskObject(
      {
        SnapsController: {
          enabled: undefined,
          data: null,
          exampleObj: {},
        },
      },
      submask,
    );
    expect(maskedState).toEqual({
      SnapsController: {
        enabled: 'undefined',
        data: 'null',
        exampleObj: 'object',
      },
    });
  });
});
