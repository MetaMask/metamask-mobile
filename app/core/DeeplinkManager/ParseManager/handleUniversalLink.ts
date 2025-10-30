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
import { DeepLinkModalLinkType } from '../../../components/UI/DeepLinkModal';
import handleDeepLinkModalDisplay from '../Handlers/handleDeepLinkModalDisplay';
import { capitalize } from '../../../util/general';

const {
  MM_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_HOST,
  MM_IO_UNIVERSAL_LINK_TEST_HOST,
} = AppConstants;

enum SUPPORTED_ACTIONS {
  DAPP = ACTIONS.DAPP,
  BUY = ACTIONS.BUY,
  BUY_CRYPTO = ACTIONS.BUY_CRYPTO,
  SELL = ACTIONS.SELL,
  SELL_CRYPTO = ACTIONS.SELL_CRYPTO,
  DEPOSIT = ACTIONS.DEPOSIT,
  HOME = ACTIONS.HOME,
  SWAP = ACTIONS.SWAP,
  SEND = ACTIONS.SEND,
  CREATE_ACCOUNT = ACTIONS.CREATE_ACCOUNT,
  PERPS = ACTIONS.PERPS,
  PERPS_MARKETS = ACTIONS.PERPS_MARKETS,
  PERPS_ASSET = ACTIONS.PERPS_ASSET,
  REWARDS = ACTIONS.REWARDS,
  WC = ACTIONS.WC,
  ONBOARDING = ACTIONS.ONBOARDING,
  ENABLE_CARD_BUTTON = ACTIONS.ENABLE_CARD_BUTTON,
  // MetaMask SDK specific actions
  ANDROID_SDK = ACTIONS.ANDROID_SDK,
  CONNECT = ACTIONS.CONNECT,
  MMSDK = ACTIONS.MMSDK,
}

/**
 * Actions that should not show the deep link modal
 */
const WHITELISTED_ACTIONS: SUPPORTED_ACTIONS[] = [
  SUPPORTED_ACTIONS.WC,
  SUPPORTED_ACTIONS.ENABLE_CARD_BUTTON,
];

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

  const shouldProceed =
    WHITELISTED_ACTIONS.includes(action) ||
    (await new Promise<boolean>((resolve) => {
      const [, actionName] = validatedUrl.pathname.split('/');
      const sanitizedAction = actionName?.replace(/-/g, ' ');
      const pageTitle: string =
        capitalize(sanitizedAction?.toLowerCase()) || '';

      const validatedUrlString = validatedUrl.toString();
      if (interstitialWhitelist.some((u) => validatedUrlString.startsWith(u))) {
        resolve(true);
        return;
      }

      handleDeepLinkModalDisplay({
        linkType: linkType(),
        pageTitle,
        onContinue: () => resolve(true),
        onBack: () => resolve(false),
      });
    }));

  // Universal links
  handled();

  if (!shouldProceed) {
    return false;
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
  } else if (action === SUPPORTED_ACTIONS.ONBOARDING) {
    const onboardingPath = urlObj.href.replace(BASE_URL_ACTION, '');
    instance._handleFastOnboarding(onboardingPath);
  } else if (action === SUPPORTED_ACTIONS.ENABLE_CARD_BUTTON) {
    instance._handleEnableCardButton();
  }
}

export default handleUniversalLink;
