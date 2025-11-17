import { TrxScope } from '@metamask/keyring-api';
import { BridgeToken } from '../../types';

export const isTradableToken = (token: BridgeToken) => {
  if (
    token.chainId === TrxScope.Mainnet &&
    (token.name?.toLowerCase() === 'energy' ||
      token.name?.toLowerCase() === 'bandwidth' ||
      token.name?.toLowerCase() === 'max bandwidth')
  ) {
    return false;
  }

  return true;
};
