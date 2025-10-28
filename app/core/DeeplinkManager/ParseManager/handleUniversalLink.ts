import { ACTIONS, PROTOCOLS, PREFIXES } from '../../../constants/deeplinks';
import AppConstants from '../../AppConstants';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import DeeplinkManager from '../DeeplinkManager';
import extractURLParams from './extractURLParams';
import {
  hasSignature,
  verifyDeeplinkSignature,
  INVALID,
  MISSING,
  VALID,
} from './utils/verifySignature';
import {
  DeepLinkModalLinkType,
  SupportedAction,
  isSupportedAction,
} from '../types/deepLink.types';
import handleDeepLinkModalDisplay from '../Handlers/handleDeepLinkModalDisplay';
import { DeepLinkModalParams } from '../../../components/UI/DeepLinkModal';
import { capitalize } from '../../../util/general';
import {
  createDeepLinkUsedEventBuilder,
  mapSupportedActionToRoute,
} from '../../../util/deeplinks/deepLinkAnalytics';
import {
  DeepLinkAnalyticsContext,
  SignatureStatus,
  InterstitialState,
  DeepLinkRoute,
} from '../types/deepLinkAnalytics.types';
import { MetaMetrics } from '../../Analytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import { selectDeepLinkModalDisabled } from '../../../selectors/settings';
import ReduxService from '../../redux';
import Logger from '../../../util/Logger';

const {
  MM_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_TEST_HOST,
} = AppConstants;

/**
 * Actions that should not show the deep link modal
 */
const WHITELISTED_ACTIONS: SupportedAction[] = [ACTIONS.WC];
const interstitialWhitelist = [
  `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${ACTIONS.PERPS_ASSET}`,
] as const;

/**
 * Determines the signature status of a validated URL
 */
async function determineSignatureStatus(
  validatedUrl: URL,
): Promise<SignatureStatus> {
  if (hasSignature(validatedUrl)) {
    try {
      const signatureResult = await verifyDeeplinkSignature(validatedUrl);
      switch (signatureResult) {
        case VALID:
          return SignatureStatus.VALID;
        case INVALID:
          return SignatureStatus.INVALID;
        case MISSING:
        default:
          return SignatureStatus.MISSING;
      }
    } catch (error) {
      return SignatureStatus.INVALID;
    }
  }
  return SignatureStatus.MISSING;
}

/**
 * Resolves the interstitial action based on whitelisting and user interaction
 */
async function resolveInterstitialAction(
  action: string,
  validatedUrl: URL,
  url: string,
  linkType: () => DeepLinkModalLinkType,
  signatureStatus: SignatureStatus,
): Promise<InterstitialState> {
  // Check if action is supported and whitelisted
  if (isSupportedAction(action) && WHITELISTED_ACTIONS.includes(action)) {
    return InterstitialState.ACCEPTED;
  }

  const validatedUrlString = validatedUrl.toString();
  if (interstitialWhitelist.some((u) => validatedUrlString.startsWith(u))) {
    return InterstitialState.ACCEPTED;
  }

  // Extract action details for modal
  const [, actionName] = validatedUrl.pathname.split('/');
  const sanitizedAction = actionName?.replace(/-/g, ' ');
  const pageTitle: string = capitalize(sanitizedAction?.toLowerCase()) || '';

  const modalLinkType = linkType();

  // Create Promise and capture resolve function to be called by modal callbacks
  let resolveInterstitial: (state: InterstitialState) => void;
  const interstitialPromise = new Promise<InterstitialState>((resolve) => {
    resolveInterstitial = resolve;
  });

  // Build params based on link type - INVALID and UNSUPPORTED don't have onContinue/pageTitle
  const modalParams: DeepLinkModalParams =
    modalLinkType === DeepLinkModalLinkType.INVALID ||
    modalLinkType === DeepLinkModalLinkType.UNSUPPORTED
      ? {
          linkType: modalLinkType,
          onBack: () => resolveInterstitial(InterstitialState.REJECTED),
        }
      : {
          linkType: modalLinkType,
          pageTitle,
          onContinue: () => resolveInterstitial(InterstitialState.ACCEPTED),
          onBack: () => resolveInterstitial(InterstitialState.REJECTED),
        };

  // Wait for async modal display (including analytics) to complete before callbacks can resolve
  await handleDeepLinkModalDisplay(modalParams, {
    url,
    route: isSupportedAction(action)
      ? mapSupportedActionToRoute(action)
      : DeepLinkRoute.INVALID,
    urlParams: extractURLParams(url).params,
    signatureStatus,
    interstitialShown: false,
    interstitialDisabled: false,
    interstitialAction: undefined,
  });

  return interstitialPromise;
}

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

  let isPrivateLink = false;
  let isInvalidLink = false;

  const action = validatedUrl.pathname.split('/')[1];

  const isSupportedDomain =
    urlObj.hostname === MM_UNIVERSAL_LINK_HOST ||
    urlObj.hostname === MM_IO_UNIVERSAL_LINK_HOST ||
    urlObj.hostname === MM_IO_UNIVERSAL_LINK_TEST_HOST;

  const isActionSupported = isSupportedAction(action);
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

  // Determine signature status before resolving interstitial to ensure correct analytics
  const signatureStatus = await determineSignatureStatus(validatedUrl);

  // Check if action/URL is whitelisted (modal will not be shown)
  const isWhitelisted =
    (isSupportedAction(action) && WHITELISTED_ACTIONS.includes(action)) ||
    interstitialWhitelist.some((url) =>
      validatedUrl.toString().startsWith(url),
    );

  const interstitialAction = await resolveInterstitialAction(
    action,
    validatedUrl,
    url,
    linkType,
    signatureStatus,
  );

  // Universal links
  handled();

  // Track consolidated deep link analytics event BEFORE early return
  // This ensures we track REJECTED and SKIPPED states as well
  try {
    const { params } = extractURLParams(url);

    // Get modal disabled state from Redux store
    const isModalDisabled = selectDeepLinkModalDisabled(
      ReduxService.store.getState(),
    );

    // Determine if interstitial was actually shown to user
    // Modal is NOT shown if: whitelisted OR (private link + modal disabled by user)
    const modalLinkType = linkType();
    const wasModalSkippedDueToPreference =
      modalLinkType === DeepLinkModalLinkType.PRIVATE && isModalDisabled;
    const wasInterstitialShown =
      !isWhitelisted && !wasModalSkippedDueToPreference;

    // Create analytics context
    const analyticsContext: DeepLinkAnalyticsContext = {
      url,
      route: isSupportedAction(action)
        ? mapSupportedActionToRoute(action)
        : DeepLinkRoute.INVALID,
      urlParams: params,
      signatureStatus,
      interstitialShown: wasInterstitialShown, // Modal was shown if user accepted or rejected
      interstitialDisabled: isModalDisabled, // Get actual modal disabled state
      interstitialAction,
    };

    // Create and track the consolidated event
    const eventBuilder = await createDeepLinkUsedEventBuilder(analyticsContext);

    const metrics = MetaMetrics.getInstance();
    eventBuilder.addProperties(generateDeviceAnalyticsMetaData());

    const event = eventBuilder.build();
    metrics.trackEvent(event);

    DevLogger.log(
      'DeepLinkAnalytics: Tracked consolidated deep link event:',
      event,
    );
  } catch (error) {
    Logger.error(error as Error, 'Error tracking deep link event');
  }

  // Handle rejection after analytics tracking
  if (interstitialAction === InterstitialState.REJECTED) {
    return false;
  }

  const BASE_URL_ACTION = `${PROTOCOLS.HTTPS}://${urlObj.hostname}/${action}`;
  if (action === ACTIONS.BUY_CRYPTO || action === ACTIONS.BUY) {
    const rampPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleBuyCrypto(rampPath);
  } else if (action === ACTIONS.SELL_CRYPTO || action === ACTIONS.SELL) {
    const rampPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleSellCrypto(rampPath);
  } else if (action === ACTIONS.DEPOSIT) {
    const depositCashPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleDepositCash(depositCashPath);
  } else if (action === ACTIONS.HOME) {
    const homePath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleOpenHome(homePath);
    return;
  } else if (action === ACTIONS.SWAP) {
    const swapPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleSwap(swapPath);
    return;
  } else if (action === ACTIONS.DAPP) {
    const deeplinkUrl = urlObj.href.replace(
      `${BASE_URL_ACTION}/`,
      PREFIXES[ACTIONS.DAPP],
    );
    instance._handleBrowserUrl(deeplinkUrl, browserCallBack);
  } else if (action === ACTIONS.SEND) {
    const deeplinkUrl = urlObj.href
      .replace(`${BASE_URL_ACTION}/`, PREFIXES[ACTIONS.SEND])
      .replace(BASE_URL_ACTION, PREFIXES[ACTIONS.SEND]);
    // loops back to open the link with the right protocol
    instance.parse(deeplinkUrl, { origin: source });
    return;
  } else if (action === ACTIONS.CREATE_ACCOUNT) {
    const deeplinkUrl = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleCreateAccount(deeplinkUrl);
  } else if (action === ACTIONS.PERPS || action === ACTIONS.PERPS_MARKETS) {
    const perpsPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handlePerps(perpsPath);
  } else if (action === ACTIONS.REWARDS) {
    const rewardsPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleRewards(rewardsPath);
  } else if (action === ACTIONS.WC) {
    const { params } = extractURLParams(urlObj.href);
    const wcURL = params?.uri;

    if (wcURL) {
      instance.parse(wcURL, { origin: source });
    }
    return;
  } else if (action === ACTIONS.ONBOARDING) {
    const onboardingPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleFastOnboarding(onboardingPath);
  }
}

export default handleUniversalLink;
