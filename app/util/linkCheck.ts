import Url from 'url-parse';
import isUrl from 'is-url';
import { PhishingController as PhishingControllerClass } from '@metamask/phishing-controller';
import Engine from '../core/Engine';
import { selectProductSafetyDappScanningEnabled } from '../selectors/featureFlagController';
import { store } from '../store';
import Logger from './Logger';
const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const DENYLISTED_DOMAINS = ['metamask.app.link'];

const isAllowedProtocol = (protocol: string): boolean =>
  ALLOWED_PROTOCOLS.includes(protocol);

const isAllowedUrl = ({ hostname, origin }: Url<string>): boolean => {
  const { PhishingController } = Engine.context as {
    PhishingController: PhishingControllerClass;
  };
  const productSafetyDappScanningEnabled = selectProductSafetyDappScanningEnabled(store.getState());

  if (productSafetyDappScanningEnabled) {
    Logger.log('Real time dapp scanning enabled');
  } else {
    PhishingController.maybeUpdateState();
    const phishingControllerTestResult = PhishingController.test(origin);
    return !(
      phishingControllerTestResult.result || DENYLISTED_DOMAINS.includes(hostname)
    );
  }

  return !DENYLISTED_DOMAINS.includes(hostname);
};

export const isLinkSafe = (link: string): boolean => {
  try {
    const url = new Url(link);
    const { protocol, href } = url;
    return isUrl(href) && isAllowedProtocol(protocol) && isAllowedUrl(url);
  } catch (err) {
    return false;
  }
};

export default isLinkSafe;
