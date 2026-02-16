/* eslint-disable import/no-namespace */
import * as Sentry from '@sentry/react-native';
import { dedupeIntegration, extraErrorDataIntegration } from '@sentry/browser';
import { Breadcrumb, Event as SentryEvent } from '@sentry/core';
import {
  updateId,
  manifest,
  isEmbeddedLaunch,
  runtimeVersion,
} from 'expo-updates';
import extractEthJsErrorMessage from '../extractEthJsErrorMessage';
import { regex } from '../regex';
import { isE2E, isQa } from '../test/utils';
import { store } from '../../store';
import { Performance } from '../../core/Performance';
import Device from '../device';
import { TraceName, hasMetricsConsent } from '../trace';
import { getTraceTags } from './tags';
import { ReduxStore } from '../../core/redux';
import { OTA_VERSION } from '../../constants/ota';

/**
 * This symbol matches all object properties when used in a mask
 */
export const AllProperties = Symbol('*');

type MaskValue =
  | boolean
  | typeof AllProperties
  | { [key: string]: MaskValue }
  | MaskValue[];

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
      AppMetadataController: {
        [AllProperties]: true,
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
      AuthenticationController: {
        isSignedIn: false,
        srpSessionData: false,
      },
      UserStorageController: {
        isBackupAndSyncEnabled: true,
        isBackupAndSyncUpdateLoading: false,
        isAccountSyncingEnabled: true,
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
    existingUser: true,
  },
} as Record<string, MaskValue>;

const METAMASK_ENVIRONMENT = process.env['METAMASK_ENVIRONMENT'] || 'dev'; // eslint-disable-line dot-notation
const METAMASK_BUILD_TYPE = process.env['METAMASK_BUILD_TYPE'] || 'main'; // eslint-disable-line dot-notation

const ERROR_URL_ALLOWLIST = [
  'cryptocompare.com',
  'coingecko.com',
  'etherscan.io',
  'codefi.network',
  'segment.io',
];

interface CaptureSentryFeedbackOptions {
  sentryId: string;
  comments: string;
}

/**
 * Capture Sentry user feedback and associate ID of captured exception
 *
 * @param options.sentryId - ID of captured exception
 * @param options.comments - User's feedback/comments
 */
export const captureSentryFeedback = ({
  sentryId,
  comments,
}: CaptureSentryFeedbackOptions): void => {
  const userFeedback = {
    event_id: sentryId,
    name: '',
    email: '',
    comments,
  };
  Sentry.captureUserFeedback(userFeedback);
};

function getProtocolFromURL(url: string): string {
  // Don't use URL api because it's slow in React Native
  const colonIndex = url.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('Invalid URL');
  }
  return url.substring(0, colonIndex + 1);
}

export function rewriteBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
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

function rewriteErrorMessages(
  report: SentryEvent,
  rewriteFn: (message: string) => string,
): void {
  // rewrite top level message
  if (typeof report.message === 'string') {
    /** @todo parse and remove/replace URL(s) found in report.message  */
    report.message = rewriteFn(report.message);
  }
  // rewrite each exception message
  if (report.exception?.values) {
    report.exception.values.forEach((item) => {
      if (typeof item.value === 'string') {
        item.value = rewriteFn(item.value);
      }
    });
  }
}

function simplifyErrorMessages(report: SentryEvent): void {
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

function removeDeviceTimezone(report: SentryEvent): void {
  if (report.contexts?.device) {
    (report.contexts.device as Record<string, unknown>).timezone = null;
  }
}

function removeDeviceName(report: SentryEvent): void {
  if (report.contexts?.device) {
    (report.contexts.device as Record<string, unknown>).name = null;
  }
}

/**
 * Removes SES from the Sentry error event stack trace.
 * By default, SES is shown as the top level frame, which can obscure errors.
 * We filter it out by identifying the SES stack trace frame simply by 'filename',
 * since the 'context_line' is rather verbose.
 *
 * @param report - the error event
 */
function removeSES(report: SentryEvent): void {
  const stacktraceFrames = report?.exception?.values?.[0]?.stacktrace?.frames;
  if (stacktraceFrames && report.exception?.values?.[0]?.stacktrace) {
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
 * @param objectToMask - The object to mask
 * @param mask - The mask to apply to the object
 * @returns - The masked object
 */
export function maskObject(
  objectToMask: Record<string, unknown>,
  mask: Record<string, MaskValue> = {},
): Record<string, unknown> {
  if (!objectToMask) return {};

  // Include both string and symbol keys.
  const maskKeys = Reflect.ownKeys(mask);
  const allPropertiesMask = maskKeys.includes(AllProperties)
    ? (Reflect.get(mask, AllProperties) as MaskValue | undefined)
    : undefined;

  return Object.keys(objectToMask).reduce(
    (maskedObject, key) => {
      // Start with the AllProperties mask if available
      let maskKey = allPropertiesMask;

      // If a key-specific mask exists, it overrides the AllProperties mask
      if (mask[key] !== undefined && mask[key] !== AllProperties) {
        maskKey = mask[key];
      }

      const shouldPrintValue = maskKey === true;
      const shouldIterateSubMask =
        maskKey !== AllProperties &&
        Boolean(maskKey) &&
        typeof maskKey === 'object';
      const shouldPrintType = maskKey === undefined || maskKey === false;

      if (shouldPrintValue) {
        maskedObject[key] = objectToMask[key];
      } else if (shouldIterateSubMask) {
        maskedObject[key] = maskObject(
          objectToMask[key] as Record<string, unknown>,
          maskKey as Record<string, MaskValue>,
        );
      } else if (shouldPrintType) {
        // For excluded fields, return their type or a placeholder
        maskedObject[key] =
          objectToMask[key] === null ? 'null' : typeof objectToMask[key];
      }

      return maskedObject;
    },
    {} as Record<string, unknown>,
  );
}

export function rewriteReport(report: SentryEvent): SentryEvent {
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

    const appState = (store as ReduxStore | undefined)?.getState();
    const maskedState = maskObject(
      appState as unknown as Record<string, unknown>,
      sentryStateMask,
    );
    if (!report.contexts) {
      report.contexts = {};
    }
    report.contexts.appState = maskedState;
  } catch (err) {
    console.error('ENTER ERROR OF REPORT ', err);
    throw err;
  }

  return report;
}

/**
 * This function excludes events from being logged in the performance portion of the app.
 *
 * @param event - to be logged
 * @returns event or null
 */
export function excludeEvents(event: SentryEvent | null): SentryEvent | null {
  if (!event) return null;

  // This is needed because store starts to initialise before performance observers completes to measure app start time
  if (event?.transaction === TraceName.UIStartup) {
    event.tags = getTraceTags((store as ReduxStore).getState());

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

function sanitizeUrlsFromErrorMessages(report: SentryEvent): void {
  rewriteErrorMessages(report, (errorMessage) => {
    const urlsInMessage = errorMessage.match(regex.sanitizeUrl);

    urlsInMessage?.forEach((url) => {
      const isAllowed = ERROR_URL_ALLOWLIST.some((allowedUrl) =>
        url.match(allowedUrl),
      );
      if (!isAllowed) {
        errorMessage = errorMessage.replace(url, '**');
      }
    });
    return errorMessage;
  });
}

function sanitizeAddressesFromErrorMessages(report: SentryEvent): void {
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
 *
 * @param isDev - Represents if the current environment is development (__DEV__ global variable).
 * @param metamaskEnvironment - The environment MetaMask is running in (process.env.METAMASK_ENVIRONMENT). It defaults to 'dev' if not provided.
 * @param metamaskBuildType - The build type of MetaMask (process.env.METAMASK_BUILD_TYPE). It defaults to 'main' if not provided.
 * @returns - "metamaskEnvironment-metamaskBuildType" or just "metamaskEnvironment" if the build type is "main".
 */
export function deriveSentryEnvironment(
  isDev: boolean,
  metamaskEnvironment: string = 'dev',
  metamaskBuildType: string = 'main',
): string {
  if (isDev || !metamaskEnvironment) {
    return 'development';
  }

  if (metamaskBuildType === 'main') {
    switch (metamaskEnvironment) {
      case 'production':
        return 'production';
      case 'dev':
        return 'development';
      case 'beta':
        return 'main-beta';
      case 'rc':
        return 'main-rc';
      case 'exp':
        return 'main-exp';
      case 'e2e':
        return 'main-e2e';
      case 'test':
        return 'main-test';
      default:
        return metamaskEnvironment;
    }
  }

  return `${metamaskBuildType}-${metamaskEnvironment}`;
}

/**
 * Sets EAS update context in Sentry to track which errors come from OTA updates.
 * This adds tags like expo-update-id, expo-channel, and expo-runtime-version
 * to help identify and debug issues specific to EAS updates.
 * reference: https://docs.expo.dev/guides/using-sentry/#install-and-configure-sentry
 */
export function setEASUpdateContext(): void {
  try {
    const metadata = 'metadata' in manifest ? manifest.metadata : undefined;
    const extra = 'extra' in manifest ? manifest.extra : undefined;
    const updateGroup =
      metadata && 'updateGroup' in metadata ? metadata.updateGroup : undefined;

    const scope = Sentry.getGlobalScope();

    scope.setTag('expo-update-id', updateId);
    scope.setTag('expo-is-embedded-update', isEmbeddedLaunch);
    scope.setTag('expo-ota-version', OTA_VERSION);
    scope.setTag('expo-runtime-version', runtimeVersion);

    if (typeof updateGroup === 'string') {
      scope.setTag('expo-update-group-id', updateGroup);

      const owner = extra?.expoClient?.owner ?? '[account]';
      const slug = extra?.expoClient?.slug ?? '[project]';
      scope.setTag(
        'expo-update-debug-url',
        `https://expo.dev/accounts/${owner}/projects/${slug}/updates/${updateGroup}`,
      );
    } else if (isEmbeddedLaunch) {
      scope.setTag(
        'expo-update-debug-url',
        'not applicable for embedded updates',
      );
    }
  } catch (error) {
    console.warn('Failed to set EAS update context in Sentry:', error);
  }
}

// Setup sentry remote error reporting
export async function setupSentry(
  forceEnabled: boolean = false,
): Promise<void> {
  const dsn = process.env.MM_SENTRY_DSN;

  // Disable Sentry for E2E tests or when DSN is not provided
  if (isE2E || !dsn) {
    return;
  }

  const isDev = __DEV__;

  const init = async () => {
    // Ensure consent cache is populated early
    const hasConsent = await hasMetricsConsent();

    const integrations = [dedupeIntegration(), extraErrorDataIntegration()];
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
      tracesSampleRate: isDev || isQa ? 1.0 : 0.03,
      profilesSampleRate: 1.0,
      beforeSend: (report) => {
        const rewritten = rewriteReport(report as SentryEvent);
        return rewritten as typeof report;
      },
      beforeBreadcrumb: (breadcrumb) => rewriteBreadcrumb(breadcrumb),
      beforeSendTransaction: (event) => {
        const filtered = excludeEvents(event as SentryEvent);
        return filtered as typeof event;
      },
      enabled: forceEnabled || hasConsent,
      // Use tracePropagationTargets from v5 SDK as default
      tracePropagationTargets: ['localhost', /^\/(?!\/)/],
    });

    // Set EAS update context after Sentry initialization
    setEASUpdateContext();
  };
  await init();
}

/**
 * Capture an exception with forced Sentry reporting.
 * This initializes Sentry with enabled: true and captures the exception.
 * Should only be used for critical errors where user hasn't consented to metrics yet.
 *
 * @param error - The error to capture
 * @param extra - Additional context to include with the error
 */
export async function captureExceptionForced(
  error: Error,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    // Initialize Sentry with forced enabled state
    await setupSentry(true);

    Sentry.captureException(error, {
      extra,
      tags: { forced_reporting: true },
    });
  } catch (sentryError) {
    console.error(
      'Failed to capture exception with forced Sentry:',
      sentryError,
    );
  } finally {
    // Reset Sentry to its default state
    await setupSentry();
  }
}

// eslint-disable-next-line no-empty-function
export function deleteSentryData(): void {}
