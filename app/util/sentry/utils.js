/* eslint-disable import/no-namespace */
import * as Sentry from '@sentry/react-native';
import { Dedupe, ExtraErrorData } from '@sentry/integrations';
import extractEthJsErrorMessage from '../extractEthJsErrorMessage';
import StorageWrapper from '../../store/storage-wrapper';
import { regex } from '../regex';
import { AGREED, METRICS_OPT_IN } from '../../constants/storage';
import { isTest } from '../test/utils';
import { store } from '../../store';
import { Performance } from '../../core/Performance';
import Device from '../device';
import { TraceName } from '../trace';
import { getTraceTags } from './tags';
/**
 * This symbol matches all object properties when used in a mask
 */
export const AllProperties = Symbol('*');

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
        [AllProperties]: false,
      },
      AccountsController: {
        internalAccounts: {
          accounts: {
            [AllProperties]: {
              id: true,
              address: false,
              type: true,
              options: true,
              methods: true,
              scopes: true,
              metadata: {
                name: true,
                importTime: true,
                keyring: {
                  type: true,
                },
                nameLastUpdatedAt: true,
                snap: {
                  id: true,
                  name: true,
                  enabled: true,
                },
                lastSelected: true,
              },
            },
          },
          selectedAccount: true,
        },
      },
      AddressBookController: {
        [AllProperties]: false,
      },
      ApprovalController: {
        [AllProperties]: false,
      },
      CurrencyRateController: {
        currencyRates: true,
        currentCurrency: true,
      },
      GasFeeController: {
        estimatedGasFeeTimeBounds: true,
        gasEstimateType: true,
        gasFeeEstimates: true,
        gasFeeEstimatesByChainId: true,
      },
      KeyringController: {
        isUnlocked: true,
        vault: false,
        keyrings: {
          [AllProperties]: {
            type: true,
            // Each keyring contains an array of accounts (addresses), all of which should be masked
            accounts: {
              [AllProperties]: false,
            },
          },
        },
      },
      LoggingController: {
        [AllProperties]: false,
      },
      NetworkController: {
        networksMetadata: true,
        providerConfig: {
          chainId: true,
          id: true,
          nickname: true,
          ticker: true,
          type: true,
        },
      },
      NftController: {
        [AllProperties]: false,
      },
      PPOMController: {
        storageMetadata: [],
        versionInfo: [],
      },
      PermissionController: {
        [AllProperties]: false,
      },
      PhishingController: {},
      PreferencesController: {
        featureFlags: true,
        isIpfsGatewayEnabled: true,
        displayNftMedia: true,
        useNftDetection: true,
        useTokenDetection: true,
        useTransactionSimulations: true,
      },
      SignatureController: {
        unapprovedPersonalMsgCount: true,
        unapprovedTypedMessagesCount: true,
      },
      SmartTransactionsController: {
        smartTransactionsState: {
          fees: {
            approvalTxFees: true,
            tradeTxFees: true,
          },
          liveness: true,
          userOptIn: true,
          userOptInV2: true,
        },
      },
      SnapController: {
        [AllProperties]: false,
      },
      SnapInterface: {
        [AllProperties]: false,
      },
      SnapsRegistry: {
        [AllProperties]: false,
      },
      SubjectMetadataController: {
        [AllProperties]: false,
      },
      SwapsController: {
        swapsState: {
          customGasPrice: true,
          customMaxFeePerGas: true,
          customMaxGas: true,
          customMaxPriorityFeePerGas: true,
          errorKey: true,
          fetchParams: true,
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
        },
      },
      TokenListController: {
        preventPollingOnNetworkRestart: true,
        tokensChainsCache: {
          [AllProperties]: false,
        },
      },
      TokenRatesController: {
        [AllProperties]: false,
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
      },
      TransactionController: {
        [AllProperties]: false,
      },
      AuthenticationController: {
        [AllProperties]: false,
      },
      NotificationServicesController: {
        isCheckingAccountsPresence: false,
        isFeatureAnnouncementsEnabled: false,
        isFetchingMetamaskNotifications: false,
        isMetamaskNotificationsFeatureSeen: false,
        isNotificationServicesEnabled: false,
        isUpdatingMetamaskNotifications: false,
        isUpdatingMetamaskNotificationsAccount: [],
        metamaskNotificationsList: [],
        metamaskNotificationsReadList: [],
        subscriptionAccountsSeen: [],
      },
      UserStorageController: {
        isProfileSyncingEnabled: true,
        isProfileSyncingUpdateLoading: false,
      },
    },
  },
  experimentalSettings: true,
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
  smartTransactions: true,
  user: {
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
 * @param {object} objectToMask - The object to mask
 * @param {{[key: string]: object | boolean}} mask - The mask to apply to the object
 * @returns {object} - The masked object
 */
export function maskObject(objectToMask, mask = {}) {
  if (!objectToMask) return {};

  // Include both string and symbol keys.
  const maskKeys = Reflect.ownKeys(mask);
  const allPropertiesMask = maskKeys.includes(AllProperties)
    ? mask[AllProperties]
    : undefined;

  return Object.keys(objectToMask).reduce((maskedObject, key) => {
    // Start with the AllProperties mask if available
    let maskKey = allPropertiesMask;

    // If a key-specific mask exists, it overrides the AllProperties mask
    if (mask[key] !== undefined && mask[key] !== AllProperties) {
      maskKey = mask[key];
    }

    const shouldPrintValue = maskKey === true;
    const shouldIterateSubMask =
      Boolean(maskKey) &&
      typeof maskKey === 'object' &&
      maskKey !== AllProperties;
    const shouldPrintType = maskKey === undefined || maskKey === false;

    if (shouldPrintValue) {
      maskedObject[key] = objectToMask[key];
    } else if (shouldIterateSubMask) {
      maskedObject[key] = maskObject(objectToMask[key], maskKey);
    } else if (shouldPrintType) {
      // For excluded fields, return their type or a placeholder
      maskedObject[key] =
        objectToMask[key] === null ? 'null' : typeof objectToMask[key];
    }

    return maskedObject;
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
    report.contexts.appState = maskedState;
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
  // This is needed because store starts to initialise before performance observers completes to measure app start time
  if (event?.transaction === TraceName.UIStartup) {
    event.tags = getTraceTags(store.getState());

    if (Device.isAndroid()) {
      const appLaunchTime = Performance.appLaunchTime;
      const formattedAppLaunchTime = (event.start_timestamp = Number(
        `${appLaunchTime.toString().slice(0, 10)}.${appLaunchTime
          .toString()
          .slice(10)}`,
      ));
      if (event.start_timestamp !== formattedAppLaunchTime) {
        event.start_timestamp = formattedAppLaunchTime;
      }
    }
  }
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
  const dsn = process.env.MM_SENTRY_DSN;

  // Disable Sentry for E2E tests or when DSN is not provided
  if (isTest || !dsn) {
    return;
  }

  const isQa = METAMASK_ENVIRONMENT === 'qa';
  const isDev = __DEV__;

  const init = async () => {
    const metricsOptIn = await StorageWrapper.getItem(METRICS_OPT_IN);

    const integrations = [new Dedupe(), new ExtraErrorData()];
    const environment = deriveSentryEnvironment(
      __DEV__,
      METAMASK_ENVIRONMENT,
      METAMASK_BUILD_TYPE,
    );

    Sentry.init({
      dsn,
      debug: isDev && process.env.SENTRY_DEBUG_DEV !== 'false',
      environment,
      integrations,
      // Set tracesSampleRate to 1.0, as that ensures that every transaction will be sent to Sentry for development builds.
      tracesSampleRate: isDev || isQa ? 1.0 : 0.04,
      profilesSampleRate: 1.0,
      beforeSend: (report) => rewriteReport(report),
      beforeBreadcrumb: (breadcrumb) => rewriteBreadcrumb(breadcrumb),
      beforeSendTransaction: (event) => excludeEvents(event),
      enabled: metricsOptIn === AGREED,
    });
  };
  init();
}

// eslint-disable-next-line no-empty-function
export function deleteSentryData() {}
