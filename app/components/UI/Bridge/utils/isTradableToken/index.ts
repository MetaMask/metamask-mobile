import { TrxScope } from '@metamask/keyring-api';
import { BridgeToken } from '../../types';
import { TokenI } from '../../../Tokens/types';

export const isTradableToken = (token: BridgeToken | TokenI) => {
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
