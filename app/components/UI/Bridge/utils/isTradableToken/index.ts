import { TrxScope } from '@metamask/keyring-api';
import { BridgeToken } from '../../types';
import { isTronSpecialAsset } from '../../../../../core/Multichain/utils';
import { TokenI } from '../../../Tokens/types';
import { isArcNativeAsset } from '../../../../../enablement/assets/arc';

const isTronRestrictedToken = (token: BridgeToken | TokenI) =>
  token.chainId === TrxScope.Mainnet &&
  isTronSpecialAsset(token.chainId, token.symbol);

export const isTradableToken = (token: BridgeToken | TokenI) =>
  !isTronRestrictedToken(token) && !isArcNativeAsset(token);
