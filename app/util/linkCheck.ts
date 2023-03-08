import Engine from '../core/Engine';
const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const BLACKLISTED_DOMAINS = ['metamask.app.link'];

const isAllowedProtocol = (protocol: string): boolean =>
  ALLOWED_PROTOCOLS.includes(protocol);

const isAllowedHostname = (hostname: string): boolean => {
  const { PhishingController } = Engine.context as any;
  PhishingController.maybeUpdateState();
  const phishingControllerTestResult = PhishingController.test(hostname);

  return !(
    phishingControllerTestResult.result ||
    BLACKLISTED_DOMAINS.includes(hostname)
  );
};

export const isLinkSafe = (link: string): boolean => {
  try {
    const url = new URL(link);
    const { protocol, hostname } = url;
    if (!isAllowedProtocol(protocol)) return false;
    if (!isAllowedHostname(hostname)) return false;
    return true;
  } catch (err) {
    return false;
  }
};

export default isLinkSafe;
