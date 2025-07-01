import { ACTIONS, PROTOCOLS } from '../../../constants/deeplinks';
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
  HOME = ACTIONS.HOME,
  SWAP = ACTIONS.SWAP,
}

async function handleUniversalLink({
  instance,
  handled,
  urlObj,
  browserCallBack,
  url,
}: {
  instance: DeeplinkManager;
  handled: () => void;
  urlObj: ReturnType<typeof extractURLParams>['urlObj'];
  browserCallBack?: (url: string) => void;
  url: string;
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
    !Object.keys(SUPPORTED_ACTIONS).includes(action.toUpperCase()) ||
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

  const shouldProceed = await new Promise<boolean>((resolve) => {
    const pageTitle: string =
      capitalize(validatedUrl.pathname.split('/')[1]?.toLowerCase()) || '';

    handleDeepLinkModalDisplay({
      linkType: linkType(),
      pageTitle,
      onContinue: () => resolve(true),
      onBack: () => resolve(false),
    });
  });

  // Universal links
  handled();

  if (!shouldProceed) {
    return false;
  }

  if (
    action === SUPPORTED_ACTIONS.BUY_CRYPTO ||
    action === SUPPORTED_ACTIONS.BUY
  ) {
    const rampPath = urlObj.href
      .replace(
        `${PROTOCOLS.HTTPS}://${urlObj.hostname}/${ACTIONS.BUY_CRYPTO}`,
        '',
      )
      .replace(`${PROTOCOLS.HTTPS}://${urlObj.hostname}/${ACTIONS.BUY}`, '');
    instance._handleBuyCrypto(rampPath);
  } else if (
    action === SUPPORTED_ACTIONS.SELL_CRYPTO ||
    action === SUPPORTED_ACTIONS.SELL
  ) {
    const rampPath = urlObj.href
      .replace(
        `${PROTOCOLS.HTTPS}://${urlObj.hostname}/${ACTIONS.SELL_CRYPTO}`,
        '',
      )
      .replace(`${PROTOCOLS.HTTPS}://${urlObj.hostname}/${ACTIONS.SELL}`, '');
    instance._handleSellCrypto(rampPath);
  } else if (action === SUPPORTED_ACTIONS.HOME) {
    instance._handleOpenHome();
    return;
  } else if (action === SUPPORTED_ACTIONS.SWAP) {
    const swapPath = urlObj.href.replace(
      `${PROTOCOLS.HTTPS}://${urlObj.hostname}/${SUPPORTED_ACTIONS.SWAP}`,
      '',
    );
    instance._handleSwap(swapPath);
    return;
  } else if (action === SUPPORTED_ACTIONS.DAPP) {
    // Normal links (same as dapp)
    instance._handleBrowserUrl(urlObj.href, browserCallBack);
  }
}

export default handleUniversalLink;
