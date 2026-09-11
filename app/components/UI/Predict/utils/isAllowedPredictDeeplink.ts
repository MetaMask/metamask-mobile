import { ACTIONS, PROTOCOLS } from '../../../../constants/deeplinks';
import { getMetaMaskDeeplinkHosts } from '../../../../core/DeeplinkManager/util/deeplinks';

/** Restricts remote carousel destinations to MetaMask-owned Predict links. */
export const isAllowedPredictDeeplink = (
  uri: unknown,
  includeCom = false,
): uri is string => {
  if (typeof uri !== 'string' || uri.length === 0) {
    return false;
  }

  try {
    const parsed = new URL(uri);

    if (parsed.protocol === `${PROTOCOLS.METAMASK}:`) {
      return parsed.hostname === ACTIONS.PREDICT;
    }

    if (
      parsed.protocol !== `${PROTOCOLS.HTTPS}:` ||
      !getMetaMaskDeeplinkHosts(includeCom).includes(parsed.hostname)
    ) {
      return false;
    }

    const action = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return action === ACTIONS.PREDICT;
  } catch {
    return false;
  }
};
