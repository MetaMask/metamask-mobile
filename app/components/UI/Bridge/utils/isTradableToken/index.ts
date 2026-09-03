import { BridgeToken } from '../../types';
import { isTronSpecialAsset } from '../../../../../core/Multichain/utils';
import { TokenI } from '../../../Tokens/types';

export const isTradableToken = (token: BridgeToken | TokenI) =>
  !isTronSpecialAsset(token.address);
