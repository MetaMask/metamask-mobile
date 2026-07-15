import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import hideProtocolFromUrl from '../../../util/hideProtocolFromUrl';

/** Same as NetworkSelector: short host + path, no protocol or API key. Truncated to fit in one line without changing shared cell layout. */
export const MAX_RPC_DISPLAY_LENGTH = 36;

export const formatRpcUrlForDisplay = (url: string): string => {
  const withoutKey = hideKeyFromUrl(url);
  const withoutProtocol = hideProtocolFromUrl(withoutKey);
  let result: string;
  if (withoutProtocol?.startsWith('http')) {
    result = withoutProtocol.replace(/^https?:\/\//, '');
  } else {
    result = withoutProtocol ?? url;
  }
  if (result.length > MAX_RPC_DISPLAY_LENGTH) {
    return `${result.slice(0, MAX_RPC_DISPLAY_LENGTH - 1)}…`;
  }
  return result;
};
