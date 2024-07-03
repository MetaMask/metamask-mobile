/* eslint-disable dot-notation */
import { UserFeedback, captureUserFeedback } from '@sentry/react-native';
import {
  deriveSentryEnvironment,
  excludeEvents,
  captureSentryFeedback,
  maskObject,
  SENTRY_STATE,
} from './utils';
import initialRootState from '../test/initial-root-state';

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
    it('mask our fixture of intial root state', () => {
      const maskedState = maskObject(initialRootState, SENTRY_STATE);

      expect(maskedState).toStrictEqual({
        accounts: undefined,
        alert: undefined,
        bookmarks: undefined,
        browser: undefined,
        collectibles: undefined,
        engine: {
          backgroundState: {
            AccountTrackerController: {
              accounts: 'object',
              accountsByChainId: 'object',
            },
            AccountsController: {
              internalAccounts: {
                accounts: 'object',
                selectedAccount: 'string',
              },
            },
            AddressBookController: {
              addressBook: 'object',
            },
            ApprovalController: {
              approvalFlows: 'object',
              pendingApprovalCount: 'number',
              pendingApprovals: 'object',
            },
            AssetsContractController: {},
            CurrencyRateController: {
              currencyRates: {
                ETH: {
                  conversionDate: 0,
                  conversionRate: 0,
                  usdConversionRate: null,
                },
              },
              currentCurrency: 'usd',
            },
            GasFeeController: {
              estimatedGasFeeTimeBounds: {},
              gasEstimateType: 'none',
              gasFeeEstimates: {},
              gasFeeEstimatesByChainId: {},
              nonRPCGasFeeApisDisabled: 'boolean',
            },
            KeyringController: {
              isUnlocked: false,
              keyrings: 'object',
              vault: 'object',
            },
            LoggingController: {
              logs: 'object',
            },
            NetworkController: {
              networkConfigurations: 'object',
              networksMetadata: {
                mainnet: {
                  EIPS: {},
                  status: 'unknown',
                },
              },
              providerConfig: {
                chainId: '0x1',
                ticker: 'ETH',
                type: 'mainnet',
              },
              selectedNetworkClientId: 'string',
            },
            NftController: {
              allNftContracts: 'object',
              allNfts: 'object',
              ignoredNfts: 'object',
            },
            NftDetectionController: 'object',
            PPOMController: {
              storageMetadata: {},
              versionInfo: {},
            },
            PermissionController: {
              subjects: 'object',
            },
            PhishingController: {
              hotlistLastFetched: 'number',
              phishingLists: 'object',
              stalelistLastFetched: 'number',
              whitelist: 'object',
            },
            PreferencesController: {
              disabledRpcMethodPreferences: {
                eth_sign: false,
              },
              displayNftMedia: true,
              featureFlags: {},
              identities: 'object',
              ipfsGateway: 'string',
              isIpfsGatewayEnabled: true,
              isMultiAccountBalancesEnabled: 'boolean',
              lostIdentities: 'object',
              securityAlertsEnabled: 'boolean',
              selectedAddress: 'string',
              showIncomingTransactions: 'object',
              showTestNetworks: 'boolean',
              smartTransactionsOptInStatus: 'boolean',
              useNftDetection: true,
              useSafeChainsListValidation: 'boolean',
              useTokenDetection: true,
              useTransactionSimulations: true,
            },
            SignatureController: {
              unapprovedMsgCount: 0,
              unapprovedMsgs: 'object',
              unapprovedPersonalMsgCount: 0,
              unapprovedPersonalMsgs: 'object',
              unapprovedTypedMessages: 'object',
              unapprovedTypedMessagesCount: 0,
            },
            SmartTransactionsController: {
              smartTransactionsState: {
                liveness: true,
              },
            },
            SnapController: {
              snapStates: 'object',
              snaps: 'object',
              unencryptedSnapStates: 'object',
            },
            SubjectMetadataController: {
              subjectMetadata: 'object',
            },
            SwapsController: {
              aggregatorMetadata: 'object',
              aggregatorMetadataLastFetched: 'number',
              approvalTransaction: 'object',
              chainCache: 'object',
              error: 'object',
              fetchParams: 'object',
              fetchParamsMetaData: 'object',
              isInPolling: 'boolean',
              pollingCyclesLeft: 'number',
              quoteRefreshSeconds: 'object',
              quoteValues: 'object',
              quotes: 'object',
              quotesLastFetched: 'number',
              tokens: 'object',
              tokensLastFetched: 'number',
              topAggId: 'object',
              topAggSavings: 'object',
              topAssets: 'object',
              topAssetsLastFetched: 'number',
              usedCustomGas: 'object',
              usedGasEstimate: 'object',
            },
            TokenBalancesController: 'object',
            TokenDetectionController: {},
            TokenListController: {
              preventPollingOnNetworkRestart: false,
              tokenList: 'object',
              tokensChainsCache: {},
            },
            TokenRatesController: {
              marketData: 'object',
            },
            TokensController: {
              allDetectedTokens: {},
              allIgnoredTokens: {},
              allTokens: {},
              detectedTokens: 'object',
              ignoredTokens: 'object',
              tokens: 'object',
            },
            TransactionController: {
              lastFetchedBlockNumbers: 'object',
              methodData: 'object',
              submitHistory: 'object',
              transactions: 'object',
            },
          },
        },
        experimentalSettings: undefined,
        fiatOrders: 'object',
        infuraAvailability: undefined,
        inpageProvider: {
          networkId: 'loading',
        },
        legalNotices: undefined,
        modals: undefined,
        navigation: undefined,
        networkOnboarded: undefined,
        notification: undefined,
        onboarding: undefined,
        privacy: undefined,
        rpcEvents: undefined,
        sdk: {
          approvedHosts: {},
          connections: {},
          dappConnections: {},
        },
        security: {
          allowLoginWithRememberMe: false,
          automaticSecurityChecksEnabled: false,
          dataCollectionForMarketing: null,
          hasUserSelectedAutomaticSecurityCheckOption: false,
          isAutomaticSecurityChecksModalOpen: false,
          isNFTAutoDetectionModalViewed: false,
        },
        settings: undefined,
        signatureRequest: 'undefined',
        smartTransactions: {
          optInModalAppVersionSeen: null,
        },
        swaps: 'undefined',
        transaction: 'undefined',
        transactionMetrics: 'object',
        user: {},
        wizard: undefined,
      });
    });
  });
});
