import { ACTIONS, PROTOCOLS, PREFIXES } from '../../../../constants/deeplinks';
import AppConstants from '../../../AppConstants';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { DeeplinkManager } from '../../DeeplinkManager';
import extractURLParams from '../../utils/extractURLParams';
import {
  hasSignature,
  verifyDeeplinkSignature,
  INVALID,
  MISSING,
  VALID,
} from '../../utils/verifySignature';
import {
  DeepLinkModalLinkType,
  type DeepLinkModalParams,
} from '../../../../components/UI/DeepLinkModal';
import handleDeepLinkModalDisplay from './handleDeepLinkModalDisplay';
import handleMetaMaskDeeplink from './handleMetaMaskDeeplink';
import { capitalize } from '../../../../util/general';
import handleRampUrl from './handleRampUrl';
import handleDepositCashUrl from './handleDepositCashUrl';
import { navigateToHomeUrl } from './handleHomeUrl';
import { handleSwapUrl } from './handleSwapUrl';
import handleBrowserUrl from './handleBrowserUrl';
import { handleCreateAccountUrl } from './handleCreateAccountUrl';
import { handlePerpsUrl } from './handlePerpsUrl';
import { handleRewardsUrl } from './handleRewardsUrl';
import { handlePredictUrl } from './handlePredictUrl';
import handleFastOnboarding from './handleFastOnboarding';
import { handleEnableCardButton } from './handleEnableCardButton';
import { handleCardOnboarding } from './handleCardOnboarding';
import { handleCardHome } from './handleCardHome';
import { handleTrendingUrl } from './handleTrendingUrl';
import { RampType } from '../../../../reducers/fiatOrders/types';
import { SHIELD_WEBSITE_URL } from '../../../../constants/shield';
import {
  createDeepLinkUsedEventBuilder,
  mapSupportedActionToRoute,
} from '../../util/deeplinks/deepLinkAnalytics';
import {
  DeepLinkAnalyticsContext,
  SignatureStatus,
  InterstitialState,
  BranchParams,
  DeepLinkRoute,
} from '../../types/deepLinkAnalytics.types';
import { isSupportedAction } from '../../types/deepLink.types';
import { selectDeepLinkModalDisabled } from '../../../../selectors/settings';
import ReduxService from '../../../redux';
import { analytics } from '../../../../util/analytics/analytics';
import branch from 'react-native-branch';
import Logger from '../../../../util/Logger';

const {
  MM_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_TEST_HOST,
} = AppConstants;

const SUPPORTED_ACTIONS = {
  DAPP: ACTIONS.DAPP,
  BUY: ACTIONS.BUY,
  BUY_CRYPTO: ACTIONS.BUY_CRYPTO,
  SELL: ACTIONS.SELL,
  SELL_CRYPTO: ACTIONS.SELL_CRYPTO,
  DEPOSIT: ACTIONS.DEPOSIT,
  HOME: ACTIONS.HOME,
  SWAP: ACTIONS.SWAP,
  SEND: ACTIONS.SEND,
  CREATE_ACCOUNT: ACTIONS.CREATE_ACCOUNT,
  PERPS: ACTIONS.PERPS,
  PERPS_MARKETS: ACTIONS.PERPS_MARKETS,
  PERPS_ASSET: ACTIONS.PERPS_ASSET,
  REWARDS: ACTIONS.REWARDS,
  PREDICT: ACTIONS.PREDICT,
  WC: ACTIONS.WC,
  ONBOARDING: ACTIONS.ONBOARDING,
  ENABLE_CARD_BUTTON: ACTIONS.ENABLE_CARD_BUTTON,
  CARD_ONBOARDING: ACTIONS.CARD_ONBOARDING,
  CARD_HOME: ACTIONS.CARD_HOME,
  TRENDING: ACTIONS.TRENDING,
  SHIELD: ACTIONS.SHIELD,
  // MetaMask SDK specific actions
  ANDROID_SDK: ACTIONS.ANDROID_SDK,
  CONNECT: ACTIONS.CONNECT,
  MMSDK: ACTIONS.MMSDK,
} as const;

type SUPPORTED_ACTIONS =
  (typeof SUPPORTED_ACTIONS)[keyof typeof SUPPORTED_ACTIONS];

/**
 * Actions that should not show the deep link INTERSTITIAL modal
 */
const WHITELISTED_ACTIONS: SUPPORTED_ACTIONS[] = [
  SUPPORTED_ACTIONS.WC,
  SUPPORTED_ACTIONS.ENABLE_CARD_BUTTON,
  SUPPORTED_ACTIONS.CARD_ONBOARDING,
  SUPPORTED_ACTIONS.CARD_HOME,
  SUPPORTED_ACTIONS.PERPS,
  SUPPORTED_ACTIONS.PERPS_MARKETS,
  SUPPORTED_ACTIONS.PERPS_ASSET,
];

/**
 * MetaMask SDK actions that should be handled by handleMetaMaskDeeplink
 */
const METAMASK_SDK_ACTIONS: SUPPORTED_ACTIONS[] = [
  SUPPORTED_ACTIONS.ANDROID_SDK,
  SUPPORTED_ACTIONS.CONNECT,
  SUPPORTED_ACTIONS.MMSDK,
];

const interstitialWhitelistUrls = [] as const;

// This is used when links originate from within the app itself
const inAppLinkSources = [
  AppConstants.DEEPLINKS.ORIGIN_CAROUSEL,
  AppConstants.DEEPLINKS.ORIGIN_NOTIFICATION,
  AppConstants.DEEPLINKS.ORIGIN_QR_CODE,
  AppConstants.DEEPLINKS.ORIGIN_IN_APP_BROWSER,
  AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
] as string[];

/**
 * Helper function to track deep link analytics asynchronously without blocking
 * @param analyticsContext - The deep link analytics context
 */
const trackDeepLinkAnalytics = (
  analyticsContext: DeepLinkAnalyticsContext,
): void => {
  createDeepLinkUsedEventBuilder(analyticsContext)
    .then((eventBuilder) => {
      const event = eventBuilder.build();
      analytics.trackEvent(event);
      DevLogger.log(
        'DeepLinkAnalytics: Tracked consolidated deep link event:',
        event,
      );
    })
    .catch((error) => {
      DevLogger.log('DeepLinkAnalytics: Failed to track analytics:', error);
    });
};

async function handleUniversalLink({
  instance,
  handled,
  urlObj,
  browserCallBack,
  url,
  source,
}: {
  instance: DeeplinkManager;
  handled: () => void;
  urlObj: ReturnType<typeof extractURLParams>['urlObj'];
  browserCallBack?: (url: string) => void;
  url: string;
  source: string;
}) {
  const validatedUrl = new URL(url);

  if (
    !validatedUrl.hostname ||
    validatedUrl.hostname.includes('?') ||
    validatedUrl.hostname.includes('&')
  ) {
    throw new Error('Invalid hostname');
  }

  // Skip handling deeplinks that do not have a pathname or query
  // Ex. It's common for third party apps to open MetaMask using only the scheme (metamask://)
  if (!validatedUrl.pathname.replace('/', '') && !validatedUrl.search) {
    handled();
    return;
  }

  let isPrivateLink = false;
  let isInvalidLink = false;

  const action: SUPPORTED_ACTIONS = validatedUrl.pathname.split(
    '/',
  )[1] as SUPPORTED_ACTIONS;

  // Intercept SDK actions and handle them in handleMetaMaskDeeplink
  if (METAMASK_SDK_ACTIONS.includes(action)) {
    const mappedUrl = url.replace(
      `${PROTOCOLS.HTTPS}://${MM_IO_UNIVERSAL_LINK_HOST}/`,
      `${PROTOCOLS.METAMASK}://`,
    );
    const { urlObj: mappedUrlObj, params } = extractURLParams(mappedUrl);
    const wcURL = params?.uri || mappedUrlObj.href;
    handleMetaMaskDeeplink({
      handled,
      wcURL,
      origin: source,
      params,
      url: mappedUrl,
    });
    return;
  }

  const isSupportedDomain =
    urlObj.hostname === MM_UNIVERSAL_LINK_HOST ||
    urlObj.hostname === MM_IO_UNIVERSAL_LINK_HOST ||
    urlObj.hostname === MM_IO_UNIVERSAL_LINK_TEST_HOST;

  const isActionSupported = Object.values(SUPPORTED_ACTIONS).includes(action);
  if (!isSupportedDomain) {
    isInvalidLink = true;
  }
  if (hasSignature(validatedUrl) && isSupportedDomain) {
    try {
      const signatureResult = await verifyDeeplinkSignature(validatedUrl);
      switch (signatureResult) {
        case VALID:
          DevLogger.log(
            'DeepLinkManager:parse Verified signature for deeplink',
            url,
          );
          isPrivateLink = true;
          break;
        case INVALID:
        case MISSING:
          DevLogger.log(
            'DeepLinkManager:parse Invalid/Missing signature, ignoring deeplink',
            url,
          );
          isPrivateLink = false;
          break;
        default:
          isPrivateLink = false;
          break;
      }
    } catch (error) {
      isPrivateLink = false;
    }
  }

  const linkType = () => {
    // Invalid domain
    if (isInvalidLink) {
      return DeepLinkModalLinkType.INVALID;
    }

    // Unsupported action with valid signature
    if (!isActionSupported && isPrivateLink) {
      return DeepLinkModalLinkType.UNSUPPORTED;
    }

    // Unsupported action without valid signature
    if (!isActionSupported) {
      return DeepLinkModalLinkType.INVALID;
    }

    // Supported action with valid signature
    if (isPrivateLink) {
      return DeepLinkModalLinkType.PRIVATE;
    }

    // Supported action without signature
    return DeepLinkModalLinkType.PUBLIC;
  };

  // Extract URL params once (will be used for analytics)
  const { params } = extractURLParams(url);

  /**
   * Branch.io parameters for analytics context.
   * Fetched once and reused across all analytics contexts to avoid duplicate API calls.
   * May be undefined if fetch fails, times out, or returns empty/null data.
   * Used by detectAppInstallation to determine app installation status.
   */
  let branchParams: BranchParams | undefined;
  try {
    // Add timeout to prevent blocking deep link processing
    const rawParams = await Promise.race([
      branch.getLatestReferringParams(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Branch.io params fetch timeout')),
          500,
        ),
      ),
    ]);

    // Validate before casting - handle null/empty edge cases
    if (
      rawParams &&
      typeof rawParams === 'object' &&
      Object.keys(rawParams).length > 0
    ) {
      branchParams = rawParams as BranchParams;
    }
  } catch (error) {
    Logger.error(
      error as Error,
      'DeepLinkManager: Error getting Branch.io params',
    );
    // branchParams remains undefined
  }

  // Build analytics context - determine signature status
  // Check if signature parameter exists and has a value
  const sigParam = validatedUrl.searchParams.get('sig');
  const hasValidSignature = sigParam && sigParam.trim() !== '';
  let signatureStatus: SignatureStatus;
  if (isPrivateLink && hasValidSignature) {
    signatureStatus = SignatureStatus.VALID;
  } else if (hasValidSignature) {
    signatureStatus = SignatureStatus.INVALID;
  } else {
    signatureStatus = SignatureStatus.MISSING;
  }

  // Type guard to ensure action is a SupportedAction before mapping
  const route = isSupportedAction(action)
    ? mapSupportedActionToRoute(action)
    : DeepLinkRoute.INVALID;

  // Get interstitial disabled state safely
  let interstitialDisabled = false;
  try {
    interstitialDisabled = selectDeepLinkModalDisabled(
      ReduxService.store.getState(),
    );
  } catch (error) {
    // Fallback if Redux store is not available (e.g., in tests)
    DevLogger.log(
      'DeepLinkManager: Error getting interstitial disabled state:',
      error,
    );
  }

  // Track analytics for whitelisted actions (they skip the modal)
  if (WHITELISTED_ACTIONS.includes(action)) {
    const analyticsContext: DeepLinkAnalyticsContext = {
      url,
      route,
      urlParams: params || {},
      branchParams,
      signatureStatus,
      interstitialShown: false,
      interstitialDisabled,
      interstitialAction: InterstitialState.ACCEPTED,
    };

    // Track analytics asynchronously without blocking
    trackDeepLinkAnalytics(analyticsContext);
  }

  const shouldProceed =
    WHITELISTED_ACTIONS.includes(action) ||
    (await new Promise<boolean>((resolve) => {
      // async because app may wait for user to dismiss modal
      const [, actionName] = validatedUrl.pathname.split('/');
      const sanitizedAction = actionName?.replace(/-/g, ' ');
      const pageTitle: string =
        capitalize(sanitizedAction?.toLowerCase()) || '';

      const validatedUrlString = validatedUrl.toString();
      const isWhitelistedUrl = interstitialWhitelistUrls.some((u) =>
        validatedUrlString.startsWith(u),
      );
      const linkInstanceType = linkType();
      const isInAppSourceWithPrivateLink =
        inAppLinkSources.includes(source) &&
        linkInstanceType === DeepLinkModalLinkType.PRIVATE;

      // Build analytics context - interstitialShown starts as false, set to true when modal is actually shown
      // interstitialAction will be set when user takes action
      const analyticsContext: DeepLinkAnalyticsContext = {
        url,
        route,
        urlParams: params || {},
        branchParams,
        signatureStatus,
        interstitialShown: false, // Initially false, will be set to true when modal is shown
        interstitialDisabled,
        // interstitialAction is undefined initially, set when user takes action
      };

      // Track analytics for skipped cases (whitelisted URLs or in-app sources with private links)
      if (isWhitelistedUrl || isInAppSourceWithPrivateLink) {
        analyticsContext.interstitialAction = InterstitialState.ACCEPTED;
        // Track analytics asynchronously without blocking
        trackDeepLinkAnalytics(analyticsContext);
        resolve(true);
        return;
      }

      // Show modal and track analytics based on user action
      // For invalid/unsupported links, pass onBack and onContinue callbacks
      if (
        linkInstanceType === DeepLinkModalLinkType.INVALID ||
        linkInstanceType === DeepLinkModalLinkType.UNSUPPORTED
      ) {
        const modalParams: DeepLinkModalParams = {
          linkType: linkInstanceType,
          onContinue: () => {
            // Modal was shown and user accepted (invalid/unsupported links always show modal)
            analyticsContext.interstitialShown = true;
            analyticsContext.interstitialAction = InterstitialState.ACCEPTED;
            // Track analytics before early return
            trackDeepLinkAnalytics(analyticsContext);
            resolve(false); // Still resolve false since we're not proceeding with the link
          },
          onBack: () => {
            // Modal was shown and user rejected
            analyticsContext.interstitialShown = true;
            analyticsContext.interstitialAction = InterstitialState.REJECTED;
            // Track analytics before early return
            trackDeepLinkAnalytics(analyticsContext);
            resolve(false);
          },
        } as DeepLinkModalParams;

        // Pass modal params for display
        handleDeepLinkModalDisplay(modalParams);
        return;
      }

      // For public/private links, pass pageTitle and onContinue
      const modalParams: DeepLinkModalParams = {
        linkType: linkInstanceType,
        pageTitle,
        onContinue: () => {
          // Determine if modal was actually shown or auto-accepted due to disabled setting
          // PUBLIC links always show modal (security requirement), so if we reach onContinue,
          // the modal was shown regardless of interstitialDisabled setting
          // PRIVATE links can be auto-accepted (skipped) if interstitialDisabled is true
          if (linkInstanceType === DeepLinkModalLinkType.PUBLIC) {
            // PUBLIC links always show modal - modal was shown and user accepted
            analyticsContext.interstitialShown = true;
            analyticsContext.interstitialAction = InterstitialState.ACCEPTED;
          } else if (
            linkInstanceType === DeepLinkModalLinkType.PRIVATE &&
            interstitialDisabled
          ) {
            // PRIVATE link with disabled setting - modal was skipped (auto-accepted)
            analyticsContext.interstitialShown = false;
            analyticsContext.interstitialAction = InterstitialState.ACCEPTED;
          } else {
            // PRIVATE link without disabled setting - modal was shown and user accepted
            analyticsContext.interstitialShown = true;
            analyticsContext.interstitialAction = InterstitialState.ACCEPTED;
          }
          // Track analytics asynchronously without blocking
          trackDeepLinkAnalytics(analyticsContext);
          resolve(true);
        },
        onBack: () => {
          // Modal was shown and user rejected (onBack only called when modal is shown)
          analyticsContext.interstitialShown = true;
          analyticsContext.interstitialAction = InterstitialState.REJECTED;
          // Track analytics before early return
          trackDeepLinkAnalytics(analyticsContext);
          resolve(false);
        },
      } as DeepLinkModalParams;

      // Pass modal params for display
      handleDeepLinkModalDisplay(modalParams);
    }));

  // Universal links
  handled();

  if (!shouldProceed) {
    return false;
  }

  const BASE_URL_ACTION = `${PROTOCOLS.HTTPS}://${urlObj.hostname}/${action}`;
  const actionBasedRampPath = urlObj.href.replace(BASE_URL_ACTION, '');

  switch (action) {
    case SUPPORTED_ACTIONS.BUY_CRYPTO:
    case SUPPORTED_ACTIONS.BUY:
    case SUPPORTED_ACTIONS.SELL_CRYPTO:
    case SUPPORTED_ACTIONS.SELL: {
      const rampType =
        action === SUPPORTED_ACTIONS.BUY_CRYPTO ||
        action === SUPPORTED_ACTIONS.BUY
          ? RampType.BUY
          : RampType.SELL;
      handleRampUrl({
        rampPath: actionBasedRampPath,
        rampType,
      });
      break;
    }
    case SUPPORTED_ACTIONS.DEPOSIT:
      handleDepositCashUrl({
        depositPath: actionBasedRampPath,
      });
      break;
    case SUPPORTED_ACTIONS.HOME:
      navigateToHomeUrl({ homePath: actionBasedRampPath });
      return;
    case SUPPORTED_ACTIONS.SWAP:
      handleSwapUrl({
        swapPath: actionBasedRampPath,
      });
      return;
    case SUPPORTED_ACTIONS.DAPP: {
      const deeplinkUrl = urlObj.href.replace(
        `${BASE_URL_ACTION}/`,
        PREFIXES[ACTIONS.DAPP],
      );
      handleBrowserUrl({
        url: deeplinkUrl,
        callback: browserCallBack,
      });
      return;
    }
    case SUPPORTED_ACTIONS.SEND: {
      const deeplinkUrl = urlObj.href
        .replace(`${BASE_URL_ACTION}/`, PREFIXES[ACTIONS.SEND])
        .replace(BASE_URL_ACTION, PREFIXES[ACTIONS.SEND]);
      // loops back to open the link with the right protocol
      instance.parse(deeplinkUrl, { origin: source });
      return;
    }
    case SUPPORTED_ACTIONS.CREATE_ACCOUNT: {
      handleCreateAccountUrl({
        path: actionBasedRampPath,
      });
      return;
    }
    case SUPPORTED_ACTIONS.PERPS:
    case SUPPORTED_ACTIONS.PERPS_MARKETS: {
      handlePerpsUrl({
        perpsPath: actionBasedRampPath,
      });
      break;
    }
    case SUPPORTED_ACTIONS.PERPS_ASSET: {
      // perps-asset URLs need screen=asset injected since actionBasedRampPath is just '?symbol=X'
      handlePerpsUrl({
        perpsPath: `perps?screen=asset${actionBasedRampPath.replace('?', '&')}`,
      });
      break;
    }
    case SUPPORTED_ACTIONS.REWARDS: {
      handleRewardsUrl({
        rewardsPath: actionBasedRampPath,
      });
      return;
    }
    case SUPPORTED_ACTIONS.PREDICT: {
      handlePredictUrl({
        predictPath: actionBasedRampPath,
        origin: source,
      });
      break;
    }
    case SUPPORTED_ACTIONS.SHIELD: {
      // shield is only available on extension for now, open shield website from in app browser
      handleBrowserUrl({
        url: SHIELD_WEBSITE_URL,
        callback: browserCallBack,
      });
      break;
    }
    case SUPPORTED_ACTIONS.WC: {
      const { params: wcParams } = extractURLParams(urlObj.href);
      const wcURL = wcParams?.uri;

      if (wcURL) {
        instance.parse(wcURL, { origin: source });
      }
      return;
    }
    case SUPPORTED_ACTIONS.ONBOARDING: {
      handleFastOnboarding({ onboardingPath: actionBasedRampPath });
      break;
    }
    case SUPPORTED_ACTIONS.ENABLE_CARD_BUTTON: {
      handleEnableCardButton();
      break;
    }
    case SUPPORTED_ACTIONS.CARD_ONBOARDING: {
      handleCardOnboarding();
      break;
    }
    case SUPPORTED_ACTIONS.CARD_HOME: {
      handleCardHome();
      break;
    }
    case SUPPORTED_ACTIONS.TRENDING: {
      handleTrendingUrl();
      break;
    }
  }
}

export default handleUniversalLink;
