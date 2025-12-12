import { ScanSuccess } from '../QRTabSwitcher';
import {
  failedSeedPhraseRequirements,
  isValidMnemonic,
} from '../../../util/validators';
import { QRType, QRTypeValue } from './constants';
import Routes from '../../../constants/navigation/Routes';
import { isValidAddress } from 'ethereumjs-util';
import { PROTOCOLS } from '../../../constants/deeplinks';
import {
  MM_WALLETCONNECT_DEEPLINK,
  MM_SDK_DEEPLINK,
} from '../../../constants/urls';
import SDKConnectV2 from '../../../core/SDKConnectV2';
import { getURLProtocol } from '../../../util/general';

/**
 * Determines the QR type based on the scanned content
 */
export const getQRType = (
  content: string,
  origin?: string,
  data?: ScanSuccess,
): QRTypeValue => {
  // Check for seed phrase
  if (
    data?.seed ||
    (!failedSeedPhraseRequirements(content) && isValidMnemonic(content))
  ) {
    return QRType.SEED_PHRASE;
  }

  // Check for private key
  if (
    data?.private_key ||
    content.length === 64 ||
    (content.substring(0, 2).toLowerCase() === '0x' && content.length === 66)
  ) {
    return QRType.PRIVATE_KEY;
  }

  // Check for send flow
  if (
    origin === Routes.SEND_FLOW.SEND_TO ||
    origin === Routes.SETTINGS.CONTACT_FORM ||
    data?.action === 'send-eth' ||
    (content.startsWith('0x') && isValidAddress(content)) ||
    content.split(`${PROTOCOLS.ETHEREUM}:`).length > 1
  ) {
    return QRType.SEND_FLOW;
  }

  // Check for wallet connect
  if (
    data?.walletConnectURI ||
    content.startsWith(MM_WALLETCONNECT_DEEPLINK) ||
    content.split('wc:').length > 1
  ) {
    return QRType.WALLET_CONNECT;
  }

  // Check for deeplink
  if (
    content.startsWith(MM_SDK_DEEPLINK) ||
    content.split('metamask-sync:').length > 1 ||
    SDKConnectV2.isMwpDeeplink(content)
  ) {
    return QRType.DEEPLINK;
  }

  // Check for URL
  const contentProtocol = getURLProtocol(content);
  if (
    contentProtocol === PROTOCOLS.HTTP ||
    contentProtocol === PROTOCOLS.HTTPS ||
    contentProtocol === PROTOCOLS.DAPP
  ) {
    return QRType.URL;
  }

  // Default to deeplink for other cases (EIP-945 arbitrary data)
  return QRType.DEEPLINK;
};
