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
import { DeepLinkModalLinkType } from '../types/deepLink.types';
import handleDeepLinkModalDisplay from '../Handlers/handleDeepLinkModalDisplay';
import { capitalize } from '../../../util/general';
import {
  createDeepLinkUsedEventBuilder,
  mapSupportedActionToRoute,
} from '../../../util/deeplinks/deepLinkAnalytics';
import {
  DeepLinkAnalyticsContext,
  SignatureStatus,
  InterstitialState,
} from '../types/deepLinkAnalytics.types';
import { SUPPORTED_ACTIONS } from '../types/deepLink.types';
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
const WHITELISTED_ACTIONS: SUPPORTED_ACTIONS[] = [SUPPORTED_ACTIONS.WC];
const interstitialWhitelist = [
  `${PROTOCOLS.HTTPS}://${AppConstants.MM_IO_UNIVERSAL_LINK_HOST}/${SUPPORTED_ACTIONS.PERPS_ASSET}`,
] as const;

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

  const action: SUPPORTED_ACTIONS = validatedUrl.pathname.split(
    '/',
  )[1] as SUPPORTED_ACTIONS;

  const isSupportedDomain =
    urlObj.hostname === MM_UNIVERSAL_LINK_HOST ||
    urlObj.hostname === MM_IO_UNIVERSAL_LINK_HOST ||
    urlObj.hostname === MM_IO_UNIVERSAL_LINK_TEST_HOST;

  if (
    !Object.values(SUPPORTED_ACTIONS).includes(action) ||
    !isSupportedDomain
  ) {
    isInvalidLink = true;
  }

  if (hasSignature(validatedUrl) && !isInvalidLink) {
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
    if (isInvalidLink) {
      return DeepLinkModalLinkType.INVALID;
    }
    if (isPrivateLink) {
      return DeepLinkModalLinkType.PRIVATE;
    }
    return DeepLinkModalLinkType.PUBLIC;
  };

  const interstitialAction =
    WHITELISTED_ACTIONS.includes(action) 
      ? InterstitialState.ACCEPTED
      : (await new Promise<InterstitialState>((resolve) => {
          const [, actionName] = validatedUrl.pathname.split('/');
          const sanitizedAction = actionName?.replace(/-/g, ' ');
          const pageTitle: string =
            capitalize(sanitizedAction?.toLowerCase()) || '';

          const validatedUrlString = validatedUrl.toString();
          if (interstitialWhitelist.some((u) => validatedUrlString.startsWith(u))) {
            resolve(InterstitialState.ACCEPTED);
            return;
          }

          handleDeepLinkModalDisplay({
            linkType: linkType(),
            pageTitle,
            onContinue: () => resolve(InterstitialState.ACCEPTED),
            onBack: () => resolve(InterstitialState.REJECTED),
          }, {
            url,
            route: mapSupportedActionToRoute(action),
            urlParams: {
              ...extractURLParams(url).params,
              hr: extractURLParams(url).params.hr ? '1' : '0', // Convert boolean back to string for analytics
            },
            signatureStatus: SignatureStatus.MISSING,
            interstitialShown: false, // Will be updated when modal is shown
            interstitialDisabled: false, // Will be updated based on user settings
            interstitialAction: undefined, // Will be set when user acts
          });
        }));

  // Universal links
  handled();

  if (interstitialAction === InterstitialState.REJECTED) {
    return false;
  }

  // Track consolidated deep link analytics event
  try {
    const { params } = extractURLParams(url);

    // Determine signature status
    let signatureStatus: SignatureStatus;
    if (hasSignature(validatedUrl)) {
      try {
        const signatureResult = await verifyDeeplinkSignature(validatedUrl);
        switch (signatureResult) {
          case VALID:
            signatureStatus = SignatureStatus.VALID;
            break;
          case INVALID:
            signatureStatus = SignatureStatus.INVALID;
            break;
          case MISSING:
          default:
            signatureStatus = SignatureStatus.MISSING;
            break;
        }
      } catch (error) {
        signatureStatus = SignatureStatus.INVALID;
      }
    } else {
      signatureStatus = SignatureStatus.MISSING;
    }

    // Get modal disabled state from Redux store
    const isModalDisabled = selectDeepLinkModalDisabled(
      ReduxService.store.getState(),
    );

    // Determine if interstitial was shown based on user action
    const wasInterstitialShown = (interstitialAction as InterstitialState) === InterstitialState.ACCEPTED || 
                                 (interstitialAction as InterstitialState) === InterstitialState.REJECTED;

    // Create analytics context
    const analyticsContext: DeepLinkAnalyticsContext = {
      url,
      route: mapSupportedActionToRoute(action), // Proper mapping function
            urlParams: {
              ...params,
              hr: params.hr ? '1' : '0', // Convert boolean back to string for analytics
            },
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

  const BASE_URL_ACTION = `${PROTOCOLS.HTTPS}://${urlObj.hostname}/${action}`;
  if (
    action === SUPPORTED_ACTIONS.BUY_CRYPTO ||
    action === SUPPORTED_ACTIONS.BUY
  ) {
    const rampPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleBuyCrypto(rampPath);
  } else if (
    action === SUPPORTED_ACTIONS.SELL_CRYPTO ||
    action === SUPPORTED_ACTIONS.SELL
  ) {
    const rampPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleSellCrypto(rampPath);
  } else if (action === SUPPORTED_ACTIONS.DEPOSIT) {
    const depositCashPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleDepositCash(depositCashPath);
  } else if (action === SUPPORTED_ACTIONS.HOME) {
    const homePath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleOpenHome(homePath);
    return;
  } else if (action === SUPPORTED_ACTIONS.SWAP) {
    const swapPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleSwap(swapPath);
    return;
  } else if (action === SUPPORTED_ACTIONS.DAPP) {
    const deeplinkUrl = urlObj.href.replace(
      `${BASE_URL_ACTION}/`,
      PREFIXES[ACTIONS.DAPP],
    );
    instance._handleBrowserUrl(deeplinkUrl, browserCallBack);
  } else if (action === SUPPORTED_ACTIONS.SEND) {
    const deeplinkUrl = urlObj.href
      .replace(`${BASE_URL_ACTION}/`, PREFIXES[ACTIONS.SEND])
      .replace(BASE_URL_ACTION, PREFIXES[ACTIONS.SEND]);
    // loops back to open the link with the right protocol
    instance.parse(deeplinkUrl, { origin: source });
    return;
  } else if (action === SUPPORTED_ACTIONS.CREATE_ACCOUNT) {
    const deeplinkUrl = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleCreateAccount(deeplinkUrl);
  } else if (
    action === SUPPORTED_ACTIONS.PERPS ||
    action === SUPPORTED_ACTIONS.PERPS_MARKETS
  ) {
    const perpsPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handlePerps(perpsPath);
  } else if (action === SUPPORTED_ACTIONS.REWARDS) {
    const rewardsPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleRewards(rewardsPath);
  } else if (action === SUPPORTED_ACTIONS.WC) {
    const { params } = extractURLParams(urlObj.href);
    const wcURL = params?.uri;

    if (wcURL) {
      instance.parse(wcURL, { origin: source });
    }
    return;
  }
}

export default handleUniversalLink;
