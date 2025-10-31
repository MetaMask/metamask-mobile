/* eslint-disable dot-notation */
import { UserFeedback, captureUserFeedback } from '@sentry/react-native';
import {
  deriveSentryEnvironment,
  excludeEvents,
  captureSentryFeedback,
  maskObject,
  sentryStateMask,
  AllProperties,
  rewriteReport,
  rewriteBreadcrumb,
} from './utils';
import { DeepPartial } from '../test/renderWithProvider';
import { RootState } from '../../reducers';
import { NetworkStatus } from '@metamask/network-controller';
import { EthScope } from '@metamask/keyring-api';
import { TraceName } from '../trace';
import { store } from '../../store';
import extractEthJsErrorMessage from '../extractEthJsErrorMessage';
import { Performance } from '../../core/Performance';
import Device from '../device';
import { getTraceTags } from './tags';
import { AvatarAccountType } from '../../component-library/components/Avatars/Avatar';
import assert from 'assert';
import { Json } from '@metamask/utils';
import { MaskedStrictPlainObject } from './mask-object';

jest.mock('@sentry/react-native', () => ({
  ...jest.requireActual('@sentry/react-native'),
  captureUserFeedback: jest.fn(),
}));
const mockedCaptureUserFeedback = jest.mocked(captureUserFeedback);

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../extractEthJsErrorMessage', () => ({
  __esModule: true,
  default: jest.fn((message) => message),
}));

jest.mock('../../core/Performance', () => ({
  Performance: {
    appLaunchTime: 1640995200000,
  },
}));

jest.mock('../device', () => ({
  __esModule: true,
  default: {
    isAndroid: jest.fn(() => true),
  },
}));

jest.mock('./tags', () => ({
  getTraceTags: jest.fn(() => ({ mockTag: 'mockValue' })),
}));

describe('deriveSentryEnvironment', () => {
  it('returns flask-production for non-dev production environment and flask build type', async () => {
    const METAMASK_ENVIRONMENT = 'production';
    const METAMASK_BUILD_TYPE = 'flask';
    const isDev = false;

    const env = deriveSentryEnvironment(
      isDev,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );
    expect(env).toBe('flask-production');
  });

  it('returns flask-dev for non-dev undefined environment and flask build type', async () => {
    const METAMASK_BUILD_TYPE = 'flask';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, undefined, METAMASK_BUILD_TYPE);
    expect(env).toBe(`flask-dev`);
  });

  it('returns flask-main for non-dev flask environment main build type', async () => {
    const METAMASK_BUILD_TYPE = 'flask';
    const METAMASK_ENVIRONMENT = 'main';
    const isDev = false;

    const env = deriveSentryEnvironment(
      isDev,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );
    expect(env).toBe(`flask-main`);
  });

  it('returns dev for non-dev dev environment and undefined build type', async () => {
    const isDev = false;
    const METAMASK_ENVIRONMENT = 'dev';

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT);
    expect(env).toBe('development');
  });

  it('returns development for non-dev with both undefined environment and build type', async () => {
    const isDev = false;

    const env = deriveSentryEnvironment(isDev);
    expect(env).toBe('development');
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

  it('returns main-rc for rc environment and main build type', async () => {
    const METAMASK_ENVIRONMENT = 'rc';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT, 'main');
    expect(env).toBe('main-rc');
  });

  it('returns main-beta for beta environment and main build type', async () => {
    const METAMASK_ENVIRONMENT = 'beta';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT, 'main');
    expect(env).toBe('main-beta');
  });
});

describe('excludeEvents', () => {
  const mockStore = jest.mocked(store);
  const mockDevice = jest.mocked(Device);
  const mockPerformance = jest.mocked(Performance);
  const mockGetTraceTags = jest.mocked(getTraceTags);

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should handle UIStartup events on Android and set trace tags and format app launch time', () => {
    const mockState = { test: 'state' } as unknown as RootState;
    mockStore.getState.mockReturnValue(mockState);
    mockGetTraceTags.mockReturnValue({ tag1: 'value1' });
    mockDevice.isAndroid.mockReturnValue(true);
    mockPerformance.appLaunchTime = 1640995200123;

    const event = {
      transaction: TraceName.UIStartup,
      start_timestamp: 1,
    };

    const result = excludeEvents(event) as unknown as Record<string, unknown>;

    expect(result).toBeTruthy();
    expect(result.tags).toEqual({ tag1: 'value1' });
    expect(mockGetTraceTags).toHaveBeenCalledWith(mockState);
    expect(result.start_timestamp).toBe(1640995200.123);
  });

  it('should handle UIStartup events on non-Android platforms', () => {
    mockDevice.isAndroid.mockReturnValue(false);

    const event = {
      transaction: TraceName.UIStartup,
      start_timestamp: 1234567890,
    };

    const result = excludeEvents(event) as unknown as Record<string, unknown>;

    expect(result).toBeTruthy();
    expect(result.start_timestamp).toBe(1234567890);
  });

  it('returns main-exp for experimental environment and main build type', async () => {
    const METAMASK_ENVIRONMENT = 'exp';
    const isDev = false;

    const env = deriveSentryEnvironment(isDev, METAMASK_ENVIRONMENT, 'main');
    expect(env).toBe('main-exp');
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
});

describe('rewriteBreadcrumb', () => {
  it('should rewrite breadcrumb URL to protocol only', () => {
    const breadcrumb = {
      data: {
        url: 'https://example.com/path?query=value',
        otherData: 'should remain',
      },
    };

    const result = rewriteBreadcrumb(breadcrumb);

    expect(result.data?.url).toBe('https:');
    expect(result.data?.otherData).toBe('should remain');
  });

  it('should rewrite breadcrumb to field to protocol only', () => {
    const breadcrumb = {
      data: {
        to: 'http://example.com/path',
        otherData: 'should remain',
      },
    };

    const result = rewriteBreadcrumb(breadcrumb);

    expect(result.data?.to).toBe('http:');
    expect(result.data?.otherData).toBe('should remain');
  });

  it('should rewrite breadcrumb from field to protocol only', () => {
    const breadcrumb = {
      data: {
        from: 'https://example.com/path',
        otherData: 'should remain',
      },
    };

    const result = rewriteBreadcrumb(breadcrumb);

    expect(result.data?.from).toBe('https:');
    expect(result.data?.otherData).toBe('should remain');
  });

  it('should handle breadcrumb with multiple URL fields', () => {
    const breadcrumb = {
      data: {
        url: 'https://example.com/path',
        to: 'http://another.com/path',
        from: 'ftp://third.com/path',
      },
    };

    const result = rewriteBreadcrumb(breadcrumb);

    expect(result.data?.url).toBe('https:');
    expect(result.data?.to).toBe('http:');
    expect(result.data?.from).toBe('ftp:');
  });

  it('should handle breadcrumb without data', () => {
    const breadcrumb = { message: 'test' };

    const result = rewriteBreadcrumb(breadcrumb);

    expect(result).toEqual({ message: 'test' });
  });

  it('should handle invalid URLs gracefully', () => {
    const breadcrumb = {
      data: {
        url: 'invalid-url',
      },
    };

    expect(() => rewriteBreadcrumb(breadcrumb)).toThrow();
  });
});

describe.only('rewriteReport', () => {
  const mockStore = jest.mocked(store);
  const mockExtractEthJsErrorMessage = jest.mocked(extractEthJsErrorMessage);

  const rootState = {
    legalNotices: {
      newPrivacyPolicyToastClickedOrClosed: true,
      newPrivacyPolicyToastShownDate: null,
    },
    collectibles: { favorites: {}, isNftFetchingProgress: false },
    engine: {
      backgroundState: {
        AccountTrackerController: {
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
                scopes: [EthScope.Eoa],
                options: {},
                type: 'eip155:eoa',
              },
              '2be55f5b-eba9-41a7-a9ed-a6a8274aca28': {
                address: '0x1234567890abcdef1234567890abcdef12345678',
                id: '2be55f5b-eba9-41a7-a9ed-a6a8274aca28',
                metadata: {
                  importTime: 1720023898235,
                  keyring: {
                    type: 'HD Key Tree',
                  },
                  lastSelected: 1720023898237,
                  name: 'Account 2',
                },
                scopes: [EthScope.Eoa],
                methods: ['personal_sign', 'eth_signTransaction'],
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
              accounts: [
                '0x6312c98831d74754f86dd4936668a13b7e9ba411',
                '0xf2ecb579d1225711c2c117f3ab22554357372c822',
              ],
              type: 'HD Key Tree',
            },
            {
              type: 'QR Hardware Wallet Device',
              accounts: [],
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
        NotificationServicesController: {
          isUpdatingMetamaskNotificationsAccount: [
            '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
            '0x0B3EAEd916519668491dB56c612Ff9B919288b65',
          ],
          metamaskNotificationsList: [
            {
              type: 'snap',
              message: 'some message',
              origin: 'some-origin',
              readDate: null,
            },
          ],
          metamaskNotificationsReadList: ['notification-1', 'notification-2'],
          subscriptionAccountsSeen: [
            '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
          ],
        },
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
      avatarAccountType: AvatarAccountType.Maskicon,
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
      getStartedDeposit: false,
      networks: [],
      orders: [],
      selectedPaymentMethodAgg: null,
      selectedRegionAgg: null,
      selectedRegionDeposit: null,
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
      dataCollectionForMarketing: null,
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
    confirmationMetrics: {
      metricsById: {},
    },
  } as const satisfies RootState;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.getState.mockReturnValue({} as unknown as RootState);
  });

  it('should remove SES from stack trace', () => {
    const report = {
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                { filename: 'app:///ses.cjs' },
                { filename: 'app:///main.js' },
              ],
            },
          },
        ],
      },
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.exception?.values?.[0]?.stacktrace?.frames).toHaveLength(1);
    expect(
      result.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename,
    ).toBe('app:///main.js');
  });

  it('should simplify complex error messages', () => {
    mockExtractEthJsErrorMessage.mockReturnValue('Simplified error');

    const report = {
      message: 'Complex error message',
      exception: {
        values: [
          {
            value: 'Another complex error',
          },
        ],
      },
      contexts: {},
    };

    rewriteReport(report);

    expect(mockExtractEthJsErrorMessage).toHaveBeenCalledWith(
      'Complex error message',
    );
    expect(mockExtractEthJsErrorMessage).toHaveBeenCalledWith(
      'Another complex error',
    );
  });

  it('should simplify "Transaction Failed: known transaction" errors', () => {
    mockExtractEthJsErrorMessage.mockReturnValue(
      'Transaction Failed: known transaction: 0x1234567890abcdef',
    );

    const report = {
      message: 'Transaction Failed: known transaction: 0x1234567890abcdef',
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.message).toBe('Transaction Failed: known transaction');
  });

  it('should sanitize URLs not in allowlist from error messages', () => {
    const message = 'Error fetching from https://bad-site.com/api';
    mockExtractEthJsErrorMessage.mockReturnValue(message);
    const report = {
      message,
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.message).toBe('Error fetching from **');
  });

  it('should preserve allowlisted URLs in error messages', () => {
    const message = 'Error fetching from https://etherscan.io/api';
    mockExtractEthJsErrorMessage.mockReturnValue(message);
    const report = {
      message,
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.message).toBe(message);
  });

  it('should process URLs in exception values', () => {
    const message = 'Exception with URL https://bad-site.com/api';
    mockExtractEthJsErrorMessage.mockReturnValue(message);
    const report = {
      message: 'Top level error',
      exception: {
        values: [
          {
            value: message,
          },
        ],
      },
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.exception?.values?.[0]?.value).toBe('Exception with URL **');
  });

  it('should sanitize Ethereum addresses from error messages', () => {
    const message =
      'Error with address 0x1234567890abcdef1234567890abcdef12345678';
    mockExtractEthJsErrorMessage.mockReturnValue(message);
    const report = {
      message,
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.message).toBe('Error with address **');
  });

  it('should sanitize addresses from exception values', () => {
    const message =
      'Transaction failed for 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    mockExtractEthJsErrorMessage.mockReturnValue(message);
    const report = {
      message: 'Top level error',
      exception: {
        values: [
          {
            value: message,
          },
        ],
      },
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.exception?.values?.[0]?.value).toBe(
      'Transaction failed for **',
    );
  });

  it('should sanitize multiple addresses from error messages', () => {
    const message =
      'Transfer from 0x1234567890abcdef1234567890abcdef12345678 to 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd failed';
    mockExtractEthJsErrorMessage.mockReturnValue(message);
    const report = {
      message,
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.message).toContain('**');
  });

  it('should not sanitize short hex strings that are not addresses', () => {
    const message = 'Transaction ID 0x123abc should not be sanitized';
    mockExtractEthJsErrorMessage.mockReturnValue(message);
    const report = {
      message,
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.message).toBe(message);
  });

  it('should remove device timezone and name', () => {
    const report = {
      contexts: {
        device: {
          name: 'Test Device',
          timezone: 'America/New_York',
          other: 'should remain',
        },
      },
    };

    const result = rewriteReport(report);

    expect(result.contexts?.device?.timezone).toBe(null);
    expect(result.contexts?.device?.name).toBe(null);
    expect(result.contexts?.device?.other).toBe('should remain');
  });

  it('should handle report without device context', () => {
    const report = {
      contexts: {},
    };

    const result = rewriteReport(report);

    expect(result.contexts).toBeDefined();
  });

  it('should handle errors during report processing', () => {
    mockStore.getState.mockImplementation(() => {
      throw new Error('Store error');
    });

    const report = {
      contexts: {},
    };

    expect(() => rewriteReport(report)).toThrow('Store error');
  });

  it('masks initial root state fixture', () => {
    const report = {
      contexts: {},
    };
    mockStore.getState.mockReturnValue(rootState);

    const result = rewriteReport(report);

    expect(result.contexts?.appState).toMatchSnapshot();
  });

  it('masks sensitive data in AccountsController while preserving other fields', () => {
    const report = { contexts: {} };
    mockStore.getState.mockReturnValue(rootState);

    const result = rewriteReport(report);

    expect(result.contexts?.appState).toMatchObject({
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                '1be55f5b-eba9-41a7-a9ed-a6a8274aca27': {
                  address: 'string',
                  id: '1be55f5b-eba9-41a7-a9ed-a6a8274aca27',
                  type: 'eip155:eoa',
                  options: {},
                  methods: [
                    'personal_sign',
                    'eth_signTransaction',
                    'eth_signTypedData_v1',
                    'eth_signTypedData_v3',
                    'eth_signTypedData_v4',
                  ],
                  scopes: [EthScope.Eoa],
                  metadata: {
                    importTime: 1720023898234,
                    keyring: {
                      type: 'HD Key Tree',
                    },
                    lastSelected: 1720023898236,
                    name: 'Account 1',
                  },
                },
                '2be55f5b-eba9-41a7-a9ed-a6a8274aca28': {
                  address: 'string',
                  id: '2be55f5b-eba9-41a7-a9ed-a6a8274aca28',
                  type: 'eip155:eoa',
                  options: {},
                  methods: ['personal_sign', 'eth_signTransaction'],
                  scopes: [EthScope.Eoa],
                  metadata: {
                    importTime: 1720023898235,
                    keyring: {
                      type: 'HD Key Tree',
                    },
                    lastSelected: 1720023898237,
                    name: 'Account 2',
                  },
                },
              },
              selectedAccount: '1be55f5b-eba9-41a7-a9ed-a6a8274aca27',
            },
          },
        },
      },
    });
  });

  it('masks sensitive data in KeyringController while preserving type', () => {
    const report = { contexts: {} };
    mockStore.getState.mockReturnValue(rootState);

    const result = rewriteReport(report);

    expect(result.contexts?.appState).toMatchObject({
      engine: {
        backgroundState: {
          KeyringController: {
            keyrings: {
              '0': {
                accounts: {
                  '0': 'string',
                  '1': 'string',
                },
                type: 'HD Key Tree',
              },
              '1': {
                accounts: {},
                type: 'QR Hardware Wallet Device',
              },
            },
            vault: 'string',
          },
        },
      },
    });
  });
});
