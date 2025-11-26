import { TrxScope } from '@metamask/keyring-api';
import { BridgeToken } from '../../types';
import {
  TRON_RESOURCE_SYMBOLS,
  TronResourceSymbol,
} from '../../../../../core/Multichain/constants';
import { TokenI } from '../../../Tokens/types';

export const isTradableToken = (token: BridgeToken | TokenI) => {
  if (token.chainId === TrxScope.Mainnet) {
    return !TRON_RESOURCE_SYMBOLS.includes(
      token.symbol?.toLowerCase() as TronResourceSymbol,
    );
  }
  return true;
};
