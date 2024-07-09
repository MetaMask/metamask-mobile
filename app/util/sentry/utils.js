/* eslint-disable import/no-namespace */
import * as Sentry from '@sentry/react-native';
import { Dedupe, ExtraErrorData } from '@sentry/integrations';
import extractEthJsErrorMessage from '../extractEthJsErrorMessage';
import DefaultPreference from 'react-native-default-preference';
import { regex } from '../regex';
import { AGREED, METRICS_OPT_IN } from '../../constants/storage';
import { isTest } from '../test/utils';
import { store } from '../../store';

/**
 * This symbol matches all object properties when used in a mask
 */
const AllProperties = Symbol('*');

// This describes the subset of background controller state attached to errors
// sent to Sentry These properties have some potential to be useful for
// debugging, and they do not contain any identifiable information.
export const sentryStateMask = {
  accounts: true,
  alert: true,
  bookmarks: true,
  browser: true,
  collectibles: true,
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: false,
        accountsByChainId: false,
      },
      AccountsController: {
        internalAccounts: {
          accounts: false,
          selectedAccount: false,
        },
      },
      AddressBookController: {
        addressBook: false,
      },
      ApprovalController: {
        approvalFlows: false,
        pendingApprovals: false,
        pendingApprovalCount: false,
      },
      AssetsContractController: {},
      CurrencyRateController: {
        currencyRates: true,
        currentCurrency: true,
      },
      GasFeeController: {
        estimatedGasFeeTimeBounds: true,
        gasEstimateType: true,
        gasFeeEstimates: true,
        gasFeeEstimatesByChainId: true,
        nonRPCGasFeeApisDisabled: false,
      },
      KeyringController: {
        isUnlocked: true,
        keyrings: false,
      },
      LoggingController: {
        logs: false,
      },
      NetworkController: {
        networkConfigurations: false,
        networksMetadata: true,
        providerConfig: {
          chainId: true,
          id: true,
          nickname: true,
          rpcPrefs: false,
          rpcUrl: false,
          ticker: true,
          type: true,
        },
        selectedNetworkClientId: false,
      },
      NftController: {
        allNftContracts: false,
        allNfts: false,
        ignoredNfts: false,
      },
      NftDetectionController: false,
      PPOMController: {
        storageMetadata: [],
        versionInfo: [],
      },
      PermissionController: {
        subjects: false,
      },
      PhishingController: {},
      PreferencesController: {
        disabledRpcMethodPreferences: true,
        featureFlags: true,
        identities: false,
        isIpfsGatewayEnabled: true,
        ipfsGateway: false,
        lostIdentities: false,
        securityAlertsEnabled: false,
        displayNftMedia: true,
        selectedAddress: false,
        useNftDetection: true,
        useTokenDetection: true,
        useTransactionSimulations: true,
      },
      SignatureController: {
        unapprovedMsgCount: true,
        unapprovedMsgs: false,
        unapprovedPersonalMsgCount: true,
        unapprovedPersonalMsgs: false,
        unapprovedTypedMessages: false,
        unapprovedTypedMessagesCount: true,
      },
      SmartTransactionsController: {
        smartTransactionsState: {
          fees: {
            approvalTxFees: true,
            tradeTxFees: true,
          },
          liveness: true,
          smartTransactions: false,
          userOptIn: true,
          userOptInV2: true,
        },
      },
      SnapController: {
        unencryptedSnapStates: false,
        snapStates: false,
        snaps: false,
      },
      SnapInterface: {
        interfaces: false,
      },
      SnapsRegistry: {
        database: false,
        lastUpdated: false,
        databaseUnavailable: false,
      },
      SubjectMetadataController: {
        subjectMetadata: false,
      },
      SwapsController: {
        swapsState: {
          approveTxId: false,
          customApproveTxData: false,
          customGasPrice: true,
          customMaxFeePerGas: true,
          customMaxGas: true,
          customMaxPriorityFeePerGas: true,
          errorKey: true,
          fetchParams: true,
          quotes: false,
          quotesLastFetched: true,
          quotesPollingLimitEnabled: true,
          routeState: true,
          saveFetchedQuotes: true,
          selectedAggId: true,
          swapsFeatureFlags: true,
          swapsFeatureIsLive: true,
          swapsQuotePrefetchingRefreshTime: true,
          swapsQuoteRefreshTime: true,
          swapsStxBatchStatusRefreshTime: true,
          swapsStxGetTransactionsRefreshTime: true,
          swapsStxMaxFeeMultiplier: true,
          swapsUserFeeLevel: true,
          tokens: false,
          topAggId: false,
          tradeTxId: false,
        },
      },
      TokenDetectionController: {
        [AllProperties]: false,
      },
      TokenListController: {
        preventPollingOnNetworkRestart: true,
        tokenList: false,
        tokensChainsCache: {
          [AllProperties]: false,
        },
      },
      TokenRatesController: {
        marketData: false,
      },
      TokensController: {
        allDetectedTokens: {
          [AllProperties]: false,
        },
        allIgnoredTokens: {
          [AllProperties]: false,
        },
        allTokens: {
          [AllProperties]: false,
        },
        detectedTokens: false,
        ignoredTokens: false,
        tokens: false,
      },
      TransactionController: {
        transactions: false,
        lastFetchedBlockNumbers: false,
        methodData: false,
        submitHistory: false,
      },
    },
  },
  experimentalSettings: true,
  fiatOrders: false,
  infuraAvailability: true,
  inpageProvider: true,
  legalNotices: true,
  modals: true,
  navigation: true,
  networkOnboarded: true,
  notification: true,
  onboarding: true,
  privacy: true,
  rpcEvents: true,
  sdk: true,
  security: true,
  settings: true,
  signatureRequest: false,
  smartTransactions: true,
  swaps: false,
  transaction: false,
  transactionMetrics: false,
  user: {
    ambiguousAddressEntries: false,
    appTheme: true,
    backUpSeedphraseVisible: true,
    gasEducationCarouselSeen: true,
    initialScreen: true,
    isAuthChecked: true,
    loadingMsg: true,
    loadingSet: true,
    passwordSet: true,
    protectWalletModalVisible: true,
    seedphraseBackedUp: true,
    userLoggedIn: true,
  },
  wizard: true,
};

const METAMASK_ENVIRONMENT = process.env['METAMASK_ENVIRONMENT'] || 'local'; // eslint-disable-line dot-notation
const METAMASK_BUILD_TYPE = process.env['METAMASK_BUILD_TYPE'] || 'main'; // eslint-disable-line dot-notation

const ERROR_URL_ALLOWLIST = [
  'cryptocompare.com',
  'coingecko.com',
  'etherscan.io',
  'codefi.network',
  'segment.io',
];
/**\
 * Required instrumentation for Sentry Performance to work with React Navigation
 */
export const routingInstrumentation =
  new Sentry.ReactNavigationV5Instrumentation();

/**
 * Capture Sentry user feedback and associate ID of captured exception
 *
 * @param options.sentryId - ID of captured exception
 * @param options.comments - User's feedback/comments
 */
export const captureSentryFeedback = ({ sentryId, comments }) => {
  const userFeedback = {
    event_id: sentryId,
    name: '',
    email: '',
    comments,
  };
  Sentry.captureUserFeedback(userFeedback);
};

function getProtocolFromURL(url) {
  return new URL(url).protocol;
}

function rewriteBreadcrumb(breadcrumb) {
  if (breadcrumb.data?.url) {
    breadcrumb.data.url = getProtocolFromURL(breadcrumb.data.url);
  }
  if (breadcrumb.data?.to) {
    breadcrumb.data.to = getProtocolFromURL(breadcrumb.data.to);
  }
  if (breadcrumb.data?.from) {
    breadcrumb.data.from = getProtocolFromURL(breadcrumb.data.from);
  }

  return breadcrumb;
}

function rewriteErrorMessages(report, rewriteFn) {
  // rewrite top level message
  if (typeof report.message === 'string') {
    /** @todo parse and remove/replace URL(s) found in report.message  */
    report.message = rewriteFn(report.message);
  }
  // rewrite each exception message
  if (report.exception && report.exception.values) {
    report.exception.values.forEach((item) => {
      if (typeof item.value === 'string') {
        item.value = rewriteFn(item.value);
      }
    });
  }
}

function simplifyErrorMessages(report) {
  rewriteErrorMessages(report, (errorMessage) => {
    // simplify ethjs error messages
    let simplifiedErrorMessage = extractEthJsErrorMessage(errorMessage);
    // simplify 'Transaction Failed: known transaction'
    if (
      simplifiedErrorMessage.indexOf(
        'Transaction Failed: known transaction',
      ) === 0
    ) {
      // cut the hash from the error message
      simplifiedErrorMessage = 'Transaction Failed: known transaction';
    }
    return simplifiedErrorMessage;
  });
}

function removeDeviceTimezone(report) {
  if (report.contexts && report.contexts.device)
    report.contexts.device.timezone = null;
}

function removeDeviceName(report) {
  if (report.contexts && report.contexts.device)
    report.contexts.device.name = null;
}

/**
 * Removes SES from the Sentry error event stack trace.
 * By default, SES is shown as the top level frame, which can obscure errors.
 * We filter it out by identifying the SES stack trace frame simply by 'filename',
 * since the 'context_line' is rather verbose.
 * @param {*} report - the error event
 */
function removeSES(report) {
  const stacktraceFrames = report?.exception?.values[0]?.stacktrace?.frames;
  if (stacktraceFrames) {
    const filteredFrames = stacktraceFrames.filter(
      (frame) => frame.filename !== 'app:///ses.cjs',
    );
    report.exception.values[0].stacktrace.frames = filteredFrames;
  }
}

/**
 * Return a "masked" copy of the given object. The returned object includes
 * only the properties present in the mask.
 *
 * The mask is an object that mirrors the structure of the given object, except
 * the only values are `true`, `false, a sub-mask, or the 'AllProperties"
 * symbol. `true` implies the property should be included, and `false` will
 * exclude it. A sub-mask implies the property should be further masked
 * according to that sub-mask. The "AllProperties" symbol is used for objects
 * with dynamic keys, and applies a rule (either `true`, `false`, or a
 * sub-mask`) to every property in that object.
 *
 * If a property is excluded, its type is included instead.
 *
 * @param {object} object - The object to mask
 * @param {{[key: string]: object | boolean}} mask - The mask to apply to the object
 */
export function maskObject(object, mask = true) {
  if (!object) return null;
  let maskAllProperties = false;
  if (Object.keys(mask).includes(AllProperties)) {
    if (Object.keys(mask).length > 1) {
      throw new Error('AllProperties mask key does not support sibling keys');
    }
    maskAllProperties = true;
  }
  return Object.keys(object).reduce((state, key) => {
    const maskKey = maskAllProperties ? mask[AllProperties] : mask[key];
    if (maskKey === true) {
      state[key] = object[key];
    } else if (maskKey && typeof maskKey === 'object') {
      state[key] = maskObject(object[key], maskKey);
    } else if (maskKey === undefined || maskKey === false) {
      state[key] = typeof object[key];
    } else {
      throw new Error(`Unsupported mask entry: ${maskKey}`);
    }
    return state;
  }, {});
}

function rewriteReport(report) {
  try {
    // filter out SES from error stack trace
    removeSES(report);
    // simplify certain complex error messages (e.g. Ethjs)
    simplifyErrorMessages(report);
    // remove urls from error message
    sanitizeUrlsFromErrorMessages(report);
    // Remove evm addresses from error message.
    // Note that this is redundent with data scrubbing we do within our sentry dashboard,
    // but putting the code here as well gives public visibility to how we are handling
    // privacy with respect to sentry.
    sanitizeAddressesFromErrorMessages(report);
    // remove device timezone
    removeDeviceTimezone(report);
    // remove device name
    removeDeviceName(report);

    const appState = store?.getState();
    const maskedState = maskObject(appState, sentryStateMask);
    report.contexts.appState = maskedState || {};
  } catch (err) {
    console.error('ENTER ERROR OF REPORT ', err);
    throw err;
  }

  return report;
}

/**
 * This function excludes events from being logged in the performance portion of the app.
 * @param {*} event - to be logged
 * @returns {(event|null)}
 */
export function excludeEvents(event) {
  //Modify or drop event here
  if (event?.transaction === 'Route Change') {
    //Route change is dropped because is does not reflect a screen we can action on.
    //Don't send the event to Sentry
    return null;
  }

  return event;
}

function sanitizeUrlsFromErrorMessages(report) {
  rewriteErrorMessages(report, (errorMessage) => {
    const urlsInMessage = errorMessage.match(regex.sanitizeUrl);

    urlsInMessage?.forEach((url) => {
      if (!ERROR_URL_ALLOWLIST.some((allowedUrl) => url.match(allowedUrl))) {
        errorMessage.replace(url, '**');
      }
    });
    return errorMessage;
  });
}

function sanitizeAddressesFromErrorMessages(report) {
  rewriteErrorMessages(report, (errorMessage) => {
    const newErrorMessage = errorMessage.replace(
      regex.replaceNetworkErrorSentry,
      '**',
    );
    return newErrorMessage;
  });
}

/**
 * Derives the Sentry environment based on input parameters.
 * This function is similar to the environment logic used in MetaMask extension.
 * - https://github.com/MetaMask/metamask-extension/blob/34375a57e558853aab95fe35d5f278aa52b66636/app/scripts/lib/setupSentry.js#L91
 *
 * @param {boolean} isDev - Represents if the current environment is development (__DEV__ global variable).
 * @param {string} [metamaskEnvironment='local'] - The environment MetaMask is running in
 *                                                  (process.env.METAMASK_ENVIRONMENT).
 *                                                  It defaults to 'local' if not provided.
 * @param {string} [metamaskBuildType='main'] - The build type of MetaMask
 *                                              (process.env.METAMASK_BUILD_TYPE).
 *                                              It defaults to 'main' if not provided.
 *
 * @returns {string} - "metamaskEnvironment-metamaskBuildType" or just "metamaskEnvironment" if the build type is "main".
 */
export function deriveSentryEnvironment(
  isDev,
  metamaskEnvironment = 'local',
  metamaskBuildType = 'main',
) {
  if (isDev || !metamaskEnvironment) {
    return 'development';
  }

  if (metamaskBuildType === 'main') {
    return metamaskEnvironment;
  }

  return `${metamaskEnvironment}-${metamaskBuildType}`;
}

// Setup sentry remote error reporting
export function setupSentry() {
  // Disable Sentry for E2E tests
  if (isTest) {
    return;
  }

  const init = async () => {
    const dsn = process.env.MM_SENTRY_DSN;

    const metricsOptIn = await DefaultPreference.get(METRICS_OPT_IN);

    const integrations = [new Dedupe(), new ExtraErrorData()];
    const environment = deriveSentryEnvironment(
      __DEV__,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );

    Sentry.init({
      dsn,
      debug: __DEV__,
      environment,
      integrations:
        metricsOptIn === AGREED
          ? [
              ...integrations,
              new Sentry.ReactNativeTracing({
                routingInstrumentation,
              }),
            ]
          : integrations,
      tracesSampleRate: 0.04,
      beforeSend: (report) => rewriteReport(report),
      beforeBreadcrumb: (breadcrumb) => rewriteBreadcrumb(breadcrumb),
      beforeSendTransaction: (event) => excludeEvents(event),
    });
  };
  init();
}

// eslint-disable-next-line no-empty-function
export function deleteSentryData() {}
