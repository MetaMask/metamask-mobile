import { BridgeToken } from '../../types';

export const includeOnlyTradableTokens = (token: BridgeToken) => {
  if (
    token.chainId?.includes('tron:') &&
    (token.name?.toLowerCase() === 'energy' ||
      token.name?.toLowerCase() === 'bandwidth' ||
      token.name?.toLowerCase() === 'max bandwidth')
  ) {
    return false;
  }

  return true;
};
